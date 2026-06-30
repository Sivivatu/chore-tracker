import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { assertHouseholdAccess } from "./security";
import type { Doc, Id } from "./_generated/dataModel";
import {
  calculateEarnedPoints,
  countPriorActiveSubmissions,
  dateFromDateKey,
  getChoreSettings,
  multiplierFor,
  periodKeyFor,
} from "./choreCalculations";
import { dayLabelFromDateKey, validateHouseholdDateBounds } from "./dateValidation";

function ensureChildInHousehold(child: Doc<"children"> | null, householdId: Id<"households">) {
  if (!child || child.householdId !== householdId) throw new Error("Child profile not found");
  return child;
}

function isTemplateScheduledForDate(template: Doc<"routineTemplates">, date: string) {
  return template.schedule.includes(dayLabelFromDateKey(date));
}

async function getTemplateSteps(
  ctx: QueryCtx | MutationCtx,
  routineTemplateId: Id<"routineTemplates">,
) {
  return await ctx.db
    .query("choreSteps")
    .withIndex("by_routine", (q) => q.eq("routineTemplateId", routineTemplateId))
    .collect();
}

async function getExistingRoutineInstance(args: {
  ctx: QueryCtx | MutationCtx;
  householdId: Id<"households">;
  childId: Id<"children">;
  routineTemplateId: Id<"routineTemplates">;
  date: string;
}) {
  const instances = await args.ctx.db
    .query("routineInstances")
    .withIndex("by_household_date_and_child", (q) =>
      q.eq("householdId", args.householdId).eq("date", args.date).eq("childId", args.childId),
    )
    .collect();

  return (
    instances.find((instance) => instance.routineTemplateId === args.routineTemplateId) ?? null
  );
}

export const listBackfillDay = query({
  args: {
    householdId: v.id("households"),
    childId: v.id("children"),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    await assertHouseholdAccess(ctx, args.householdId);
    const household = await ctx.db.get(args.householdId);
    if (!household) throw new Error("Household not found");
    ensureChildInHousehold(await ctx.db.get(args.childId), args.householdId);
    const bounds = validateHouseholdDateBounds({
      date: args.date,
      householdCreatedAt: household.createdAt,
    });

    const templates = await ctx.db
      .query("routineTemplates")
      .withIndex("by_household", (q) => q.eq("householdId", args.householdId))
      .collect();
    const instances = await ctx.db
      .query("routineInstances")
      .withIndex("by_household_date_and_child", (q) =>
        q.eq("householdId", args.householdId).eq("date", args.date).eq("childId", args.childId),
      )
      .collect();
    const settings = await getChoreSettings(ctx, args.householdId);
    const chores = await ctx.db
      .query("chores")
      .withIndex("by_household", (q) => q.eq("householdId", args.householdId))
      .collect();

    const routines = await Promise.all(
      templates
        .filter((template) => {
          const instance = instances.find((row) => row.routineTemplateId === template._id);
          return template.active || Boolean(instance);
        })
        .map(async (template) => {
          const instance = instances.find((row) => row.routineTemplateId === template._id) ?? null;
          const templateSteps = await getTemplateSteps(ctx, template._id);
          const stepInstances = instance
            ? await ctx.db
                .query("stepInstances")
                .withIndex("by_routine_instance", (q) => q.eq("routineInstanceId", instance._id))
                .collect()
            : [];
          return {
            id: template._id,
            template,
            scheduled: isTemplateScheduledForDate(template, args.date),
            instance: instance ? { id: instance._id, ...instance } : null,
            steps: instance
              ? stepInstances
                  .slice()
                  .sort((a, b) => a.snapshotOrder - b.snapshotOrder)
                  .map((step) => ({
                    id: step._id,
                    order: step.snapshotOrder,
                    title: step.snapshotTitle,
                    points: step.snapshotPoints,
                    completed: Boolean(step.completedAt),
                  }))
              : templateSteps
                  .slice()
                  .sort((a, b) => a.order - b.order)
                  .map((step) => ({
                    id: step._id,
                    order: step.order,
                    title: step.title,
                    points: step.points,
                    completed: false,
                  })),
          };
        }),
    );

    const activeChores = await Promise.all(
      chores
        .filter((chore) => chore.active)
        .map(async (chore) => {
          const periodKey = periodKeyFor(chore.frequency, dateFromDateKey(args.date));
          const repeatCount = await countPriorActiveSubmissions(
            ctx,
            args.childId,
            chore._id,
            periodKey,
          );
          const multiplier = multiplierFor(settings, chore.frequency);
          return {
            id: chore._id,
            ...chore,
            periodKey,
            multiplier,
            repeatCount,
            ...calculateEarnedPoints({
              basePoints: chore.basePoints,
              multiplier,
              frequency: chore.frequency,
              repeatCount,
            }),
          };
        }),
    );

    return { bounds, routines, chores: activeChores };
  },
});

