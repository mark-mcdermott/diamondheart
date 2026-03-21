# Ortholinear

[![CI](https://github.com/mark-mcdermott/ortholinear/actions/workflows/ci.yml/badge.svg)](https://github.com/mark-mcdermott/ortholinear/actions/workflows/ci.yml)

Track what matters. Build better habits and reach your goals with simple, powerful tracking.

## What is Ortholinear?

Ortholinear is a personal health and productivity tracking platform. It combines habit tracking, workout logging, nutrition monitoring, and merch into one app — with web, iOS, and desktop builds from a single codebase.

The name comes from ortholinear keyboards — keyboards with keys arranged in a straight grid rather than staggered rows. The idea is the same: straightforward, no-nonsense, aligned.

## Features

- **Custom Metrics** - Create and track any metric (water intake, sleep, reading, exercise) with daily goals and progress visualization
- **Workout Tracking** - Log exercises, sets, reps, and weight with automatic personal record detection
- **Nutrition Logging** - Search the USDA food database, log meals, create custom foods, save favorite meals
- **Dashboard** - See all your tracked data at a glance with progress rings and streaks
- **User Profiles** - Public profile pages with avatar upload and stats
- **Merch Store** - Built-in e-commerce with Stripe payments and Printful print-on-demand fulfillment
- **Contact Form** - Direct contact submissions stored in the database
- **Automated Backups** - Nightly database backups to Cloudflare R2 with retention policies

## Tech Stack

- **Frontend**: SvelteKit 2, Svelte 5 (with runes), TypeScript
- **Styling**: Tailwind CSS 4, Bits UI
- **Database**: Neon (serverless PostgreSQL), Drizzle ORM
- **Auth**: Lucia (session-based, PBKDF2 password hashing)
- **Payments**: Stripe Checkout
- **Fulfillment**: Printful print-on-demand
- **Storage**: Cloudflare R2
- **Hosting**: Cloudflare Pages
- **Mobile**: Capacitor (iOS)
- **Desktop**: Tauri v2 (macOS, Windows, Linux)
- **Testing**: Vitest (134 tests across 14 files)
- **CI**: GitHub Actions

## Getting Started

### Prerequisites

- Node.js 22+
- pnpm (recommended) or npm
- PostgreSQL database (Neon recommended)
- Rust toolchain (for Tauri desktop builds only)

### Installation

```bash
# Clone the repository
git clone https://github.com/mark-mcdermott/ortholinear.git
cd ortholinear

# Install dependencies
pnpm install
```

### Environment Variables

Create a `.env` file with:

```bash
# Database (Neon PostgreSQL)
DATABASE_URL="postgresql://..."

# Stripe (for payments)
STRIPE_SECRET_KEY="sk_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Cloudflare R2 (for avatar storage)
R2_PUBLIC_URL="https://your-r2-public-url.example.com"

# Printful (for merch fulfillment)
PRINTFUL_API_KEY="..."

# USDA FoodData Central API (for food search)
USDA_API_KEY="..."

# Backup (for nightly database backups)
BACKUP_SECRET="..."
R2_ENDPOINT="https://your_account_id.r2.cloudflarestorage.com"
R2_ACCESS_KEY_ID="..."
R2_SECRET_ACCESS_KEY="..."
R2_BACKUP_BUCKET="ortholinear-backups"

# Oura Ring API
OURA_CLIENT_ID="..."
OURA_CLIENT_SECRET="..."
```

### Database Setup

```bash
# Push schema to database
pnpm db:push

# Seed with sample data (optional)
pnpm db:seed-office
pnpm db:seed-exercises
pnpm db:seed-custom-foods
```

### Development

```bash
# Start dev server
pnpm dev

# Start dev server and open browser
pnpm dev --open
```

### Building

```bash
# Build for production (Cloudflare Pages)
pnpm build

# Preview production build locally
pnpm preview
```

### Testing

```bash
# Run all tests
pnpm test

# Run individual suites
pnpm test:auth        # Password hashing, login, account management
pnpm test:api         # Stripe/Printful webhooks, food search, backup
pnpm test:actions     # Food, metrics, workout, contact form actions
pnpm test:unit        # Utils, merch data, Printful client

# Run full regression (used in CI)
pnpm test:regression  # All 4 suites sequentially
```

CI runs `test:regression` — new test files won't run in CI until explicitly added to a suite in `package.json`.

### iOS (Capacitor)

```bash
# Build and sync web assets to iOS
pnpm ios:build

# Open Xcode
pnpm ios:dev
```

For live reload during development, run `pnpm dev` and then run the app from Xcode — it points at `localhost:5173`.

### Desktop (Tauri)

```bash
# Run desktop app in dev mode
pnpm tauri:dev

# Build distributable (.dmg, .app, etc.)
pnpm tauri:build
```

Requires the Rust toolchain (`rustup`).

### Deployment

The app is configured for Cloudflare Pages:

```bash
# Deploy to Cloudflare Pages
npx wrangler pages deploy .svelte-kit/cloudflare
```

## Project Structure

```
src/
├── lib/
│   ├── __tests__/      # Vitest test files (14 files, 134 tests)
│   ├── components/
│   │   ├── blocks/     # Page-level components (Hero, Nav, Footer, etc.)
│   │   └── ui/         # UI primitives (Button, Card, Input, etc.)
│   ├── data/           # Static data (merch products)
│   └── server/         # Server-only code
│       ├── db/         # Drizzle schema and client
│       ├── auth.ts     # Lucia auth setup
│       ├── backup.ts   # Database backup logic
│       ├── password.ts # PBKDF2 hashing
│       ├── printful.ts # Printful API client
│       └── stripe.ts   # Stripe client
├── routes/
│   ├── api/            # API endpoints (checkout, webhooks, food search, backup)
│   ├── dashboard/      # Main dashboard
│   ├── food/           # Nutrition tracking
│   ├── workout/        # Workout logging
│   ├── metrics/        # Custom metric tracking
│   ├── records/        # Personal records
│   ├── tracker/        # Daily tracker
│   ├── merch/          # Merch store
│   ├── account/        # Account settings
│   ├── login/          # Authentication
│   ├── signup/
│   ├── about/          # Static pages
│   ├── services/
│   ├── contact/
│   ├── team/
│   └── u/[id]/         # Public user profiles
├── app.d.ts            # Type declarations
└── hooks.server.ts     # Auth middleware
src-tauri/              # Tauri desktop app (Rust)
ios/                    # Capacitor iOS project
scripts/                # Database seed and restore scripts
```

## Roadmap

### Completed
- [x] User authentication (Lucia + PBKDF2)
- [x] Custom metric tracking with daily goals
- [x] Workout logging with PR detection
- [x] Nutrition tracking with USDA food search
- [x] Merch store with Stripe + Printful
- [x] Automated database backups
- [x] Regression test suite
- [x] CI pipeline (GitHub Actions)
- [x] iOS app (Capacitor)
- [x] Desktop app (Tauri v2)
- [x] Oura Ring integration (biometric data)
- [x] Scheduled reminders / notifications

### Brand / UI Redesign
- [ ] Cozy/quirky brand identity and mascot character
- [ ] Zen/wabi-sabi design system (earth tones, organic shapes, hand-drawn icons)
- [ ] Mascot that reacts to your wellness data (sleepy, energized, calm, etc.)
- [ ] Mindfulness & wellness features (meditation timer, yoga tracking, mood journaling)
- [ ] Wellness score (composite of sleep, activity, mindfulness, nutrition)
- [ ] Apple Watch app (native SwiftUI complication)
- [ ] iOS home screen widgets (daily progress, streaks, biometrics)
- [ ] Watch face complications (glanceable metric summaries)
- [ ] Analytics — trend charts, metric correlations, streaks, weekly reports

### Premium Tier
- [ ] Stripe subscription checkout (reuse existing Stripe infra)
- [ ] Premium gating (plan field on users table)
- [ ] Unlimited integrations (free tier: 1 connected service)
- [ ] Full history + advanced analytics (free tier: 7-day history)
- [ ] Data export (CSV/JSON)
- [ ] On-demand backup + self-service restore

### Tauri / Capacitor Flow & UI Tweaks
- [ ] Native navigation and transition polish
- [ ] Platform-specific UX adjustments (iOS, macOS, Windows)

### Cleanroom Components
- [ ] Evaluate replacing third-party UI components with custom implementations

### Platform Migrations
- [ ] SvelteKit to Next.js
- [ ] Cloudflare to Vercel

## License

MIT

## Author

[Mark McDermott](https://markmcdermott.io)
