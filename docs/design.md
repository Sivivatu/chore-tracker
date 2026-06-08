```yaml
version: "alpha"
name: "Chore Routine App"
description: "A child-friendly routine tracker design system based on the local My Morning Routine reference image, with a calmer parent dashboard style."
colors:
  primary: "#0B3F91"
  on-primary: "#FFFFFF"
  secondary: "#111827"
  background: "#FFFFFF"
  surface: "#F8FAFC"
  surface-strong: "#E0F2FE"
  border: "#0EA5E9"
  accent-blue: "#1D9BF0"
  accent-green: "#65C832"
  accent-yellow: "#FFC928"
  accent-purple: "#A855C7"
  accent-orange: "#FF8427"
  accent-teal: "#24B9B6"
  accent-pink: "#F64E8B"
  success: "#15803D"
  warning: "#B45309"
  danger: "#B91C1C"
  paused: "#64748B"
typography:
  child-title:
    fontFamily: "Baloo 2, Nunito, system-ui, sans-serif"
    fontSize: "3rem"
    fontWeight: "800"
    lineHeight: "1.05"
    letterSpacing: "0"
  child-step:
    fontFamily: "Comic Neue, Nunito, system-ui, sans-serif"
    fontSize: "2rem"
    fontWeight: "700"
    lineHeight: "1.2"
    letterSpacing: "0"
  body-md:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: "400"
    lineHeight: "1.5"
    letterSpacing: "0"
  dashboard-title:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: "700"
    lineHeight: "1.25"
    letterSpacing: "0"
rounded:
  sm: "6px"
  md: "8px"
  lg: "14px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  routine-card:
    backgroundColor: "{colors.background}"
    textColor: "{colors.secondary}"
    rounded: "{rounded.lg}"
    padding: "16px"
  routine-step-row:
    backgroundColor: "{colors.background}"
    textColor: "{colors.secondary}"
    rounded: "{rounded.sm}"
    padding: "12px"
  step-number-badge:
    backgroundColor: "{colors.accent-blue}"
    textColor: "{colors.on-primary}"
    typography: "{typography.child-step}"
    rounded: "{rounded.pill}"
    size: "76px"
  submit-for-approval-button:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.md}"
    padding: "14px"
  dashboard-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.secondary}"
    rounded: "{rounded.md}"
    padding: "16px"
```

## Overview

The child routine tracker is visually anchored to the local reference image:

![My Morning Routine](./img/My%20Morning%20Routine.png)

Use this image as the canonical style source for child-facing routine screens. It is a simple poster layout with a large friendly title, seven horizontal routine rows, oversized numbered colour circles, clear black step labels, bright row outlines, and cheerful static illustrations. Replicate that visual grammar across all child-facing routines, not just morning routines.

Parent-facing areas use the same product vocabulary only lightly. They should feel calm, scannable, and data-focused rather than poster-like.

Core design principles:

- Child-friendly
- Clear
- Low-friction
- Visual-first
- Mobile and tablet first
- Calm, structured parent management surfaces

## Colours

The morning routine reference uses a white background, dark blue title text, black step labels, and a repeating set of bright row accents. The child tracker should use these accents for rows, number badges, progress states, and illustration framing.

- **Primary (`#0B3F91`)**: dark friendly blue for major child-facing headings and primary actions.
- **Secondary (`#111827`)**: near-black for routine step labels and dashboard body text.
- **Background (`#FFFFFF`)**: clean poster surface.
- **Surface (`#F8FAFC`)**: quiet dashboard panel surface.
- **Accent sequence**: blue, green, yellow, purple, orange, teal, pink. Use in this order for routine rows so the layout echoes the reference image.
- **State colours**: success, warning, danger, and paused colours must be paired with text, icons, or labels. Colour alone is never enough.

For child rows, keep accents bright and saturated. For parent dashboard charts and cards, use the same hues at lower density with neutral surfaces.

## Typography

Child-facing UI should look close to the reference poster:

- Use `child-title` for the routine title. It should be large, rounded, and playful.
- Use `child-step` for routine labels. Labels should be large, black or near-black, and easy for a child to scan quickly.
- Avoid small explanatory text in the main child flow.
- Keep letter spacing at `0`.

