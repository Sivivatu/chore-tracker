import { mutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

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

export const demo = mutation({
  args: {
    clerkUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const date = "2026-05-31";

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

    const householdId = await ctx.db.insert("households", {
      name: "The Parker Household",
      createdAt: now,
    });
    const parentId = await ctx.db.insert("parents", {
      householdId,
      clerkUserId: args.clerkUserId,
      name: "Alex",
    });
    const childId = await ctx.db.insert("children", {
      householdId,
      name: "Maya",
      pinHash: "1234",
      avatarColour: "#ffcf5a",
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
    });
    await ctx.db.insert("rewards", {
      householdId,
      title: "Pick the park",
      pointsCost: 35,
      active: true,
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
  },
});
