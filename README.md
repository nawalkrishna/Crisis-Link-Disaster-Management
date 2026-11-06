# CrisisLink

A disaster-relief coordination platform for Kerala: relief camps, evacuees, volunteers, camp needs
and donations. Originally a 2024 BTech mini project, now being rebuilt phase by phase.

## Quick start

Requires **Node.js 22.12+** (see `.nvmrc`).

```bash
npm install        # installs every workspace at once
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
| `npm run dev -w @crisislink/api` | Run a script in just one workspace                        |

## Project layout

```
crisislink/
├── apps/
│   ├── api/          Express 5 + TypeScript REST API (dev: tsx, build: tsup)
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

## Roadmap

- [x] **Phase 0** — Foundations: git, TypeScript monorepo, lint/format, API + web skeleton
- [ ] **Phase 1** — PostgreSQL + Prisma, data model (District → Camp → Evacuee, Volunteer, Need,
      Donation, Incident), Zod validation, REST endpoints
- [ ] **Phase 2** — Authentication (hashed passwords) and role-based access control
- [ ] **Phase 3** — Frontend rebuild: routing, TanStack Query, react-hook-form + Zod
- [ ] **Phase 4** — Real-time updates (Socket.IO) and maps (Leaflet + PostGIS)
- [ ] **Phase 5** — Offline-first PWA, SMS alerts
- [ ] **Phase 6** — Tests (Vitest, Playwright), Docker, CI/CD, deployment, monitoring
- [ ] **Phase 7** — AI report triage, Malayalam i18n, analytics
