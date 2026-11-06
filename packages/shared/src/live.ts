import type { Priority } from './enums';

/**
 * REAL-TIME EVENTS (Socket.IO)
 *
 * Events are SIGNALS, not data: "camp X changed", never "here is camp X".
 * The browser reacts by refetching through the normal REST API, so
 *  - every permission rule still lives in one place (the HTTP routes) - a signal can't
 *    leak an evacuee's phone number because it doesn't carry one;
 *  - a client that missed events (laptop asleep, train tunnel) just refetches on reconnect
 *    and is correct again - no need to replay a history of changes.
 * The trade-off is one extra HTTP request per change, which is cheap at our scale.
 */
export type LiveEvent =
  | { type: 'camp.changed'; campId: string }
  | { type: 'evacuees.changed'; campId: string }
  | { type: 'needs.changed'; campId: string }
  | { type: 'donations.changed'; campId: string | null }
  | {
      type: 'incident.changed';
      incidentId: string;
      /** Present when a new report arrives, so staff can be alerted. */
      created?: { severity: Priority; district: string; locationText: string };
    }
  | { type: 'tasks.changed'; campId: string | null }
  | { type: 'volunteers.changed' }
  /** Your own account changed (approved, role, camps): refetch /auth/me. */
  | { type: 'me.changed' };

/** The single Socket.IO event name everything travels on. */
export const LIVE_EVENT = 'live';

/** Typed Socket.IO maps: the compiler checks both server and client use the same names. */
export interface ServerToClientEvents {
  live: (event: LiveEvent) => void;
}
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ClientToServerEvents {}
