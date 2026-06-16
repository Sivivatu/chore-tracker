import type {
  AuditEvent,
  ChildProfile,
  DailyRoutineInstance,
  HolidayPause,
  Household,
  ParentMembership,
  RewardOption,
  RoutineTemplate,
} from "@/types/domain";

export const household: Household = {
  id: "household-1",
  name: "The Parker Household",
};

export const parents: ParentMembership[] = [
  {
    id: "parent-1",
    householdId: household.id,
    clerkUserId: "user_parent_1",
    name: "Alex",
  },
  {
    id: "parent-2",
    householdId: household.id,
    clerkUserId: "user_parent_2",
    name: "Sam",
  },
];

export const child: ChildProfile = {
  id: "child-1",
  householdId: household.id,
  name: "Maya",
  avatarColour: "#ffcf5a",
  avatarPreset: "star",
  pointsBalance: 42,
};

export const routineTemplates: RoutineTemplate[] = [
  {
    id: "routine-template-morning",
    householdId: household.id,
    name: "My Morning Routine",
    type: "morning",
    active: true,
    schedule: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    createdByParentId: parents[0].id,
    steps: [
      {
        id: "step-dressed",
        householdId: household.id,
        routineTemplateId: "routine-template-morning",
        title: "Get dressed",
        description: "Pick clothes and get ready for the day.",
        order: 1,
        points: 5,
        required: true,
        illustrationKey: "dressed",
        accent: "#f97316",
      },
      {
        id: "step-bed",
        householdId: household.id,
        routineTemplateId: "routine-template-morning",
        title: "Make the bed",
        description: "Pull up the duvet and tidy the pillows.",
        order: 2,
        points: 4,
        required: true,
        illustrationKey: "bed",
        accent: "#14b8a6",
      },
      {
        id: "step-breakfast",
        householdId: household.id,
        routineTemplateId: "routine-template-morning",
        title: "Eat breakfast",
        description: "Sit down and eat something filling.",
        order: 3,
        points: 3,
        required: true,
        illustrationKey: "breakfast",
        accent: "#eab308",
      },
      {
        id: "step-teeth",
        householdId: household.id,
        routineTemplateId: "routine-template-morning",
        title: "Brush teeth",
        description: "Brush for two minutes.",
        order: 4,
        points: 5,
        required: true,
        illustrationKey: "teeth",
        accent: "#38bdf8",
      },
      {
        id: "step-bag",
        householdId: household.id,
        routineTemplateId: "routine-template-morning",
        title: "Pack school bag",
        description: "Check books, lunch, bottle and homework.",
        order: 5,
        points: 6,
        required: true,
        illustrationKey: "bag",
        accent: "#a855f7",
      },
    ],
  },
  {
    id: "routine-template-evening",
    householdId: household.id,
    name: "Bedtime Reset",
    type: "evening",
    active: true,
    schedule: ["Sun", "Mon", "Tue", "Wed", "Thu"],
    createdByParentId: parents[0].id,
    steps: [
      {
        id: "step-toys",
        householdId: household.id,
        routineTemplateId: "routine-template-evening",
        title: "Tidy toys",
        description: "Put toys back in their baskets.",
        order: 1,
        points: 4,
        required: true,
        illustrationKey: "toys",
        accent: "#ef4444",
      },
      {
        id: "step-reading",
        householdId: household.id,
        routineTemplateId: "routine-template-evening",
        title: "Read together",
        description: "Choose one book for quiet reading.",
        order: 2,
        points: 4,
        required: false,
        illustrationKey: "reading",
        accent: "#22c55e",
      },
    ],
  },
];

function instanceFromTemplate(
  template: RoutineTemplate,
  status: DailyRoutineInstance["status"],
): DailyRoutineInstance {
  const completedCount =
    status === "approved" || status === "submitted" ? template.steps.length : 2;
  return {
    id: `instance-${template.type}-today`,
    householdId: household.id,
    childId: child.id,
    routineTemplateId: template.id,
    date: "2026-05-31",
    status,
    snapshotName: template.name,
    snapshotType: template.type,
    submittedAt:
      status === "submitted" || status === "approved" ? "2026-05-31T08:11:00.000Z" : undefined,
    approvedAt: status === "approved" ? "2026-05-31T08:22:00.000Z" : undefined,
    approvedByParentId: status === "approved" ? parents[0].id : undefined,
    steps: template.steps.map((step, index) => ({
      id: `instance-${template.type}-${step.id}`,
      routineInstanceId: `instance-${template.type}-today`,
      householdId: household.id,
      childId: child.id,
      snapshotTitle: step.title,
      snapshotDescription: step.description,
      snapshotOrder: step.order,
      snapshotPoints: step.points,
      snapshotRequired: step.required,
      snapshotIllustrationKey: step.illustrationKey,
      accent: step.accent,
      completedAt: index < completedCount ? "2026-05-31T08:00:00.000Z" : undefined,
      completedByChildId: index < completedCount ? child.id : undefined,
    })),
  };
}

export const routineInstances: DailyRoutineInstance[] = [
  instanceFromTemplate(routineTemplates[0], "in_progress"),
  instanceFromTemplate(routineTemplates[1], "submitted"),
  {
    ...instanceFromTemplate(routineTemplates[0], "rejected"),
    id: "instance-morning-rejected",
    date: "2026-05-30",
    rejectionNote: "Please check the school bag again.",
    rejectedAt: "2026-05-30T08:20:00.000Z",
  },
];

export const rewardOptions: RewardOption[] = [
  {
    id: "reward-film",
    householdId: household.id,
    title: "Family film night",
    pointsCost: 50,
    active: true,
    visualType: "icon",
    iconKey: "film",
  },
  {
    id: "reward-park",
    householdId: household.id,
    title: "Pick the park",
    pointsCost: 35,
    active: true,
    visualType: "icon",
    iconKey: "park",
  },
  {
    id: "reward-baking",
    householdId: household.id,
    title: "Weekend baking choice",
    pointsCost: 45,
    active: true,
    visualType: "icon",
    iconKey: "baking",
  },
];

export const holidayPauses: HolidayPause[] = [
  {
    id: "pause-1",
    householdId: household.id,
    startDate: "2026-06-07",
    endDate: "2026-06-12",
    reason: "Half-term break",
    createdByParentId: parents[0].id,
  },
];

export const auditEvents: AuditEvent[] = [
  {
    id: "audit-1",
    householdId: household.id,
    actorId: parents[0].id,
    action: "Routine submitted",
    createdAt: "2026-05-31T08:11:00.000Z",
  },
  {
    id: "audit-2",
    householdId: household.id,
    actorId: parents[0].id,
    action: "Points awarded",
    createdAt: "2026-05-30T08:24:00.000Z",
  },
];
