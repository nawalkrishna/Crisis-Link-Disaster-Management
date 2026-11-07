import { useSyncExternalStore } from 'react';
import { onlineManager, useMutationState, type MutationState } from '@tanstack/react-query';
import type {
  CreateEvacueeInput,
  CreateIncidentInput,
  Evacuee,
  Incident,
} from '@crisislink/shared';
import { api, ApiError } from './api';
import { queryClient } from './query-client';

/**
 * OFFLINE WRITES ("outbox")
 *
 * TanStack Query PAUSES a mutation when the browser is offline and RESUMES it when the
 * connection comes back. Paused mutations are saved to IndexedDB with the rest of the cache,
 * so they even survive closing the app. Two things make that work:
 *
 *  1. MUTATION DEFAULTS: after a reload, a restored mutation is only data (its key and
 *     variables). The function that sends it must be found again by its key - so it is
 *     registered here, globally, instead of inside a component.
 *  2. IDEMPOTENCY KEYS: each action gets a random id when the user presses the button, sent
 *     as the `Idempotency-Key` header on every attempt. If a send "fails" after the server had
 *     already saved it, the retry gets the original answer instead of creating a duplicate.
 *
 * Only actions that make sense offline are queueable: reporting an incident (no signal is
 * common at the scene) and checking people into a camp (often in places with bad coverage).
 */

export interface Queued<T> {
  input: T;
  idempotencyKey: string;
  /** When the person pressed the button (shown in the outbox). */
  queuedAt: string;
}
export const queueable = <T>(input: T): Queued<T> => ({
  input,
  idempotencyKey: crypto.randomUUID(),
  queuedAt: new Date().toISOString(),
});

export type ReportIncidentVars = Queued<CreateIncidentInput>;
export type CheckInVars = Queued<CreateEvacueeInput & { campId: string }>;

export const offlineKeys = {
  all: ['offline'] as const,
  reportIncident: ['offline', 'reportIncident'] as const,
  checkIn: ['offline', 'checkIn'] as const,
};

/** Keep retrying while the problem is the network or the server, not the request itself. */
const retryTransient = (failureCount: number, error: unknown) =>
  error instanceof ApiError && (error.status === 0 || error.status >= 500) && failureCount < 8;
const retryDelay = (attempt: number) => Math.min(30_000, 1000 * 2 ** attempt);

const refresh = (...roots: string[]) =>
  Promise.all(roots.map((root) => queryClient.invalidateQueries({ queryKey: [root] })));

queryClient.setMutationDefaults(offlineKeys.reportIncident, {
  mutationFn: ({ input, idempotencyKey }: ReportIncidentVars) =>
    api<Incident>('/incidents', {
      method: 'POST',
      body: input,
      headers: { 'idempotency-key': idempotencyKey },
    }),
  onSuccess: () => refresh('incidents', 'stats', 'districts', 'map'),
  retry: retryTransient,
  retryDelay,
});

queryClient.setMutationDefaults(offlineKeys.checkIn, {
  mutationFn: ({ input: { campId, ...person }, idempotencyKey }: CheckInVars) =>
    api<Evacuee>(`/camps/${campId}/evacuees`, {
      method: 'POST',
      body: person,
      headers: { 'idempotency-key': idempotencyKey },
    }),
  onSuccess: () => refresh('evacuees', 'camps', 'stats', 'districts', 'map'),
  retry: retryTransient,
  retryDelay,
});

// ---------- Hooks for the UI ----------

/** Is the browser online? (navigator.onLine via TanStack's onlineManager.) */
export const useOnline = () =>
  useSyncExternalStore(
    (cb) => onlineManager.subscribe(cb),
    () => onlineManager.isOnline(),
  );

export interface OutboxItem {
  id: number;
  kind: 'reportIncident' | 'checkIn';
  label: string;
  queuedAt: string;
  state: 'waiting' | 'sending' | 'failed';
  error: string | null;
}

function describe(kind: OutboxItem['kind'], vars: unknown) {
  if (kind === 'checkIn') return `Check in ${(vars as CheckInVars).input.fullName}`;
  return `Incident report: ${(vars as ReportIncidentVars).input.locationText}`;
}

/** Everything queued or failed that hasn't reached the server yet. */
export function useOutbox(): OutboxItem[] {
  return useMutationState({
    filters: { mutationKey: offlineKeys.all, predicate: (m) => m.state.status !== 'success' },
    select: (m) => {
      const state = m.state as MutationState<unknown, Error, Queued<unknown>>;
      const kind = m.options.mutationKey?.[1] as OutboxItem['kind'];
      return {
        id: m.mutationId,
        kind,
        label: describe(kind, state.variables),
        queuedAt: state.variables?.queuedAt ?? new Date(state.submittedAt).toISOString(),
        state: state.status === 'error' ? 'failed' : state.isPaused ? 'waiting' : 'sending',
        error: state.error?.message ?? null,
      } satisfies OutboxItem;
    },
  });
}

const findMutation = (id: number) =>
  queryClient
    .getMutationCache()
    .getAll()
    .find((m) => m.mutationId === id);

/** Give up on a failed item (e.g. the camp filled up meanwhile). */
export function discardOutboxItem(id: number) {
  const mutation = findMutation(id);
  if (mutation) queryClient.getMutationCache().remove(mutation);
}

/** Try a failed item again - same variables, so the same idempotency key. */
export function retryOutboxItem(id: number) {
  const mutation = findMutation(id);
  if (!mutation || mutation.state.variables === undefined) return;
  const variables = mutation.state.variables;
  queryClient.getMutationCache().remove(mutation);
  const fresh = queryClient
    .getMutationCache()
    .build(queryClient, { mutationKey: mutation.options.mutationKey });
  void fresh.execute(variables).catch(() => {}); // a new failure shows up in the outbox again
}

/** Number of writes not yet sent - used to warn before logging out. */
export const pendingOutboxCount = () =>
  queryClient
    .getMutationCache()
    .findAll({ mutationKey: offlineKeys.all })
    .filter((m) => m.state.status !== 'success').length;
