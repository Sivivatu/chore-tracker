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

Populate `.env.local` with Clerk and Convex values before connecting to real services. Blank `VITE_CONVEX_URL` values fall back to the local placeholder URL in development, so copying `.env.example` before creating a Convex deployment will not break the Vite dev server.

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

## End-to-End Test User Stories

The Playwright smoke tests in `tests/e2e/app.spec.ts` cover these user stories:

- `child can unlock and view today's routines`: As a child, I want to unlock child mode with my PIN so I can see the routines I need to complete today.
- `parent can view dashboard and approval queue`: As a parent, I want to review today's household dashboard and open the approvals queue so I can verify submitted routines.
- `parent can edit a demo routine and keep edit history`: As a parent, I want to edit a routine template while keeping an archived copy of the previous version so routine history remains traceable.
- `parent can create and customise reward visuals with SVG icons`: As a parent, I want to create a reward, let the app assign a default icon, then edit it to a chosen SVG icon so reward cards stay visual and customisable.

UploadThing image upload is covered as a manual smoke journey rather than CI E2E: run with Clerk, `CLERK_SECRET_KEY` and `UPLOADTHING_TOKEN`, upload a reward image on `/parent/rewards`, save, refresh, and confirm the uploaded image persists.

## Product Constraints

v1 supports one household, one child and up to two parents. Child mode is PIN based inside a parent-authenticated household session. Parent-only data must be protected in Convex functions, not only in client routes.

Out of scope for v1: multiple households, multiple children, reward redemption, push/email notifications and heavy animation.
