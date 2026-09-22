# Roadmap

## Where this came from

283 commits, **244 of them in April 2026**, then five months of silence. The result is 16 dashboard sections, ~30k lines, and no single feature anyone would call finished. The code is healthy — green verify loop, real auth, real CRUD, native shells wired — but the product is wide and thin.

The correction is to go the other way: **a small number of features, each genuinely complete**, before anything new is added.

> **Settled: this repo continues. There is no from-scratch v2.**
>
> The alternative was scrapping the repo and rebuilding on a fresh stack. What decided it: every one of the sixteen sections is wanted eventually, and a rebuild means rebuilding all of them — finances with its eight tables, entertainment with OMDb and episode tracking, meditation with presence and reactions. A port keeps them and rewrites only how they reach the server.
>
> The stack move survives as **a port, scheduled** — see *The Astro port* below. The original v2 target, ZENCATSNBATS, no longer exists; the taxonomy was rebuilt and replaced it with the `DNC-` family.

## Strategy

Each finished before the next starts:

1. **Coffee** — ✅ settled as a counter metric rather than a section. See below.
2. **Weight** — ✅ daily single-value tracking with history. The first real take-it-to-done feature.
3. **Food** — ✅ the largest, and the one with the most existing code to salvage.
4. **The Astro port** — ✅ landed 2026-09-21, all six phases of `docs/PORT-PLAN.md`.

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
| Playwright harness + first two-user isolation test | ✅ #195 |
| Prune stale merged branches | ✅ |
| Deploy to Vercel | ✅ |

