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
| Auth | Better Auth's `better-auth.session_token` cookie on the web, or the session token as `Authorization: Bearer` — which is what the bundled native build sends, and what makes curl work. |
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

Better Auth is mounted at `/api/auth/*` (`src/lib/server/auth.ts`). The routes below are
the ones the app uses; the full surface is Better Auth's.

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/auth/me` | Ours. `{ user }` or `{ user: null }`. **200 either way** — signed-out is a state, not an error. A token for a deleted account reads as signed out. |
| `POST` | `/api/auth/sign-in/email` | `{ email, password }`. Sets the cookie and returns the session token in the `set-auth-token` response header for bearer use. A wrong password or an unknown address is the same 401. |
| `POST` | `/api/auth/sign-up/email` | `{ name, email, password }`; password at least 8 characters. Signs the new account in. |
| `POST` | `/api/auth/sign-out` | Ends the session behind the cookie or bearer token. |
| `GET` | `/api/auth/get-session` | Better Auth's own session read; the client library uses it. |

Passwords are bcrypt, verified through the app's own `verifyPassword`, so hashes from
before Phase 2 (and the SvelteKit era's `pbkdf2:` ones) keep working.

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
| `PATCH` | `/api/account/password` | `{ currentPassword, newPassword }` → 204, through Better Auth's own change-password, which verifies against `account.password` and rehashes. A wrong current password is a 422 on `currentPassword`, not a 401 — the session is fine. |
| `DELETE` | `/api/account/avatar` | 204. Clears the avatar and, best effort, deletes the file. Nothing to clear is still a 204. |

### Notifications

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/notifications` | `{ notifications, unread }` — the latest fifty, newest first. |
| `PATCH` | `/api/notifications` | `{ read: true }` marks everything read → `{ unread }`. |
| `PATCH` | `/api/notifications/:id` | `{ read }` → `{ notification }`. |
| `DELETE` | `/api/notifications/:id` | 204. |

Notifications are created server-side only. The old action file exported `createNotification`, which made it a callable action for any signed-in client against any user id; it has no callers and now lives in the server module.

### Tracking, medical and appointments

Three shelved sections, each a plain owned list.

| Method | Path | Notes |
|---|---|---|
| `GET` / `POST` | `/api/tracking` | `{ items }` by category then name / `name` required; `category`, `count`, `unit`, `icon`, `notes` → 201 `{ item }`. |
| `PATCH` / `DELETE` | `/api/tracking/:id` | Partial → `{ item }` / 204. |
| `POST` | `/api/tracking/:id/count` | `{ delta }` (non-zero) adds to the count in one statement → `{ item }`. |
| `GET` / `POST` | `/api/medical` | `{ logs }` newest first / `type` required; `subtype`, `severity` (1–5), `notes`, `date` → 201 `{ log }`. |
| `DELETE` | `/api/medical/:id` | 204. |
| `GET` | `/api/medical/totals?from=&to=` | `{ byType, bySeverity }` — counts per type, and average severity per day where one was recorded. |
| `GET` / `POST` | `/api/appointments` | `{ appointments }` newest first / `title`, `date` (ISO) required; `appointmentType` (default `doctor`), `provider`, `location`, `durationMinutes`, `status` (default `upcoming`), `notes`, `followUp` → 201 `{ appointment }`. |
| `PATCH` / `DELETE` | `/api/appointments/:id` | Partial → `{ appointment }` / 204. |
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

