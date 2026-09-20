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
`409` conflicts with what exists · `422` validation failed · `500` unexpected

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

### Categories

Metric categories. Every account gets a **General** category (slug `default`) the first
time something needs one; it cannot be deleted.

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/categories` | `{ categories }` in sort order. |
| `POST` | `/api/categories` | `{ name }` → 201 `{ category }`. The slug comes from the name; a name whose slug already exists is a **409**. |
| `PATCH` | `/api/categories/:id` | `{ name }` — renames the category, its slug, and the nav item that points at it. |
| `DELETE` | `/api/categories/:id` | 204. Its metrics move to General; its nav item is removed. The default category is a 409. |

### Metrics

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/metrics` | `{ metrics }` — the caller's non-archived metrics in sort order. |
| `POST` | `/api/metrics` | `name`, `valueType` required; `unit`, `dailyGoal` (default 1, `null` for none), `fields`, `categoryId` (default General; someone else's is a 404), `counter`, `singleValuePerDay` optional → 201 `{ metric }`. |
| `PATCH` | `/api/metrics` | `{ ids }` — reorder; every id must be the caller's (422 otherwise). Returns `{ metrics }`. |
| `GET` | `/api/metrics/:id` | `{ metric, entries }`, entries newest first, **values as stored** in the metric's own unit — convert for display client-side with `toDisplayValue`. |
| `PATCH` | `/api/metrics/:id` | Any subset of the create fields plus `hidden`. A metric cannot both accumulate and hold one reading per day: `singleValuePerDay: true` forces `counter: false`. |
| `DELETE` | `/api/metrics/:id` | 204. Entries cascade. |

### Entries

| Method | Path | Notes |
|---|---|---|
| `POST` | `/api/metrics/:id/entries` | `value` (default `"done"`), `date` (ISO, default now), `notes`, `unit` (`kg`/`lb`: the unit `value` is in, for a mass metric — the server converts to the metric's unit). **201** for a new entry; **200** when a single-value-per-day metric replaced that day's entry. |
| `PATCH` | `/api/entries/:id` | `value`, `notes`, `unit` — partial. |
| `DELETE` | `/api/entries/:id` | 204. |

Values are text in the database (`"done"`, free text, or a number), so they cross the wire
as strings.

### Reminders

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/reminders` | `{ reminders }`, ordered by time. |
| `POST` | `/api/reminders` | `label`, `time` (`HH:MM`), `days` (0–6, Sunday first, no repeats) required; `timezone` (default `America/Chicago`), `enabled` (default true), `metricId` (must be the caller's, else 404) optional → 201 `{ reminder }`. |
| `PATCH` | `/api/reminders/:id` | Any subset of the same fields. Unknown keys are a 422 — the old handler spread the raw body into the update, so a body could have rewritten `user_id`. |
| `DELETE` | `/api/reminders/:id` | 204. |

### Food

Days are calendar days, `YYYY-MM-DD`, read in the server's local time the way the pages
read them. Meal types are `breakfast`, `lunch`, `dinner`, `snack`. Macro numbers are per
serving; a logged item also carries `quantity`, and every total multiplies the two.

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/food/log?date=` | `{ date, meals: { breakfast, lunch, dinner, snack }, totals }` for one day (today when omitted). |
| `POST` | `/api/food/log` | `mealType`, `name` required; `date`, `fdcId`, `servingSize`, `servingUnit`, `calories`, `protein`, `carbs`, `fat`, `quantity` optional → 201 `{ item }`. |
| `DELETE` | `/api/food/log/items/:id` | 204. Items have no `user_id`; ownership is the parent log's, checked in the same query. |
| `GET` | `/api/food/totals?from=&to=` | `{ days: [{ date, calories, protein, carbs, fat }] }`, inclusive of both days, unrounded, days with nothing logged absent. |
| `GET` / `POST` | `/api/food/custom` | `{ customFoods }` / `name` + macros → 201 `{ customFood }`. |
| `DELETE` | `/api/food/custom/:id` | 204. |
| `GET` / `POST` | `/api/food/favorites` | `{ favorites }` / `name` + macros, optional `fdcId` or `customFoodId` (must be the caller's) → 201 `{ favorite }`. |
| `DELETE` | `/api/food/favorites/:id` | 204. |
| `GET` / `POST` | `/api/food/meals` | `{ meals }`, each with its `items` / `{ name, mealType, date? }` saves what is logged under that meal on that day → 201 `{ meal }`; nothing logged is a 422. |
| `DELETE` | `/api/food/meals/:id` | 204. Items cascade. |
| `POST` | `/api/food/meals/:id/log` | `{ mealType, date? }` logs every item of the saved meal → 201 `{ items }`. |
| `GET` | `/api/food/search?q=` | `{ foods }` from USDA FoodData Central. **Signed-in only now** — the deployment's key was reachable by anyone who found the URL. 503 `reason: not_configured` without a key; 502 with `reason` when USDA is unreachable, rejects the key, or errors. |

### Dashboard

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/dashboard?date=` | One read for the dashboard screen: `{ date, metrics, todayEntries, recentEntries, sparklines, food: { totals, meals } }`. Metrics are the visible, non-archived ones; `recentEntries` are the last twenty from the seven days before the date; `sparklines` are per metric, per day totals over those days, non-numeric values counting as 1. Today when `date` is omitted. |

### Account

| Method | Path | Notes |
|---|---|---|
| `PATCH` | `/api/account/password` | `{ currentPassword, newPassword }` → 204. A wrong current password is a 422 on `currentPassword`, not a 401 — the session is fine. |
| `DELETE` | `/api/account/avatar` | 204. Clears the avatar and, best effort, deletes the file. Nothing to clear is still a 204. |

Sign-in and sign-up remain server actions until Phase 2 replaces them with Better Auth.

### Notifications

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/notifications` | `{ notifications, unread }` — the latest fifty, newest first. |
| `PATCH` | `/api/notifications` | `{ read: true }` marks everything read → `{ unread }`. |
| `PATCH` | `/api/notifications/:id` | `{ read }` → `{ notification }`. |
| `DELETE` | `/api/notifications/:id` | 204. |

Notifications are created server-side only. The old action file exported `createNotification`, which made it a callable action for any signed-in client against any user id; it has no callers and now lives in the server module.

### Meditation

The first shelved section with endpoints. Durations are seconds.

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/meditation` | `{ sessions, styles, presets, defaultTimerSeconds }` — the meditate page's read; sessions newest first, at most a thousand. |
| `POST` | `/api/meditation/defaults` | Seeds the starter styles and presets for whichever list is empty; safe to repeat. Returns both lists. |
| `GET` / `POST` | `/api/meditation/sessions` | `{ sessions }` / `duration` required, `type` (default `guided`), `notes`, `date` (default now) → 201 `{ session }`. |
| `PATCH` / `DELETE` | `/api/meditation/sessions/:id` | Partial `duration`, `type`, `notes` → `{ session }` / 204. |
| `GET` | `/api/meditation/totals?from=&to=` | `{ days: [{ date, minutes, sessions }] }`, inclusive of both days. |
| `GET` / `POST` | `/api/meditation/styles` | `{ styles }` / `{ label, iconName? }` → 201 `{ style }`. |
| `PATCH` / `DELETE` | `/api/meditation/styles/:id` | `{ label, iconName? }` → `{ style }` / 204. |
| `GET` / `POST` | `/api/meditation/presets` | `{ presets }` / `{ label, seconds }` → 201 `{ preset }`. |
| `PATCH` / `DELETE` | `/api/meditation/presets/:id` | `{ label, seconds }` → `{ preset }` / 204. |
| `PATCH` | `/api/meditation/timer` | `{ seconds }` → `{ defaultTimerSeconds }`. |
| `PUT` / `DELETE` | `/api/meditation/presence` | Heartbeat while the timer runs / stop. Both 204. |
| `GET` | `/api/meditation/presence` | `{ count, meditators }` — everyone else meditating now, names redacted where they chose that. |

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
