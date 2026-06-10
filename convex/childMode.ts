import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { assertHouseholdAccess } from "./security";

export const unlock = query({
  args: { householdId: v.id("households"), pin: v.string() },
  handler: async (ctx, args) => {
    await assertHouseholdAccess(ctx, args.householdId);
    const child = await ctx.db
      .query("children")
      .withIndex("by_household", (query) => query.eq("householdId", args.householdId))
      .unique();
    if (!child || child.pinHash !== args.pin) return null;
    return { childId: child._id, householdId: child.householdId, name: child.name };
  },
});

export const submitRoutine = mutation({
  args: {
    householdId: v.id("households"),
    routineInstanceId: v.id("routineInstances"),
  },
  handler: async (ctx, args) => {
    await assertHouseholdAccess(ctx, args.householdId);
    const instance = await ctx.db.get(args.routineInstanceId);
    if (!instance || instance.householdId !== args.householdId)
      throw new Error("Routine not found");
    if (instance.status === "approved" || instance.status === "submitted")
      throw new Error("Routine is read-only");
    await ctx.db.patch(args.routineInstanceId, {
      status: "submitted",
      submittedAt: new Date().toISOString(),
    });
  },
});
