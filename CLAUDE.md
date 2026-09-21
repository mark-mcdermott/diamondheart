# Diamondheart

Personal health and life tracking app. Web + iOS/Android (Capacitor) + desktop (Tauri).

## Commands

| | |
|---|---|
| `pnpm dev` | Astro dev server on port 3000 |
| `pnpm build` | `astro build` — static pages plus one Vercel function |
| `pnpm typecheck` | `astro check` (covers `.ts`, `.tsx` and `.astro`) |
| `pnpm lint` | ESLint, flat config, whole tree |
| `pnpm test:unit` | Vitest |
| `pnpm test:e2e` | Playwright against `astro dev` — provisions a disposable Neon branch, see below |
| `pnpm test:api` | API integration tests (Vitest) — same disposable branch, see `docs/API.md` |
| `pnpm build:native` | The applet as static files in `dist-native/` for the native shells, see below |
| `pnpm cap:sync` | `build:native`, then copy it into the iOS and Android projects |
| `pnpm tauri:build` | The desktop app — runs `build:native` itself |

**The verify loop is `typecheck` → `lint` → `test:unit` → `build` → `build:native`.** CI runs exactly these. Run them before opening a PR.

> `.env` reaches `process.env` in dev through `dotenv/config` at the top of `astro.config.mjs`; Astro alone loads it only into its own layer. Client-side reads use `import.meta.env` and keep their `NEXT_PUBLIC_` names through `envPrefix`, so the Vercel project needed no renaming.

### Database

| | |
|---|---|
| `pnpm db:push` | Push schema changes to Neon — **development only**, see below |
| `pnpm db:studio` | Drizzle Studio |
| `pnpm db:seed` | **Full reset** — see warning below |
| `pnpm db:reseed:tracker` | Rebuild tracker tables per user only — refuses if dependent rows exist, see below |
| `pnpm db:migrate:tracker-scope` | One-off tracker ownership migration (already applied) |
| `pnpm db:nav-defaults --email <addr>` | Apply `DEFAULT_NAV_ITEMS` to an existing account (`--all`, `--dry-run`) |

> ⚠️ **Never run `db:push` against production.** Asked to add one column, it proposed adding `tracker_categories_user_slug_unique` — a constraint that already existed, verified identical on both branches — and offered to **truncate `tracker_categories`** to do it. Its diff is not trustworthy here, and it only failed safe because a non-TTY shell could not answer the prompt. Apply production schema changes as explicit SQL:
>
> ```sql
> alter table <table> add column if not exists <col> <type> not null default <value>;
> ```

> ⚠️ **`db:seed` deletes every user**, which cascades through food, workouts, meditation, finances and everything else, then rotates all passwords into `.secrets`. It is a full database reset, not a top-up. For tracker-only work use `db:reseed:tracker`.

> ⚠️ **`db:reseed:tracker` wipes `tracker_metrics`**, which cascades into `tracker_entries`, `tracker_goals` and `reminder_schedules`. It counts those three first and refuses — naming what it would delete — unless you pass `--force`. On any database with real tracking data it *will* refuse, and that is the intended behaviour: think before forcing.

### Neon branches

The project has two branches. **`production` is the Neon default**, which is why `.env` pointed at it for months without anyone noticing — every local command ran against production.

| Branch | Used by | Contains |
|---|---|---|
| `production` | the Vercel deployment | the real account only |
| `development` | local `.env` | seeded demo data — safe to wipe |

`.env` must point at **`development`**. Check with the host: `ep-still-sky-*` is development, `ep-patient-fire-*` is production.

> ⚠️ **`.secrets` is your production password.** `db:seed` regenerates it, so seeding development overwrites the credentials for the production account. The production copy is kept at `.secrets.production` (gitignored). Restore from there if you lose it.

> ⚠️ **`scripts/seed.ts` calls `seed()` at module scope.** Importing it for its data triggers that reset. Import `scripts/tracker-seed-data.ts` instead.

> **Changing `DEFAULT_NAV_ITEMS` only affects new accounts.** Nav rows are created per user at signup, so existing accounts keep whatever they were given. Use `db:nav-defaults` to bring one in line. It adds missing entries, never deletes, and leaves custom metric-category entries alone.

### End-to-end tests

`pnpm test:e2e` runs `scripts/e2e-db.ts`, which creates a throwaway Neon branch, points `DATABASE_URL` at it for the run, and deletes it afterwards — including on Ctrl-C. A Neon branch is a copy-on-write clone, so it arrives with the schema already in place.

> **Navigate with `gotoReady()`, never bare `page.goto()`.** Server-rendered
> markup is clickable before React attaches handlers, so Playwright will happily
> click a button that does nothing — "actionable" by its rules, dead to the app.
> The gap is invisible locally and wide enough on CI runners to swallow clicks,
> which made three separate tests flaky before the helper existed.

> ⚠️ **It clones the *default* branch, which is `production`.** So a schema change must reach production before e2e can pass anywhere — including on a PR that has not merged. Expect a new column to fail CI until you apply it to production, and note that re-running the job *does* help in that case: the fix is in the database, not in the commit GitHub replays.

Needs `NEON_API_KEY` (and `NEON_PROJECT_ID` if that key can see several projects). Set `TEST_DATABASE_URL` to point at a specific database and skip Neon entirely.