Parent-facing UI should use `body-md` and `dashboard-title`. It should be more restrained and optimised for review, approval, trends, and settings.

## Layout

Design mobile and tablet first.

Routine layouts should preserve the reference structure:

- A prominent title area at the top.
- A poster-like white routine panel.
- Horizontal rows with strong coloured separators.
- Left column for the numbered badge.
- Centre column for the step label.
- Right column for the illustration.
- Completion control placed consistently without competing with the label or illustration.

Responsive behaviour:

- **Mobile**: rows may become slightly taller and illustrations may reduce, but the numbered badge, label, and completion action must remain visible without horizontal scrolling.
- **Tablet**: closely resemble the reference image, including the three-column poster row structure.
- **Desktop**: centre the child tracker in a constrained max-width container.
- **Parent dashboard**: may use cards, charts, calendar views, and denser layouts where appropriate.

Minimum touch target is `44px`. Fixed-format elements such as badges, checkboxes, toolbar buttons, and calendar cells need stable dimensions so text and hover states do not shift the layout.

## Elevation & Depth

The child tracker should feel printed and flat, not heavily layered.

- Prefer outlines, dividers, and white space over shadows.
- Use only subtle elevation for modals or parent dashboard cards.
- Do not put cards inside cards.
- Do not add decorative gradient blobs, orbs, or abstract backgrounds.

## Shapes

- Routine cards may use `lg` rounding.
- Row corners and dashboard cards use `md` or smaller rounding.
- Number badges are circular using `pill` rounding and equal width and height.
- Buttons use `md` rounding.
- Avoid highly rounded rectangular text pills when a clear icon, checkbox, badge, or button would communicate the action better.

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

### RoutineCard

The main child-facing container. It should look like a clean routine poster: white background, bright outer border, large title, stacked rows, and generous spacing. Use the local morning routine image as the visual target.

### RoutineStepRow

Each routine step row includes:

1. Numbered colour badge.
2. Chore title.
3. Optional short description outside the primary label hierarchy.
4. Static illustration.
5. Completion checkbox.
6. Completion state.

The visual hierarchy must make the chore title and completion action immediately obvious.

### StepNumberBadge

Use large circular badges with white numbers. Cycle through the accent sequence in the same order as the reference image.

### StepIllustration

Illustrations should be static, cheerful, child-safe, and consistent in style. Use clean cartoon scenes with simple backgrounds, soft outlines, and clear action mapping.

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

Avoid photorealism, clutter, complex backgrounds, and inconsistent illustration styles. Store illustration assets locally or behind stable asset keys.

### CompletionCheckbox

The checkbox should be large enough for children to tap confidently. The checked state must include a clear tick mark and an accessible state label.

### ParentApprovalPanel

Use the calmer dashboard style. Approval, rejection, notes, and resubmission should be explicit and non-punitive.

## Do's and Don'ts

Do:

- Use the morning routine image as the canonical child-facing style reference.
- Preserve the row-based poster structure for routine flows.
- Use large numbered coloured circles for routine order.
- Keep labels short, direct, and highly readable.
- Use bright accents for children and calmer surfaces for parents.
- Include non-colour indicators for every state.

Don't:

- Replace the child tracker with a dense table.
- Let dashboard styling dominate the child routine view.
- Use photorealistic images or overly detailed artwork.
- Add heavy animation, sound, confetti, or character animation in v1.
- Make paused days look like failures.
- Use colour alone to communicate completion, approval, rejection, or paused state.

## Completion States

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
- Show "Waiting for parent approval".

### Approved

- Show clear approved state.
- Points are counted.

### Rejected

- Show parent note if available.
- Allow child to update and resubmit if appropriate.

### Paused

- Show paused state in dashboard and calendar.
- Do not present as failure.

## Animation Rules

- No heavy animation in v1.
- No sound in v1.
- No confetti in v1.
- No character animation in v1.
- Use only a small success animation when a checkbox is ticked.

## Responsive Targets

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
