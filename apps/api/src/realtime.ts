import type { Server as HttpServer } from 'node:http';
import type { Request } from 'express';
import { Server, type Socket } from 'socket.io';
import {
  LIVE_EVENT,
  type ClientToServerEvents,
  type LiveEvent,
  type ServerToClientEvents,
} from '@crisislink/shared';
import { config } from './config';
import { isActive, isStaff } from './auth/policies';
import { SESSION_COOKIE, findSession, loadAuthUser, type AuthUser } from './auth/session';

/**
 * REAL-TIME UPDATES with Socket.IO
 *
 * HTTP is request -> response: the browser only learns about changes when it asks.
 * A WebSocket is a long-lived two-way connection, so the SERVER can push "something changed"
 * the moment it happens. Socket.IO adds reconnection, fallbacks and "rooms" on top.
 *
 * ROOMS decide who hears what. Every connection joins rooms based on who is logged in:
 *   public           everyone, including anonymous visitors (camps, needs, incidents)
 *   members          ACTIVE accounts (volunteer tasks)
 *   staff            ACTIVE admins + coordinators (donation lists, volunteer sign-ups)
 *   user:<id>        all tabs/devices of one user ("your account was approved")
 *   session:<id>     one login, so logging out / revoking it also closes its sockets
 *
 * Events carry no personal data (see packages/shared/src/live.ts), so rooms are mainly
 * about relevance; the REST API still decides what each person may actually read.
 */

interface SocketData {
  user?: AuthUser;
  sessionId?: string;
}
type LiveServer = Server<ClientToServerEvents, ServerToClientEvents, object, SocketData>;
type LiveSocket = Socket<ClientToServerEvents, ServerToClientEvents, object, SocketData>;

let io: LiveServer | undefined;

/** Minimal Cookie header parser: "a=1; cl_session=xyz" -> "xyz". */
function readCookie(header: string | undefined, name: string) {
  for (const part of header?.split(';') ?? []) {
    const [key, ...value] = part.trim().split('=');
    if (key === name) return decodeURIComponent(value.join('='));
  }
  return undefined;
}

function roomsFor(user?: AuthUser) {
  const rooms = ['public'];
  if (isActive(user)) rooms.push('members');
  if (isStaff(user)) rooms.push('staff');
  return rooms;
}
const ROLE_ROOMS = ['members', 'staff'];

export function attachRealtime(server: HttpServer) {
  io = new Server(server, {
    // Socket.IO's `cors` option only covers its HTTP long-polling fallback...
    cors: { origin: config.corsOrigins, credentials: true },
    // ...WebSocket upgrades are NOT protected by CORS at all. Without this check, any website
    // could open a socket with the visitor's cookie ("Cross-Site WebSocket Hijacking").
    allowRequest: (req, callback) => {
      const origin = req.headers.origin;
      callback(null, !origin || config.corsOrigins.includes(origin));
    },
    serveClient: false,
  });

  // Handshake middleware = login check. Runs once per connection, with the same session
  // lookup as HTTP requests. A bad/missing cookie is fine: you're just anonymous.
  io.use(async (socket, next) => {
    try {
      const token = readCookie(socket.handshake.headers.cookie, SESSION_COOKIE);
      const session = token ? await findSession(token) : null;
      if (session) {
        socket.data.user = session.user;
        socket.data.sessionId = session.id;
      }
      next();
    } catch (err) {
      next(err as Error);
    }
  });

  io.on('connection', (socket: LiveSocket) => {
    const { user, sessionId } = socket.data;
    void socket.join(roomsFor(user));
    if (user) void socket.join(`user:${user.id}`);
    if (sessionId) void socket.join(`session:${sessionId}`);
  });

  return io;
}

/** Which rooms an event goes to. */
function audience(event: LiveEvent): string {
  switch (event.type) {
    case 'camp.changed':
    case 'evacuees.changed': // occupancy numbers are public
    case 'needs.changed':
    case 'incident.changed':
      return 'public';
    case 'tasks.changed':
      return 'members';
    case 'donations.changed':
    case 'volunteers.changed':
      return 'staff';
    case 'me.changed':
      throw new Error('Use notifyUser() for me.changed');
  }
}

/**
 * Broadcast change signals. Pass the request that caused them: its `X-Socket-Id` header
 * tells us which connection made the change, and that tab is skipped (it already refreshed
 * its own data after the request succeeded). No-op when sockets aren't running (scripts, tests).
 */
export function publish(origin: Request | undefined, ...events: LiveEvent[]) {
  if (!io) return;
  const except = origin?.get('x-socket-id');
  for (const event of events) {
    const target = io.to(audience(event));
    (except ? target.except(except) : target).emit(LIVE_EVENT, event);
  }
}

/**
 * A user's role, status or camps changed: re-sort their open connections into the right
 * rooms (from fresh database data) and tell their tabs to refetch /auth/me.
 */
export async function notifyUser(userId: string) {
  if (!io) return;
  const user = await loadAuthUser(userId);
  const sockets = await io.in(`user:${userId}`).fetchSockets();
  for (const socket of sockets) {
    socket.data.user = user ?? undefined;
    for (const room of ROLE_ROOMS) socket.leave(room);
    socket.join(roomsFor(user ?? undefined));
  }
  io.to(`user:${userId}`).emit(LIVE_EVENT, { type: 'me.changed' });
}

/** Sessions were deleted (logout, suspension, password change): close their sockets. */
export function disconnectSessions(sessionIds: string[]) {
  if (!io || sessionIds.length === 0) return;
  io.in(sessionIds.map((id) => `session:${id}`)).disconnectSockets(true);
}

export function closeRealtime() {
  return new Promise<void>((resolve) => (io ? io.close(() => resolve()) : resolve()));
}
