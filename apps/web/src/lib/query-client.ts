import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './api';

/**
 * TanStack Query manages SERVER STATE: data that lives in the database and that we only
 * keep a cached copy of. It deduplicates requests, caches results, refetches stale data
 * when the window regains focus, and tracks loading/error states for us.
 * (UI state like "is this menu open" stays in plain useState.)
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // data younger than 30 s is served from cache without refetching
      retry: (failureCount, error) => {
        // Retrying a 4xx won't help (bad input, not allowed, not found) - only retry network/5xx.
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
        return failureCount < 2;
      },
    },
  },
});
