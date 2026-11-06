import { useEffect, useState } from 'react';
import type { HealthResponse } from '@crisislink/shared';

type Status =
  | { state: 'loading' }
  | { state: 'online'; data: HealthResponse }
  | { state: 'offline'; reason: string };

/**
 * Pings the API so we can see, end to end, that web -> Vite proxy -> API works.
 * The `Status` type is a "discriminated union": TypeScript knows `data` only
 * exists when state === 'online', so we can't accidentally read it otherwise.
 * (Phase 3 replaces this hand-written fetching with TanStack Query.)
 */
export function ApiStatus() {
  const [status, setStatus] = useState<Status>({ state: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/health', { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<HealthResponse>;
      })
      .then((data) => setStatus({ state: 'online', data }))
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setStatus({ state: 'offline', reason: err instanceof Error ? err.message : 'unknown' });
      });
    // Cleanup: cancel the request if the component unmounts before it finishes.
    return () => controller.abort();
  }, []);

  const styles = {
    loading: 'bg-slate-100 text-slate-600',
    online: 'bg-emerald-100 text-emerald-800',
    offline: 'bg-red-100 text-red-800',
  } as const;

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${styles[status.state]}`}
    >
      <span className="size-2 rounded-full bg-current" aria-hidden />
      {status.state === 'loading' && 'Checking API...'}
      {status.state === 'online' && `API online - v${status.data.version}`}
      {status.state === 'offline' && `API offline (${status.reason})`}
    </span>
  );
}
