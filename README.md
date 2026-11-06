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
   npm run db:seed    # districts + sample camps, needs, incidents
   npm run dev        # API on http://localhost:4000, web on http://localhost:5173
   ```

Open http://localhost:5173. The badge top-right should say **API online**.

## Scripts (run from the repo root)

| Command                          | What it does                                              |
| -------------------------------- | --------------------------------------------------------- |
| `npm run dev`                    | Runs API and web together (`concurrently`)                |
| `npm run build`                  | Production build of every workspace                       |
| `npm run typecheck`              | `tsc` type-check of every workspace                       |
| `npm run lint`                   | ESLint across the whole repo (`lint:fix` to auto-fix)     |
| `npm run format`                 | Prettier formats every file (`format:check` only reports) |
| `npm run check`                  | format check + lint + typecheck — run before committing   |
| `npm run db:migrate`             | Create a migration from schema changes and apply it       |
| `npm run db:seed`                | Insert districts and (in development) sample data         |
| `npm run db:reset`               | Drop everything, re-run all migrations (dev only!)        |
| `npm run db:studio`              | Prisma Studio: browse and edit data in the browser        |
| `npm run dev -w @crisislink/api` | Run a script in just one workspace                        |

## API (Phase 1)

All endpoints are under `/api`. Lists accept `limit` and `offset` and return
`{ items, total, limit, offset }`. Errors always look like
`{ "error": { "code": "...", "message": "...", "details": { "field": ["problem"] } } }`.

| Method & path                        | Purpose                                                 |
| ------------------------------------ | ------------------------------------------------------- |
| `GET /health`                        | API + database status                                   |
| `GET /stats`                         | Dashboard numbers (camps, evacuees, needs, incidents)   |
| `GET /districts`, `/districts/:slug` | Per-district camp, evacuee and incident counts          |
| `GET, POST /camps`                   | List (`district`, `status`, `q`) / create relief camps  |
| `GET, PATCH /camps/:id`              | One camp with live occupancy / update it                |
| `GET, POST /camps/:id/evacuees`      | People in a camp / check someone in (capacity enforced) |
| `PATCH /evacuees/:id`                | Update details or `{ "checkedOut": true }`              |
| `GET /needs`                         | Open needs across camps, most urgent first              |
| `GET, POST /camps/:id/needs`         | A camp's needs / add one                                |
| `PATCH /needs/:id`                   | Update a need                                           |
| `GET, POST /donations`               | List / pledge a donation (optionally for a `needId`)    |
| `PATCH /donations/:id`               | `{ "status": "RECEIVED" }` updates the need's total     |
| `GET, POST /incidents`               | List (`district`, `status`, `severity`) / report one    |
| `GET, PATCH /incidents/:id`          | One incident / verify, resolve or dismiss it            |

> Write endpoints are open to anyone until Phase 2 adds login and roles.

## Project layout

```
crisislink/
├── apps/
│   ├── api/          Express 5 + TypeScript REST API (dev: node --watch + tsx, build: tsup)
│   │   ├── prisma/       schema.prisma, migrations/, seed.ts
│   │   └── src/          app.ts, routes/, lib/ (errors, validation), db.ts
│   └── web/          React 19 + Vite + Tailwind CSS v4
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

## Roadmap

- [x] **Phase 0** — Foundations: git, TypeScript monorepo, lint/format, API + web skeleton
- [x] **Phase 1** — PostgreSQL + Prisma, data model (District → Camp → Evacuee, Need, Donation,
      Incident), Zod validation, REST endpoints (volunteers move to Phase 2 with accounts)
- [ ] **Phase 2** — Authentication (hashed passwords) and role-based access control
- [ ] **Phase 3** — Frontend rebuild: routing, TanStack Query, react-hook-form + Zod
- [ ] **Phase 4** — Real-time updates (Socket.IO) and maps (Leaflet + PostGIS)
- [ ] **Phase 5** — Offline-first PWA, SMS alerts
- [ ] **Phase 6** — Tests (Vitest, Playwright), Docker, CI/CD, deployment, monitoring
- [ ] **Phase 7** — AI report triage, Malayalam i18n, analytics
