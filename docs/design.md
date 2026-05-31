# Design System: Chore Routine App

## Reference

The child routine tracker is visually inspired by the uploaded “My Morning Routine” image.

The reference image uses a simple poster-like layout with a friendly title, large numbered circles, clear text labels, bright row dividers, and illustrative child-focused visuals for each step.

## Design principles

- Child-friendly
- Clear
- Low-friction
- Visual-first
- Mobile/tablet-first
- Parent dashboard should be clean, calm, and data-focused

## Child tracker visual language

- Large title area.
- Friendly rounded or handwritten-style typography for child-facing headings.
- High-contrast text.
- White or very light background.
- Large numbered coloured circles.
- Row-based routine layout.
- Illustration per routine step.
- Soft borders.
- Generous spacing.
- Large touch targets.
- Minimal visual clutter.
- Strong separation between steps.

## Colour use

- Each chore row should have a distinct accent colour.
- Number circles should use bright, friendly colours.
- The child view can use stronger colours than the parent dashboard.
- Dashboard should use calmer neutral surfaces with clear chart accents.
- Colour must not be the only indicator of completion, approval, rejection, or paused state.

## Layout rules

- Child tracker rows should be large enough for easy tapping.
- Minimum touch target: 44px.
- Mobile should use stacked or compact layout where needed.
- Tablet should closely resemble the uploaded reference layout.
- Desktop should centre the child tracker in a constrained max-width container.
- Use generous vertical rhythm.
- Avoid dense tables in the child view.
- Parent dashboard may use cards, charts, and denser layouts when appropriate.

## Child routine row structure

Each routine step row should include:

1. Numbered colour badge.
2. Chore title.
3. Optional short description.
4. Static illustration.
5. Completion checkbox.
6. Completion state.

The visual hierarchy should make the chore title and completion action immediately obvious.

## Illustration rules

- Use static AI-generated-style illustrations.
- Illustrations should be consistent in style.
- Use simple, cheerful child-safe scenes.
- Avoid photorealism.
- Avoid clutter.
- Avoid overly detailed backgrounds.
- Store illustration assets locally or behind stable asset keys.
- Each illustration should map clearly to the chore action.

Example illustration subjects:

- Getting dressed
- Making the bed
- Eating breakfast
- Brushing teeth
- Putting on shoes
- Packing or collecting a school bag
- Leaving for school
- Tidying toys
- Reading
- Getting ready for bed

## Typography

### Child-facing UI

- Use a friendly rounded font for headings.
- Use highly readable sans-serif body text.
- Keep chore labels large.
- Avoid small explanatory text in the main child flow.

### Parent-facing UI

- Use a cleaner product/dashboard typography style.
- Optimise for legibility and data review.
- Avoid the child poster style dominating management screens.

## Components

Required components:

- `RoutineCard`
- `RoutineStepRow`
- `StepNumberBadge`
- `StepIllustration`
- `CompletionCheckbox`
- `SubmitForApprovalButton`
- `ParentApprovalPanel`
- `DashboardMetricCard`
- `CompletionTrendChart`
- `CalendarCompletionView`
- `RewardPointsCard`
- `HolidayPauseBadge`

## Completion states

### Not started

- Checkbox empty.
- Row uses normal background.
- Step title fully visible.

### Completed locally

- Checkbox checked.
- Brief success animation.
- Clear tick mark.
- Optional subtle row highlight.

### Submitted

- Routine is read-only.
- Show “Waiting for parent approval”.

### Approved

- Show clear approved state.
- Points are counted.

### Rejected

- Show parent note if available.
- Allow child to update and resubmit if appropriate.

### Paused

- Show paused state in dashboard/calendar.
- Do not present as failure.

## Animation rules

- No heavy animation in v1.
- No sound in v1.
- No confetti in v1.
- No character animation in v1.
- Use only a small success animation when a checkbox is ticked.

## Responsive targets

Design mobile and tablet first.

Target devices:

- Pixel 8
- Pixel 9 Pro
- Samsung Galaxy Tab S4

The UI must remain usable on desktop.

## Accessibility

- Text must remain readable on mobile.
- All controls must be keyboard accessible.
- Checkbox state must be available to screen readers.
- Colour must not be the only indicator of state.
- Maintain sufficient contrast.
- Parent dashboard charts should include readable labels and non-colour indicators where practical.
- Child PIN input should support screen reader labels.
- Error states should be descriptive and non-punitive.
