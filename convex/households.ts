import { query } from "./_generated/server";
import { requireParent } from "./security";

export const current = query({
  args: {},
  handler: async (ctx) => {
    const parent = await requireParent(ctx);
    return await ctx.db.get(parent.householdId);
  },
});

export const currentContext = query({
  args: {},
  handler: async (ctx) => {
    const parent = await requireParent(ctx);
    const household = await ctx.db.get(parent.householdId);
    if (!household) throw new Error("Household not found");

    const child = await ctx.db
      .query("children")
      .withIndex("by_household", (query) => query.eq("householdId", parent.householdId))
      .unique();

    return { household, parent, child };
  },
});
