import type { DailyRoutineInstance } from "@/types/domain";

export function getCompletedPoints(instance: DailyRoutineInstance): number {
  return instance.steps
    .filter((step) => Boolean(step.completedAt))
    .reduce((total, step) => total + step.snapshotPoints, 0);
}

export function getApprovedPoints(instances: DailyRoutineInstance[]): number {
  return instances
    .filter((instance) => instance.status === "approved")
    .reduce((total, instance) => total + getCompletedPoints(instance), 0);
}
