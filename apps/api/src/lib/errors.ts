import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError, z } from 'zod';
import type { ApiError } from '@crisislink/shared';
import { Prisma } from '../generated/prisma/client';
import { config } from '../config';
import { HttpError } from './http';

function send(res: Parameters<RequestHandler>[1], status: number, error: ApiError['error']) {
  res.status(status).json({ error } satisfies ApiError);
}

export const notFoundHandler: RequestHandler = (req, res) => {
  send(res, 404, { code: 'NOT_FOUND', message: `No route for ${req.method} ${req.path}` });
};

/**
 * One place that turns every kind of error into a consistent JSON response.
 * Express recognises error handlers by their 4 parameters, so `_next` must stay.
 */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  // Our own errors: already know their status.
  if (err instanceof HttpError) {
    return send(res, err.status, { code: err.code, message: err.message });
  }

  // Invalid input -> 400 with a per-field list of problems the UI can show.
  if (err instanceof ZodError) {
    const { formErrors, fieldErrors } = z.flattenError(err);
    const details: Record<string, string[]> = { ...(fieldErrors as Record<string, string[]>) };
    if (formErrors.length) details._ = formErrors;
    return send(res, 400, {
      code: 'VALIDATION_ERROR',
      message: 'Some fields are invalid',
      details,
    });
  }

  // Known database errors -> meaningful HTTP codes instead of a generic 500.
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2025': // record to update/delete/connect was not found
        return send(res, 404, { code: 'NOT_FOUND', message: 'Record not found' });
      case 'P2002': // unique constraint
        return send(res, 409, { code: 'ALREADY_EXISTS', message: 'Record already exists' });
      case 'P2003': // foreign key: referenced row doesn't exist
        return send(res, 400, {
          code: 'INVALID_REFERENCE',
          message: 'Referenced record not found',
        });
    }
  }

  // Malformed JSON / body too large, raised by express.json().
  const status = (err as { status?: number }).status;
  if (status === 400 || status === 413) {
    return send(res, status, {
      code: status === 400 ? 'BAD_JSON' : 'PAYLOAD_TOO_LARGE',
      message: (err as Error).message,
    });
  }

  // Unexpected: log it with the request id so it can be found from the user's report.
  req.log.error({ err }, 'unhandled error');
  // Never leak internals (stack traces, SQL) to clients in production.
  send(res, 500, {
    code: 'INTERNAL_ERROR',
    message: config.nodeEnv === 'production' ? 'Something went wrong' : String(err?.message ?? err),
  });
};
