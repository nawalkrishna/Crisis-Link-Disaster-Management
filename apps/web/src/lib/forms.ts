import { zodResolver } from '@hookform/resolvers/zod';
import {
  useForm,
  type DefaultValues,
  type FieldValues,
  type Path,
  type UseFormSetError,
} from 'react-hook-form';
import type { z } from 'zod';
import { ApiError } from './api';

/**
 * react-hook-form + the SAME Zod schema the API uses (from @crisislink/shared).
 * The browser shows mistakes instantly; the server still validates independently.
 * Input type (what the form holds) and output type (what we submit) can differ,
 * e.g. defaults applied or strings trimmed.
 */
export function useZodForm<Output extends FieldValues, Input extends FieldValues>(
  schema: z.ZodType<Output, Input>,
  defaultValues?: DefaultValues<Input>,
) {
  return useForm<Input, unknown, Output>({
    resolver: zodResolver<Input, unknown, Output>(schema),
    defaultValues,
    mode: 'onTouched', // validate a field after the user leaves it, not on every keystroke
  });
}

/**
 * Put the server's per-field validation messages next to the matching inputs.
 * Returns the general message if the error isn't field-specific.
 */
export function applyServerErrors<T extends FieldValues>(
  err: unknown,
  setError: UseFormSetError<T>,
): string | null {
  if (err instanceof ApiError && err.details) {
    let placed = false;
    for (const [field, messages] of Object.entries(err.details)) {
      if (field !== '_' && messages[0]) {
        setError(field as Path<T>, { type: 'server', message: messages[0] });
        placed = true;
      }
    }
    if (placed) return null;
  }
  return err instanceof Error ? err.message : 'Something went wrong';
}

/** For optional inputs: an empty box means "not provided", not "empty string". */
export const emptyToUndefined = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

/** Number inputs give strings; empty -> undefined, otherwise a number (NaN fails validation). */
export const toOptionalNumber = (value: unknown) =>
  value === '' || value === null || value === undefined ? undefined : Number(value);
