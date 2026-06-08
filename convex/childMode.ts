import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { hashPin, verifyPin } from "./pins";

export const unlock = query({
  args: { householdId: v.id("households"), pin: v.string() },
  handler: async (ctx, args) => {
    const hashedPin = await hashPin(args.pin, args.householdId);
    const hashedMatches = await ctx.db
      .query("children")
      .withIndex("by_household_and_pinHash", (query) =>
        query.eq("householdId", args.householdId).eq("pinHash", hashedPin),
      )
      .take(1);
    const child =
      hashedMatches.at(0) ??
      (
        await ctx.db
          .query("children")
          .withIndex("by_household_and_pinHash", (query) =>
            query.eq("householdId", args.householdId).eq("pinHash", args.pin.trim()),
          )
          .take(1)
      ).at(0);

    if (!child || !(await verifyPin(args.pin, child.pinHash, args.householdId))) return null;
    return { childId: child._id, householdId: child.householdId, name: child.name };
  },
});

export const submitRoutine = mutation({
  args: {
    householdId: v.id("households"),
    childId: v.id("children"),
    routineInstanceId: v.id("routineInstances"),
    completedStepIds: v.array(v.id("stepInstances")),
  },
  handler: async (ctx, args) => {
    const instance = await ctx.db.get(args.routineInstanceId);
    if (
      !instance ||
      instance.householdId !== args.householdId ||
      instance.childId !== args.childId
    ) {
      throw new Error("Routine not found");
    }
    if (instance.status === "approved" || instance.status === "submitted")
      throw new Error("Routine is read-only");

    const child = await ctx.db.get(args.childId);
    if (!child || child.householdId !== args.householdId) {
      throw new Error("Child profile not found");
    }

    const steps = await ctx.db
      .query("stepInstances")
      .withIndex("by_routine_instance", (query) =>
        query.eq("routineInstanceId", args.routineInstanceId),
      )
      .collect();
    const stepIds = new Set(args.completedStepIds);
    const now = new Date().toISOString();

    for (const step of steps) {
      if (step.householdId !== args.householdId || step.childId !== args.childId) {
        throw new Error("Routine step mismatch");
      }

      if (stepIds.has(step._id)) {
        await ctx.db.patch(step._id, {
          completedAt: step.completedAt ?? now,
          completedByChildId: args.childId,
        });
      } else {
        await ctx.db.patch(step._id, {
          completedAt: undefined,
          completedByChildId: undefined,
        });
      }
    }

    await ctx.db.patch(args.routineInstanceId, {
      status: "submitted",
      submittedAt: now,
    });
  },
});
