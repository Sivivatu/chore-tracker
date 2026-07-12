# PRD: Child Chore & Routine Tracking Web App

## 1. Product summary

Build a mobile-first chore and routine tracking web app for a single household. Parents create and manage routines, chores, rewards, schedules, child profiles, reminders, and approvals. Children use a simplified PIN-based profile experience to complete routine steps in a highly visual checklist interface inspired by the uploaded “My Morning Routine” reference image.

The app must be built with:

- Vite
- React
- TypeScript
- pnpm
- TanStack Router
- Tailwind CSS
- shadcn/ui
- Recharts
- Clerk authentication
- Convex backend
- Vercel deployment
- Full TDD workflow and CI quality gates

## 2. Product goals

### Primary goals

1. Allow parents to create reusable chore/routine templates.
2. Allow one child to complete assigned routines using a visual, simple, tablet/mobile-friendly interface.
3. Require parent verification before submitted chores count as approved.
4. Track daily completion by child and routine.
5. Provide a parent dashboard showing completion, missed routines, streaks, trends, calendar history, and rewards/points.
6. Deploy safely to Vercel with Clerk and Convex configured.
7. Enforce automated testing and CI checks before changes reach `main`.

### Non-goals for v1

1. Multi-household support.
2. More than one child profile.
3. More than two parent users.
4. Public sharing.
5. Complex compliance workflow.
6. Reward redemption marketplace.
7. Multi-school/classroom support.
8. Native mobile apps.
9. Animation-heavy child experience.

## 3. Target users

### Parent

Parents authenticate using Clerk and manage all app configuration.

Parent capabilities:

- Sign in with Google.
- Sign in via magic link.
- Create and manage the child profile.
- Set the child PIN.
- Create routines.
- Create chore steps.
- Assign points/rewards.
- Configure reminders.
- Review submitted routines.
- Approve or reject child submissions.
- View dashboards and history.
- Pause routines for holidays.

### Child

The child does not have an email login. The child accesses their profile through a parent-authenticated session and enters a child PIN to use the child-facing routine tracker.

Child capabilities:

- Select/access their profile.
- Enter PIN.
- View today’s available routines.
- Open a routine.
- Tick off chores visually.
- Submit completed routine for parent approval.
- See simple points/streak feedback.

## 4. Authentication and authorisation

### Clerk requirements

Use Clerk for parent authentication.

Required login methods:

- Google sign-in.
- Magic link / email link sign-in.

Clerk should be integrated with Convex so authenticated Clerk user identity can be used by Convex functions.

### Child access model

The child does not have a Clerk account.

The child profile is owned by the household. Access is granted through:

1. Parent signs in with Clerk.
2. Parent opens the child mode.
3. Child enters PIN.
4. App stores child-mode session state locally for that browser/device.
5. Sensitive parent routes remain inaccessible from child mode without returning to parent mode.

### Roles

| Role | Description | Access |
|---|---|---|
| Parent | Clerk-authenticated adult | Full household management |
| Child | PIN-unlocked child profile | Can complete assigned routines only |

### Backend security rules

Every Convex query and mutation must verify:

1. Authenticated Clerk identity where required.
2. Household ownership.
3. Role capability.
4. Child profile scope.
5. No cross-household access, even though v1 only supports one household.

Do not rely only on client-side route guards.

## 5. Household model

v1 supports one household only.

The data model should still include `householdId` on all household-owned records to keep future multi-household expansion possible.

Supported v1 household constraints:

- One household.
- Up to two parents.
- One child.
- Multiple routine templates.
- Multiple active routines.
- Daily completion tracking.
- Holiday pause support.

## 6. Routine and chore model

### Routine types

Support these routine categories from v1:

- Morning routine
- Bedtime routine
- Weekend chores
- Custom routine

### Routine template

A routine template is reusable and contains ordered chore steps.

Required routine fields:

| Field | Notes |
|---|---|
| `id` | Convex document ID |
| `householdId` | Required |
| `name` | Example: “Morning Routine” |
| `type` | Morning, bedtime, weekend, custom |
| `description` | Optional |
| `isActive` | Boolean |
| `resetFrequency` | Daily for v1 |
| `createdByParentId` | Clerk user reference |
| `createdAt` | Timestamp |
| `updatedAt` | Timestamp |

### Chore step

Each routine contains multiple chore steps.

Required step fields:

