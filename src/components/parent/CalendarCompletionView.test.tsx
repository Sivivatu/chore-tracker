import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  CalendarCompletionView,
  type DashboardDay,
} from "@/components/parent/CalendarCompletionView";

const days: DashboardDay[] = [
  {
    date: "2026-05-25",
    scheduled: 0,
    approved: 0,
    submitted: 0,
    rejected: 0,
    paused: 0,
    isBeforeSignup: true,
  },
  {
    date: "2026-05-26",
    scheduled: 2,
    approved: 0,
    submitted: 0,
    rejected: 0,
    paused: 1,
    isBeforeSignup: false,
  },
  {
    date: "2026-05-27",
    scheduled: 3,
    approved: 1,
    submitted: 1,
    rejected: 1,
    paused: 0,
    isBeforeSignup: false,
  },
  {
    date: "2026-05-28",
    scheduled: 1,
    approved: 0,
    submitted: 0,
    rejected: 0,
    paused: 0,
    isBeforeSignup: false,
  },
  {
    date: "2026-05-29",
    scheduled: 0,
    approved: 0,
    submitted: 0,
    rejected: 0,
    paused: 0,
    isBeforeSignup: false,
  },
  {
    date: "2026-05-30",
    scheduled: 0,
    approved: 0,
    submitted: 0,
    rejected: 0,
    paused: 0,
    isBeforeSignup: false,
  },
  {
    date: "2026-05-31",
    scheduled: 0,
    approved: 0,
    submitted: 0,
    rejected: 0,
    paused: 0,
    isBeforeSignup: false,
  },
];

describe("CalendarCompletionView", () => {
  it("labels every live calendar state, including days before parent signup", () => {
    render(<CalendarCompletionView days={days} weekEnd="2026-05-31" />);

    expect(screen.getByText("Before signup")).toBeInTheDocument();
    expect(screen.getByText("Paused")).toBeInTheDocument();
    expect(screen.getByText("1 approved, 1 submitted, 1 rejected")).toBeInTheDocument();
    expect(screen.getByText("In progress")).toBeInTheDocument();
    expect(screen.getAllByText("No routines")).toHaveLength(3);
    expect(screen.getByText("Sat 30 May").parentElement).toHaveAttribute("data-weekend", "true");
    expect(screen.getByText("Sun 31 May").parentElement).toHaveClass("bg-teal/5");
    expect(screen.getByText("Mon 25 May").parentElement).toHaveAttribute("data-weekend", "false");
  });
});
