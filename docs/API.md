# Diamondheart API

The REST surface the app calls. Every route is a framework-agnostic handler in
`src/server/api/<resource>.ts`, mounted today by a three-line Next route file under
`src/app/api/` and, after Phase 4 of `docs/PORT-PLAN.md`, by the same three lines as an
Astro `APIRoute`.

**The auth boundary is here, not on the page.** Each handler resolves the session itself
and answers 401 when there is none. There is no per-request `locals` and no page guard to
rely on, so every endpoint is safe when reached directly.

## Conventions

| | |
|---|---|
| Request body | JSON. `content-type: application/json` on every write. |
| Auth | The `session` cookie (a signed JWT), or the same token as `Authorization: Bearer` — which is what the bundled native build sends, and what makes curl work. |
| Errors | `{ "error": string }`, plus `{ "fields": { path: string[] } }` on a 422. |
| PATCH | Genuinely partial. An omitted key is left alone; an explicit `null` clears a nullable column; an unknown key is a 422. |
| Ownership | Enforced by a `user_id` predicate inside the query, so someone else's row is a 404, never a 403. |

### Status codes

`200` ok · `201` created · `204` deleted / signed out · `400` malformed JSON ·
`401` no session · `403` signed in but not allowed · `404` missing or not yours ·
`422` validation failed · `500` unexpected

401 precedes 422: an unauthenticated request with a bad body learns nothing about the schema.

## Routes

### Auth

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/auth/me` | `{ user }` or `{ user: null }`. **200 either way** — signed-out is a state, not an error. A token for a deleted account reads as signed out. |

Sign-in and sign-up are still server actions until Phase 2 replaces them with Better Auth.

### Preferences

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/preferences` | `{ preferences }` — defaults for a user who has never saved any. |
| `PATCH` | `/api/preferences` | Any subset of `useNetflixUI`, `showSiteName`, `showMeditationInFeed`, `showNameWhenMeditating`, `weightUnit` (`kg`/`lb`), `dashboardSections` (unique keys), `targets` (`calories`/`protein`/`carbs`/`fat`, each a positive number or `null`). Returns the new `{ preferences }`. |

### Nav

The sidebar. A fresh account has no rows; `GET` answers with in-memory defaults whose ids
are deterministic, and the first mutation persists those same ids — so an id the client
saw is always the id a mutation finds.

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/nav` | `{ items }` in display order. |
| `PATCH` | `/api/nav` | `{ ids }` — the full ordering. Every id must be the caller's; an unknown one is a 422 naming it, never a silent no-op. Returns `{ items }`. |
| `PATCH` | `/api/nav/:id` | `{ visible }`. Visible items are packed first, then hidden. Setting the state an item already has is a no-op. The locked Dashboard item cannot be hidden (422). Someone else's item is a 404. |
| `PUT` | `/api/nav/sections/:key` | `{ visible }` for a tracking section by key (`food`, `workout`, …). Unknown key → 404. |
| `PUT` | `/api/nav/categories/:categoryId` | `{ visible }` for one of the caller's metric categories, creating its nav item on first show. A category that is not theirs → 404. |

## Verifying against a deploy

```bash
BASE=https://www.diamondheart.app

# 200 with a null user — no session needed
curl -s $BASE/api/auth/me

# 401 on everything else
curl -s -o /dev/null -w '%{http_code}\n' $BASE/api/preferences
```

## Tests

`pnpm test:api` runs `tests/api/` against a throwaway Neon branch (or `TEST_DATABASE_URL`),
calling the handlers directly with a real `Request` — no HTTP server, no framework. Each
resource's suite covers: no session → 401; another user's data → never returned; own data
→ 200; and the validation edges above. `tests/api/setup.ts` refuses the production host.
