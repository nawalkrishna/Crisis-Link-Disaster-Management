# CrisisLink

A disaster-relief coordination platform for Kerala: relief camps, evacuees, volunteers, camp needs
and donations. Originally a 2024 BTech mini project, now being rebuilt phase by phase.

## Quick start

Requires **Node.js 22.12+** (see `.nvmrc`) and **PostgreSQL 15+**.

1. Create a database user and database (once), in `psql -U postgres`:

   ```sql
   CREATE ROLE crisislink LOGIN PASSWORD 'pick-a-password' CREATEDB;
   CREATE DATABASE crisislink OWNER crisislink;
   ```

   `CREATEDB` lets Prisma create a temporary "shadow" database when it generates migrations.

2. Configure and start:

   ```bash
   cp apps/api/.env.example apps/api/.env   # then put your password in DATABASE_URL
   npm install        # installs every workspace and generates the Prisma client
   npm run db:migrate # creates the tables
   npm run db:seed    # districts + sample camps, needs, incidents, tasks and users
   npm run dev        # API on http://localhost:4000, web on http://localhost:5173
   ```

Open http://localhost:5173. The footer should say **Live**.

### Trying the offline app and SMS alerts

- **Offline / installable app**: the service worker is only active in the production build.
  Run `npm run build -w @crisislink/web` then `npm run preview -w @crisislink/web` and open
  http://localhost:4173 (the API must be running). Visit once, then in DevTools → Network choose
  "Offline" and reload: the app still opens, shows the last data it saw, and queues incident
  reports and camp check-ins until you go back online. Chrome offers "Install app" in the address
  bar.
- **SMS alerts**: with `SMS_PROVIDER=console` (the default) no real SMS is sent; messages are
  printed in the API terminal. Sign up at `/alerts`, copy the 6-digit code from the terminal, then
  verify a HIGH or CRITICAL incident in that district as staff and watch the alert appear. Admins
  can follow every message at `/admin/sms`. For real SMS set `SMS_PROVIDER=twilio` and the
  `TWILIO_*` variables (see `apps/api/.env.example`).

### What each role can do in the web app

| Who         | Pages                                                                                                                          |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Anyone      | Dashboard, districts, camps, needs (`/needs`), pledge a donation, incidents, report one, SMS alerts (`/alerts`)                |
| Volunteer   | Sign up (`/register`), task board (`/tasks`: available + mine), account                                                        |
| Coordinator | `/manage`: their camps → people check-in/out, needs, incoming donations, tasks, settings; approve volunteers; verify incidents |
| Admin       | Everything above for all camps, plus `/admin/users` (roles, suspension, camp assignment), opening new camps, `/admin/sms`      |

**Sample accounts** (development only): when `DEV_SEED_PASSWORD` is set in `apps/api/.env`,
the seed creates `admin@`, `coordinator@`, `volunteer@` and `pending@crisislink.test`, all with
that password. The coordinator manages the Meppadi camp.

**First real admin** (any environment): register through `POST /api/auth/register`, then on the
server run `npm run make-admin -- you@example.com`.

## Scripts (run from the repo root)

| Command                              | What it does                                              |
| ------------------------------------ | --------------------------------------------------------- |
| `npm run dev`                        | Runs API and web together (`concurrently`)                |
| `npm run build`                      | Production build of every workspace                       |
| `npm run typecheck`                  | `tsc` type-check of every workspace                       |
| `npm run lint`                       | ESLint across the whole repo (`lint:fix` to auto-fix)     |
| `npm run format`                     | Prettier formats every file (`format:check` only reports) |
| `npm run check`                      | format check + lint + typecheck — run before committing   |
| `npm run db:migrate`                 | Create a migration from schema changes and apply it       |
| `npm run db:seed`                    | Insert districts and (in development) sample data         |
| `npm run db:reset`                   | Drop everything, re-run all migrations (dev only!)        |
| `npm run db:studio`                  | Prisma Studio: browse and edit data in the browser        |
| `npm run make-admin -- <email>`      | Promote a registered user to an active admin              |
| `npm run dev -w @crisislink/api`     | Run a script in just one workspace                        |
| `npm run preview -w @crisislink/web` | Serve the production build (with service worker) on :4173 |

## API

All endpoints are under `/api`. Lists accept `limit` and `offset` and return
`{ items, total, limit, offset }`. Errors always look like
`{ "error": { "code": "...", "message": "...", "details": { "field": ["problem"] } } }`.
Request bodies must be JSON. Logging in sets an httpOnly `cl_session` cookie.

