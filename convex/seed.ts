import { mutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { hashPin } from "./pins";

type SeedStep = {
  title: string;
  description: string;
  order: number;
  points: number;
  required: boolean;
  illustrationKey: string;
  accent: string;
};

type SeedRoutine = {
  name: string;
  type: "morning" | "evening" | "weekend" | "custom";
  schedule: string[];
  status: "in_progress" | "submitted";
  steps: SeedStep[];
};

const routines: SeedRoutine[] = [
  {
    name: "My Morning Routine",
    type: "morning",
    schedule: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    status: "in_progress",
    steps: [
      {
        title: "Get dressed",
        description: "Pick clothes and get ready for the day.",
        order: 1,
        points: 5,
        required: true,
        illustrationKey: "dressed",
        accent: "#f97316",
      },
      {
        title: "Make the bed",
        description: "Pull up the duvet and tidy the pillows.",
        order: 2,
        points: 4,
        required: true,
        illustrationKey: "bed",
        accent: "#14b8a6",
      },
      {
        title: "Eat breakfast",
        description: "Sit down and eat something filling.",
        order: 3,
        points: 3,
        required: true,
        illustrationKey: "breakfast",
        accent: "#eab308",
      },
      {
        title: "Brush teeth",
        description: "Brush for two minutes.",
        order: 4,
        points: 5,
        required: true,
        illustrationKey: "teeth",
        accent: "#38bdf8",
      },
      {
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
    name: "Bedtime Reset",
    type: "evening",
    schedule: ["Sun", "Mon", "Tue", "Wed", "Thu"],
    status: "submitted",
    steps: [
      {
        title: "Tidy toys",
        description: "Put toys back in their baskets.",
        order: 1,
        points: 4,
        required: true,
        illustrationKey: "toys",
        accent: "#ef4444",
      },
      {
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

function normaliseInitialHouseholdName(name: string | undefined) {
  const trimmed = name?.trim();
  if (!trimmed) return "The Parker Household";
  return trimmed.slice(0, 80);
}

async function insertDemoHousehold(
  ctx: MutationCtx,
  clerkUserId: string,
  initialHouseholdName?: string,
) {
  const now = new Date().toISOString();
  const date = "2026-05-31";

  const householdId = await ctx.db.insert("households", {
    name: normaliseInitialHouseholdName(initialHouseholdName),
    createdAt: now,
  });
  await ctx.db.patch(householdId, { parentLockPinHash: await hashPin("2468", householdId) });
  const parentId = await ctx.db.insert("parents", {
    householdId,
    clerkUserId,
    name: "Alex",
  });
  const childId = await ctx.db.insert("children", {
    householdId,
    name: "Maya",
    avatarColour: "#ffcf5a",
    avatarPreset: "star",
    pointsBalance: 42,
  });

  const routineTemplateIds: Id<"routineTemplates">[] = [];
  const routineInstanceIds: Id<"routineInstances">[] = [];

  for (const routine of routines) {
    const routineTemplateId = await ctx.db.insert("routineTemplates", {
      householdId,
      name: routine.name,
      type: routine.type,
      active: true,
      schedule: routine.schedule,
      createdByParentId: parentId,
    });
    routineTemplateIds.push(routineTemplateId);

    for (const step of routine.steps) {
      await ctx.db.insert("choreSteps", {
        householdId,
        routineTemplateId,
        ...step,
      });
    }

    const completedCount = routine.status === "submitted" ? routine.steps.length : 2;
    const routineInstanceId = await ctx.db.insert("routineInstances", {
      householdId,
      childId,
      routineTemplateId,
      date,
      status: routine.status,
      snapshotName: routine.name,
      snapshotType: routine.type,
      submittedAt: routine.status === "submitted" ? "2026-05-31T08:11:00.000Z" : undefined,
    });
    routineInstanceIds.push(routineInstanceId);

    for (const [index, step] of routine.steps.entries()) {
      await ctx.db.insert("stepInstances", {
        householdId,
        childId,
        routineInstanceId,
        snapshotTitle: step.title,
        snapshotDescription: step.description,
        snapshotOrder: step.order,
        snapshotPoints: step.points,
        snapshotRequired: step.required,
        snapshotIllustrationKey: step.illustrationKey,
        accent: step.accent,
        completedAt: index < completedCount ? "2026-05-31T08:00:00.000Z" : undefined,
        completedByChildId: index < completedCount ? childId : undefined,
      });
    }
  }

  await ctx.db.insert("rewards", {
    householdId,
    title: "Family film night",
    pointsCost: 50,
    active: true,
    visualType: "icon",
    iconKey: "film",
  });
  await ctx.db.insert("rewards", {
    householdId,
    title: "Pick the park",
    pointsCost: 35,
    active: true,
    visualType: "icon",
    iconKey: "park",
  });
  await ctx.db.insert("choreSettings", {
    householdId,
    dailyMultiplier: 1,
    weeklyMultiplier: 3,
    monthlyMultiplier: 10,
  });
  await ctx.db.insert("chores", {
    householdId,
    title: "Water the plants",
    description: "Check the kitchen and living room plants.",
    frequency: "weekly",
    basePoints: 2,
    active: true,
    createdByParentId: parentId,
  });
  await ctx.db.insert("holidayPauses", {
    householdId,
    startDate: "2026-06-07",
    endDate: "2026-06-12",
    reason: "Half-term break",
    createdByParentId: parentId,
  });
  await ctx.db.insert("auditEvents", {
    householdId,
    actorId: parentId,
    action: "Demo data seeded",
    createdAt: now,
    metadata: { routineCount: routines.length },
  });

  return {
    householdId,
    parentId,
    childId,
    routineTemplateIds,
    routineInstanceIds,
    alreadySeeded: false,
  };
}

async function deleteExistingDemoHousehold(ctx: MutationCtx, clerkUserId: string) {
  const parent = await ctx.db
    .query("parents")
    .withIndex("by_clerk_user", (query) => query.eq("clerkUserId", clerkUserId))
    .unique();

  if (!parent) return;

  const householdId = parent.householdId;
  const routineInstances = await ctx.db
    .query("routineInstances")
    .withIndex("by_household_date", (query) => query.eq("householdId", householdId))
    .collect();

  for (const instance of routineInstances) {
    const stepInstances = await ctx.db
      .query("stepInstances")
      .withIndex("by_routine_instance", (query) => query.eq("routineInstanceId", instance._id))
      .collect();
    for (const stepInstance of stepInstances) {
      await ctx.db.delete(stepInstance._id);
    }
    await ctx.db.delete(instance._id);
  }

  const routineTemplates = await ctx.db
    .query("routineTemplates")
    .withIndex("by_household", (query) => query.eq("householdId", householdId))
    .collect();

  for (const template of routineTemplates) {
    const steps = await ctx.db
      .query("choreSteps")
      .withIndex("by_routine", (query) => query.eq("routineTemplateId", template._id))
      .collect();
    for (const step of steps) {
      await ctx.db.delete(step._id);
    }
    await ctx.db.delete(template._id);
  }

  const routineTemplateVersions = await ctx.db
    .query("routineTemplateVersions")
    .withIndex("by_household", (query) => query.eq("householdId", householdId))
    .collect();
  for (const version of routineTemplateVersions) {
    await ctx.db.delete(version._id);
  }

  const children = await ctx.db
    .query("children")
    .withIndex("by_household", (query) => query.eq("householdId", householdId))
    .collect();
  for (const child of children) {
    await ctx.db.delete(child._id);
  }

  const rewards = await ctx.db
    .query("rewards")
    .withIndex("by_household", (query) => query.eq("householdId", householdId))
    .collect();
  for (const reward of rewards) {
    await ctx.db.delete(reward._id);
  }

  const choreSubmissions = await ctx.db
    .query("choreSubmissions")
    .withIndex("by_household", (query) => query.eq("householdId", householdId))
    .collect();
  for (const submission of choreSubmissions) {
    await ctx.db.delete(submission._id);
  }

  const chores = await ctx.db
    .query("chores")
    .withIndex("by_household", (query) => query.eq("householdId", householdId))
    .collect();
  for (const chore of chores) {
    await ctx.db.delete(chore._id);
  }

  const choreSettings = await ctx.db
    .query("choreSettings")
    .withIndex("by_household", (query) => query.eq("householdId", householdId))
    .collect();
  for (const settings of choreSettings) {
    await ctx.db.delete(settings._id);
  }

  const reminders = await ctx.db
    .query("reminders")
    .withIndex("by_household", (query) => query.eq("householdId", householdId))
    .collect();
  for (const reminder of reminders) {
    await ctx.db.delete(reminder._id);
  }

  const holidayPauses = await ctx.db
    .query("holidayPauses")
    .withIndex("by_household", (query) => query.eq("householdId", householdId))
    .collect();
  for (const pause of holidayPauses) {
    await ctx.db.delete(pause._id);
  }

  const auditEvents = await ctx.db
    .query("auditEvents")
    .withIndex("by_household", (query) => query.eq("householdId", householdId))
    .collect();
  for (const event of auditEvents) {
    await ctx.db.delete(event._id);
  }

  await ctx.db.delete(parent._id);
  await ctx.db.delete(householdId);
}

export const demo = mutation({
  args: {
    clerkUserId: v.string(),
    initialHouseholdName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existingParent = await ctx.db
      .query("parents")
      .withIndex("by_clerk_user", (query) => query.eq("clerkUserId", args.clerkUserId))
      .unique();

    if (existingParent) {
      return {
        householdId: existingParent.householdId,
        parentId: existingParent._id,
        alreadySeeded: true,
      };
    }

    return await insertDemoHousehold(ctx, args.clerkUserId, args.initialHouseholdName);
  },
});

export const e2eReset = mutation({
  args: {
    clerkUserId: v.string(),
    initialHouseholdName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (process.env.E2E_AUTH_BYPASS !== "true") {
      throw new Error("E2E reset is only available when E2E_AUTH_BYPASS is enabled");
    }
    if (!process.env.E2E_CLERK_USER_ID) {
      throw new Error("E2E reset requires E2E_CLERK_USER_ID");
    }
    if (args.clerkUserId !== process.env.E2E_CLERK_USER_ID) {
      throw new Error("E2E reset can only seed the configured e2e parent");
    }

    await deleteExistingDemoHousehold(ctx, args.clerkUserId);
    return await insertDemoHousehold(ctx, args.clerkUserId, args.initialHouseholdName);
  },
});
