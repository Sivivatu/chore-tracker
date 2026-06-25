import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { assertHouseholdAccess } from "./security";
import type { Doc, Id } from "./_generated/dataModel";

const routineType = v.union(
  v.literal("morning"),
  v.literal("evening"),
  v.literal("weekend"),
  v.literal("custom"),
);

const stepInput = v.object({
  title: v.string(),
  description: v.string(),
  points: v.number(),
  required: v.boolean(),
  illustrationKey: v.string(),
  accent: v.string(),
});

function validateTemplateInput(args: {
  name: string;
  type: "morning" | "evening" | "weekend" | "custom";
  schedule: string[];
  steps: Array<{
    title: string;
    points: number;
    accent: string;
    illustrationKey: string;
  }>;
}) {
  if (!args.name.trim()) throw new Error("Routine name is required");
  if (args.type !== "custom" && args.schedule.length === 0) {
    throw new Error("Scheduled routines need at least one day");
  }
  if (args.steps.length === 0) throw new Error("Add at least one step");

  for (const step of args.steps) {
    if (!step.title.trim()) throw new Error("Step title is required");
    if (step.points < 0) throw new Error("Step points cannot be negative");
    if (!step.illustrationKey.trim()) throw new Error("Step illustration is required");
    if (!step.accent.trim()) throw new Error("Step accent is required");
  }
}

async function getTemplateSteps(ctx: MutationCtx, routineTemplateId: Id<"routineTemplates">) {
  return await ctx.db
    .query("choreSteps")
    .withIndex("by_routine", (query) => query.eq("routineTemplateId", routineTemplateId))
    .collect();
}

