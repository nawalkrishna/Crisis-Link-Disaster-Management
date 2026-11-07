import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CloudOff, RefreshCw, Send, X } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { timeAgo } from '../lib/format';
import { discardOutboxItem, retryOutboxItem, useOnline, useOutbox } from '../lib/offline';
import { useToast } from './toast-context';
import { Button } from './ui';
import { cn } from './styles';

/** "You're offline" strip under the header, with how old the shown information is. */
export function OfflineBanner() {
  const online = useOnline();
  const queryClient = useQueryClient();
  if (online) return null;
  const savedAt = queryClient.getQueryState(['stats'])?.dataUpdatedAt;
  return (
    <div role="status" className="bg-slate-800 text-sm text-white">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2">
        <CloudOff className="size-4 shrink-0" aria-hidden />
        <span>
          You&rsquo;re offline. Showing information saved on this device
          {savedAt ? ` (updated ${timeAgo(new Date(savedAt).toISOString())})` : ''}. Reports and
          check-ins will be sent when you&rsquo;re back online.
        </span>
      </div>
    </div>
  );
}

/**
 * The OUTBOX: writes made offline that haven't reached the server yet, and ones the server
 * rejected when they finally arrived (e.g. "camp is full") so nothing fails silently.
 */
// Bottom-LEFT, so it is never hidden under toasts (bottom-right).
export function Outbox() {
  const items = useOutbox();
  const [open, setOpen] = useState(false);
  if (items.length === 0) return null;
  const failed = items.filter((i) => i.state === 'failed').length;

  return (
    <div className="fixed bottom-4 left-4 z-50 w-[min(22rem,calc(100vw-2rem))]">
      {open && (
        <div className="mb-2 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Not sent yet</h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded p-1 text-slate-500 hover:bg-slate-100"
            >
              <X className="size-4" aria-hidden />
              <span className="sr-only">Close</span>
            </button>
          </div>
          <ul className="max-h-72 space-y-2 overflow-y-auto">
            {items.map((item) => (
              <li key={item.id} className="rounded-lg bg-slate-50 p-2 text-sm">
                <div className="font-medium">{item.label}</div>
                <div className="text-xs text-slate-500">
                  {item.state === 'failed'
                    ? 'Rejected'
                    : item.state === 'sending'
                      ? 'Sending…'
                      : 'Waiting for connection'}{' '}
                  · saved {timeAgo(item.queuedAt)}
                </div>
                {item.error && <div className="mt-1 text-xs text-red-700">{item.error}</div>}
                {item.state === 'failed' && (
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => retryOutboxItem(item.id)}>
                      Try again
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => discardOutboxItem(item.id)}>
                      Discard
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={cn(
          'flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-white shadow-lg',
          failed > 0 ? 'bg-red-700' : 'bg-amber-600',
        )}
      >
        <Send className="size-4" aria-hidden />
        {failed > 0 ? `${failed} not sent - check` : `${items.length} waiting to send`}
      </button>
    </div>
  );
}

/**
 * SERVICE WORKER UPDATES: a new deploy installs in the background, but the old version keeps
 * running until the user agrees - reloading in the middle of a check-in would lose their typing.
 */
export function UpdatePrompt() {
  const toast = useToast();
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW();

  useEffect(() => {
    if (!offlineReady) return;
    toast('CrisisLink is ready to work offline');
    setOfflineReady(false);
  }, [offlineReady, setOfflineReady, toast]);

  if (!needRefresh) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md items-center gap-3 rounded-xl bg-slate-900 p-3 text-sm text-white shadow-lg"
    >
      <RefreshCw className="size-4 shrink-0" aria-hidden />
      <span className="flex-1">A new version of CrisisLink is ready.</span>
      <Button size="sm" variant="secondary" onClick={() => void updateServiceWorker(true)}>
        Reload
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="text-white"
        onClick={() => setNeedRefresh(false)}
      >
        Later
      </Button>
    </div>
  );
}