| Field | Notes |
|---|---|
| `id` | Convex document ID |
| `routineTemplateId` | Parent routine |
| `title` | Example: “Brush teeth” |
| `description` | Optional |
| `order` | Numeric sequence |
| `illustrationKey` | Static generated image reference |
| `isRequired` | Boolean |
| `estimatedMinutes` | Optional |
| `dueTime` | Optional |
| `points` | Numeric |
| `recurrence` | Daily for v1 |
| `createdAt` | Timestamp |
| `updatedAt` | Timestamp |

### Completion behaviour

Steps should be displayed in order, but the child can complete them out of order.

The UI should encourage sequential completion visually, but should not hard-block ticking later steps.

### Daily reset

Routine completion resets daily.

Each day creates a distinct routine instance/snapshot so history is preserved even if templates later change.

## 7. Snapshot and history rules

When a daily routine instance is created, it must snapshot the routine and chore step names, order, points, and illustration references.

Reason: if a parent edits a routine later, historical completion data must still reflect what the child saw at the time.

### Daily routine instance

| Field | Notes |
|---|---|
| `id` | Convex document ID |
| `householdId` | Required |
| `childId` | Required |
| `routineTemplateId` | Source template |
| `routineNameSnapshot` | Stored name |
| `routineTypeSnapshot` | Stored type |
| `date` | Local date |
| `status` | Not started, in progress, submitted, approved, rejected, missed, paused |
| `totalSteps` | Count |
| `completedSteps` | Count |
| `totalPointsPossible` | Count |
| `pointsSubmitted` | Count |
| `pointsApproved` | Count |
| `submittedAt` | Optional |
| `approvedAt` | Optional |
| `approvedByParentId` | Optional |
| `createdAt` | Timestamp |

### Daily step instance

| Field | Notes |
|---|---|
| `id` | Convex document ID |
| `routineInstanceId` | Parent daily routine |
| `stepTemplateId` | Source step |
| `titleSnapshot` | Stored title |
| `descriptionSnapshot` | Stored description |
| `orderSnapshot` | Stored order |
| `illustrationKeySnapshot` | Stored image reference |
| `pointsSnapshot` | Stored points |
| `isRequiredSnapshot` | Stored required flag |
| `isCompleted` | Boolean |
| `completedAt` | Optional |
| `completedByChildId` | Optional |

## 8. Approval workflow

### Child flow

1. Child opens today’s routine.
2. Child ticks completed steps.
3. Child submits the routine.
4. Routine status becomes `submitted`.
5. Parent receives an in-app review item.
6. Submitted routines remain editable by the child until the end of the routine's scheduled day in the household timezone; each update remains pending review and creates a new submission revision.

### Parent flow

Parent can:

- View submitted routine.
- See completed and incomplete steps.
- Approve routine.
- Reject routine.
- Add optional rejection note.
- Return routine to child for correction.

### Status values

| Status | Meaning |
|---|---|
| `not_started` | Daily routine created but untouched |
| `in_progress` | At least one step ticked |
| `submitted` | Child submitted for approval |
| `approved` | Parent verified completion |
| `rejected` | Parent rejected submission |
| `missed` | Day ended without approved completion |
| `paused` | Routine skipped due to holiday pause |

## 9. Holiday pause

Parents can pause routines for holidays.

### Pause requirements

- Parent can create date ranges where routines do not count as missed.
- Paused dates should appear in dashboard/calendar as paused, not failed.
- Paused routines should not break streaks unless configured otherwise.
- v1 default: paused days do **not** break streaks.

Required pause fields:

| Field | Notes |
|---|---|
| `id` | Convex document ID |
| `householdId` | Required |
| `name` | Example: “Half-term” |
| `startDate` | Local date |
| `endDate` | Local date |
| `appliesToRoutineTypes` | Optional |
| `createdByParentId` | Required |
| `createdAt` | Timestamp |

## 10. Rewards and points

### v1 rewards

The app should support configurable points and simple reward tracking.

Required v1 features:

- Each chore step can have points.
- Approved routines add approved points to the child’s balance.
- Dashboard shows total points earned.
- Parent can configure reward options.
- Reward redemption flow is a future milestone.

### Future milestone

Reward redemption:

- Child requests reward.
- Parent approves redemption.
- Points deducted.
- Redemption history stored.

## 11. Notifications and reminders

Notifications should be configurable.

### v1 reminders

Support in-app reminder configuration first.

Optional browser push/email reminders can be planned but not required unless implementation is straightforward.

Reminder fields:

| Field | Notes |
|---|---|
| `id` | Convex document ID |
| `householdId` | Required |
| `routineTemplateId` | Optional |
| `timeOfDay` | Local time |
| `daysOfWeek` | For v1 daily default |
| `enabled` | Boolean |
| `message` | Optional |
| `createdAt` | Timestamp |

