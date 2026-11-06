import type { ZodType, z } from 'zod';

/**
 * An error that maps directly to an HTTP response.
 * Throw it anywhere in a route; the central error handler turns it into JSON.
 * (Express 5 forwards errors from async handlers automatically - no try/catch needed.)
 */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export const notFound = (what: string) => new HttpError(404, 'NOT_FOUND', `${what} not found`);
export const conflict = (code: string, message: string) => new HttpError(409, code, message);

/**
 * Validate untrusted input (req.body / req.query / req.params) against a Zod schema.
 * Returns the parsed, typed and cleaned value, or throws a ZodError -> 400.
 */
export function parse<S extends ZodType>(schema: S, input: unknown): z.output<S> {
  return schema.parse(input);
}
