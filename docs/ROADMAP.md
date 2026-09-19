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

Behind **Vercel Authentication**, so only the account owner can open it. Signup is open and this is personal health data, so it stays locked until there is a reason not to.

Also reachable at **https://www.diamondheart.app** (canonical) and `diamondheart.app`, both behind the same protection. The Capacitor and Tauri shells now point at the canonical host rather than a domain that used to not resolve.

Production runs on the Neon `production` branch, which holds one real account — the 27 seeded demo users were deleted on deployment day. Local development runs on `development`. See `CLAUDE.md`.

---

## The Astro port

**Decided: diamondheart moves to Astro + React islands — but not yet.**

The trigger was committing to real bundled App Store apps. Capacitor bundles a static build into the webview, and Next cannot produce one here: `output: 'export'` disables server actions (20 files, ~3,900 lines), `middleware.ts`, cookie sessions, and dynamic routes like `/metrics/[id]`. Diamondheart is built on all four.

So the data-layer rewrite — server actions to API routes, cookie session to a bearer token at the API boundary — is **mandatory for bundled native under either framework**. Astro is the option that leaves the project converged with pupluv and fullstackwolfpack rather than on a bespoke Next static-export setup.

What is *not* a reason to port:

- **Speed.** Diamondheart is already fully SSR — every route renders on the server. There is no rendering gain on the web, and the reference pattern would make the dashboard client-rendered.
- **Svelte.** It was SvelteKit as Ortholinear and moved to Next in April 2026. No Svelte remains; the Svelte projects are `themeforseen.com` and `sidvid`.

**Sequence: deploy (done) → finish weight → then port as its own project.** It is a rewrite, not a tidy-up, and should not be folded into feature work.

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

The biggest of the three and the one with the most to salvage — 1,272 lines already exist, plus `food_log`, `food_log_items`, `custom_foods`, `favorite_foods`, `favorite_meals`, and a search API.

Scope to be written once Phase 1 has landed and the pattern for "done" is established. Do not start it early.

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

