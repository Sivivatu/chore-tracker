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
    const submitted = all.filter((instance) => instance.status === "submitted");
    return await Promise.all(
      submitted.map(async (instance) => {
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

    const steps = await ctx.db
      .query("stepInstances")
      .withIndex("by_routine_instance", (query) =>
        query.eq("routineInstanceId", args.routineInstanceId),
      )
      .collect();
    const missedRequiredStepCount = steps.filter(
      (step) => step.snapshotRequired && !step.completedAt,
    ).length;
    const completedPoints = steps
      .filter((step) => step.completedAt)
      .reduce((total, step) => total + step.snapshotPoints, 0);
    const earnedPoints = missedRequiredStepCount > 0 ? 0 : completedPoints;
    const child = await ctx.db.get(instance.childId);
    if (!child || child.householdId !== args.householdId) {
      throw new Error("Child profile not found");
    }

    await ctx.db.patch(args.routineInstanceId, {
      status: "approved",
      approvedAt: new Date().toISOString(),
      approvedByParentId: parent._id,
    });
    await ctx.db.patch(child._id, {
      pointsBalance: child.pointsBalance + earnedPoints,
    });
    await ctx.db.insert("auditEvents", {
      householdId: args.householdId,
      actorId: parent._id,
      action: "Routine approved",
      createdAt: new Date().toISOString(),
      metadata: {
        routineInstanceId: args.routineInstanceId,
        earnedPoints,
        missedRequiredStepCount,
        requiredStepsComplete: missedRequiredStepCount === 0,
      },
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
    if (instance.status !== "submitted") throw new Error("Only submitted routines can be rejected");

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
      metadata: { routineInstanceId: args.routineInstanceId },
    });
  },
});
