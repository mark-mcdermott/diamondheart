# Diamondheart

[![CI](https://github.com/mark-mcdermott/diamondheart/actions/workflows/ci.yml/badge.svg)](https://github.com/mark-mcdermott/diamondheart/actions/workflows/ci.yml)

> **Pre-beta, being dogfooded.** The app works end to end and is in daily use by its author, who is currently living in it to find the rough edges. Expect UX bugs, and please report any you meet.

Personal health and life tracking — metrics, food, workouts, meditation and more. Web, iOS/Android via Capacitor, desktop via Tauri. The web app runs at [www.diamondheart.app](https://www.diamondheart.app); the native apps are built from this repo and are not in the stores yet.

## Stack

Astro 7 · React 19 islands · React Router · TanStack Query · TypeScript · Tailwind 4 · shadcn/Radix · Drizzle + Neon Postgres · Zod · Recharts · Capacitor 8 · Tauri 2

Auth is Better Auth with bcrypt passwords: a cookie session on the web, a bearer token in the native shells. Every API handler resolves the session itself.

## Getting started

Requires Node 22+ and pnpm 10 (pinned via `packageManager`).

```bash
pnpm install
cp .env.example .env    # then fill in DATABASE_URL and BETTER_AUTH_SECRET
pnpm db:push            # push the schema to your Neon database
pnpm dev
```

`DATABASE_URL` is a Neon connection string; `BETTER_AUTH_SECRET` is any long random string. The rest of `.env.example` is optional and only needed for the features that use it — Stripe and Printful (merch), OMDb (entertainment), Oura (biometrics), USDA (food search), UploadThing (uploads) and VAPID (web push).

To populate a database with demo data:

```bash
pnpm db:seed
```

> `db:seed` is a **full reset** — it deletes every user, cascades through all feature tables and rotates passwords into `.secrets`. For tracker data only, use `pnpm db:reseed:tracker`.

## Commands

| | |
|---|---|
| `pnpm dev` | Dev server (Turbopack) |
| `pnpm build` | Production build |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | ESLint |
| `pnpm test:unit` | Vitest |
| `pnpm test:e2e` | Playwright |
| `pnpm db:push` | Push schema to Neon |
| `pnpm db:studio` | Drizzle Studio |

The verify loop is `typecheck` → `lint` → `test:unit` → `build`. CI runs exactly these, plus the end-to-end suite.

## Tests

**Unit** — 202 tests across 16 files (Vitest), covering date handling, chart and financial utilities, view ranges, nav config, widget sync and presence. Pure functions; no database.

**End-to-end** — Playwright. `pnpm test:e2e` creates a disposable Neon branch, points the app at it, runs the suite, and deletes the branch afterwards. Needs `NEON_API_KEY` in `.env`; set `TEST_DATABASE_URL` to target an existing database instead.

`e2e/isolation.spec.ts` is the regression test for user data isolation: two accounts, and the second must not see or be able to open the first's metric. It has been verified to fail when the scoping is removed — every tracker table was global until it was fixed, and nothing in the unit suite could have caught that.

Running `playwright test` directly is deliberately refused, because without the wrapper it would inherit `DATABASE_URL` from `.env` and create accounts in a real database.

## Layout

```
src/app/(public)/      unauthenticated pages — landing, login, signup, merch
src/app/(dashboard)/   the authenticated app, one directory per section
src/app/actions/       server actions, one file per feature
src/app/api/           route handlers — integrations, webhooks, export, push
src/lib/               shared helpers
src/lib/server/db/     Drizzle schema
e2e/                   Playwright specs
scripts/               seeds, migrations, test database provisioning
```

Pages are server components that query Drizzle directly and hand data to a client component. Mutations go through server actions; API routes are for external callers.

## Contributing

`CLAUDE.md` holds the conventions that matter — in particular the rule that **every query is scoped to the session user**, and why child tables like `workout_sets` are scoped through their parent instead.

`docs/ROADMAP.md` covers what is being built and what is deliberately parked.