### Reminder examples

- “Start morning routine at 7:15”
- “Submit bedtime routine before 20:00”
- “Parent approval reminder at 20:30”

## 12. Child-facing UI

### Design requirement

Create a `design.md` file before implementation. This file must convert the uploaded reference image into concrete design rules for the coding agent.

The child routine tracker should closely mirror the uploaded image style:

- Large title at top.
- Friendly handwritten-style heading.
- Soft white background.
- Large numbered coloured circles on the left.
- Chore title in large, readable text.
- Static illustration on the right.
- Table/list layout with strong horizontal row separation.
- Bright, child-friendly colours.
- Clear checkbox/tick action for completion.
- Success animation when a step is ticked.
- No complex animations beyond tick success feedback.

### Responsive targets

Design mobile and tablet first.

Target devices:

- Pixel 8
- Pixel 9 Pro
- Samsung Galaxy Tab S4

The UI must also be responsive for general desktop use.

### Child routine screen

Required elements:

- Routine title.
- Date.
- Progress indicator.
- Ordered chore list.
- Numbered coloured circles.
- Chore labels.
- Illustration per chore.
- Tick box per chore.
- Submit button.
- “Waiting for parent approval” state.
- Rejected state with parent note.

### Tick animation

Use a small success animation only:

- Checkbox tick.
- Brief visual confirmation.
- No confetti in v1.
- No sound in v1.
- No character animation in v1.

## 13. Parent dashboard

The parent dashboard should provide a clear management view of completion over time.

### Required dashboard views

1. Daily completion
2. Completion over time
3. Trends
4. Missed routines
5. Streaks
6. Calendar view
7. Rewards/points

### Suggested dashboard components

Use Recharts where charting is required.

Recommended charts:

| View | Suggested visual |
|---|---|
| Daily completion | KPI cards + progress bar |
| Completion over time | Line chart |
| Trends by routine type | Bar chart |
| Missed routines | Count card + recent missed list |
| Streaks | Streak card + calendar heatmap-style view |
| Rewards/points | Points balance card + points earned over time |
| Calendar | Month grid with status indicators |

### Dashboard filters

Include:

- Date range
- Routine type
- Status
- Approved/submitted/missed/paused

## 14. Parent management screens

Required screens:

1. Parent dashboard
2. Routine template list
3. Create/edit routine
4. Create/edit chore steps
5. Child profile settings
6. Child PIN settings
7. Approval queue
8. Rewards settings
9. Reminder settings
10. Holiday pause settings

## 15. Routing

Use TanStack Router.

Suggested route structure:

```txt
/
  /sign-in
  /sign-up
  /parent
    /dashboard
    /routines
    /routines/new
    /routines/:routineId
    /approvals
    /child-profile
    /rewards
    /reminders
    /holiday-pauses
    /settings
  /child
    /unlock
    /today
    /routine/:routineInstanceId
```

Route protection:

- Public: `/sign-in`, `/sign-up`
- Parent-only: `/parent/*`
- Child PIN mode: `/child/*`
- Unknown routes: friendly 404 page

## 16. Backend: Convex

Use Convex as the backend and database.

Convex must store:

- Household
- Parent membership
- Child profile
- Child PIN hash
- Routine templates
- Chore step templates
- Daily routine instances
- Daily step instances
- Approvals
- Rewards
- Reward events
- Reminder settings
- Holiday pauses
- Audit events

Suggested structure:

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

### Convex auth

Use Clerk identity in Convex functions.

All parent mutations must require Clerk auth.

Child operations must validate:

1. Parent-authenticated household session exists.
2. Child PIN mode is active client-side.
3. Operation is limited to the configured child profile.
4. Backend does not expose parent-only data to child routes.

## 17. Audit trail

Because parents need audit/approval of completed chores, store audit events.

Audit events should capture:

| Field | Notes |
|---|---|
| `id` | Convex document ID |
| `householdId` | Required |
| `actorType` | Parent or child |
| `actorId` | Parent ID or child ID |
| `eventType` | Step completed, routine submitted, routine approved, routine rejected, routine edited |
| `entityType` | Routine, step, reward, pause |
| `entityId` | Related document |
| `metadata` | JSON object |
| `createdAt` | Timestamp |

## 18. Testing strategy

Development must follow TDD.

### Required test types

1. Unit tests
2. Component tests
3. E2E tests
4. Accessibility tests
5. API/data-layer tests
6. Visual regression tests

### Tooling

Recommended:

