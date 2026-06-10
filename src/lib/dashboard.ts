import type { DailyRoutineInstance, HolidayPause } from "@/types/domain";
import { getRecentDateKeys, isWithinPause } from "./dates";
import { getApprovedPoints } from "./points";

export function getCompletionPercentage(instances: DailyRoutineInstance[]): number {
  const actionable = instances.filter((instance) => instance.status !== "paused");
  if (actionable.length === 0) return 0;
  const complete = actionable.filter((instance) => instance.status === "approved").length;
  return Math.round((complete / actionable.length) * 100);
}

export function getApprovalQueue(instances: DailyRoutineInstance[]): DailyRoutineInstance[] {
  return instances.filter((instance) => instance.status === "submitted");
}

export function getMissedCount(instances: DailyRoutineInstance[], pauses: HolidayPause[]): number {
  return instances.filter(
    (instance) => instance.status === "not_started" && !isWithinPause(instance.date, pauses),
  ).length;
}

export function getDashboardSummary(instances: DailyRoutineInstance[], pauses: HolidayPause[]) {
  return {
    completionPercentage: getCompletionPercentage(instances),
    submittedCount: getApprovalQueue(instances).length,
    approvedCount: instances.filter((instance) => instance.status === "approved").length,
    missedCount: getMissedCount(instances, pauses),
    pausedCount: pauses.length,
    pointsEarned: getApprovedPoints(instances),
  };
}

export function getCalendarSeries(instances: DailyRoutineInstance[], pauses: HolidayPause[]) {
  const keys = getRecentDateKeys(new Date("2026-05-31T12:00:00.000Z"), 7);
  return keys.map((date) => {
    const dayInstances = instances.filter((instance) => instance.date === date);
    const paused = isWithinPause(date, pauses);
    const approved = dayInstances.filter((instance) => instance.status === "approved").length;
    return {
      date,
      label: date.slice(5),
      approved,
      submitted: dayInstances.filter((instance) => instance.status === "submitted").length,
      paused: paused ? 1 : 0,
    };
  });
}