**Acceptance for the Playwright task:** two accounts, each with their own metric; account A cannot see, edit or delete account B's metric via the UI or by visiting `/metrics/<B's id>` directly. Runs in CI.

---

## Coffee — done

Settled: coffee is a **counter metric**, not a section (#193). The generic tracker already gives tap-to-increment tiles, dated entries, history and sparklines; a dedicated section would have been a third counting system in an app that already has two.

Caffeine math — mg per drink type, half-life decay, "last cup was 3h ago", "this one is still in you at bedtime" — is deliberately **not** built. It is the genuinely interesting idea here, and it is a real feature deserving a real spec, not a warm-up. Parked below.

---

## Deployed

Live at **https://diamondheart-zeta.vercel.app** — the bare `diamondheart.vercel.app` belongs to someone else.

**Public since 2026-09-21.** It sat behind Vercel Authentication from deployment day until the Astro shell landed; previews still are. Signup is open.

Canonical at **https://www.diamondheart.app**, with `diamondheart.app` answering 308 to it. The Capacitor and Tauri shells bundle the applet and call that host's API (`docs/PORT-PLAN.md`, Phase 5).

Production runs on the Neon `production` branch, which holds one real account — the 27 seeded demo users were deleted on deployment day. Local development runs on `development`. See `CLAUDE.md`.

---

## Phase 3 — The Astro port

**Landed.** Started 2026-09-20 after Phase 2 closed; the shell swap merged 2026-09-21 and
the bundled native applet and the cleanup followed the same day. **`docs/PORT-PLAN.md`**
holds the decisions, the six phases and what each turned out to be. This section keeps
the reasoning that led there.

The trigger was committing to real bundled App Store apps. Capacitor bundles a static build into the webview, and Next cannot produce one here: `output: 'export'` disables server actions (20 files, ~3,900 lines), `middleware.ts`, cookie sessions, and dynamic routes like `/metrics/[id]`. Diamondheart is built on all four.

So the data-layer rewrite — server actions to API routes, cookie session to a bearer token at the API boundary — is **mandatory for bundled native under either framework**. Astro is the option that leaves the project converged with pupluv and fullstackwolfpack rather than on a bespoke Next static-export setup.

What is *not* a reason to port:

- **Speed.** Diamondheart is already fully SSR — every route renders on the server. There is no rendering gain on the web, and the reference pattern would make the dashboard client-rendered.
- **Svelte.** It was SvelteKit as Ortholinear and moved to Next in April 2026. No Svelte remains; the Svelte projects are `themeforseen.com` and `sidvid`.

**Sequence: deploy (done) → finish weight (done) → finish food (done) → port (done).** It
was a rewrite of the data layer, not a tidy-up, and was not folded into feature work.
Unlike frunk's port it ran as a strangler inside the live Next app first — REST endpoints
and Better Auth landed section by section while every merge still shipped — and the shell
swap to Astro was one PR at the end, verified on a preview deploy. `docs/PORT-PLAN.md`
Decision 1 records why.

---

## Phase 1 — Weight

The first take-it-to-done feature. The `weight` metric already exists (kg, Body category), so this is about making **one metric excellent** — and because it is the generic metric UI being improved, every other metric benefits, coffee included.

**Done.**

| # | Task | Acceptance | |
|---|---|---|---|
| 1.1 | Daily entry | One value per day; logging twice updates rather than duplicating | ✅ #200 |
| 1.2 | Trend view | Line chart with a moving average; readable at 7/30/365 days; sensible with 1 data point | ✅ #201 |
| 1.3 | Unit preference | kg/lb per user, stored once, applied everywhere including history | ✅ #203 |
| 1.4 | Tests | Unit tests for moving average and unit conversion; Playwright | ✅ throughout |

Weight is stored in the unit its metric declares and converted only for display, so switching preference converts history rather than rewriting it. **Pounds is the default**, in the schema rather than only the UI, so a new account never sees kilograms first.

What "done" turned out to mean, for Phase 2 to copy: a canonical storage decision made once, conversion at the write boundary rather than in the client, a test seen to fail for the right reason, and looking at the result in a browser. Three of the bugs found in this phase — the zero-anchored Y axis, the invented "Daily goal: 1 kg", and the type picker that could not represent `number` — were invisible in the code and obvious on screen.

---

## Phase 2 — Food

The biggest of the three and the one with the most to salvage — 1,272 lines, plus `food_log`, `food_log_items`, `custom_foods`, `favorite_foods`, `favorite_meals` and a USDA search API. Logging, favourites, saved meals and a macro overview all exist and work.

Scope below was written after Phase 1, from an audit of the live code rather than from the feature list. Three things came out of it.

**The numbers cannot represent food.** Every macro column is an `integer`, and every value is read with `parseInt`. The failures are not rounding, they are wrong:

| User enters | Stored | |
|---|---|---|
| quantity `0.5` | **1** | `parseInt("0.5")` is 0, and `\|\| 1` turns that into a whole serving |
| serving size `0.5` | **100** | same path, falling back to the 100 g default — a 200× error |
| protein `12.5` | `12` | truncated, and it accumulates across a day |

Half a portion logging as a full one is the weight-rounding bug again, louder: the tracker quietly disagrees with what you told it.

**Search is broken in production.** `/api/food/search` needs `USDA_API_KEY`, which is not set on the deployment, so the primary way of adding food returns a 500. Locally it works, which is why this was invisible.

**Nothing to measure against.** There is no calorie or macro target anywhere in the schema or the code. You can log a day perfectly and the app will not tell you whether it was a good one.

**Done.**

| # | Task | Acceptance | |
|---|---|---|---|
| 2.1 | Fix the numeric model | Macros and quantities stored as decimals; `0.5` of a serving logs as 0.5; existing integer rows migrate unchanged | ✅ #208 |
| 2.2 | Make search work in production | Key configured; when it is absent the UI says so plainly instead of failing with a 500 | ✅ #211 |
| 2.3 | Daily targets | Per-user calorie and macro goals; the day reads against them; sensible before any goal is set | ✅ #214 |
| 2.4 | Tests | Unit: the quantity and serving-size regressions above. e2e: log a food, see totals change; log half a serving, see half | ✅ #208, #210 |

Do 2.1 first. Everything else builds on numbers that are currently wrong, and migrating later means migrating data that has already been corrupted.

What Phase 2 found, for the port to remember: the custom-food dialog had never saved — a click-outside handler fired on clicks inside its own portal — search failed with an empty list rather than a message, and server actions across the app returned errors nobody read. All three were silent: the page looked fine and did nothing. That is why #212 and #213 surface every action result, and why targets are nullable — no goal means no progress bar, not a bar toward a default of 1.

---

## Parked for v2

Not deleted, not scheduled. Ideas worth keeping that do not belong in a "finish three features" pass:

| Idea | Where it lives now | Why parked |
|---|---|---|
| **Social** — community feed, live meditation presence, session reactions | `feed` (257 lines), `meditation_presence`, `meditation_reactions` | This is a different product hiding inside the tracker: other people's activity, not your own. It needs its own thinking about who the audience is before it gets more code |
| **Caffeine intelligence** — mg by drink type, half-life decay, time-since-last-cup, sleep-impact warning | nothing yet; coffee is a plain counter | The best product idea on this list. Wants a real spec and a real data model, which is exactly why it is not the warm-up feature |

## Shelving the rest

**All sixteen sections are kept.** Nothing is deleted. The twelve outside the current plan ship **hidden**, not removed: their code, tables and data stay exactly where they are, and Settings turns any of them back on.

That is a default, not a demolition — `DEFAULT_NAV_ITEMS` now ships Dashboard, Metrics and Food visible, everything else off. Metrics stays because it is the tracker engine coffee and weight run on.

| Section | Lines | | Section | Lines |
|---|---|---|---|---|
| finances | 3,176 | | appointments | 497 |
| entertainment | 1,754 | | tracking | 496 |
| meditate | 1,181 | | medical | 434 |
| workout | 812 | | feed | 422 |
| settings | 687 | | notifications | 306 |
| account | 524 | | records | 117 |

Three of those are not really optional and stay visible in practice regardless: **settings** holds the weight-unit preference, **account** is password and profile, **notifications** is plumbing other features push into.

The original plan here was deletion, on the theory that breadth without depth is what stalled this project. The diagnosis was right; the remedy was wrong. Focus comes from what the nav shows, and hiding costs nothing to reverse.

