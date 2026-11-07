import type { ApiError as ApiErrorBody } from '@crisislink/shared';

/**
 * One small, typed wrapper around fetch for every API call.
 *  - `credentials: 'include'` sends the httpOnly session cookie (the browser handles it;
 *    our JavaScript never sees the token).
 *  - Non-2xx responses become an `ApiError` carrying the server's error code and
 *    per-field details, so forms can show messages next to the right input.
 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type QueryValue = string | number | boolean | undefined | null;

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Record<string, QueryValue>;
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

/** In production the API may live on another origin: set VITE_API_URL at build time. */
export const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '';

/**
 * Other modules can add headers to every request (live.ts adds X-Socket-Id). Registering a
 * function instead of importing live.ts here avoids an import cycle (live.ts imports api.ts).
 */
let extraHeaders: () => Record<string, string> = () => ({});
export function setExtraHeaders(fn: () => Record<string, string>) {
  extraHeaders = fn;
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, signal, headers } = options;

  const url = new URL(`${API_BASE}/api${path}`, window.location.origin);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '')
      url.searchParams.set(key, String(value));
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      credentials: 'include',
      headers: {
        ...(body !== undefined && { 'content-type': 'application/json' }),
        ...(method !== 'GET' && extraHeaders()), // only writes need it; keeps GETs preflight-free
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err;
    throw new ApiError(0, 'NETWORK_ERROR', 'Cannot reach the server. Check your connection.');
  }

  if (response.status === 204) return undefined as T;
  const data: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const error = (data as ApiErrorBody | null)?.error;
    throw new ApiError(
      response.status,
      error?.code ?? 'HTTP_ERROR',
      error?.message ?? `Request failed (${response.status})`,
      error?.details,
    );
  }
  return data as T;
}

export const isApiError = (err: unknown, status?: number): err is ApiError =>
  err instanceof ApiError && (status === undefined || err.status === status);

/** A message that is safe to show to users for any thrown value. */
export const errorMessage = (err: unknown) =>
  err instanceof Error ? err.message : 'Something went wrong';
