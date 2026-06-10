import { query } from "./_generated/server";
import { v } from "convex/values";
import { assertHouseholdAccess } from "./security";

export const summary = query({
  args: { householdId: v.id("households"), date: v.string() },
  handler: async (ctx, args) => {
    await assertHouseholdAccess(ctx, args.householdId);
    const instances = await ctx.db
      .query("routineInstances")
      .withIndex("by_household_date", (query) =>
        query.eq("householdId", args.householdId).eq("date", args.date),
      )
      .collect();
    const submittedCount = instances.filter((instance) => instance.status === "submitted").length;
    const approvedCount = instances.filter((instance) => instance.status === "approved").length;
    const completedCount = instances.filter((instance) =>
      ["approved", "submitted", "rejected"].includes(instance.status),
    ).length;
    return {
      submittedCount,
      approvedCount,
      completionPercentage:
        completedCount === 0 ? 0 : Math.round((approvedCount / completedCount) * 100),
    };
  },
});
