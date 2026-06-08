import type { DailyRoutineInstance, HolidayPause } from "@/types/domain";
import { formatBritishDateLabel, getRecentDateKeys, isWithinPause, toDateKey } from "./dates";
import { getApprovedPoints } from "./points";

export function getCompletionPercentage(instances: DailyRoutineInstance[]): number {
  const completed = instances.filter((instance) =>
    ["approved", "submitted", "rejected"].includes(instance.status),
  );
  if (completed.length === 0) return 0;
  const approved = completed.filter((instance) => instance.status === "approved").length;
  return Math.round((approved / completed.length) * 100);
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
  const anchorDate = new Date("2026-05-31T12:00:00.000Z");
  const anchorDateKey = toDateKey(anchorDate);
  const keys = getRecentDateKeys(anchorDate, 7);
  return keys.map((date) => {
    const dayInstances = instances.filter((instance) => instance.date === date);
    const paused = isWithinPause(date, pauses);
    const approved = dayInstances.filter((instance) => instance.status === "approved").length;
    return {
      date,
      label: formatBritishDateLabel(date, anchorDateKey),
      approved,
      submitted: dayInstances.filter((instance) => instance.status === "submitted").length,
      paused: paused ? 1 : 0,
    };
  });
}