function dayLabelFromDateKey(date: string) {
  const parsed = new Date(`${date}T12:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) throw new Error("Invalid date");
  const label = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][parsed.getUTCDay()];
  if (!label) throw new Error("Invalid date");
  return label;
}

function isTemplateScheduledForDate(template: Doc<"routineTemplates">, date: string) {
  return template.schedule.includes(dayLabelFromDateKey(date));
}

async function hasHolidayPauseForDate(
  ctx: MutationCtx,
  householdId: Id<"households">,
  date: string,
) {
  const pauses = await ctx.db
    .query("holidayPauses")
    .withIndex("by_household", (query) => query.eq("householdId", householdId))
    .collect();

  return pauses.some((pause) => pause.startDate <= date && date <= pause.endDate);
}

async function listChildRoutineInstancesForDate(
  ctx: MutationCtx,
  householdId: Id<"households">,
  childId: Id<"children">,
  date: string,
) {
  return await ctx.db
    .query("routineInstances")
    .withIndex("by_household_date_and_child", (query) =>
      query.eq("householdId", householdId).eq("date", date).eq("childId", childId),
    )
    .collect();
}

async function pauseActionableRoutineInstances(
  ctx: MutationCtx,
  instances: Doc<"routineInstances">[],
) {
  for (const instance of instances) {
    if (instance.status === "not_started" || instance.status === "in_progress") {
      await ctx.db.patch(instance._id, { status: "paused" });
    }
  }
}

async function replaceTemplateSteps(
  ctx: MutationCtx,
  householdId: Id<"households">,
  routineTemplateId: Id<"routineTemplates">,
  existingSteps: Doc<"choreSteps">[],
  steps: Array<{
    title: string;
    description: string;
    points: number;
    required: boolean;
    illustrationKey: string;
    accent: string;
  }>,
) {
  for (const step of existingSteps) {
    await ctx.db.delete(step._id);
  }

  for (const [index, step] of steps.entries()) {
    await ctx.db.insert("choreSteps", {
      householdId,
      routineTemplateId,
      title: step.title.trim(),
      description: step.description.trim(),
      order: index + 1,
      points: step.points,
      required: step.required,
      illustrationKey: step.illustrationKey.trim(),
      accent: step.accent.trim(),
    });
  }
}

export const listTemplates = query({
  args: { householdId: v.id("households") },
  handler: async (ctx, args) => {
    await assertHouseholdAccess(ctx, args.householdId);
    return await ctx.db
      .query("routineTemplates")
      .withIndex("by_household", (query) => query.eq("householdId", args.householdId))
      .collect();
  },
});

export const listTemplatesWithSteps = query({
  args: { householdId: v.id("households") },
  handler: async (ctx, args) => {
    await assertHouseholdAccess(ctx, args.householdId);
    const templates = await ctx.db
      .query("routineTemplates")
      .withIndex("by_household", (query) => query.eq("householdId", args.householdId))
      .collect();

    return await Promise.all(
      templates.map(async (template) => {
        const steps = await ctx.db
          .query("choreSteps")
          .withIndex("by_routine", (query) => query.eq("routineTemplateId", template._id))
          .collect();

        return {
          id: template._id,
          ...template,
          steps: steps.map((step) => ({ id: step._id, ...step })).sort((a, b) => a.order - b.order),
        };
      }),
    );
  },
});

export const listTemplateVersions = query({
  args: { householdId: v.id("households"), routineTemplateId: v.id("routineTemplates") },
  handler: async (ctx, args) => {
    await assertHouseholdAccess(ctx, args.householdId);
    const template = await ctx.db.get(args.routineTemplateId);
    if (!template || template.householdId !== args.householdId) {
      throw new Error("Routine not found");
    }

    const versions = await ctx.db
      .query("routineTemplateVersions")
      .withIndex("by_routine", (query) => query.eq("routineTemplateId", args.routineTemplateId))
      .collect();

    return versions.sort((a, b) => b.archivedAt.localeCompare(a.archivedAt));
  },
});

export const createTemplate = mutation({
  args: {
    householdId: v.id("households"),
    name: v.string(),
    type: routineType,
    active: v.optional(v.boolean()),
    schedule: v.array(v.string()),
    steps: v.array(stepInput),
  },
  handler: async (ctx, args) => {
    const parent = await assertHouseholdAccess(ctx, args.householdId);
    validateTemplateInput(args);
    const routineTemplateId = await ctx.db.insert("routineTemplates", {
      householdId: args.householdId,
      name: args.name.trim(),
      type: args.type,
      schedule: args.schedule,
      active: args.active ?? true,
      createdByParentId: parent._id,
    });
    await replaceTemplateSteps(ctx, args.householdId, routineTemplateId, [], args.steps);
    await ctx.db.insert("auditEvents", {
      householdId: args.householdId,
      actorId: parent._id,
      action: "Routine created",
      createdAt: new Date().toISOString(),
      metadata: { routineTemplateId, stepCount: args.steps.length },
    });
    return routineTemplateId;
  },
});

export const updateTemplate = mutation({
  args: {
    householdId: v.id("households"),
    routineTemplateId: v.id("routineTemplates"),
    name: v.string(),
    type: routineType,
    active: v.boolean(),
    schedule: v.array(v.string()),
    steps: v.array(stepInput),
    keepEditHistory: v.boolean(),
  },
  handler: async (ctx, args) => {
    const parent = await assertHouseholdAccess(ctx, args.householdId);
    validateTemplateInput(args);

    const template = await ctx.db.get(args.routineTemplateId);
    if (!template || template.householdId !== args.householdId) {
      throw new Error("Routine not found");
    }

    const existingSteps = await getTemplateSteps(ctx, args.routineTemplateId);
    const orderedExistingSteps = existingSteps.slice().sort((a, b) => a.order - b.order);
    const now = new Date().toISOString();

    if (args.keepEditHistory) {
      await ctx.db.insert("routineTemplateVersions", {
        householdId: args.householdId,
        routineTemplateId: args.routineTemplateId,
        archivedByParentId: parent._id,
        archivedAt: now,
        snapshotName: template.name,
        snapshotType: template.type,
        snapshotActive: template.active,
        snapshotSchedule: template.schedule,
        snapshotSteps: orderedExistingSteps.map((step) => ({
          title: step.title,
          description: step.description,
          order: step.order,
          points: step.points,
          required: step.required,
          illustrationKey: step.illustrationKey,
          accent: step.accent,
        })),
      });
    }

    await ctx.db.patch(args.routineTemplateId, {
      name: args.name.trim(),
      type: args.type,
      active: args.active,
      schedule: args.schedule,
    });
    await replaceTemplateSteps(
      ctx,
      args.householdId,
      args.routineTemplateId,
      existingSteps,
      args.steps,
    );

    await ctx.db.insert("auditEvents", {
      householdId: args.householdId,
      actorId: parent._id,
      action: "Routine edited",
      createdAt: now,
      metadata: {
        routineTemplateId: args.routineTemplateId,
        stepCount: args.steps.length,
        archived: args.keepEditHistory,
      },
    });

    return args.routineTemplateId;
  },
});

export const listTodayForParent = query({
  args: { householdId: v.id("households"), date: v.string() },
  handler: async (ctx, args) => {
    await assertHouseholdAccess(ctx, args.householdId);
    return await ctx.db
      .query("routineInstances")
      .withIndex("by_household_date", (query) =>
        query.eq("householdId", args.householdId).eq("date", args.date),
      )
      .collect();
  },
});

export const listTodayWithSteps = query({
  args: {
    householdId: v.id("households"),
    date: v.string(),
    childId: v.optional(v.id("children")),
  },
  handler: async (ctx, args) => {
    await assertHouseholdAccess(ctx, args.householdId);
    const childId = args.childId;
    const instances = childId
      ? await ctx.db
          .query("routineInstances")
          .withIndex("by_household_date_and_child", (query) =>
            query
              .eq("householdId", args.householdId)
              .eq("date", args.date)
              .eq("childId", childId),
          )
          .collect()
      : await ctx.db
          .query("routineInstances")
          .withIndex("by_household_date", (query) =>
            query.eq("householdId", args.householdId).eq("date", args.date),
          )
          .collect();

    return await Promise.all(
      instances.map(async (instance) => {
        const steps = await ctx.db
          .query("stepInstances")
          .withIndex("by_routine_instance", (query) => query.eq("routineInstanceId", instance._id))
          .collect();

        return {
          id: instance._id,
          ...instance,
          steps: steps
            .map((step) => ({ id: step._id, ...step }))
            .sort((a, b) => a.snapshotOrder - b.snapshotOrder),
        };
      }),
    );
  },
});

export const ensureTodayForChild = mutation({
  args: {
    householdId: v.id("households"),
    childId: v.id("children"),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    await assertHouseholdAccess(ctx, args.householdId);
    const child = await ctx.db.get(args.childId);
    if (!child || child.householdId !== args.householdId) {
      throw new Error("Child profile not found");
    }
    const todaysInstances = await listChildRoutineInstancesForDate(
      ctx,
      args.householdId,
      args.childId,
      args.date,
    );
    if (await hasHolidayPauseForDate(ctx, args.householdId, args.date)) {
      await pauseActionableRoutineInstances(ctx, todaysInstances);
      return { createdCount: 0 };
    }

    const templates = await ctx.db
      .query("routineTemplates")
      .withIndex("by_household", (query) => query.eq("householdId", args.householdId))
      .collect();
    const existingTemplateIds = new Set(
      todaysInstances.map((instance) => instance.routineTemplateId),
    );

    let createdCount = 0;
    for (const template of templates) {
      if (
        !template.active ||
        existingTemplateIds.has(template._id) ||
        !isTemplateScheduledForDate(template, args.date)
      ) {
        continue;
      }

      const steps = await getTemplateSteps(ctx, template._id);
      const routineInstanceId = await ctx.db.insert("routineInstances", {
        householdId: args.householdId,
        childId: args.childId,
        routineTemplateId: template._id,
        date: args.date,
        status: "not_started",
        snapshotName: template.name,
        snapshotType: template.type,
      });

      for (const step of steps.sort((a, b) => a.order - b.order)) {
        await ctx.db.insert("stepInstances", {
          householdId: args.householdId,
          childId: args.childId,
          routineInstanceId,
          snapshotTitle: step.title,
          snapshotDescription: step.description,
          snapshotOrder: step.order,
          snapshotPoints: step.points,
          snapshotRequired: step.required,
          snapshotIllustrationKey: step.illustrationKey,
          accent: step.accent,
        });
      }

      createdCount += 1;
    }

    return { createdCount };
  },
});

export const getInstanceWithSteps = query({
  args: { householdId: v.id("households"), routineInstanceId: v.id("routineInstances") },
  handler: async (ctx, args) => {
    await assertHouseholdAccess(ctx, args.householdId);
    const instance = await ctx.db.get(args.routineInstanceId);
    if (!instance || instance.householdId !== args.householdId) return null;

    const steps = await ctx.db
      .query("stepInstances")
      .withIndex("by_routine_instance", (query) =>
        query.eq("routineInstanceId", args.routineInstanceId),
      )
      .collect();

    return {
      id: instance._id,
      ...instance,
      steps: steps
        .map((step) => ({ id: step._id, ...step }))
        .sort((a, b) => a.snapshotOrder - b.snapshotOrder),
    };
  },
});
