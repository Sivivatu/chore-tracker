# Deployment Guide: Child Chore & Routine Tracking Web App

## Deployment target

Deploy the app to Vercel.

Required environments:

- Preview
- Production

## Build stack

- Vite
- React
- TypeScript
- pnpm
- Convex backend
- Clerk authentication

## Required environment variables

Create `.env.example` with the following variables:

```bash
# Clerk
VITE_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_JWT_ISSUER_DOMAIN=

# Convex
VITE_CONVEX_URL=
CONVEX_DEPLOYMENT=
CONVEX_SITE_URL=

# App
VITE_APP_ENV=local
VITE_APP_BASE_URL=http://localhost:5173

# Optional future notification support
RESEND_API_KEY=
```

Do not commit real secrets.

## Manual pre-setup steps

These steps should be completed manually in the local dev container before asking Codex to implement the PRD.

### Local tooling

1. Confirm Node.js LTS is available.
2. Install or enable pnpm.
3. Confirm Git is configured.
4. Confirm GitHub CLI is authenticated if Codex will create PRs.
5. Confirm the repo is initialised.
6. Confirm the working branch is not `main`.

### Clerk setup

1. Create a Clerk application.
2. Enable Google sign-in.
3. Enable magic link/email sign-in.
4. Copy Clerk publishable key.
5. Copy Clerk secret key.
6. Configure allowed redirect URLs for local, preview, and production.
7. Confirm the Clerk frontend API works locally.

### Convex setup

1. Create or connect a Convex project.
2. Configure Convex environment.
3. Configure Clerk as the auth provider for Convex using `CLERK_JWT_ISSUER_DOMAIN`.
4. Confirm Convex deploy/dev command works locally.
5. Add Convex URL to local environment.

### Vercel setup

1. Create a Vercel project.
2. Link the GitHub repository.
3. Configure preview and production environment variables.
4. Confirm Vercel uses pnpm.
5. Confirm build command.
6. Confirm output directory.
7. Confirm preview deployments are enabled.

### Repository setup

1. Add branch protection for `main`.
2. Require PR before merge.
3. Require status checks to pass before merge.
4. Require typecheck/lint/format/test/build checks.
5. Add `.env.local` locally only.
6. Add `.env.example` to source control.
7. Add `.gitignore` entries for local env files and generated artefacts.

## Suggested Vercel settings

- Framework preset: Vite
- Install command: `pnpm install --frozen-lockfile`
- Build command: `pnpm exec convex deploy --cmd-url-env-var-name VITE_CONVEX_URL --cmd "pnpm build"`
- Output directory: `dist`

These settings are captured in `vercel.json`. The build command deploys the
Convex schema and functions before running the Vite production build, and
injects the deployed Convex URL into `VITE_CONVEX_URL`.

Do not set `VITE_CONVEX_URL` manually in Vercel for Preview or Production. The
Convex deploy command provides that value to the nested Vite build, and a
manually configured Vercel value can override the deployment-specific URL.

Configure `CONVEX_DEPLOY_KEY` separately for Preview and Production in Vercel.
This server-side secret is required for the build command to deploy Convex, and
must not use a `VITE_` prefix. The per-environment key lets the same build
command target the correct Convex deployment for each environment.

## Deployment checks

Before production deployment:

- Typecheck passes.
- Lint passes.
- Format check passes.
- Unit tests pass.
- Component tests pass.
- E2E tests pass.
- Accessibility tests pass.
- Visual regression tests pass.
- Production build succeeds.
- Clerk redirects are configured.
- Convex environment variables are configured.
- Vercel production environment variables are configured.

## Security notes

- Do not store real secrets in source control.
- Do not expose Clerk secret key to frontend code.
- Use `VITE_` prefix only for frontend-safe variables.
- Enforce access control in Convex functions.
- Do not rely on client-side route protection alone.
