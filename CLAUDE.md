# Diamondheart

Personal health and life tracking app. Web + iOS/Android (Capacitor) + desktop (Tauri).

## Commands

| | |
|---|---|
| `pnpm dev` | Next dev server (Turbopack) |
| `pnpm build` | Production build |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | ESLint |
| `pnpm test:unit` | Vitest |
| `pnpm test:e2e` | Playwright — provisions a disposable Neon branch, see below |
| `pnpm test:api` | API integration tests (Vitest) — same disposable branch, see `docs/API.md` |

**The verify loop is `typecheck` → `lint` → `test:unit` → `build`.** CI runs exactly these. Run them before opening a PR.

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

`e2e/isolation.spec.ts` is the regression test for the user-scoping rule above — two accounts, and the second must not see or be able to open the first's metric. It has been verified to fail when that scoping is removed.

## Stack

Next.js 15 App Router · React 19 · TypeScript · Tailwind 4 · shadcn/Radix · Drizzle + Neon Postgres · Zod · Recharts · Capacitor 8 · Tauri 2.

Auth is hand-rolled: bcrypt hashes, a `jose` JWT in a `session` cookie, route guarding in `middleware.ts`. `getCurrentUser()` in `src/lib/auth.ts` returns `{ userId } | null` — the single source of identity on the server.

## Architecture

```
src/app/(public)/      unauthenticated pages — landing, login, signup, merch
src/app/(dashboard)/   authenticated app, one directory per section
src/app/actions/       server actions, one file per feature
src/app/api/           route handlers — integrations, webhooks, export, push
src/lib/               shared client + server helpers
src/lib/server/db/     Drizzle schema (the real one; src/db/schema.ts just re-exports)
scripts/               seeds and migrations
```

Pages are server components that query Drizzle directly and hand data to a `*-client.tsx`, except where Phase 3 of the port has moved a page onto the API: those pages render a client that reads through `src/app/api.ts` with TanStack Query (settings is the first). Mutations for the plan sections go through `/api/*` handlers in `src/server/api/`; the remaining server actions are wrappers over the same functions until their clients move.

## Conventions

**Every query is scoped to the session user.** This is the rule the codebase got wrong once and it cost a data leak — every tracker table was global until PR #188.

- Tables carrying `user_id`: filter every read with `eq(table.userId, session.userId)`, and stamp it on every insert.
- Scope `update`/`delete` by owner too, and use `.returning()` to tell "not found" from "not yours" — never let a non-owner get a silent success.
- Child tables have no `user_id` by design (`workout_sets`, `food_log_items`, `favorite_meal_items`, `integration_sync_log`). They are scoped **through their parent**, so their queries must join or pre-check it. Never trust a parent ID straight off a `FormData`.

Other conventions:

- Commit style is gitmoji, single line — see `.claude/commit-style.md`. No AI attribution anywhere.
- Strict TypeScript, no `any`.
- PRs are opened ready for review, never draft. Automerge is on: once every check passes and the PR is mergeable, squash-merge it without asking.

## Known gaps

- **Lint is not applying Next's rules** — `next lint` warns the plugin is not detected. `next lint` is also deprecated and removed in Next 16.
- **Deployment protection hides the apex redirect.** Both `diamondheart.app` and `www.diamondheart.app` serve the app, with www canonical. While Vercel Authentication is on, the edge answers with an SSO redirect before the apex-to-www hop, so that redirect cannot be observed from outside.

## Scope

The app has 16 dashboard sections, most of them shallow. See `docs/ROADMAP.md` for which are being kept and why.

**The Astro port is in progress** — `docs/PORT-PLAN.md` is the plan and the status. Until
its Phase 4 lands, this is still a Next app and everything above applies. New server
code goes in `src/server/api/` as framework-agnostic handlers (plan, Decision 1), not in
new server actions.
