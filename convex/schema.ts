import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const routineStatus = v.union(
  v.literal("not_started"),
  v.literal("in_progress"),
  v.literal("submitted"),
  v.literal("approved"),
  v.literal("rejected"),
  v.literal("paused"),
);

export const choreFrequency = v.union(
  v.literal("daily"),
  v.literal("weekly"),
  v.literal("monthly"),
);

export const choreSubmissionStatus = v.union(
  v.literal("submitted"),
  v.literal("approved"),
  v.literal("rejected"),
);

export default defineSchema({
  households: defineTable({
    name: v.string(),
    createdAt: v.string(),
    parentLockPinHash: v.optional(v.string()),
  }),
  parents: defineTable({
    householdId: v.id("households"),
    clerkUserId: v.string(),
    name: v.string(),
  }).index("by_clerk_user", ["clerkUserId"]),
  children: defineTable({
    householdId: v.id("households"),
    name: v.string(),
    pinHash: v.string(),
    avatarColour: v.string(),
    avatarPreset: v.optional(v.string()),
    pointsBalance: v.number(),
  })
    .index("by_household", ["householdId"])
    .index("by_household_and_pinHash", ["householdId", "pinHash"]),
  routineTemplates: defineTable({
    householdId: v.id("households"),
    name: v.string(),
    type: v.union(
      v.literal("morning"),
      v.literal("evening"),
      v.literal("weekend"),
      v.literal("custom"),
    ),
    active: v.boolean(),
    schedule: v.array(v.string()),
    createdByParentId: v.id("parents"),
  }).index("by_household", ["householdId"]),
  routineTemplateVersions: defineTable({
    householdId: v.id("households"),
    routineTemplateId: v.id("routineTemplates"),
    archivedByParentId: v.id("parents"),
    archivedAt: v.string(),
    snapshotName: v.string(),
    snapshotType: v.union(
      v.literal("morning"),
      v.literal("evening"),
      v.literal("weekend"),
      v.literal("custom"),
    ),
    snapshotActive: v.boolean(),
    snapshotSchedule: v.array(v.string()),
    snapshotSteps: v.array(
      v.object({
        title: v.string(),
        description: v.string(),
        order: v.number(),
        points: v.number(),
        required: v.boolean(),
        illustrationKey: v.string(),
        accent: v.string(),
      }),
    ),
  })
    .index("by_routine", ["routineTemplateId"])
    .index("by_household", ["householdId"]),
  choreSteps: defineTable({
    householdId: v.id("households"),
    routineTemplateId: v.id("routineTemplates"),
    title: v.string(),
    description: v.string(),
    order: v.number(),
    points: v.number(),
    required: v.boolean(),
    illustrationKey: v.string(),
    accent: v.string(),
  }).index("by_routine", ["routineTemplateId"]),
  routineInstances: defineTable({
    householdId: v.id("households"),
    childId: v.id("children"),
    routineTemplateId: v.id("routineTemplates"),
    date: v.string(),
    status: routineStatus,
    snapshotName: v.string(),
    snapshotType: v.union(
      v.literal("morning"),
      v.literal("evening"),
      v.literal("weekend"),
      v.literal("custom"),
    ),
    submittedAt: v.optional(v.string()),
    approvedAt: v.optional(v.string()),
    approvedByParentId: v.optional(v.id("parents")),
    rejectedAt: v.optional(v.string()),
    rejectionNote: v.optional(v.string()),
  })
    .index("by_household_date", ["householdId", "date"])
    .index("by_household_and_status", ["householdId", "status"]),
  stepInstances: defineTable({
    householdId: v.id("households"),
    childId: v.id("children"),
    routineInstanceId: v.id("routineInstances"),
    snapshotTitle: v.string(),
    snapshotDescription: v.string(),
    snapshotOrder: v.number(),
    snapshotPoints: v.number(),
    snapshotRequired: v.boolean(),
    snapshotIllustrationKey: v.string(),
    accent: v.string(),
    completedAt: v.optional(v.string()),
    completedByChildId: v.optional(v.id("children")),
  }).index("by_routine_instance", ["routineInstanceId"]),
  rewards: defineTable({
    householdId: v.id("households"),
    title: v.string(),
    pointsCost: v.number(),
    active: v.boolean(),
    visualType: v.optional(v.union(v.literal("icon"), v.literal("upload"))),
    iconKey: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    uploadThingKey: v.optional(v.string()),
    imageName: v.optional(v.string()),
  }).index("by_household", ["householdId"]),
  chores: defineTable({
    householdId: v.id("households"),
    title: v.string(),
    description: v.string(),
    frequency: choreFrequency,
    basePoints: v.number(),
    active: v.boolean(),
    createdByParentId: v.id("parents"),
  }).index("by_household", ["householdId"]),
  choreSubmissions: defineTable({
    householdId: v.id("households"),
    childId: v.id("children"),
    choreId: v.id("chores"),
    periodKey: v.string(),
    status: choreSubmissionStatus,
    snapshotTitle: v.string(),
    snapshotDescription: v.string(),
    snapshotFrequency: choreFrequency,
    snapshotBasePoints: v.number(),
    snapshotMultiplier: v.number(),
    repeatCount: v.number(),
    repeatAdjustment: v.number(),
    earnedPoints: v.number(),
    submittedAt: v.string(),
    approvedAt: v.optional(v.string()),
    approvedByParentId: v.optional(v.id("parents")),
    rejectedAt: v.optional(v.string()),
    rejectionNote: v.optional(v.string()),
  })
    .index("by_household", ["householdId"])
    .index("by_household_and_status", ["householdId", "status"])
    .index("by_household_and_approvedAt", ["householdId", "approvedAt"])
    .index("by_child_and_chore_and_period", ["childId", "choreId", "periodKey"]),
  choreSettings: defineTable({
    householdId: v.id("households"),
    dailyMultiplier: v.number(),
    weeklyMultiplier: v.number(),
    monthlyMultiplier: v.number(),
  }).index("by_household", ["householdId"]),
  reminders: defineTable({
    householdId: v.id("households"),
    kind: v.string(),
    time: v.string(),
    enabled: v.boolean(),
  }).index("by_household", ["householdId"]),
  holidayPauses: defineTable({
    householdId: v.id("households"),
    startDate: v.string(),
    endDate: v.string(),
    reason: v.string(),
    createdByParentId: v.id("parents"),
  }).index("by_household", ["householdId"]),
  auditEvents: defineTable({
    householdId: v.id("households"),
    actorId: v.union(v.id("parents"), v.id("children"), v.string()),
    action: v.string(),
    createdAt: v.string(),
    metadata: v.optional(v.any()),
  }).index("by_household", ["householdId"]),
});
