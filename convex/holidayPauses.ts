import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { assertHouseholdAccess } from "./security";

export const list = query({
  args: { householdId: v.id("households") },
  handler: async (ctx, args) => {
    await assertHouseholdAccess(ctx, args.householdId);
    return await ctx.db
      .query("holidayPauses")
      .withIndex("by_household", (query) => query.eq("householdId", args.householdId))
      .collect();
  },
});

export const create = mutation({
  args: {
    householdId: v.id("households"),
    startDate: v.string(),
    endDate: v.string(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const parent = await assertHouseholdAccess(ctx, args.householdId);
    return await ctx.db.insert("holidayPauses", {
      householdId: args.householdId,
      startDate: args.startDate,
      endDate: args.endDate,
      reason: args.reason,
      createdByParentId: parent._id,
    });
  },
});
