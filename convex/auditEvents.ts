import { query } from "./_generated/server";
import { v } from "convex/values";
import { assertHouseholdAccess } from "./security";

export const list = query({
  args: { householdId: v.id("households") },
  handler: async (ctx, args) => {
    await assertHouseholdAccess(ctx, args.householdId);
    return await ctx.db
      .query("auditEvents")
      .withIndex("by_household", (query) => query.eq("householdId", args.householdId))
      .collect();
  },
});
