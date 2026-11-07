import { QueryClient, onlineManager, type Mutation, type Query } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { del, get, set } from 'idb-keyval';
import { ApiError } from './api';

/**
 * TanStack Query manages SERVER STATE: data that lives in the database and that we only
 * keep a cached copy of. It deduplicates requests, caches results, refetches stale data
 * when the window regains focus, and tracks loading/error states for us.
 * (UI state like "is this menu open" stays in plain useState.)
 */

/** How long saved data may be shown offline. Old information beats no information in a disaster. */
export const OFFLINE_MAX_AGE = 3 * 24 * 60 * 60 * 1000;

// TanStack's online manager assumes "online" at start-up and only reacts to later
// online/offline events. If the app is OPENED with no signal, tell it so - otherwise writes
// are attempted (and fail) instead of being queued.
onlineManager.setOnline(navigator.onLine);

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // data younger than 30 s is served from cache without refetching
      // Keep unused data in memory as long as it may be persisted (default is only 5 minutes).
      gcTime: OFFLINE_MAX_AGE,
      retry: (failureCount, error) => {
        // Retrying a 4xx won't help (bad input, not allowed, not found) - only retry network/5xx.
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
        return failureCount < 2;
      },
    },
  },
});

/**
 * PERSISTENCE: the query cache is saved to IndexedDB (a database inside the browser, much
 * larger than localStorage and asynchronous) and restored on the next visit - so a reload
 * with no signal still shows camps, needs and incidents.
 */
export const persister = createAsyncStoragePersister({
  storage: { getItem: get, setItem: set, removeItem: del },
  key: 'crisislink-cache',
  throttleTime: 1000,
});

/**
 * Only PUBLIC data is written to disk. Evacuee lists, donor phone numbers and user lists stay in
 * memory only: a phone can be shared or lost, and logging out must leave nothing behind.
 */
const PUBLIC_ROOTS = new Set([
  'stats',
  'districts',
  'camps',
  'needs',
  'incidents',
  'map',
  'health',
]);
/** Staff see incident reporters' names and phones in the same lists: those copies stay in memory. */
const hasPersonalFields = (data: unknown) =>
  JSON.stringify(data ?? null).includes('"reporterPhone"');

export const shouldPersistQuery = (query: Query) =>
  query.state.status === 'success' &&
  PUBLIC_ROOTS.has(String(query.queryKey[0])) &&
  !hasPersonalFields(query.state.data);

/** Writes waiting for a connection ARE saved, so a reload or closed tab doesn't lose them. */
const shouldPersistMutation = (mutation: Mutation) => mutation.state.isPaused;

export const persistOptions = {
  persister,
  maxAge: OFFLINE_MAX_AGE,
  // A new app version may change response shapes: start with a fresh cache.
  buster: __APP_VERSION__,
  dehydrateOptions: {
    shouldDehydrateQuery: shouldPersistQuery,
    shouldDehydrateMutation: shouldPersistMutation,
  },
};
