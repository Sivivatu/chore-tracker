import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { assertHouseholdAccess } from "./security";

export const queue = query({
  args: { householdId: v.id("households") },
  handler: async (ctx, args) => {
    await assertHouseholdAccess(ctx, args.householdId);
    const all = await ctx.db
      .query("routineInstances")
      .withIndex("by_household_date", (query) => query.eq("householdId", args.householdId))
      .collect();
    return all.filter((instance) => instance.status === "submitted");
  },
});

export const approve = mutation({
  args: {
    householdId: v.id("households"),
    routineInstanceId: v.id("routineInstances"),
  },
  handler: async (ctx, args) => {
    const parent = await assertHouseholdAccess(ctx, args.householdId);
    const instance = await ctx.db.get(args.routineInstanceId);
    if (!instance || instance.householdId !== args.householdId)
      throw new Error("Routine not found");
    if (instance.status !== "submitted") throw new Error("Only submitted routines can be approved");

    await ctx.db.patch(args.routineInstanceId, {
      status: "approved",
      approvedAt: new Date().toISOString(),
      approvedByParentId: parent._id,
    });
    await ctx.db.insert("auditEvents", {
      householdId: args.householdId,
      actorId: parent._id,
      action: "Routine approved",
      createdAt: new Date().toISOString(),
    });
  },
});

export const reject = mutation({
  args: {
    householdId: v.id("households"),
    routineInstanceId: v.id("routineInstances"),
    note: v.string(),
  },
  handler: async (ctx, args) => {
    const parent = await assertHouseholdAccess(ctx, args.householdId);
    const instance = await ctx.db.get(args.routineInstanceId);
    if (!instance || instance.householdId !== args.householdId)
      throw new Error("Routine not found");

    await ctx.db.patch(args.routineInstanceId, {
      status: "rejected",
      rejectedAt: new Date().toISOString(),
      rejectionNote: args.note,
    });
    await ctx.db.insert("auditEvents", {
      householdId: args.householdId,
      actorId: parent._id,
      action: "Routine rejected",
      createdAt: new Date().toISOString(),
    });
  },
});