- Vitest for unit tests
- React Testing Library for components
- Playwright for E2E
- axe or equivalent for accessibility checks
- Playwright screenshot tests for visual regression
- Convex test utilities or mocked Convex client for data-layer tests

### Coverage

Minimum coverage target: **80%**.

Coverage should apply to:

- Business logic
- Route guards
- Convex function helpers
- Routine completion logic
- Approval workflow
- Dashboard calculations

Do not chase 100% coverage at the expense of meaningful tests.

## 19. CI requirements

Use GitHub Actions.

### Every push

Run:

- Install with pnpm
- Typecheck
- Lint
- Format check

### Every pull request

Run:

- Install with pnpm
- Typecheck
- Lint
- Format check
- Unit tests
- Component tests
- Accessibility tests
- E2E tests
- Build
- Dependency/security audit

### Main branch rule

Merging to `main` must be blocked if PR tests fail.

Do not rely on tests being run only after merge.

### Main build

The production build should run after merge/deploy, but the required test gate must happen before merge.

## 20. Deployment

Deploy to Vercel.

Environments:

- Preview
- Production

Environment variables should be managed through Vercel project settings rather than committed to source control.

### Required deployment artefacts

Codex must generate:

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

## 21. Environment variables

Create `.env.example`.

Indicative variables:

```bash
# Clerk
VITE_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

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

## 22. Manual pre-setup steps before PRD implementation

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
3. Configure Clerk as the auth provider for Convex.
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

## 23. Acceptance criteria

### Authentication

- Parent can sign in with Google.
- Parent can sign in with magic link.
- Parent can sign out.
- Parent-only routes are inaccessible when unauthenticated.
- Child cannot access parent screens from child mode.

### Child profile

- Parent can create one child profile.
- Parent can set/update child PIN.
- Child can unlock child mode with PIN.
- Incorrect PIN is rejected.

### Routine management

- Parent can create routine templates.
- Parent can create chore steps.
- Parent can reorder steps.
- Parent can assign points.
- Parent can set routine type.
- Parent can activate/deactivate routines.

### Child completion

- Child can view today’s routine.
- Child can tick steps in any order.
- UI displays steps in configured order.
- Child can submit routine for approval.
- Submitted routine becomes pending approval.

### Parent approval

- Parent can see submitted routine.
- Parent can approve submitted routine.
- Parent can reject submitted routine.
- Approved routines update completion history and points.
- Rejected routines return to child with status and note.

### Dashboard

- Dashboard shows today’s completion.
- Dashboard shows completion over time.
- Dashboard shows missed routines.
- Dashboard shows streaks.
- Dashboard shows calendar history.
- Dashboard shows rewards/points.

### Holiday pause

- Parent can create a holiday pause.
- Paused days do not count as missed.
- Paused days do not break streaks by default.
- Calendar displays paused state.

### Testing

- 80% coverage target is enforced.
- Unit tests pass.
- Component tests pass.
- E2E tests pass.
- Accessibility tests pass.
- Visual regression tests pass.
- CI blocks merge on failure.

### Deployment

- App deploys to Vercel preview.
- App deploys to Vercel production.
- Environment variables are documented.
- README includes setup and deployment instructions.

## 24. Implementation milestones

### Milestone 1: Foundation

- Vite + React + TypeScript app
- pnpm setup
- Tailwind + shadcn/ui
- TanStack Router
- Clerk auth
- Convex backend
- Basic protected routes
- CI skeleton

### Milestone 2: Design system

- Create `/docs/design.md`
- Implement child tracker components
- Add static placeholder illustrations
- Implement responsive mobile/tablet layout
- Add accessibility baseline

### Milestone 3: Data model

- Convex schema
- Household model
- Parent membership
- Child profile
- Child PIN
- Routine templates
- Chore step templates
- Daily routine snapshots

### Milestone 4: Child routine flow

- Child unlock
- Today’s routine view
- Tick completion
- Submit for approval
- Submitted/rejected/approved states

### Milestone 5: Parent management

- Routine editor
- Chore step editor
- Child settings
- Reminder settings
- Holiday pause settings

### Milestone 6: Approval and audit

- Approval queue
- Approve/reject workflow
- Audit log events
- Points allocation on approval

### Milestone 7: Dashboard

- Daily completion
- Completion trend
- Missed routines
- Streaks
- Calendar view
- Rewards/points summary

### Milestone 8: Testing and hardening

- Unit tests
- Component tests
- E2E tests
- Accessibility tests
- Visual regression tests
- Coverage enforcement
- Security review
- README and deployment docs