**Who** column: _public_ = no login, _user_ = any logged-in user, _staff_ = active admin or
coordinator, _camp staff_ = admin or a coordinator of that camp, _admin_ = active admin.

| Method & path                                                | Who              | Purpose                                                 |
| ------------------------------------------------------------ | ---------------- | ------------------------------------------------------- |
| `GET /health`                                                | public           | API + database status                                   |
| `GET /stats`                                                 | public           | Dashboard numbers (camps, evacuees, needs, incidents)   |
| `GET /districts`, `/districts/:slug`                         | public           | Per-district camp, evacuee and incident counts          |
| `POST /auth/register`                                        | public           | Volunteer sign-up (starts PENDING)                      |
| `POST /auth/login`, `/auth/logout`                           | public           | Start / end a session (failed logins are rate-limited)  |
| `GET, PATCH /auth/me`                                        | user             | Own account and volunteer profile                       |
| `POST /auth/change-password`                                 | user             | Also logs out all other devices                         |
| `GET /users`, `PATCH /users/:id`                             | admin            | List accounts / approve, suspend, change role           |
| `PUT /users/:id/camps`                                       | admin            | Set which camps a coordinator manages                   |
| `GET /volunteers`                                            | staff            | Active volunteers (`district`, `skill`, `available`)    |
| `POST /volunteers/:id/approve`                               | staff            | Approve a pending volunteer                             |
| `GET /camps`, `/camps/:id`                                   | public           | Camps with live occupancy                               |
| `GET /camps/nearby?lat=&lng=`                                | public           | Closest camps with space (`radiusKm`, `hasSpace`)       |
| `GET /map`                                                   | public           | Camp + active incident markers (`district` filter)      |
| `POST /camps`                                                | admin            | Open a camp                                             |
| `PATCH /camps/:id`                                           | camp staff       | Update a camp                                           |
| `GET, POST /camps/:id/evacuees`                              | camp staff       | People in a camp / check someone in (capacity enforced) |
| `PATCH /evacuees/:id`                                        | camp staff       | Update details or `{ "checkedOut": true }`              |
| `GET /needs`, `/camps/:id/needs`                             | public           | Open needs, most urgent first                           |
| `POST /camps/:id/needs`, `PATCH /needs/:id`                  | camp staff       | Add / update a need                                     |
| `POST /donations`                                            | public           | Pledge a donation (optionally for a `needId`)           |
| `GET /donations`                                             | staff            | Coordinators see only their camps' donations            |
| `PATCH /donations/:id`                                       | camp staff       | `{ "status": "RECEIVED" }` updates the need's total     |
| `GET /incidents`, `/incidents/:id`                           | public           | Reporter name/phone only shown to staff                 |
| `POST /incidents`                                            | public           | Report an incident (rate-limited)                       |
| `PATCH /incidents/:id`                                       | staff            | Verify, resolve or dismiss                              |
| `GET /tasks`                                                 | user             | Volunteers: open + own tasks; staff: all (`mine=true`)  |
| `POST /tasks`                                                | staff            | Coordinators for their camps; admins also field tasks   |
| `POST /tasks/:id/claim`                                      | volunteer        | Active volunteer takes an open task (skill checked)     |
| `PATCH /tasks/:id`                                           | assignee / staff | Move through the task state machine, edit, assign       |
| `POST /alerts/subscribe`                                     | public           | Phone + district → texts a 6-digit code (rate-limited)  |
| `POST /alerts/verify`                                        | public           | Confirm the code → alerts on                            |
| `GET /alerts/subscription/:code`, `POST /alerts/unsubscribe` | public           | "Stop alerts" link in every SMS                         |
| `GET /admin/sms`, `/admin/alerts/stats`                      | admin            | SMS outbox log, subscribers per district                |

`POST /incidents`, `POST /donations` and `POST /camps/:id/evacuees` accept an optional
`Idempotency-Key: <uuid>` header: repeating a request with the same key returns the first
response (header `Idempotent-Replayed: true`) instead of creating a duplicate. Verifying a
HIGH/CRITICAL incident (`PATCH /incidents/:id`) queues SMS alerts; the response includes
`alertsQueued`.

### Live updates (Socket.IO)

The API also accepts Socket.IO connections at `/socket.io/` on the same port. The server sends a
single event, `live`, carrying a small signal such as `{ "type": "needs.changed", "campId": "…" }`
(all types are in `packages/shared/src/live.ts`). Signals carry ids only, never personal data;
clients refetch through the REST API above, which applies the usual permissions. Who receives
what: everyone gets camp, need and incident changes; active accounts also get task changes;
staff also get donation and volunteer changes; each user gets `me.changed` when an admin changes
their account.

