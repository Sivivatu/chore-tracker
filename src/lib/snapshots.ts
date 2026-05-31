import type { DailyRoutineInstance, RoutineTemplate } from "@/types/domain";

export function createRoutineSnapshot(
  template: RoutineTemplate,
  childId: string,
  date: string,
): DailyRoutineInstance {
  return {
    id: `instance-${template.id}-${date}`,
    householdId: template.householdId,
    childId,
    routineTemplateId: template.id,
    date,
    status: "not_started",
    snapshotName: template.name,
    snapshotType: template.type,
    steps: template.steps
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((step) => ({
        id: `instance-${template.id}-${date}-${step.id}`,
        routineInstanceId: `instance-${template.id}-${date}`,
        householdId: template.householdId,
        childId,
        snapshotTitle: step.title,
        snapshotDescription: step.description,
        snapshotOrder: step.order,
        snapshotPoints: step.points,
        snapshotRequired: step.required,
        snapshotIllustrationKey: step.illustrationKey,
        accent: step.accent,
      })),
  };
}