### Workout

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/workout?active=` | `{ exercises, recentWorkouts, active }` — built-in then custom exercises, the last five hundred workouts, and the named workout with its sets (exercise names joined in) or `null`. |
| `POST` | `/api/workout/workouts` | `{ name? }` → 201 `{ workout }`. |
| `PATCH` | `/api/workout/workouts/:id` | `{ duration?, notes? }` → `{ workout }` — finishing. |
| `POST` | `/api/workout/workouts/:id/sets` | `{ exerciseId, reps, weight, unit?, type?, notes? }` → 201 `{ set, isPR }`. The exercise must be built-in or the caller's; the set number continues per exercise; a heavier weight at the same rep count is a personal record. |
| `DELETE` | `/api/workout/sets/:id` | 204. Sets have no `user_id`; ownership is the workout's. |
| `GET` | `/api/workout/totals?from=&to=` | `{ days: [{ date, duration, volume, sessions }] }`. |

### Entertainment

| Method | Path | Notes |
|---|---|---|
| `GET` / `POST` | `/api/entertainment` | `{ items }` by last update / `type`, `title` required; `creator`, `status` (default `completed`), `rating` 1–5, `notes`, `startDate`, `endDate`, and the OMDB fields → 201 `{ item }`. |
| `PATCH` / `DELETE` | `/api/entertainment/:id` | Partial → `{ item }` / 204. |
| `GET` | `/api/entertainment/totals` | `{ byType, byStatus }`. |
| `GET` | `/api/entertainment/episodes?series=` | `{ episodes }` the caller has watched of a series. |
| `PUT` | `/api/entertainment/episodes` | `{ seriesImdbId, episodeImdbId, watched, season?, episode?, title?, airDate? }` → `{ episode }` or `{ episode: null }` when cleared. Marking is idempotent; season and episode are required to mark. |

### Feed

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/feed` | `{ items }` — the last thirty meditations by other members who have not opted out, with reaction counts and whether the caller reacted. |
| `PUT` | `/api/feed/reactions/:sessionId` | `{ reacted }` → `{ reacted, reactionCount }`. Explicit rather than a toggle, so a retry cannot flip it twice. |

### Finances

Every amount is **integer cents**; the form wrappers convert from dollars. Accounts are
archived, never deleted. Categories are seeded with twenty-four defaults on first read.

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/finances` | The finances page's read: accounts, investments, properties, retirement plans, the last twelve snapshots, the last ten transactions, net worth, this month's spending by category and income, and categories. |
| `GET` / `POST` | `/api/finances/accounts` | `{ accounts }` (unarchived) / `name`, `accountType` required → 201 `{ account }`. |
| `PATCH` / `DELETE` | `/api/finances/accounts/:id` | Partial (including `archived`) → `{ account }` / archive, 204. |
| `GET` / `POST` | `/api/finances/categories` | `{ categories }` / `{ name, type?, icon? }` → 201 `{ category }`. |
| `GET` | `/api/finances/transactions` | `?accountId&categoryId&type&from&to&limit&offset` → `{ transactions }`, newest first, at most five hundred. |
| `POST` | `/api/finances/transactions` | `accountId` (must be the caller's), `type`, `amountCents` (the magnitude; signed by type), `description` required; `categoryId`, `merchant`, `date`, `notes`, `isRecurring` → 201 `{ transaction }`. Moves the account balance. |
| `PATCH` / `DELETE` | `/api/finances/transactions/:id` | `categoryId`, `description`, `merchant`, `notes` → `{ transaction }` / 204, reversing the balance. |
| `POST` | `/api/finances/transactions/import` | `{ accountId, transactions: [{ date, description, amount (dollars), type, merchant?, categoryId? }] }` → `{ imported, skipped }`. Repeats are skipped by an import key; the balance is recomputed from every transaction on the account. |
| `GET` | `/api/finances/months/:year/:month` | `{ spending: [{ categoryId, totalCents, count }], incomeCents, year, month }`. |
| `GET` / `PUT` | `/api/finances/budgets` | `{ budgets }` / `{ categoryId, amountCents, period? }` sets the one budget a category has → `{ budget }`. |
| `DELETE` | `/api/finances/budgets/:id` | 204. |
| `GET` / `POST` | `/api/finances/investments` | `{ investments }` / `symbol` (upper-cased), `name`, `investmentType` required → 201 `{ investment }`. |
| `PATCH` / `DELETE` | `/api/finances/investments/:id` | Partial → `{ investment }` / 204. |
| `GET` / `POST` | `/api/finances/properties` | `{ properties }` / `name` required → 201 `{ property }`. |
| `PATCH` / `DELETE` | `/api/finances/properties/:id` | Partial → `{ property }` / 204. |
| `GET` / `POST` | `/api/finances/retirement` | `{ plans }` / `name`, `planType` required → 201 `{ plan }`. |
| `PATCH` / `DELETE` | `/api/finances/retirement/:id` | Partial → `{ plan }` / 204. |
| `GET` | `/api/finances/net-worth` | `{ netWorthCents, totalAssetsCents, totalLiabilitiesCents }`. |
| `GET` / `POST` | `/api/finances/snapshots?limit=` | `{ snapshots }` / take one now → 201 `{ snapshot }`. |

The old actions moved an account balance without checking the account was the caller's,
and the CSV import took any account id. Both are 404 now.

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