## Project layout

```
crisislink/
├── apps/
│   ├── api/          Express 5 + TypeScript REST API (dev: node --watch + tsx, build: tsup)
│   │   ├── prisma/       schema.prisma, migrations/, seed.ts
│   │   └── src/          app.ts, realtime.ts (Socket.IO), routes/, auth/ (sessions,
│   │                     policies), sms/ (provider, outbox worker), lib/, scripts/, db.ts
│   └── web/          React 19 + Vite + Tailwind CSS v4
│       └── src/          router.tsx, lib/ (api client, queries, auth, forms, socket, live,
│                         offline outbox, persisted cache),
│                         components/ (UI kit, layout, domain cards, map/), pages/ (public,
│                         auth, volunteer, manage, admin)
├── packages/
│   └── shared/       Types & constants imported by BOTH api and web
├── tsconfig.base.json   strict TypeScript settings every workspace extends
├── eslint.config.js     one lint config for the whole repo
└── package.json         npm workspaces + root scripts
```

## Concepts introduced in Phase 0

- **Monorepo with npm workspaces** — several packages in one repo, one `npm install`, one lockfile.
  `@crisislink/shared` is symlinked into `node_modules`, so `import { DISTRICTS } from
'@crisislink/shared'` works in both apps.
- **Shared types as a contract** — `HealthResponse` is defined once. If the API changes a field,
  the web app stops compiling instead of breaking at runtime.
- **Strict TypeScript** — `strict`, `noUncheckedIndexedAccess` etc. `tsc` only _checks_ types;
  Vite (web) and tsup/esbuild (api) produce the JavaScript.
- **Data-driven UI** — the 14 districts are one array, replacing ~40 copy-pasted district
  components from the 2024 version.
- **Dev proxy** — the browser calls `/api/...` on Vite, which forwards to the API, so local
  development has no CORS issues.
- **App vs server split** — `createApp()` builds Express without listening, so tests can use it.
- **12-factor config** — settings come from environment variables (`apps/api/.env.example`).
- **Security defaults** — `helmet` headers, CORS allow-list, JSON body size limit, no error
  details leaked in production.
- **Consistent code** — Prettier formats, ESLint finds bugs, EditorConfig + `.gitattributes` keep
  line endings LF on Windows too.

## Concepts introduced in Phase 1

- **Relational data model** — tables linked by foreign keys (`ReliefCamp.districtId` →
  `District.id`), so the database itself refuses a camp in a district that doesn't exist.
  Replaces the 2024 approach of one Firestore collection per district keyed by person name.
- **ORM + migrations** — Prisma turns `schema.prisma` into SQL migration files
  (`prisma/migrations/`) that are committed to git, so every database (yours, CI, production) is
  built the same way, step by step.
- **Indexes** — `@@index([districtId])` etc. keep filtered lists fast as data grows.
- **Validation at the boundary** — every request body / query / param goes through a Zod schema
  (`packages/shared/src/schemas.ts`). Bad input gets a 400 with per-field messages.
- **Single source of truth for enums** — shared enums are checked against Prisma's at compile
  time (`apps/api/src/lib/enum-guard.ts`).
- **Transactions** — receiving a donation updates the donation _and_ the need's total
  atomically: both happen or neither does.
- **Race conditions & locking** — checking someone into a camp locks the camp row
  (`SELECT ... FOR UPDATE`) so simultaneous check-ins can't overfill it; conditional updates
  (`WHERE status = 'PLEDGED'`) stop a donation being counted twice.
- **Avoiding N+1 queries** — filtered relation counts (`_count`) and one SQL query with
  sub-queries for district summaries, instead of a query per row.
- **Pagination** — `limit`/`offset` with the page and total count fetched together.
- **Central error handling** — Zod, Prisma and HTTP errors become consistent JSON in one place;
  Express 5 forwards errors from `async` routes automatically.
- **Fail-fast config** — environment variables are validated at startup.
- **Idempotent seeding** — `upsert` makes the seed safe to run repeatedly.

## Concepts introduced in Phase 2

- **Authentication vs authorisation** — login proves _who_ you are; `apps/api/src/auth/policies.ts`
  decides _what_ you may do, all in one reviewable file.
- **Password hashing** — argon2id (slow, salted, memory-hard). The 2024 version stored plain-text
  passwords in Firestore and compared them in the browser; now the raw password never touches the
  database.
