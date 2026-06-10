import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { assertHouseholdAccess, requireParent } from "./security";

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
          steps: steps
            .map((step) => ({ id: step._id, ...step }))
            .sort((a, b) => a.order - b.order),
        };
      }),
    );
  },
});

export const createTemplate = mutation({
  args: {
    householdId: v.id("households"),
    name: v.string(),
    type: v.union(
      v.literal("morning"),
      v.literal("evening"),
      v.literal("weekend"),
      v.literal("custom"),
    ),
    schedule: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const parent = await assertHouseholdAccess(ctx, args.householdId);
    const routineTemplateId = await ctx.db.insert("routineTemplates", {
      householdId: args.householdId,
      name: args.name,
      type: args.type,
      schedule: args.schedule,
      active: true,
      createdByParentId: parent._id,
    });
    await ctx.db.insert("auditEvents", {
      householdId: args.householdId,
      actorId: parent._id,
      action: "Routine created",
      createdAt: new Date().toISOString(),
    });
    return routineTemplateId;
  },
});

export const listTodayForParent = query({
  args: { householdId: v.id("households"), date: v.string() },
  handler: async (ctx, args) => {
    await requireParent(ctx);
    return await ctx.db
      .query("routineInstances")
      .withIndex("by_household_date", (query) =>
        query.eq("householdId", args.householdId).eq("date", args.date),
      )
      .collect();
  },
});

export const listTodayWithSteps = query({
  args: { householdId: v.id("households"), date: v.string() },
  handler: async (ctx, args) => {
    await assertHouseholdAccess(ctx, args.householdId);
    const instances = await ctx.db
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

export const getInstanceWithSteps = query({
  args: { householdId: v.id("households"), routineInstanceId: v.id("routineInstances") },
  handler: async (ctx, args) => {
    await assertHouseholdAccess(ctx, args.householdId);
    const instance = await ctx.db.get(args.routineInstanceId);
    if (!instance || instance.householdId !== args.householdId) return null;

    const steps = await ctx.db
      .query("stepInstances")
      .withIndex("by_routine_instance", (query) => query.eq("routineInstanceId", args.routineInstanceId))
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
