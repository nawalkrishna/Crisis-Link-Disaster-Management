import { useCallback, useState, type ReactNode } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { cn } from './styles';
import { ToastContext, type ToastFn } from './toast-context';

/**
 * Short confirmations ("Donation recorded") shown bottom-right.
 * React CONTEXT lets any component call useToast() without passing props down.
 * `aria-live="polite"` makes screen readers announce new messages.
 */
type Toast = { id: number; kind: 'success' | 'error'; message: string };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback<ToastFn>((message, kind = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, kind, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-end gap-2 sm:left-auto"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex max-w-sm items-start gap-2 rounded-lg px-4 py-3 text-sm shadow-lg ring-1',
              t.kind === 'success'
                ? 'bg-white text-slate-900 ring-slate-200'
                : 'bg-red-50 text-red-900 ring-red-200',
            )}
          >
            {t.kind === 'success' ? (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden />
            ) : (
              <XCircle className="mt-0.5 size-4 shrink-0 text-red-600" aria-hidden />
            )}
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