export const approvePastRoutine = mutation({
  args: {
    householdId: v.id("households"),
    childId: v.id("children"),
    date: v.string(),
    routineTemplateId: v.id("routineTemplates"),
    completedStepOrders: v.array(v.number()),
  },
  handler: async (ctx, args) => {
    const parent = await assertHouseholdAccess(ctx, args.householdId);
    const household = await ctx.db.get(args.householdId);
    if (!household) throw new Error("Household not found");
    const child = ensureChildInHousehold(await ctx.db.get(args.childId), args.householdId);
    validateHouseholdDateBounds({ date: args.date, householdCreatedAt: household.createdAt });

    const template = await ctx.db.get(args.routineTemplateId);
    if (!template || template.householdId !== args.householdId) {
      throw new Error("Routine not found");
    }

    const selectedOrders = new Set(args.completedStepOrders);
    const steps = (await getTemplateSteps(ctx, args.routineTemplateId)).sort(
      (a, b) => a.order - b.order,
    );
    const now = new Date().toISOString();
    let instance = await getExistingRoutineInstance({ ctx, ...args });
    if (!template.active && !instance) {
      throw new Error("Routine not found");
    }

    if (instance?.status === "approved") {
      throw new Error("Routine has already awarded points for this date");
    }
    if (
      instance &&
      !["not_started", "in_progress", "submitted", "rejected"].includes(instance.status)
    ) {
      throw new Error("Routine cannot be backfilled in its current state");
    }

    let earnedPoints = 0;
    if (!instance) {
      earnedPoints = steps
        .filter((step) => selectedOrders.has(step.order))
        .reduce((total, step) => total + step.points, 0);
      const routineInstanceId = await ctx.db.insert("routineInstances", {
        householdId: args.householdId,
        childId: args.childId,
        routineTemplateId: args.routineTemplateId,
        date: args.date,
        status: "not_started",
        snapshotName: template.name,
        snapshotType: template.type,
      });
      for (const step of steps) {
        const completedFields = selectedOrders.has(step.order)
          ? { completedAt: now, completedByChildId: args.childId }
          : {};
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
          ...completedFields,
        });
      }
      instance = await ctx.db.get(routineInstanceId);
    } else {
      const existingInstance = instance;
      const instanceSteps = await ctx.db
        .query("stepInstances")
        .withIndex("by_routine_instance", (q) => q.eq("routineInstanceId", existingInstance._id))
        .collect();
      earnedPoints = instanceSteps
        .filter((step) => selectedOrders.has(step.snapshotOrder))
        .reduce((total, step) => total + step.snapshotPoints, 0);
      for (const step of instanceSteps) {
        await ctx.db.patch(step._id, {
          completedAt: selectedOrders.has(step.snapshotOrder) ? now : undefined,
          completedByChildId: selectedOrders.has(step.snapshotOrder) ? args.childId : undefined,
        });
      }
    }

    if (!instance) throw new Error("Routine instance could not be created");
    await ctx.db.patch(instance._id, {
      status: "approved",
      approvedAt: now,
      approvedByParentId: parent._id,
      submittedAt: undefined,
      rejectedAt: undefined,
      rejectionNote: undefined,
    });
    await ctx.db.patch(child._id, { pointsBalance: child.pointsBalance + earnedPoints });
    await ctx.db.insert("auditEvents", {
      householdId: args.householdId,
      actorId: parent._id,
      action: "Past routine completion added",
      createdAt: now,
      metadata: {
        childId: args.childId,
        routineTemplateId: args.routineTemplateId,
        date: args.date,
        earnedPoints,
      },
    });

    return { earnedPoints };
  },
});

export const approvePastChore = mutation({
  args: {
    householdId: v.id("households"),
    childId: v.id("children"),
    choreId: v.id("chores"),
    completedOnDate: v.string(),
  },
  handler: async (ctx, args) => {
    const parent = await assertHouseholdAccess(ctx, args.householdId);
    const household = await ctx.db.get(args.householdId);
    if (!household) throw new Error("Household not found");
    const child = ensureChildInHousehold(await ctx.db.get(args.childId), args.householdId);
    validateHouseholdDateBounds({
      date: args.completedOnDate,
      householdCreatedAt: household.createdAt,
    });

    const chore = await ctx.db.get(args.choreId);
    if (!chore || chore.householdId !== args.householdId || !chore.active) {
      throw new Error("Chore not found");
    }

    const settings = await getChoreSettings(ctx, args.householdId);
    const periodKey = periodKeyFor(chore.frequency, dateFromDateKey(args.completedOnDate));
    const repeatCount = await countPriorActiveSubmissions(
      ctx,
      args.childId,
      args.choreId,
      periodKey,
    );
    const multiplier = multiplierFor(settings, chore.frequency);
    const calculated = calculateEarnedPoints({
      basePoints: chore.basePoints,
      multiplier,
      frequency: chore.frequency,
      repeatCount,
    });
    const now = new Date().toISOString();
    const submissionId = await ctx.db.insert("choreSubmissions", {
      householdId: args.householdId,
      childId: args.childId,
      choreId: args.choreId,
      periodKey,
      status: "approved",
      snapshotTitle: chore.title,
      snapshotDescription: chore.description,
      snapshotFrequency: chore.frequency,
      snapshotBasePoints: chore.basePoints,
      snapshotMultiplier: multiplier,
      repeatCount,
      repeatAdjustment: calculated.repeatAdjustment,
      earnedPoints: calculated.earnedPoints,
      completedOnDate: args.completedOnDate,
      submittedAt: now,
      approvedAt: now,
      approvedByParentId: parent._id,
    });

    await ctx.db.patch(child._id, {
      pointsBalance: child.pointsBalance + calculated.earnedPoints,
    });
    await ctx.db.insert("auditEvents", {
      householdId: args.householdId,
      actorId: parent._id,
      action: "Past chore completion added",
      createdAt: now,
      metadata: {
        submissionId,
        childId: args.childId,
        choreId: args.choreId,
        completedOnDate: args.completedOnDate,
        earnedPoints: calculated.earnedPoints,
      },
    });

    return { submissionId, earnedPoints: calculated.earnedPoints };
  },
});
