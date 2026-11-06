/**
 * A small, dependency-free UI kit. Every page uses these, so spacing, colours and
 * accessibility behaviour (labels, focus rings, error announcements) are consistent.
 */
import {
  useId,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { Link } from 'react-router';
import { AlertTriangle, Inbox, Loader2 } from 'lucide-react';
import type { Tone } from '../lib/format';
import { buttonClass, cn, focusRing, type ButtonSize, type Variant } from './styles';

// ---------- Buttons ----------

export function Button({
  variant,
  size,
  loading,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: ButtonSize;
  loading?: boolean;
}) {
  return (
    <button
      type="button"
      {...props}
      disabled={props.disabled || loading}
      aria-busy={loading || undefined}
      className={cn(buttonClass(variant, size), className)}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function ButtonLink({
  to,
  variant,
  size,
  className,
  children,
}: {
  to: string;
  variant?: Variant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link to={to} className={cn(buttonClass(variant, size), className)}>
      {children}
    </Link>
  );
}

// ---------- Form fields ----------

/**
 * Label + control + hint + error, wired together with ids so screen readers announce
 * the label, the hint and the error when the field is focused.
 */
export function Field({
  label,
  error,
  hint,
  required,
  children,
  className,
}: {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: (props: {
    id: string;
    'aria-invalid'?: boolean;
    'aria-describedby'?: string;
  }) => ReactNode;
  className?: string;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(' ') || undefined;
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium text-slate-800">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </label>
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy })}
      {hint && !error && (
        <p id={hintId} className="text-xs text-slate-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

const controlClass = cn(
  'w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm',
  'placeholder:text-slate-400 aria-[invalid=true]:border-red-500',
  'focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900',
  'disabled:bg-slate-100',
);

export const Input = (props: InputHTMLAttributes<HTMLInputElement>) => (
  <input {...props} className={cn(controlClass, 'h-10', props.className)} />
);
export const Select = (props: SelectHTMLAttributes<HTMLSelectElement>) => (
  <select {...props} className={cn(controlClass, 'h-10 pr-8', props.className)} />
);
export const Textarea = (props: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea {...props} className={cn(controlClass, 'min-h-24 py-2', props.className)} />
);

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-200"
    >
      {message}
    </div>
  );
}

// ---------- Display ----------

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('rounded-xl border border-slate-200 bg-white p-5 shadow-sm', className)}>
      {children}
    </div>
  );
}

const tones: Record<Tone, string> = {
  neutral: 'bg-slate-100 text-slate-700 ring-slate-200',
  info: 'bg-sky-50 text-sky-800 ring-sky-200',
  success: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  warning: 'bg-amber-50 text-amber-900 ring-amber-200',
  danger: 'bg-red-50 text-red-800 ring-red-200',
};

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

export function ProgressBar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const color = pct >= 100 ? 'bg-red-600' : pct >= 85 ? 'bg-amber-500' : 'bg-emerald-600';
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className="h-2 w-full overflow-hidden rounded-full bg-slate-100"
    >
      <div
        className={cn('h-full rounded-full transition-all', color)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  back,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  back?: { to: string; label: string };
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {back && (
          <Link
            to={back.to}
            className="mb-1 inline-block text-sm text-slate-500 hover:text-slate-900"
          >
            ← {back.label}
          </Link>
        )}
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
        {description && <div className="mt-1 text-slate-600">{description}</div>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-2 py-10 text-slate-500">
      <Loader2 className="size-5 animate-spin" aria-hidden />
      <span className="text-sm">{label}…</span>
    </div>
  );
}

export const PageLoader = () => (
  <div className="py-24">
    <Spinner />
  </div>
);

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-300 px-6 py-10 text-center">
      <Inbox className="size-8 text-slate-400" aria-hidden />
      <p className="mt-2 font-medium text-slate-700">{title}</p>
      {children && <div className="mt-1 text-sm text-slate-500">{children}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center rounded-xl bg-red-50 px-6 py-8 text-center ring-1 ring-red-200"
    >
      <AlertTriangle className="size-7 text-red-600" aria-hidden />
      <p className="mt-2 font-medium text-red-900">Couldn’t load this</p>
      <p className="mt-1 text-sm text-red-800">
        {error instanceof Error ? error.message : 'Something went wrong'}
      </p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function Pagination({
  total,
  limit,
  offset,
  onChange,
}: {
  total: number;
  limit: number;
  offset: number;
  onChange: (offset: number) => void;
}) {
  if (total <= limit) return null;
  const page = Math.floor(offset / limit) + 1;
  const pages = Math.ceil(total / limit);
  return (
    <nav aria-label="Pagination" className="mt-4 flex items-center justify-between text-sm">
      <span className="text-slate-600">
        Page {page} of {pages} · {total} total
      </span>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={page <= 1}
          onClick={() => onChange(offset - limit)}
        >
          Previous
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={page >= pages}
          onClick={() => onChange(offset + limit)}
        >
          Next
        </Button>
      </div>
    </nav>
  );
}

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
}: {
  tabs: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="mb-5 flex gap-1 overflow-x-auto shadow-[inset_0_-1px_0_var(--color-slate-200)]"
    >
      {tabs.map((tab) => (
        <button
          key={tab.value}
          role="tab"
          type="button"
          aria-selected={tab.value === value}
          onClick={() => onChange(tab.value)}
          className={cn(
            'whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium',
            focusRing,
            tab.value === value
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-800',
          )}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 text-xs text-slate-600">
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
