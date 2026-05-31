# Chore Tracker

Production-oriented Vite, React and TypeScript implementation of the single-household child chore and routine tracker described in `PRD.md`.

## Stack

- Vite + React + TypeScript
- TanStack Router
- Tailwind CSS with shadcn-style local primitives
- Clerk parent authentication
- Convex backend functions and schema
- Recharts dashboard charts
- Vitest, React Testing Library and Playwright
- Vercel deployment

## Setup

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

The local app runs at `http://localhost:5173`.

Populate `.env.local` with Clerk and Convex values before connecting to real services. The checked-in demo UI uses local seed data so the interface and tests can run before external projects are configured.

## Scripts

```bash
pnpm dev          # start Vite
pnpm build        # production build
pnpm typecheck    # TypeScript
pnpm lint         # ESLint
pnpm format       # Prettier check
pnpm test         # Vitest with 80% coverage thresholds
pnpm test:e2e     # Playwright
pnpm convex:dev   # local Convex development
```

## Product Constraints

v1 supports one household, one child and up to two parents. Child mode is PIN based inside a parent-authenticated household session. Parent-only data must be protected in Convex functions, not only in client routes.

Out of scope for v1: multiple households, multiple children, reward redemption, push/email notifications and heavy animation.
