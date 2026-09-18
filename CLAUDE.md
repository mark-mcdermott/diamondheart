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

**The verify loop is `typecheck` → `lint` → `test:unit` → `build`.** CI runs exactly these. Run them before opening a PR.

### Database

| | |
|---|---|
| `pnpm db:push` | Push schema changes to Neon |
| `pnpm db:studio` | Drizzle Studio |
| `pnpm db:seed` | **Full reset** — see warning below |
| `pnpm db:reseed:tracker` | Rebuild tracker tables per user only — refuses if dependent rows exist, see below |
| `pnpm db:migrate:tracker-scope` | One-off tracker ownership migration (already applied) |

> ⚠️ **`db:seed` deletes every user**, which cascades through food, workouts, meditation, finances and everything else, then rotates all passwords into `.secrets`. It is a full database reset, not a top-up. For tracker-only work use `db:reseed:tracker`.

> ⚠️ **`db:reseed:tracker` wipes `tracker_metrics`**, which cascades into `tracker_entries`, `tracker_goals` and `reminder_schedules`. It counts those three first and refuses — naming what it would delete — unless you pass `--force`. On any database with real tracking data it *will* refuse, and that is the intended behaviour: think before forcing.

> ⚠️ **`scripts/seed.ts` calls `seed()` at module scope.** Importing it for its data triggers that reset. Import `scripts/tracker-seed-data.ts` instead.

### End-to-end tests

`pnpm test:e2e` runs `scripts/e2e-db.ts`, which creates a throwaway Neon branch, points `DATABASE_URL` at it for the run, and deletes it afterwards — including on Ctrl-C. A Neon branch is a copy-on-write clone, so it arrives with the schema already in place.

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

Pages are server components that query Drizzle directly and hand data to a `*-client.tsx`. Mutations go through server actions, not API routes; API routes are for external callers (integrations, webhooks, the widget).

## Conventions

**Every query is scoped to the session user.** This is the rule the codebase got wrong once and it cost a data leak — every tracker table was global until PR #188.

- Tables carrying `user_id`: filter every read with `eq(table.userId, session.userId)`, and stamp it on every insert.
- Scope `update`/`delete` by owner too, and use `.returning()` to tell "not found" from "not yours" — never let a non-owner get a silent success.
- Child tables have no `user_id` by design (`workout_sets`, `food_log_items`, `favorite_meal_items`, `integration_sync_log`). They are scoped **through their parent**, so their queries must join or pre-check it. Never trust a parent ID straight off a `FormData`.

Other conventions:

- Commit style is gitmoji, single line — see `.claude/commit-style.md`. No AI attribution anywhere.
- Strict TypeScript, no `any`.
- PRs are opened ready for review, never draft. Automerge is off.

## Known gaps

- **Lint is not applying Next's rules** — `next lint` warns the plugin is not detected. `next lint` is also deprecated and removed in Next 16.
- **Not deployed.** There is no Vercel project for this repo and `diamondheart.app` does not resolve.

## Scope

The app has 16 dashboard sections, most of them shallow. See `docs/ROADMAP.md` for which are being kept and why.
