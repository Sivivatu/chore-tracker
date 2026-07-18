# Testing Strategy: Child Chore & Routine Tracking Web App

## Testing approach

Development must follow TDD.

For each feature:

1. Define expected behaviour.
2. Write or update tests first.
3. Implement the smallest change required.
4. Refactor only after tests pass.
5. Keep tests meaningful and user-behaviour focused.

## Required test types

- Unit tests
- Component tests
- E2E tests
- Accessibility tests
- API/data-layer tests
- Visual regression tests

## Recommended tooling

- Vitest for unit tests
- React Testing Library for component tests
- Playwright for E2E tests
- axe or equivalent for accessibility checks
- Playwright screenshot tests for visual regression
- Convex test utilities or mocked Convex client for data-layer tests

## Coverage requirement

Minimum coverage target: **80%**.

The repository enforces this threshold through Vitest coverage in `vite.config.ts`.

Coverage should apply to:

- Business logic
- Route guards
- Convex function helpers
- Routine completion logic
- Approval workflow
- Dashboard calculations
- Holiday pause logic
- Points calculation

Do not optimise for 100% coverage if it leads to brittle or low-value tests.

## Critical test scenarios

### Authentication

- Parent can access parent routes when signed in.
- Unauthenticated user cannot access parent routes.
- Child cannot access parent routes from child mode.
- Sign-out clears protected access.

### Child PIN

- Correct PIN unlocks child mode.
- Incorrect PIN is rejected.
- PIN state does not grant parent permissions.
- Parent can reset child PIN.

### Routine templates

- Parent can create a routine.
- Parent can edit a routine.
- Parent can deactivate a routine.
- Parent can add chore steps.
- Parent can reorder chore steps.

### Daily routine instances

- Daily routine instance is created from active template.
- Instance snapshots template fields.
- Historical instance does not change when template is edited.
- Daily reset creates the correct new instance.

### Child completion

- Child sees routine steps in configured order.
- Child can tick steps out of order.
- Completion count updates.
- Child can submit routine.
- Submitted routines can be updated only until the end of their scheduled day in the household timezone; approved and expired routines are read-only, while rejected routines can be corrected and resubmitted.

### Parent approval

- Submitted routine appears in approval queue.
- Parent can approve routine.
- Approved routine updates completion history.
- Approved routine awards points.
- Parent can reject routine with note.
- Rejected routine becomes visible to child for correction.

### Holiday pause

- Parent can create a pause date range.
- Paused days do not count as missed.
- Paused days do not break streaks by default.
- Calendar displays paused days.

### Rewards

- Parent can create a reward.
- A reward saved without an image or icon gets a persisted random SVG icon.
- Parent can edit a reward and choose a specific SVG icon.
- Reward title, points cost, active state and selected icon persist after reload.
- Invalid reward saves show inline validation and do not submit.
- UploadThing image uploads are covered by manual/smoke E2E with Clerk and `UPLOADTHING_TOKEN`, not by CI E2E.

### Dashboard

- Daily completion calculation is correct.
- Completion over time is correct.
- Missed count excludes paused days.
- Streak calculation ignores paused days.
- Points totals only include approved points.

### Accessibility

- Child routine screen supports keyboard navigation.
- Checkbox state is announced by screen readers.
- PIN input is labelled.
- Dashboard charts have accessible labels or supporting text.
- Colour is not the only indicator of status.

### Visual regression

Capture and compare key screens:

- Child unlock screen
- Child today screen
- Child routine screen
- Submitted state
- Approved state
- Parent dashboard
- Approval queue
- Calendar view

## CI expectations

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

Current implementation scripts are documented in `README.md`; CI runs typecheck, lint, format, unit/component coverage tests, and build. Playwright smoke tests are available through `pnpm test:e2e`.

## Merge protection

Merging to `main` must be blocked if PR tests fail.
