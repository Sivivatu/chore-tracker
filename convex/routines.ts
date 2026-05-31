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
