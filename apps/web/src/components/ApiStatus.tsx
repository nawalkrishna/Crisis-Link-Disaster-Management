import { useQuery } from '@tanstack/react-query';
import type { HealthResponse } from '@crisislink/shared';
import { api } from '../lib/api';
import { useLiveStatus } from '../lib/socket';
import { cn } from './styles';

/**
 * Footer indicator: is the backend up, and is the live connection open?
 *  - Live     : changes made by others appear instantly
 *  - Online   : API reachable but live updates are reconnecting (pages still refresh on focus)
 *  - Offline  : API unreachable
 */
export function ApiStatus() {
  const live = useLiveStatus();
  const { data, isError } = useQuery({
    queryKey: ['health'],
    queryFn: () => api<HealthResponse>('/health'),
    refetchInterval: 60_000,
    retry: false,
  });
  const online = data?.status === 'ok' && !isError;
  const label = live ? 'Live' : online ? 'Online' : isError ? 'Offline' : 'Checking…';
  return (
    <span
      className="inline-flex items-center gap-1.5"
      title={
        live
          ? 'Updates from other people appear automatically'
          : data
            ? `API v${data.version}`
            : undefined
      }
    >
      <span aria-hidden className="relative flex size-2">
        {live && (
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60 motion-reduce:hidden" />
        )}
        <span
          className={cn(
            'relative inline-flex size-2 rounded-full',
            live || online ? 'bg-emerald-500' : isError ? 'bg-red-500' : 'bg-slate-300',
          )}
        />
      </span>
      {label}
    </span>
  );
}
