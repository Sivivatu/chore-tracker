# Codex Implementation Instructions

You are implementing a production-quality Vite + React + TypeScript web app using pnpm, TanStack Router, Tailwind CSS, shadcn/ui, Recharts, Clerk, Convex, and Vercel.

Follow the PRD exactly.

Before writing application code, create:

- `/docs/design.md`
- `/docs/architecture.md`
- `/docs/testing.md`
- `/docs/deployment.md`

## Development method

Use TDD:

1. Write or update tests before implementing each feature.
2. Keep tests meaningful and user-behaviour focused.
3. Maintain an 80% coverage threshold.
4. Do not bypass failing tests.

## Security requirements

- Use Clerk for parent authentication.
- Use child PIN mode for the child profile.
- Enforce access control in Convex functions.
- Do not rely only on client-side route protection.
- Do not expose parent-only data to child routes.

## Deployment requirements

- App must deploy to Vercel.
- Use preview and production environments.
- Provide `.env.example`.
- Provide README setup instructions.
- Provide GitHub Actions CI.

## Important v1 constraints

- Single household only.
- One child only.
- Up to two parents.
- Multi-household expansion is out of scope.
- Reward redemption is a future milestone.
- No heavy animation; only checkbox success animation.

## Required generated artefacts

- Vite app
- Convex backend
- Clerk integration
- Vercel configuration if needed
- GitHub Actions CI workflow
- README
- `.env.example`
- Test fixtures
- Seed data
- `/docs/design.md`
- `/docs/architecture.md`
- `/docs/testing.md`
- `/docs/deployment.md`
