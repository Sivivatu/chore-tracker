import { describe, expect, it } from "vitest";
import { holidayPauses, routineInstances, routineTemplates } from "@/test/fixtures/domain";
import { getApprovalQueue, getDashboardSummary, getMissedCount } from "@/lib/dashboard";
import { isWithinPause } from "@/lib/dates";
import { getApprovedPoints, getCompletedPoints } from "@/lib/points";
import { createRoutineSnapshot } from "@/lib/snapshots";
import { canAccessParentData, isParentForHousehold } from "@/lib/permissions";
import { parents } from "@/data/seed";

describe("business rules", () => {
  it("keeps template snapshots independent from later template edits", () => {
    const template = routineTemplates[0];
    const snapshot = createRoutineSnapshot(template, "child-1", "2026-06-01");

    template.steps[0].title = "Changed later";

    expect(snapshot.snapshotName).toBe("My Morning Routine");
    expect(snapshot.steps[0].snapshotTitle).toBe("Get dressed");
  });

  it("counts only submitted routines in the parent approval queue", () => {
    expect(getApprovalQueue(routineInstances)).toHaveLength(1);
    expect(getApprovalQueue(routineInstances)[0].status).toBe("submitted");
  });

  it("does not count paused days as missed", () => {
    expect(isWithinPause("2026-06-10", holidayPauses)).toBe(true);
    expect(getMissedCount(routineInstances, holidayPauses)).toBe(0);
  });

  it("awards points only for approved routines", () => {
    const approved = { ...routineInstances[0], status: "approved" as const };
    expect(getCompletedPoints(approved)).toBeGreaterThan(0);
    expect(getApprovedPoints([approved, routineInstances[1]])).toBe(getCompletedPoints(approved));
  });

  it("summarises dashboard state from routine history", () => {
    const summary = getDashboardSummary(routineInstances, holidayPauses);
    expect(summary.submittedCount).toBe(1);
    expect(summary.pausedCount).toBe(1);
  });

  it("keeps parent permissions separate from child mode", () => {
    expect(canAccessParentData("child")).toBe(false);
    expect(isParentForHousehold("user_parent_1", "household-1", parents)).toBe(true);
  });
});