Running `playwright test` directly is refused on purpose: without the wrapper it would inherit `DATABASE_URL` from `.env` and create accounts in a real database.

Playwright's server is `astro dev`, told its own origin (`BETTER_AUTH_URL`) because Better Auth checks every browser call's `Origin` against its base URL and Next used to report `localhost` where the browser said `127.0.0.1`. The Vercel adapter's build output is not runnable outside Vercel, which is why the suite does not run against a build.

`e2e/isolation.spec.ts` is the regression test for the user-scoping rule above — two accounts, and the second must not see or be able to open the first's metric. It has been verified to fail when that scoping is removed.

### Native shells

`pnpm build:native` bundles the applet with `vite.native.config.ts` in `--mode native`, so `.env.native` stamps `NEXT_PUBLIC_NATIVE=1` and the production `NEXT_PUBLIC_API_BASE`. The shells sign in with Better Auth's bearer token (`src/lib/session-token.ts`), never a cookie, and every call is cross-origin: `src/middleware.ts` answers CORS for the origins in `src/lib/server/origins.ts` and nothing else.

To point a build at a local server instead: `NEXT_PUBLIC_API_BASE=http://localhost:3000 pnpm build:native`, then `pnpm exec cap sync ios`. `astro dev` already allows the native origins (`astro.config.mjs`); the iOS project is not in git, so its `Info.plist` needs `NSAppTransportSecurity` → `NSAllowsLocalNetworking` for cleartext to `localhost`.

## Stack

Astro 7 · React 19 islands · React Router · TanStack Query · TypeScript · Tailwind 4 · shadcn/Radix · Drizzle + Neon Postgres · Zod · Recharts · Capacitor 8 · Tauri 2. Deployed on Vercel through `@astrojs/vercel`.

Auth is Better Auth (`src/lib/server/auth.ts`), mounted at `/api/auth/*`, with bcrypt passwords through the app's own hasher and the `bearer` plugin for native builds. Astro pages never touch the session: every API handler resolves it itself with `resolveSession()` in `src/server/api/_lib/session.ts`, and the applet decides what to render from `GET /api/auth/me`. Sign-in, sign-up and sign-out use Better Auth's browser client in `src/lib/auth-client.ts`.

## Architecture

```
src/pages/             Astro routes: public pages, one [...slug].astro per dashboard section, /api endpoints
src/pages/api/         three-line APIRoute adapters over src/server/api/*
src/layouts/           Base (document, theme boot, root islands) and Public (nav + footer)
src/app/AppRoot.tsx    the applet: QueryClient → BrowserRouter → AppShell → lazy routes
src/app/routes/        one module per section, the route components
src/app/sections/      the section clients, one directory per dashboard section
src/app/api.ts         the browser's whole view of the API, with every query key
src/app/link.tsx       Link: a route change inside the applet, a navigation elsewhere
src/components/islands/ what Astro pages hydrate: nav, footer, auth forms, contact form, root bootstraps
src/server/api/        framework-agnostic API handlers, one file per resource
src/stores/            nanostores shared across islands (the signed-in user)
src/lib/               shared client + server helpers
src/lib/server/db/     Drizzle schema (the real one; src/db/schema.ts just re-exports)
scripts/               seeds and migrations
```

The dashboard is one `client:only` React applet (docs/PORT-PLAN.md, Phase 4). Every section page under `src/pages/<section>/[...slug].astro` mounts the same `AppRoot`, so moving between sections is a client-side route change; each screen reads through `src/app/api.ts` with TanStack Query and writes through the `/api/*` handlers. `QueryGate` gives a page its skeleton and retry card; `useApiMutation` toasts a failed write and refetches what it touched. Public pages are static Astro with React blocks, hydrated only where they need a browser. Cross-island state is a nanostore, not React context, because each island is its own React root.

## Conventions

**Every query is scoped to the session user.** This is the rule the codebase got wrong once and it cost a data leak — every tracker table was global until PR #188.

- Tables carrying `user_id`: filter every read with `eq(table.userId, session.userId)`, and stamp it on every insert.
- Scope `update`/`delete` by owner too, and use `.returning()` to tell "not found" from "not yours" — never let a non-owner get a silent success.
- Child tables have no `user_id` by design (`workout_sets`, `food_log_items`, `favorite_meal_items`, `integration_sync_log`). They are scoped **through their parent**, so their queries must join or pre-check it. Never trust a parent ID straight off a `FormData`.

Other conventions:

- Commit style is gitmoji, single line — see `.claude/commit-style.md`. No AI attribution anywhere.
- Strict TypeScript, no `any`.
- PRs are opened ready for review, never draft. Automerge is on: once every check passes and the PR is mergeable, squash-merge it without asking.

## Domains

`www.diamondheart.app` is canonical; the apex answers 308 to it. Production is public since 2026-09-21 (Vercel Authentication covers previews only), so that redirect is observable from outside again.

## Scope

The app has 16 dashboard sections, most of them shallow. See `docs/ROADMAP.md` for which are being kept and why.

**The Astro port has landed** — `docs/PORT-PLAN.md` records the decisions and what each phase turned out to be. New server code goes in `src/server/api/` as framework-agnostic handlers (plan, Decision 1), mounted by an adapter in `src/pages/api/`.
