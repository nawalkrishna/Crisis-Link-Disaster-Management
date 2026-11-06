import { useSyncExternalStore } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@crisislink/shared';
import { API_BASE, setExtraHeaders } from './api';

/**
 * The tab's single Socket.IO connection (see live.ts for what we do with its events).
 * Typed with the shared event maps, so `socket.on('live', ...)` knows the payload type.
 */
export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(
  API_BASE || undefined,
  {
    withCredentials: true, // send the session cookie with the handshake
    autoConnect: false, // connected by useLiveUpdates() once the app renders
  },
);

// The server closes our socket when this login session ends (logout, suspension, password
// changed elsewhere). Socket.IO does not reconnect after a server-side close by itself,
// so reconnect - as whoever the cookie now says we are (possibly nobody).
socket.on('disconnect', (reason) => {
  if (reason === 'io server disconnect') setTimeout(() => socket.connect(), 1000);
});

/** Call after login/logout so the server re-reads who we are and picks the right rooms. */
export function reconnectLive() {
  if (socket.active) socket.disconnect().connect();
}

// Our own writes carry X-Socket-Id, so the server doesn't echo our changes back to us
// (this tab already refreshes its data when its own request succeeds).
setExtraHeaders((): Record<string, string> =>
  socket.connected && socket.id ? { 'x-socket-id': socket.id } : {},
);

// ---------- Connection status for the UI ----------

function subscribeStatus(onChange: () => void) {
  socket.on('connect', onChange);
  socket.on('disconnect', onChange);
  return () => {
    socket.off('connect', onChange);
    socket.off('disconnect', onChange);
  };
}
/** useSyncExternalStore: the React-approved way to read state that lives outside React. */
export const useLiveStatus = () => useSyncExternalStore(subscribeStatus, () => socket.connected);