- **Server-side sessions over JWT** — a random 256-bit token in an httpOnly cookie, stored only as
  a SHA-256 hash. Logout, suspension and password changes take effect instantly by deleting rows.
- **Cookie security** — `HttpOnly` (no JavaScript access → XSS can't steal it), `SameSite=Lax`,
  `Secure` in production, sliding expiry.
- **CSRF defence in depth** — SameSite cookie + `Origin` allow-list + JSON-only bodies.
- **RBAC + resource-based access** — roles (admin / coordinator / volunteer) _and_ ownership
  ("coordinators manage only their assigned camps").
- **Least privilege & data minimisation** — evacuee records, donor phones and incident reporter
  details are visible only to staff who need them; responses use explicit field allow-lists
  (`select`) so the password hash can never leak.
- **No account enumeration** — identical error and similar timing for "no such email" and
  "wrong password".
- **Rate limiting** — failed logins, sign-ups and public submissions are throttled per IP.
- **Session fixation** — a fresh token is issued at every login.
- **State machines** — task status transitions are declared as data and enforced on the server.
- **Optimistic concurrency** — `UPDATE ... WHERE status = <what we read>` makes simultaneous
  claims or edits fail cleanly with 409 instead of silently overwriting each other.
- **Declaration merging** — `req.user` is added to Express's `Request` type.
- **Bootstrap problem** — the first admin is created with a server-side script, not an API.

## Concepts introduced in Phase 3

- **Client-side routing** — React Router: the page changes without a full reload; URLs like
  `/camps/:id` map to components. **Pathless layout routes** wrap groups of pages in a guard.
- **Code splitting** — every page is `lazy`-loaded, so the public dashboard doesn't download the
  admin panel. Check `npm run build`: one small JS file per page.
- **Server state vs UI state** — TanStack Query owns data from the API (caching, deduplication,
  background refetch, loading/error states); `useState` is only for UI (an open menu).
- **Query keys & invalidation** — `lib/queries.ts` defines hierarchical keys; after a mutation we
  invalidate e.g. `['needs']`, and every list or count showing needs refreshes itself.
- **Auth state as server state** — "who am I" is just the cached `GET /auth/me`. Route guards in
  the browser are for convenience; the API still enforces every rule.
- **One validation schema, two places** — forms use the same Zod schemas as the API
  (react-hook-form + `zodResolver`), and server-side field errors are mapped back onto inputs.
- **URL as state** — list filters live in the query string (`?district=wayanad&priority=HIGH`),
  so filtered views can be bookmarked, shared and undone with the back button.
- **Accessibility** — labels wired to inputs (`useId`), errors announced (`role="alert"`),
  live regions for toasts, keyboard focus rings, skip link, semantic tables and tabs.
- **Mobile-first layout** — tested at 375 px wide with no horizontal scrolling; `tel:` links
  so coordinators can call donors and volunteers with one tap.
- **Fast Refresh boundaries** — `.tsx` files export only components; hooks and helpers live in
  `.ts` files so edits update instantly without losing page state.
- **Security on the frontend** — no tokens in JavaScript (httpOnly cookie), `?next=` redirects
  restricted to our own paths (no open redirect), cached personal data cleared on logout.

## Concepts introduced in Phase 4

- **WebSockets** — a long-lived, two-way connection, so the server can _push_ changes instead of
  the browser polling. Socket.IO adds automatic reconnection, an HTTP fallback and **rooms**
  (`public`, `members`, `staff`, `user:<id>`, `session:<id>`) to target who hears what.
- **Signals, not data** — events say "camp X changed", never "here is camp X". The browser turns
  them into TanStack Query invalidations and refetches over HTTP, so permission rules stay in
  one place and a client that missed events simply refetches on reconnect.
- **Socket authentication** — the handshake reuses the HTTP session lookup (`findSession`), and
  logging out, suspension or a password change closes that session's sockets immediately.
- **Cross-Site WebSocket Hijacking** — CORS does **not** apply to WebSocket upgrades, so the
  server checks the `Origin` header itself (`allowRequest`); otherwise any website could open a
  socket with a visitor's cookie.
- **Echo suppression & coalescing** — writes carry `X-Socket-Id` so the tab that made a change
  isn't told about it again; bursts of events are batched into one refetch per 300 ms.
- **`useSyncExternalStore`** — the React way to read state that lives outside React (the socket's
  connected/disconnected status in the footer).
- **Web maps** — Leaflet draws OpenStreetMap _tiles_ (256 px images per zoom level) with our own
  layers on top: camps coloured by how full they are, incidents as a different _shape_ so the
  map doesn't rely on colour alone. Leaflet is lazy-loaded in its own chunk.
- **Geodesy without PostGIS** — the haversine formula gives great-circle distance; the
  nearest-camp query first narrows by a lat/lng **bounding box** (served by an index), then
  computes exact distances only for the survivors. PostGIS (`geography`, GiST indexes,
  `ST_DWithin`) is the next step for millions of points or flood-zone polygons.
- **Geolocation API** — "find camps near me" and "use my location" ask permission and read the
  position once (no tracking); a map click or drag is the fallback.

## Concepts introduced in Phase 5

- **Progressive Web App** — a web manifest (name, icons, colours) makes the site installable on a
  phone's home screen; a **service worker** (generated by Workbox via `vite-plugin-pwa`) serves
  the app's files from a local cache, so it opens with no signal at all.
- **Precaching vs runtime caching** — every built file (including lazy page chunks and Leaflet) is
  downloaded once in the background, so even pages you never visited work offline; map tiles are
  cached as you look at them (cache-first, with a size and age limit).
- **Update flow** — a new deploy installs in the background, but the running version is only
  replaced when the user clicks "Reload", so nobody loses a half-filled form.
- **Persisted query cache** — TanStack Query's cache is saved to **IndexedDB** and restored on
  start-up, with a version "buster" and a maximum age. Only public data is written to disk;
  evacuee lists, donor phones and incident reporter details stay in memory and vanish on logout.
- **Offline mutations ("outbox")** — writes made offline are _paused_, saved with the cache and
  resumed on reconnect. Their send functions are registered as **mutation defaults** so they can
  be resumed after a reload. Rejected replays (e.g. the camp filled up meanwhile) are shown with
  the reason and can be retried or discarded — nothing fails silently.
- **Idempotency keys** — the client gives each action a UUID and re-sends it on every retry; the
  server stores the first response and replays it, so a request that "failed" after the server
  had saved it can't create a duplicate. A key reused for a different request is rejected (422).
- **`navigator.onLine` is a hint** — the app reads it at start-up and listens for changes, but
  also retries network errors with exponential backoff, because "connected to Wi-Fi" doesn't mean
  "connected to the internet".
- **Transactional outbox** — SMS rows are inserted in the same database transaction as the change
  that causes them; a background worker sends them. No lost alerts when the SMS gateway is down,
  and the HTTP request never waits for it.
- **Job queue in PostgreSQL** — `FOR UPDATE SKIP LOCKED` lets several servers share the queue
  without sending a message twice; retries use **exponential backoff with jitter**; delivery is
  _at-least-once_ (a crash mid-send can cause a rare duplicate, never a lost alert).
- **Set-based fan-out** — one `INSERT ... SELECT` queues an alert for every subscriber of a
  district, and a unique `(incident, phone)` index makes it safe to run twice.
- **Double opt-in & OTP security** — codes come from a CSPRNG, are stored hashed, expire in
  10 minutes, allow 5 guesses (counted atomically), are compared in constant time and are redacted
  after sending; sign-ups are limited per IP and per phone number.
- **Safe unsubscribe links** — the link opens a page with a button (a POST), because messaging
  apps fetch links to build previews and would otherwise unsubscribe people.
- **Ports and adapters** — the SMS provider is an interface with a console adapter for
  development and a Twilio adapter (plain `fetch`, no SDK) for production. Real SMS in India also
  needs TRAI DLT registration of the sender ID and message templates.

## Roadmap

- [x] **Phase 0** — Foundations: git, TypeScript monorepo, lint/format, API + web skeleton
- [x] **Phase 1** — PostgreSQL + Prisma, data model (District → Camp → Evacuee, Need, Donation,
      Incident), Zod validation, REST endpoints (volunteers move to Phase 2 with accounts)
- [x] **Phase 2** — Authentication (argon2id, sessions), roles and permissions, volunteers and
      tasks, CSRF protection, rate limiting
- [x] **Phase 3** — Frontend rebuild: public pages, volunteer task board, coordinator camp
      management, admin panel (React Router, TanStack Query, react-hook-form + Zod)
- [x] **Phase 4** — Real-time updates (Socket.IO), maps (Leaflet), nearest camp with space
- [x] **Phase 5** — Offline-first PWA (service worker, persisted cache, outbox, idempotency),
      SMS alerts (double opt-in, transactional outbox, retrying worker)
- [ ] **Phase 6** — Tests (Vitest, Playwright), Docker, CI/CD, deployment, monitoring
- [ ] **Phase 7** — AI report triage, Malayalam i18n, analytics
