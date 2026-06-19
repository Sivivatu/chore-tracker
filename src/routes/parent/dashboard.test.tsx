import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ParentDashboardPage } from "./dashboard";

const queryState = vi.hoisted(() => ({
  lastWeeklyArgs: null as null | { weekStart: string; today: string },
  currentContext: "loaded" as "loaded" | "loading" | "missing",
  dashboard: "loaded" as "loaded" | "loading" | "empty",
}));

function weekEndFor(weekStart: string) {
  return {
    "2026-05-25": "2026-05-31",
    "2026-06-01": "2026-06-07",
    "2026-06-08": "2026-06-14",
  }[weekStart];
}

vi.mock("convex/react", () => ({
  useQuery: (query: { _name?: string }, args?: { weekStart: string; today: string } | "skip") => {
    if (query._name?.includes("currentContext")) {
      if (queryState.currentContext === "loading") return undefined;
      if (queryState.currentContext === "missing") return null;
      return {
        household: { _id: "household-1" },
        child: { name: "Maya" },
      };
    }

    if (query._name?.includes("weeklyOverview") && args && args !== "skip") {
      if (queryState.dashboard === "loading") return undefined;
      queryState.lastWeeklyArgs = args;
      return {
        weekStart: args.weekStart,
        weekEnd: weekEndFor(args.weekStart),
        signupDate: "2026-05-27",
        earliestWeekStart: "2026-05-25",
        currentWeekStart: "2026-06-08",
        summary: {
          completionPercentage: 75,
          submittedCount: 2,
          pointsEarned: 18,
          pausedCount: 1,
        },
        days:
          queryState.dashboard === "empty"
            ? [
                {
                  date: args.weekStart,
                  scheduled: 0,
                  approved: 0,
                  submitted: 0,
                  rejected: 0,
                  paused: 0,
                  isBeforeSignup: false,
                },
              ]
            : [
                {
                  date: args.weekStart,
                  scheduled: 2,
                  approved: 1,
                  submitted: 1,
                  rejected: 0,
                  paused: 0,
                  isBeforeSignup: false,
                },
              ],
      };
    }

    return undefined;
  },
}));

vi.mock("../../../convex/_generated/api", () => ({
  api: {
    households: { currentContext: { _name: "currentContext" } },
    dashboard: { weeklyOverview: { _name: "weeklyOverview" } },
  },
}));

vi.mock("@/components/parent/CompletionTrendChart", () => ({
  CompletionTrendChart: () => <div>Completion chart</div>,
}));

vi.mock("@/components/parent/CalendarCompletionView", () => ({
  CalendarCompletionView: () => <div>Calendar days</div>,
}));

describe("ParentDashboardPage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-14T10:00:00.000Z"));
    queryState.lastWeeklyArgs = null;
    queryState.currentContext = "loaded";
    queryState.dashboard = "loaded";
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts on the current Monday and navigates back only to the signup week", () => {
    render(<ParentDashboardPage />);

    expect(screen.getByRole("heading", { name: "This week for Maya" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "8 Jun to 14 Jun 2026" })).toBeInTheDocument();
    expect(queryState.lastWeeklyArgs).toMatchObject({
      weekStart: "2026-06-08",
      today: "2026-06-14",
    });
    expect(screen.getByRole("button", { name: "Next week" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Previous week" }));
    expect(screen.getByRole("heading", { name: "1 Jun to 7 Jun 2026" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next week" }));
    expect(screen.getByRole("heading", { name: "8 Jun to 14 Jun 2026" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Previous week" }));
    fireEvent.click(screen.getByRole("button", { name: "Previous week" }));
    expect(screen.getByRole("heading", { name: "25 May to 31 May 2026" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous week" })).toBeDisabled();
  });

  it("renders live summary values from the dashboard query", () => {
    render(<ParentDashboardPage />);

    expect(screen.getByText("75%")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("18")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("shows loading and missing-context states clearly", () => {
    queryState.currentContext = "loading";
    const { rerender } = render(<ParentDashboardPage />);

    expect(screen.getByText("Loading live dashboard data…")).toBeInTheDocument();

    queryState.currentContext = "missing";
    rerender(<ParentDashboardPage />);

    expect(
      screen.getByText("We could not load your parent dashboard. Please sign in again."),
    ).toBeInTheDocument();
  });

  it("shows an empty state when the selected live week has no activity", () => {
    queryState.dashboard = "empty";
    render(<ParentDashboardPage />);

    expect(screen.getByText("No dashboard activity for this week yet.")).toBeInTheDocument();
  });
});
