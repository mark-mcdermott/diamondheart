# Roadmap

## Where this came from

283 commits, **244 of them in April 2026**, then five months of silence. The result is 16 dashboard sections, ~30k lines, and no single feature anyone would call finished. The code is healthy — green verify loop, real auth, real CRUD, native shells wired — but the product is wide and thin.

The correction is to go the other way: **a small number of features, each genuinely complete**, before anything new is added.

> **This is the open question on the project.** The alternative on the table is scrapping this repo for a fresh v2 built the same way from scratch. That was argued down on the grounds that deleting scope costs days where rebuilding costs months, and that the target stack (ZENCATSNBATS) is unproven — 0 projects, to be proven on pupluv first. That reasoning has not been accepted as settled. If v2 wins, this roadmap is void.

## Strategy

Each finished before the next starts:

1. **Coffee** — ✅ settled as a counter metric rather than a section. See below.
2. **Weight** — daily single-value tracking with history. The first real take-it-to-done feature.
3. **Food** — the largest, and the one with the most existing code to salvage.

"Finished" means: logs, displays, edits, deletes; empty, loading and error states; works on mobile; survives a fresh account with no data; covered by a test that would catch a regression.

---

## Phase 0 — Foundations

Not features. The things that made April's work hard to build on.

| Task | Status |
|---|---|
| Scope tracker tables to their owner | ✅ #188 |
| Scope workout/food child-table queries | ✅ #189 |
| Fix stale chart colour assertion | ✅ #190 |
| Run typecheck, lint and tests in CI | ✅ #191 |
| Write `CLAUDE.md` + this roadmap | ✅ #192 |
| Playwright harness + first two-user isolation test | ✅ |
| Prune stale merged branches | ✅ |

**Acceptance for the Playwright task:** two accounts, each with their own metric; account A cannot see, edit or delete account B's metric via the UI or by visiting `/metrics/<B's id>` directly. Runs in CI.

---

## Coffee — done

Settled: coffee is a **counter metric**, not a section (#193). The generic tracker already gives tap-to-increment tiles, dated entries, history and sparklines; a dedicated section would have been a third counting system in an app that already has two.

Caffeine math — mg per drink type, half-life decay, "last cup was 3h ago", "this one is still in you at bedtime" — is deliberately **not** built. It is the genuinely interesting idea here, and it is a real feature deserving a real spec, not a warm-up. Parked below.

---

## Phase 1 — Weight

The first take-it-to-done feature. The `weight` metric already exists (kg, Body category), so this is about making **one metric excellent** — and because it is the generic metric UI being improved, every other metric benefits, coffee included.

| # | Task | Acceptance |
|---|---|---|
| 1.1 | Daily entry | One value per day; logging twice updates rather than duplicating |
| 1.2 | Trend view | Line chart with a moving average; readable at 7/30/365 days; sensible with 1 data point |
| 1.3 | Unit preference | kg/lb per user, stored once, applied everywhere including history |
| 1.4 | Tests | Unit tests for moving average and unit conversion; Playwright: log → chart updates |

---

## Phase 2 — Food

The biggest of the three and the one with the most to salvage — 1,272 lines already exist, plus `food_log`, `food_log_items`, `custom_foods`, `favorite_foods`, `favorite_meals`, and a search API.

Scope to be written once Phase 1 has landed and the pattern for "done" is established. Do not start it early.

---

## Parked for v2

Not deleted, not scheduled. Ideas worth keeping that do not belong in a "finish three features" pass:

| Idea | Where it lives now | Why parked |
|---|---|---|
| **Social** — community feed, live meditation presence, session reactions | `feed` (257 lines), `meditation_presence`, `meditation_reactions` | This is a different product hiding inside the tracker: other people's activity, not your own. It needs its own thinking about who the audience is before it gets more code |
| **Caffeine intelligence** — mg by drink type, half-life decay, time-since-last-cup, sleep-impact warning | nothing yet; coffee is a plain counter | The best product idea on this list. Wants a real spec and a real data model, which is exactly why it is not the warm-up feature |

## Deleting the rest

**Still a product decision, still not made.** Twelve sections sit outside the plan above:

| Section | Lines | What it is |
|---|---|---|
| finances | 3,176 | 8 pages: accounts, budgets, transactions, investments, properties, retirement, CSV import |
| entertainment | 1,620 | Movie/TV tracking via OMDb, per-episode watch state |
| meditate | 1,181 | Timer, styles, presets, session history |
| settings | 632 | Nav customisation, dashboard preferences |
| workout | 627 | Workouts, sets, exercises |
| account | 433 | Profile, password, avatar, HealthKit/Oura, reminders |
| appointments | 410 | Upcoming and past appointments |
| tracking | 409 | Lifetime tallies — see below |
| medical | 391 | Medical log entries |
| feed | 257 | Community feed — **parked for v2**, not a deletion candidate |
| notifications | 206 | In-app notifications |
| records | 117 | Read-only view of personal records; a satellite of workout |

Roughly 9,400 lines. Reversible — it is all in git history.

**`metrics` is not on this list.** An earlier draft included it at 1,560 lines. That was wrong: `metrics` *is* the generic tracker, and Phases 1 and 2 are work on it. It stays.

**`tracking` is less redundant than first claimed.** It was described as duplicating counter metrics. It does not: `tracking_items` holds a single lifetime `count` incremented in place with no history, where counter metrics write dated entries. The seeded data shows the real intent — "Restaurants tried", "Books read", "Flights taken" — life tallies, not daily habits.

It *is* replaceable, but by a plain dated metric rather than a counter, which would trade the increment-button feel for real history. That is a judgement call about what the feature is for, not a straightforward duplication, so it is listed here with everything else rather than deleted on its own.
