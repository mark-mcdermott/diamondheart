# Roadmap

## Where this came from

283 commits, **244 of them in April 2026**, then five months of silence. The result is 16 dashboard sections, ~30k lines, and no single feature anyone would call finished. The code is healthy — green verify loop, real auth, real CRUD, native shells wired — but the product is wide and thin.

The correction is to go the other way: **a small number of features, each genuinely complete**, before anything new is added.

> **This is the open question on the project.** The alternative on the table is scrapping this repo for a fresh v2 built the same way from scratch. That was argued down on the grounds that deleting scope costs days where rebuilding costs months, and that the target stack (ZENCATSNBATS) is unproven — 0 projects, to be proven on pupluv first. That reasoning has not been accepted as settled. If v2 wins, this roadmap is void.

## Strategy

Three features, in this order, each finished before the next starts:

1. **Coffee** — the smallest possible end-to-end feature.
2. **Weight** — daily single-value tracking with history.
3. **Food** — the largest, and the one with the most existing code to salvage.

"Finished" means: logs, displays, edits, deletes; empty, loading and error states; works on mobile; survives a fresh account with no data; covered by a test that would catch a regression.

---

## Phase 0 — Foundations

Not features. The things that made April's work hard to build on.

| Task | Status |
|---|---|
| Scope tracker tables to their owner | ✅ #188 |
| Scope workout/food child-table queries | ✅ #189 |
| Fix stale chart colour assertion | 🔄 #190 |
| Run typecheck, lint and tests in CI | 🔄 #191 |
| Write `CLAUDE.md` + this roadmap | 🔄 this PR |
| Playwright harness + first two-user isolation test | ⬜ |
| Prune 10 stale merged branches | ⬜ |

**Acceptance for the Playwright task:** two accounts, each with their own metric; account A cannot see, edit or delete account B's metric via the UI or by visiting `/metrics/<B's id>` directly. Runs in CI.

---

## Phase 1 — Coffee

**Open question that must be answered before this starts.** The generic tracker already supports counter metrics, so "coffee tracking" is one seeded row away from existing. Two readings:

- **(a) A seeded counter metric.** Nearly free. But then coffee is not a feature, it is a row, and the "tiny fully-functional feature" exercise proves nothing.
- **(b) A dedicated section** — drink type, size, caffeine estimate, time of day, a "last cup was N hours ago" view. Real work, real product, and a genuine test of whether one feature can be taken to done.

The spirit of the plan points at **(b)**; (a) is the cheap answer. This needs a decision, not a default.

Tasks below assume (b).

| # | Task | Acceptance |
|---|---|---|
| 1.1 | `coffee_logs` table — user-scoped, drink type, size, caffeine mg, logged-at | Migration applied; `user_id` NOT NULL with cascading FK; scoping rule in `CLAUDE.md` followed |
| 1.2 | Log a cup | One tap logs a default cup; a second path sets type/size/time. Optimistic UI, rolls back on error |
| 1.3 | Today view | Cups today, caffeine total, time since last cup. Correct on a brand-new account with zero rows |
| 1.4 | History + edit/delete | Week/month view; edit and delete an entry; a non-owner gets "not found" |
| 1.5 | Tests | Unit tests for caffeine totals and time-since; Playwright: log → appears → edit → delete |

---

## Phase 2 — Weight

A `weight` metric already exists in the seed data (`kg`, Body category), so this is partly a matter of taking the generic metric UI and making one metric excellent.

| # | Task | Acceptance |
|---|---|---|
| 2.1 | Daily entry | One value per day; logging twice updates rather than duplicating |
| 2.2 | Trend view | Line chart with a moving average; readable at 7/30/365 days; sensible with 1 data point |
| 2.3 | Unit preference | kg/lb per user, stored once, applied everywhere including history |
| 2.4 | Tests | Unit tests for moving average and unit conversion; Playwright: log → chart updates |

---

## Phase 3 — Food

The biggest of the three and the one with the most to salvage — 1,272 lines already exist, plus `food_log`, `food_log_items`, `custom_foods`, `favorite_foods`, `favorite_meals`, and a search API.

Scope to be written once Phases 1 and 2 have landed and the pattern for "done" is established. Do not start it early.

---

## Deleting the rest

**Proposed, not approved.** Thirteen sections are not in the plan above:

| Section | Lines | | Section | Lines |
|---|---|---|---|---|
| finances | 3,176 | | appointments | 410 |
| entertainment | 1,620 | | tracking | 409 |
| meditate | 1,181 | | medical | 391 |
| settings | 632 | | feed | 257 |
| workout | 627 | | notifications | 206 |
| account | 433 | | records | 117 |
| metrics | 1,560 | | | |

`metrics` is listed but is the generic tracker the other features are built on — it almost certainly stays in some form.

Roughly 11k lines. Deleting them is what buys the focus this roadmap depends on, and it is reversible — it is all in git history. But it is a product decision, not a technical one, and it has not been made. Nothing gets deleted until it is.
