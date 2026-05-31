# Architecture: Child Chore & Routine Tracking Web App

## Stack

- Vite
- React
- TypeScript
- pnpm
- TanStack Router
- Tailwind CSS
- shadcn/ui
- Recharts
- Clerk
- Convex
- Vercel
- GitHub Actions

## Frontend architecture

Suggested source structure:

```txt
src/
  app/
    router.tsx
    providers.tsx
  components/
    child/
    parent/
    dashboard/
    shared/
  features/
    auth/
    child-mode/
    routines/
    approvals/
    rewards/
    reminders/
    holiday-pauses/
    dashboard/
  lib/
    dates.ts
    permissions.ts
    child-session.ts
    formatting.ts
  routes/
    __root.tsx
    sign-in.tsx
    sign-up.tsx
    parent/
    child/
  test/
    fixtures/
    mocks/
```

Implementation note: the project now uses the `src/` TanStack Router structure. The previous React Router starter files have been removed, and app routes are defined centrally in `src/app/router.tsx`.

## Backend architecture

Use Convex for data storage and server-side functions.

Suggested Convex structure:

```txt
convex/
  schema.ts
  auth.config.ts
  households.ts
  parents.ts
  children.ts
  routines.ts
  routineInstances.ts
  approvals.ts
  rewards.ts
  reminders.ts
  holidayPauses.ts
  dashboard.ts
  audit.ts
```

Implementation note: Convex schema and function modules exist under `convex/`. Local `_generated` shims are present so TypeScript can run before the project is linked; running `pnpm exec convex codegen` after `CONVEX_DEPLOYMENT` is configured should replace them with real generated bindings.

## Data ownership

All owned data should include `householdId`, even though v1 only supports a single household. This preserves a clean migration path to multi-household support.

## Security boundaries

- Clerk authenticates parents.
- Child profile uses PIN mode inside a parent-authenticated household context.
- Parent-only screens are protected in the client.
- Convex functions enforce the real data access boundary.
- No Convex function should return parent-only data to child-mode views.
- Do not use Vercel middleware as the primary security model.

## Route protection

Public routes:

- `/sign-in`
- `/sign-up`

Parent routes:

- `/parent/*`

Child routes:

- `/child/unlock`
- `/child/today`
- `/child/routine/:routineInstanceId`

## Core domain entities

- Household
- Parent membership
- Child profile
- Routine template
- Chore step template
- Daily routine instance
- Daily step instance
- Approval event
- Reward configuration
- Reward event
- Reminder setting
- Holiday pause
- Audit event

## Snapshot strategy

Routine templates are editable. Daily routine instances must store snapshots of the routine and step metadata so historical reporting does not change when templates are updated.

Snapshot fields should include:

- Routine name
- Routine type
- Step title
- Step order
- Step description
- Step points
- Step required flag
- Illustration key

## Dashboard calculations

Dashboard functions should centralise calculations for:

- Daily completion percentage
- Approved routines count
- Submitted routines count
- Missed routines count
- Paused routines count
- Streaks
- Points earned
- Calendar status by day

## Audit events

Audit events should be created for:

- Routine created
- Routine edited
- Step completed
- Routine submitted
- Routine approved
- Routine rejected
- Points awarded
- Holiday pause created
- Child PIN changed

## Future expansion considerations

Keep these future needs in mind, but do not implement them in v1:

- Multi-household support
- Multiple children
- More than two parents
- Reward redemption flow
- Browser push notifications
- Email notifications
- Native mobile app
