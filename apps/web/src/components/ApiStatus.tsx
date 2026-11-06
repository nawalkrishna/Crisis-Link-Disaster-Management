import { useQuery } from '@tanstack/react-query';
import type { HealthResponse } from '@crisislink/shared';
import { api } from '../lib/api';
import { cn } from './styles';

/** Tiny "is the backend up?" indicator in the footer. Re-checks every minute. */
export function ApiStatus() {
  const { data, isError } = useQuery({
    queryKey: ['health'],
    queryFn: () => api<HealthResponse>('/health'),
    refetchInterval: 60_000,
    retry: false,
  });
  const online = data?.status === 'ok' && !isError;
  return (
    <span
      className="inline-flex items-center gap-1.5"
      title={data ? `API v${data.version}` : undefined}
    >
      <span
        aria-hidden
        className={cn(
          'size-2 rounded-full',
          online ? 'bg-emerald-500' : isError ? 'bg-red-500' : 'bg-slate-300',
        )}
      />
      {online ? 'Online' : isError ? 'Offline' : 'Checking…'}
    </span>
  );
}
