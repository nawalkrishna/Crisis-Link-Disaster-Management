/**
 * Class-name helpers shared by components. They live in a plain .ts file because React's
 * Fast Refresh (instant updates while editing) only works when a .tsx file exports components.
 */

export const cn = (...classes: (string | false | null | undefined)[]) =>
  classes.filter(Boolean).join(' ');

export const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900';

export type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'emergency';
export type ButtonSize = 'sm' | 'md';

const variants: Record<Variant, string> = {
  primary: 'bg-slate-900 text-white hover:bg-slate-700',
  secondary: 'bg-white text-slate-900 ring-1 ring-inset ring-slate-300 hover:bg-slate-50',
  danger: 'bg-white text-red-700 ring-1 ring-inset ring-red-300 hover:bg-red-50',
  ghost: 'text-slate-700 hover:bg-slate-100',
  emergency: 'bg-red-600 text-white hover:bg-red-700',
};
const sizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
};

export const buttonClass = (variant: Variant = 'primary', size: ButtonSize = 'md') =>
  cn(
    'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors',
    'disabled:cursor-not-allowed disabled:opacity-50',
    focusRing,
    variants[variant],
    sizes[size],
  );
