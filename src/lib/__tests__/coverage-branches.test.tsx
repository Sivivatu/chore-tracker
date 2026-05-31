import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StepIllustration } from "@/components/child/StepIllustration";
import { getCalendarSeries, getCompletionPercentage, getDashboardSummary } from "@/lib/dashboard";
import { getRecentDateKeys, isWithinPause, toDateKey } from "@/lib/dates";
import { canAccessChildRoutine } from "@/lib/permissions";
import { readChildSession } from "@/lib/child-session";

describe("remaining helper branches", () => {
  it("handles empty dashboard inputs", () => {
    expect(getCompletionPercentage([])).toBe(0);
    expect(getDashboardSummary([], [])).toMatchObject({
      completionPercentage: 0,
      submittedCount: 0,
      pointsEarned: 0,
    });
  });

  it("builds calendar series including paused indicators", () => {
    const series = getCalendarSeries(
      [],
      [
        {
          id: "pause-test",
          householdId: "household-1",
          startDate: "2026-05-31",
          endDate: "2026-05-31",
          reason: "Test pause",
          createdByParentId: "parent-1",
        },
      ],
    );
    expect(series).toHaveLength(7);
    expect(series.at(-1)).toMatchObject({ paused: 1 });
  });

  it("formats date keys and detects dates outside pause ranges", () => {
    expect(toDateKey(new Date("2026-05-31T10:00:00.000Z"))).toBe("2026-05-31");
    expect(getRecentDateKeys(new Date("2026-05-31T10:00:00.000Z"), 2)).toEqual([
      "2026-05-30",
      "2026-05-31",
    ]);
    expect(isWithinPause("2026-05-20", [])).toBe(false);
  });

  it("keeps child and parent routine access explicit", () => {
    expect(canAccessChildRoutine("child")).toBe(true);
    expect(canAccessChildRoutine("parent")).toBe(true);
  });

  it("drops malformed stored child sessions", () => {
    localStorage.setItem("chore-tracker-child-session", "{broken");
    expect(readChildSession()).toBeNull();
  });

  it("renders a fallback illustration label", () => {
    render(<StepIllustration illustrationKey="unknown" accent="#000000" />);
    expect(screen.getByLabelText("task illustration")).toBeInTheDocument();
  });
});
