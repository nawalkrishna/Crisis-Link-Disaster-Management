import { createContext, useContext } from 'react';

export type ToastFn = (message: string, kind?: 'success' | 'error') => void;

export const ToastContext = createContext<ToastFn | null>(null);

export function useToast(): ToastFn {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
