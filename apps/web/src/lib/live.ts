import { useEffect } from 'react';
import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import { LIVE_EVENT, type LiveEvent } from '@crisislink/shared';
import { useToast } from '../components/toast-context';
import { humanize } from './format';
import { socket } from './socket';
import { isStaff, useCurrentUser } from './auth';

/**
 * LIVE UPDATES (client side)
 *
 * One Socket.IO connection per tab. The server sends small signals ("needs of camp X
 * changed"); we turn each into TanStack Query INVALIDATIONS. Invalidating marks cached data
 * stale and refetches only the queries some component on screen is using - so a page that
 * shows the needs list updates itself, and nothing else is downloaded.
 */

// ---------- Event -> cache invalidation ----------

const campLevel: QueryKey[] = [['camps'], ['stats'], ['districts'], ['map'], ['nearby']];

function keysFor(event: LiveEvent): QueryKey[] | 'all' {
  switch (event.type) {
    case 'camp.changed':
      return campLevel;
    case 'evacuees.changed':
      return [['evacuees', event.campId], ...campLevel];
    case 'needs.changed':
      return [['needs'], ...campLevel]; // open-need counts appear on camp cards
    case 'donations.changed':
      return [['donations']];
    case 'incident.changed':
      return [['incidents'], ['stats'], ['districts'], ['map']];
    case 'tasks.changed':
      return [['tasks']];
    case 'volunteers.changed':
      return [['volunteers'], ['users']];
    case 'me.changed':
      return 'all'; // role/camps changed: what we may see has changed everywhere
  }
}

/** Mount once (in the Layout): keeps every visible page in sync with the server. */
export function useLiveUpdates() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { data: user } = useCurrentUser();
  const staff = isStaff(user);

  useEffect(() => {
    socket.connect();
    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    // COALESCING: a busy camp can emit many events per second. Collect the keys and refetch
    // once per 300 ms window instead of once per event.
    let pending = new Map<string, QueryKey>();
    let everything = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const flush = () => {
      timer = undefined;
      if (everything) void queryClient.invalidateQueries();
      else
        for (const key of pending.values()) void queryClient.invalidateQueries({ queryKey: key });
      pending = new Map();
      everything = false;
    };
    const schedule = () => {
      timer ??= setTimeout(flush, 300);
    };

    const onEvent = (event: LiveEvent) => {
      const keys = keysFor(event);
      if (keys === 'all') everything = true;
      else for (const key of keys) pending.set(JSON.stringify(key), key);
      schedule();

      if (event.type === 'incident.changed' && event.created && staff) {
        const { severity, district, locationText } = event.created;
        toast(`New ${humanize(severity).toLowerCase()} incident: ${locationText}, ${district}`);
      }
    };

    // After a reconnect we may have missed events (sleeping laptop, lost signal):
    // the simplest correct answer is to refetch whatever is on screen.
    let connectedBefore = socket.connected;
    const onConnect = () => {
      if (connectedBefore) {
        everything = true;
        schedule();
      }
      connectedBefore = true;
    };

    socket.on(LIVE_EVENT, onEvent);
    socket.on('connect', onConnect);
    return () => {
      socket.off(LIVE_EVENT, onEvent);
      socket.off('connect', onConnect);
      if (timer) clearTimeout(timer);
    };
  }, [queryClient, toast, staff]);
}
