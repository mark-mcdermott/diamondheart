# Port Plan: diamondheart → Astro + React islands

> **How to resume with cleared context:** tell a fresh session
> *"Read `docs/PORT-PLAN.md` and execute it phase by phase."*
> Each phase ends on a green `main` that still serves the live app. Nothing here
> requires a big-bang window until Phase 4, which is one PR verified on a preview deploy.

Modelled on `fullstack-wolfpack/docs/astro-merge-plan.md` (the playbook) and
`frunk/docs/PORT-PLAN.md` (the same developer's port, landed 2026-09-19). Their principles
are assumed here. Where this plan departs from frunk's, the departure is stated and why.

---

## Context

diamondheart is **Next 15 App Router**: 37 pages, 20 server-action files (4,055 lines),
23 route handlers, 101 client components, a 119-line `middleware.ts` that guards routes
with a `jose` JWT in a cookie, and a 43-table Drizzle schema on Neon. It ships Capacitor
(iOS/Android) and Tauri shells, but **both load `https://www.diamondheart.app` remotely** —
`capacitor.config.ts` sets `server.url`, `tauri.conf.json` sets `frontendDist` to the URL.
They are wrappers around the website, not bundled apps.

**The trigger is bundled App Store apps.** Capacitor bundles a static build into the
webview, and Next cannot produce one here: `output: 'export'` disables server actions,
`middleware.ts`, cookie sessions, and dynamic routes. The data layer has to become REST
with a bearer token regardless of framework; Astro is the framework every other project
converges on (`_PROJECTS/README.md`, "Stack direction").

| | from | to |
|---|---|---|
| Data layer | server components query Drizzle; mutations are server actions | `/api/*` endpoints the applet calls; every handler resolves the session itself |
| Auth | bcrypt + `jose` cookie, route guard in middleware | Better Auth: cookie on the web, bearer in native; the boundary is the API |
| Shell | Next App Router, server-rendered dashboard | Astro static pages + one `client:only` React applet with react-router |
| Native | webview pointed at the live site | a bundled static applet calling the deployed API |

**What this is not:** a redesign (the UI ports as it is), a rebuild (all sixteen sections
come across, twelve of them still hidden by default), or a storage migration.

**Shape of the job, compared to the precedents.** wolfpack's move was pure packaging — its
app was already React and already fetched an API. frunk's was three changes at once —
Svelte to React, load functions to REST, Cloudflare to Vercel. diamondheart sits between:
the components are React and port nearly verbatim, but the data layer is server-first and
is the one real rewrite. **So the plan turns diamondheart into wolfpack's shape first —
REST plus a client-fetched applet, while it is still Next and still shipping — and then
does wolfpack's migration.**

**What ports verbatim:** the schema, the 23 route handlers (already Web `Request` →
`Response`), everything in `src/lib/` that is pure (`targets`, `units`, `numbers`,
`chart-utils`, `dates`, `nav-utils`), the 27 shadcn `ui/` and 23 `blocks/` components,
the Vitest suite (287 tests), and `scripts/e2e-db.ts` (a Neon branch per test run).

---

## Target architecture

**Draw the auth boundary at the API, not the page.** Astro serves the same static HTML to
everyone; the applet decides what to render; every API handler checks the session itself.
Astro never touches the session.

| Surface | Rendering | Notes |
|---|---|---|
| Landing, about, contact, `/u/[id]`, merch | **Astro static** (merch: static + cart island) | no JS except the islands |
| Header / footer | **Astro** + a `client:only` user island | reads `/api/auth/me` through a nanostore |
| Login / signup | **Astro page** + React auth island | `client:only`; a future passkey ceremony is browser JS |
| Every dashboard section | **`client:only` applet**, react-router | one catch-all `.astro` per section, so real 404s stay real |
| `/api/*` | **Astro endpoints** | one bundled Vercel function |
| Native (iOS, Android, desktop) | the applet, **bundled**, `PUBLIC_API_BASE` absolute | bearer token, no cookies |

**Island rule:** does a live browser runtime need to exist to render it? Yes →
`client:only`. No → `client:load` / `client:visible`. **Cross-island state is a
nanostore, not React context** — each island is its own React root.

**The dashboard becomes client-rendered.** `docs/ROADMAP.md` already accepts this: there
is no rendering gain to chase on the web, and a bundled native build has no server to
render on anyway. Every screen therefore needs real loading, empty and error states — the
server-rendered version never had to show a spinner.

---

## Decisions

1. **Sequencing — DECIDED: strangler first, shell swap last.** Phases 1–3 rewrite the data
   layer and auth *inside the Next app*, section by section, each PR shipping to
   production. Phase 4 swaps the shell in one PR verified on a preview deploy.

   frunk did the opposite — Astro at the repo root on day one, the old app frozen in
   `legacy/` — and that was right for frunk, which had never launched. diamondheart is used
   daily with real data, and it deploys from one Vercel project whose framework preset is
   Next. A root-level Astro app would need a second Vercel project or root-directory
   juggling for the weeks until parity, and nothing would ship in between. The strangler
   keeps every merge usable and makes the swap a packaging change.

   **Handlers are written framework-agnostic from the first PR** so the swap is file
   moves, not rewrites: each resource lives in `src/server/api/<resource>.ts` exporting
   plain functions of `{ request: Request; params: Record<string, string> }` that return a
   `Response`. The Next route file is a three-line adapter; in Phase 4 the Astro
   `APIRoute` file is the same three lines.

2. **Auth — DECIDED: Better Auth, self-hosted, email + password kept.** `better-auth` with
   the Drizzle adapter, mounted at `/api/auth/[...all]`; `bearer` plugin for native.
   Passkeys are a later add (`@better-auth/passkey`, proven in frunk), not a port
   requirement — there is one account and it signs in with a password today.

   - **Identity does not change.** `users.id` is already a text primary key, so the
     adapter maps Better Auth's `user` model onto the existing `users` table. It brings its
     own `session`, `account` and `verification` tables; the legacy `sessions` table (a
     SvelteKit leftover nothing reads) is dropped in Phase 6.
   - **The existing password keeps working.** Better Auth hashes with scrypt by default
     but accepts a custom `password.verify`; ours checks bcrypt (and the older `pbkdf2:`
     format `verifyPassword` still supports) and rehashes on success. The one production
     account is migrated by inserting its `account` row (`providerId: 'credential'`) with
     the existing hash. No forced reset.
   - `requireSession()` swaps its internals here and **keeps its return type** —
     `{ userId }` — so Phase 1 endpoints do not change. That is frunk's lesson: hold the
     session interface steady and the auth swap never reaches the entity endpoints.
   - `BETTER_AUTH_SECRET` is effectively unrotatable once TOTP or passkeys exist (frunk
     verified this 2026-09-19). Generate it once, keep a copy outside Vercel.
   - `middleware.ts` shrinks in Phase 2 to "no session cookie on a dashboard path →
     `/login`", a convenience for the web only, and is deleted in Phase 4. The applet's
     API client already redirects on 401.

3. **Component library — DECIDED: keep shadcn `new-york` on Radix.** Fifty components
   exist and work. Re-basing them on Base UI is a design-system job, not a port job, and
   the roster's naming rule already has a letter for this flavour.

4. **Repo shape — DECIDED: flat stock Astro layout at the repo root, no `legacy/`.**
   frunk kept `legacy/` as the reference for 60 Svelte components that had to be
   rewritten. Here nothing is rewritten in Phase 4 — the components move — and git
   history is the reference. The Vercel project stays the same project; its framework
   preset flips from Next to Astro in the swap PR (project settings, before merge, verified
   on the preview).

5. **Server state — DECIDED: TanStack Query.** One `QueryClient` at the applet root,
   `staleTime` 60 s, `networkMode: 'always'` (Capacitor webviews lie about
   `navigator.onLine` — frunk hit the infinite "Loading…"), and **4xx is never retried**.
   **No cache persistence to `localStorage`**: this is health, medical and financial data
   on a device that may be shared. Query keys are owned by one `src/app/api.ts` client so a
   mutation cannot invalidate a key the list is not cached under.

6. **Storage — DECIDED: UploadThing stays.** It works and it is the `U` in the current
   stack name. Vercel Blob is a separate later swap, if ever.

7. **Merch, Stripe, Printful — kept.** Public pages port as static Astro plus a cart
   island; checkout and both webhooks are already route handlers and port verbatim. Last
   of the public surface, not dropped — frunk dropped its store for branding reasons that
   do not apply here.

8. **Tauri — DECIDED: kept.** frunk dropped desktop; diamondheart ships it. It costs
   nothing once the native bundle exists (Phase 5): `frontendDist` points at the same
   output as Capacitor's `webDir`.

9. **Native — DECIDED: a bundled static applet, not a remote URL.** This is the point of
   the port, and it is the part with no precedent in frunk yet (its shells are still in
   `legacy/`). The design:

   - `astro build` with `NATIVE=1` prerenders a single applet shell (`app/index.html`)
     whose react-router uses memory history, and stamps `PUBLIC_API_BASE` with the
     production origin. Capacitor `webDir` and Tauri `frontendDist` point at that output.
   - The API client prefixes every path with `PUBLIC_API_BASE` (empty string on the web).
   - Sign-in inside the webview uses Better Auth's `bearer` plugin: the token comes back
     in a response header, is stored with `@capacitor/preferences`, and is sent as
     `Authorization: Bearer` on every call. No cookie is involved.
   - **CSRF.** Astro's built-in origin check rejects cross-origin mutations, and a bundled
     app *is* cross-origin (`capacitor://localhost` on iOS, `http://localhost` on Android).
     Turn `security.checkOrigin` off and enforce the rule in our own middleware:
     a mutating request authenticated by **cookie** must carry a same-site `Origin`; one
     authenticated by **bearer** may come from anywhere, because a bearer header cannot be
     attached by a cross-site form. Both cookies stay `SameSite=Lax` as a second layer.
   - Anything that assumes same-origin or relative URLs does not reach the bundle —
     Vercel Web Analytics' beacon, `astro:actions`, Neon Auth's cookies (the roster's
     "capacitor://localhost filter"). Check that first for any new dependency.
   - The biometric lock gate and native init components carry over as applet components.
   - **Apple Guideline 4.2** (minimum functionality) is the reason a wrapper around the
     website is not enough. Bundling is the answer, not a workaround.

10. **Section order.** Plan sections first, because they are what the roadmap finished
    and what the tests cover; the twelve shelved sections after, ported as they are and
    still hidden by `DEFAULT_NAV_ITEMS`.

    1. auth `me`, preferences, nav
    2. metrics — categories, metrics, entries, goals, reminders (weight and coffee live here)
    3. food — log, items, custom foods, favourites, meals, search, targets
    4. dashboard aggregates, account, settings
    5. meditate · tracking · medical · appointments · entertainment · workout · finances ·
       feed · notifications · records / entry — in that order, largest last (finances is
       3,183 lines and Phase 4 does not wait for it: a section whose endpoints are not
       done yet keeps its server actions until they are, since Phase 4 can only land when
       zero remain).

11. **Testing — API integration tests carry the weight.** Vitest, against a Neon branch
    from the existing `scripts/e2e-db.ts` harness (or `TEST_DATABASE_URL`). Per endpoint:
    no session → 401; another user's row → 404, never the row; own row → 200. This is
    where the user-scoping rule from PR #188 now lives, and post-port each endpoint is
    independently reachable, so a missing check is a leak. The 10 Playwright specs stay
    and are re-pointed at the Astro markup in Phase 4 (`gotoReady` survives; it waits for
    hydration, which is exactly what islands need). `e2e/isolation.spec.ts` gains an API
    twin and keeps its browser form.

12. **Stack name — after it lands.** The roster's own rule: naming a half-finished rewrite
    means renaming it twice. `DUCXZ-WSRRANT` stands until Phase 6 updates the roster.

13. **Vercel — same project.** Function count drops from one per route to ~1. Preview
    deploys are on; production protection stays on. `USDA_API_KEY` is still unset for the
    Preview environment — set it before Phase 4's preview is judged.

---

## Local development

Until Phase 4, `pnpm dev` is unchanged. After it, `pnpm dev` is `astro dev`: one server
for static pages, islands with HMR, and `/api/*`. `DATABASE_URL` is read through
`astro:env/server`, not `process.env` — Astro loads `.env` into its own layer and never
copies it into `process.env` (frunk lost an afternoon to this; `drizzle.config.ts` imports
`dotenv/config` itself and sees it fine, which is why the symptom is confusing).

---

## Phase 0 — Prerequisites

- **Clean `main`.** Phases 0–2 of the roadmap are done (#214 closed Phase 2); no open PRs
  after #216. ✅
- **`.env` points at the Neon `development` branch.** ✅ (`ep-still-sky-*`).
- **Baseline recorded:** typecheck 0, lint clean, 287 unit tests, 10 Playwright specs
  green twice, `pnpm build` clean. Every phase must hold this line.
- **Budgets.** GitHub Actions is on a $10 budget with a 15-minute e2e cap (#215); Vercel
  is Pro. A port produces many PRs — keep e2e in CI, but every PR should pass locally
  first so CI is confirmation, not discovery.
- **Secrets.** Rotate the production Neon role password (a fragment was printed in a
  session transcript on 2026-09-20). Generate `BETTER_AUTH_SECRET` when Phase 2 starts and
  store a copy outside Vercel. Both are Mark's.
- This document, and the roadmap pointing at it.

## Phase 1 — REST endpoints under Next

**Landed 2026-09-20 — the foundation** (`feat/api-foundation`): `_lib`, the session
resolver off a raw `Request` (cookie or bearer), `GET /api/auth/me`, and preferences as
one GET plus one partial PATCH that replaces five server actions. `pnpm test:api` and
`docs/API.md` exist from here on; every resource PR adds to both.

**Landed 2026-09-20 — nav** (`feat/api-nav`): five endpoints, and the action file is
now wrappers over the shared functions. Moving the logic surfaced a latent bug: the seed
minted random ids while the client held the deterministic virtual ones, so a fresh
account's first reorder or toggle matched nothing and reported success. The seed now
keeps the virtual ids, and a reorder with an id that is not yours is a 422.

**Landed 2026-09-20 — categories, metrics and entries** (`feat/api-metrics`): fourteen
endpoints over the tracker tables, with the action files reduced to wrappers. Entry writes
take an explicit `unit` for what the value is expressed in, so the conversion decision is
the caller's to state rather than the server's to guess from a preference; the wrappers
pass the viewer's unit to keep today's behaviour. `slugify` moved to `src/lib/slug.ts`
from two copies. The default category is now consistently named General.
Reminders came with it: four endpoints replacing route handlers that spread the raw
request body into the update, which would have let a body rewrite `user_id`.

**Landed 2026-09-20 — food** (`feat/api-food`): the day log, per-day totals, custom foods,
favourites, saved meals and the USDA search, seventeen endpoints. Day windows are now
half-open — the page and the actions used `lte` on the end bound, so a log dated exactly
midnight belonged to two days. Search requires a session. The two food chart readers in
`chart-data.ts` delegate to the one `dailyTotals` query.

**Landed 2026-09-20 — dashboard, account and notifications** (`feat/api-shell`): the
dashboard as one aggregate read, password change and avatar removal, and the
notifications the shell shows. Password hashing moved to `src/lib/password.ts` so the
account module does not import `next/headers`. `createNotification` was an exported
action any client could call for any user; it is server-side only now. **Every plan
section has endpoints.** What remains in Phase 1 is the shelved sections.

**Landed 2026-09-20 — tracking, medical and appointments** (`feat/api-sections-1`): three
small shelved sections in one PR, fourteen endpoints. The count increment is one
`UPDATE … SET count = count + delta`, where the action read the row and wrote back a
number it might have computed from a stale copy.
**Landed 2026-09-20 — meditation** (`feat/api-meditation`): the first shelved section,
seventeen endpoints covering sessions, the chart totals, styles, presets, the default timer
and presence. The meditation and presence action files are wrappers; the chart reader
delegates.

**Landed 2026-09-20 — workout, entertainment, episodes and feed** (`feat/api-sections-2`):
nineteen endpoints. Reactions became an explicit set instead of a toggle. With this,
`chart-data.ts` is nothing but delegates, and finances is the last section without
endpoints.

**Landed 2026-09-20 — finances** (`feat/api-finances`): thirty-three endpoints over the
eight financial tables, amounts in integer cents on the wire. Two ownership holes closed:
adding a transaction moved any account's balance, and the CSV import wrote into any
account. **Phase 1 is complete: every section has endpoints.** What remains before
Phase 4 is Phase 3 for the shelved sections, the account block and the auth forms.

- `src/server/api/_lib/`: `http.ts` (`json`, `fail`, `HttpError`, `handler`, `readJson`),
  `guard.ts` (`requireSession` → `{ userId }`; ownership helpers that put the owner in the
  `WHERE` clause so a foreign row is a 404, never an oracle), `schemas.ts` (Zod shapes;
  every update schema is the create schema made partial, so PATCH is genuinely partial and
  an explicit `null` clears a nullable column). Reference, don't copy: frunk's
  `src/pages/api/_lib/*`.
- `requireSession` reads the `jose` cookie off the raw `Request` — no `next/headers` —
  so the same function runs under Astro unchanged.
- One resource per PR in the order of Decision 10. Each PR: the handlers in
  `src/server/api/<resource>.ts`, the Next adapters under `src/app/api/<resource>/`,
  the Vitest integration tests, and `docs/API.md` updated. The server actions for that
  resource are **not** deleted yet — Phase 3 does that when the client moves.
- Fold the existing app-facing handlers in (`food/search`, `reminders`, `export`,
  `backup`, `widget/snapshot`, push) — they already have the right shape.
- **Checkpoint:** every plan-section resource has endpoints and tests; unauthenticated
  calls answer 401 on everything except `GET /api/auth/me`; a second user gets 404 on
  every owned route; 401 precedes 422 so a bad body never leaks the schema.

## Phase 2 — Better Auth under Next

- Mount `betterAuth()` at `src/app/api/auth/[...all]/route.ts` with the Drizzle adapter,
  `user` mapped to `users`, `emailAndPassword` with the bcrypt-compatible `verify`,
  `bearer` plugin. Generate the `session` / `account` / `verification` tables with the CLI
  and apply them to production as explicit SQL (never `db:push`).
- Migrate the production account: one `account` row carrying the existing hash.
- `requireSession` delegates to `auth.api.getSession({ headers })`; return type unchanged.
- Login and signup forms use the Better Auth client. `middleware.ts` becomes the thin
  cookie-presence redirect. `src/lib/auth.ts` loses `createSession` / `verifySession` /
  the cookie helpers; `verifyPassword` survives as the custom verifier.
- **Checkpoint:** sign in with the existing password on production; `curl` a bearer
  sign-in and read `/api/auth/me` with the token; the e2e suite (which signs up through
  the UI) green.

## Phase 3 — Applet-ize under Next

**Landed 2026-09-20 — settings** (`feat/applet-settings`): the first page that reads and
writes through the API from the browser. `src/app/api.ts` is the applet's whole view of
the API and owns the query keys; `src/app/query-provider.tsx` is Decision 5's one
`QueryClient`, mounted in the dashboard layout. Every preference write is one partial
PATCH with an optimistic cache patch that is put back if the server disagrees; nav
toggles and reorders work the same way. Nine server actions were deleted with it. The
page shows a skeleton while loading and a retry card on failure, which the
server-rendered version never had to.

**Landed 2026-09-20 — the metrics page** (`feat/applet-metrics`): `GET /api/metrics/overview`
replaces the nine queries the page ran, and the client does every edit — add, hide,
reorder, delete, section create/rename/delete, nav toggles — through the endpoints with
optimistic cache patches. Seven more server actions and the whole categories action file
are gone.

**Landed 2026-09-20 — metric detail, edit and entry** (`feat/applet-metric-pages`): the
three pages read `GET /api/metrics/:id` and `GET /api/metrics`, and write entries and
metric edits through the endpoints, passing the viewer's unit so mass readings convert on
the server as before. A foreign or missing metric renders its own "page not found", which
is what the isolation spec asserts. Four more actions gone; `quickLog` is the last
tracker action and moves with the dashboard.

**Landed 2026-09-20 — food** (`feat/applet-food`): the day view reads the log, the
targets, favourites and saved meals through the API; the 778-line client kept its markup
and its eight handlers became API calls that refetch. The chart and the overview read
`GET /api/food/totals`. The food action file is gone, and so are the two food chart
readers.

**Landed 2026-09-20 — the dashboard** (`feat/applet-dashboard`): one aggregate read plus
the preferences; the four quick-log buttons became one API call that refetches, and
pull-to-refresh refetches instead of reloading the route. The tracker action file is gone.
**Every plan section now reads and writes through the API.** What remains for Phase 3 is
the account block, the login and signup forms (which Better Auth's client will take over),
and the shelved sections once their endpoints exist.

**Landed 2026-09-20 — tracking, medical and appointments** (`feat/applet-tracking-medical-appointments`):
the first shelved sections on the API, and the first to share `RetryCard` for the failed
read. A tracking count tap patches the cached list and only refetches once the last tap in
a burst has settled, so two quick taps never snap back to one. The medical chart reads
`GET /api/medical/totals` through Query with the range in its key. An appointment's date
is now turned into an instant in the browser, in the zone it was typed, where the action
used to parse it in the server's zone. Three action files gone.

- `src/app/api.ts`: the applet's whole view of the API — `fetch` with `PUBLIC_API_BASE`,
  `ApiError`, 401 → `/login`, and every query key. TanStack Query provider at the
  dashboard layout (Decision 5).
- Section by section, in Decision 10's order: each `*-client.tsx` reads through Query and
  writes through mutations; the page becomes a thin shell; the server actions and the
  server-component queries for that section are deleted; loading, empty and error states
  are built. `surfaceErrors()` is retired in favour of `ApiError` surfacing through the
  same toasts.
- `next/link` and `next/navigation` stay until Phase 4 — replacing them here would be
  work done twice. `next/cache` (`revalidatePath`, 16 uses) goes here, since Query owns
  invalidation now.
- **Checkpoint:** zero `"use server"` files; zero Drizzle imports under `src/app/`; the
  e2e suite green; the dashboard shows real loading and empty states.

## Phase 4 — The shell swap (one PR)

- Astro 7, `@astrojs/react`, `@astrojs/vercel`, Tailwind 4 via `@tailwindcss/vite`, at
  the repo root. `next`, `next-themes` and `middleware.ts` removed.
- `src/pages/api/**`: three-line `APIRoute` adapters over `src/server/api/*`.
  `export const prerender = false` on each.
- `src/app/AppRoot.tsx` — `QueryClientProvider` → `BrowserRouter` → routes, lazy per
  section; mounted by one `src/pages/<section>/[...slug].astro` per dashboard section.
  Mechanical replacements: `next/link` (56) → `Link`, `useRouter`/`usePathname`/
  `useSearchParams` (48) → react-router, `next/image` (8) → `<img>`, `next/server` (22)
  → `Response`, `next/headers` (1) gone.
- Public pages → `.astro`; login/signup → `.astro` with the auth forms as `client:only`
  islands; header/footer → Astro with a `client:only` user island on a `stores/user.ts`
  nanostore. Theme boot script inlined in `<head>` (frunk's `THEME_BOOT_SCRIPT`), replacing
  `next-themes`.
- `astro:env` schema for every secret with `access: 'secret'` (a `public` server variable
  is inlined at build time — a missing optional one freezes as `undefined` for the life
  of the deploy).
- Vercel: framework preset → Astro on the project **before** merge; the PR's preview is
  the proof. Function count ≈ 1.
- e2e re-pointed; `scripts/e2e-db.ts` unchanged; CI's build step becomes `astro build`.
- **Checkpoint:** the preview deploy signs in, logs a weight and a food entry, and shows
  the dashboard; view-source on `/` is static HTML; the 10 specs pass in CI; production
  is switched by merging.

## Phase 5 — Bundled native

- `NATIVE=1 astro build` → `dist-native/` with the applet shell and `PUBLIC_API_BASE`
  stamped (Decision 9). Capacitor `webDir` and Tauri `frontendDist` point at it;
  `server.url` and the remote `frontendDist` URL are removed.
- Bearer storage in `@capacitor/preferences`; `Authorization` header from the API client
  when a token exists; the CSRF middleware from Decision 9.
- Deep links (`app.diamondheart.mobile`) route into react-router's memory history.
- Push, HealthKit and biometric plugins re-verified against the bundle.
- **Checkpoint:** iOS Simulator build signs in with the existing account, logs an entry,
  and the row is on production; Android and Tauri builds do the same.

## Phase 6 — Cleanup

- Drop the legacy `sessions` table and `AUTH_SECRET` from Vercel; delete `bcryptjs`
  callers that Better Auth replaced; remove `next`-era ESLint config.
- Update `CLAUDE.md` (commands, architecture, the Neon notes stay), `docs/ROADMAP.md`,
  and the roster's stack name (Decision 12).
- **Checkpoint:** `pnpm typecheck`, `pnpm lint`, `pnpm test:unit`, `pnpm build`,
  `pnpm test:e2e` all green on the Astro app; no reference to Next in the tree.

---

## Key files / patterns

- **Create:** `src/server/api/_lib/{http,guard,schemas}.ts`, `src/server/api/<resource>.ts`,
  `src/app/api.ts`, `src/app/AppRoot.tsx`, `src/pages/<section>/[...slug].astro`,
  `src/stores/user.ts`, `src/lib/theme.ts`, `docs/API.md`.
- **Reuse verbatim:** `src/lib/server/db/schema.ts`, `src/lib/*` pure modules,
  `src/components/ui/*`, `src/components/blocks/*`, `scripts/e2e-db.ts`, the Vitest suite.
- **Reference, don't copy:** frunk's `src/pages/api/_lib/*`, `src/app/api.ts`,
  `src/lib/server/auth/config.ts`, `[...slug].astro`; wolfpack's `AppRoot.tsx`.
- **Retire:** `src/app/actions/*` (Phase 3), `middleware.ts` and `next-themes` (Phase 4),
  `sessions` table and `AUTH_SECRET` (Phase 6), `capacitor.config.ts` `server.url` (Phase 5).

## Risks

- **Auth continuity.** One production account, one password. Decision 2's custom
  verifier is what keeps it working; test it against a copy of the real hash on the
  development branch before Phase 2 touches production.
- **Losing SSR loading behaviour.** The dashboard has never shown a spinner. Every
  Phase 3 screen needs loading and empty states built deliberately, or the port ships
  flashes of nothing.
- **The swap PR is large.** Mitigated by Phases 1–3 leaving only mechanical import
  replacements, and by judging it on a preview deploy rather than in review.
- **Native CSRF trade.** Turning off Astro's origin check moves the rule into our
  middleware; the API integration tests must cover it (cookie + foreign origin → 403,
  bearer + foreign origin → 200).
- **Schema changes reach CI e2e through production.** Unchanged from today: apply the
  Phase 2 tables to production as SQL, then re-run the job.

## Verification (per checkpoint)

- **Local:** the verify loop plus `pnpm test:e2e`, before every PR.
- **API:** `curl` — 200 on `/api/auth/me` signed out; 401 everywhere else; a second
  account's id in a URL is a 404.
- **Preview:** sign in, one write per plan section, function count.
- **Native:** the iOS Simulator drives the bundled build against production.
