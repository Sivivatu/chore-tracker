import { mutation, type MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";

type RoutineStepSelectionArgs = {
  householdId: Id<"households">;
  childId: Id<"children">;
  routineInstanceId: Id<"routineInstances">;
  completedStepIds: Id<"stepInstances">[];
};

async function applyRoutineStepSelection(
  ctx: MutationCtx,
  args: RoutineStepSelectionArgs,
  now: string,
) {
  const instance = await ctx.db.get(args.routineInstanceId);
  if (!instance || instance.householdId !== args.householdId || instance.childId !== args.childId) {
    throw new Error("Routine not found");
  }
  if (
    instance.status === "submitted" ||
    instance.status === "approved" ||
    instance.status === "paused"
  ) {
    throw new Error("Routine is read-only");
  }

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
  const validStepIds = new Set(steps.map((step) => step._id));
  const completedStepIds = new Set(args.completedStepIds);

  for (const completedStepId of completedStepIds) {
    if (!validStepIds.has(completedStepId)) {
      throw new Error("Routine step mismatch");
    }
  }

  for (const step of steps) {
    if (step.householdId !== args.householdId || step.childId !== args.childId) {
      throw new Error("Routine step mismatch");
    }

    if (completedStepIds.has(step._id) && !step.completedAt) {
      await ctx.db.patch(step._id, {
        completedAt: now,
        completedByChildId: args.childId,
      });
    } else if (!completedStepIds.has(step._id) && step.completedAt) {
      await ctx.db.patch(step._id, {
        completedAt: undefined,
        completedByChildId: undefined,
      });
    }
  }

  return { instance, completedStepCount: completedStepIds.size };
}

const routineSelectionArgs = {
  householdId: v.id("households"),
  childId: v.id("children"),
  routineInstanceId: v.id("routineInstances"),
  completedStepIds: v.array(v.id("stepInstances")),
};

export const saveRoutineProgress = mutation({
  args: routineSelectionArgs,
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const { completedStepCount } = await applyRoutineStepSelection(ctx, args, now);

    await ctx.db.patch(args.routineInstanceId, {
      status: completedStepCount > 0 ? "in_progress" : "not_started",
      rejectedAt: undefined,
      rejectionNote: undefined,
    });
    await ctx.db.insert("auditEvents", {
      householdId: args.householdId,
      actorId: args.childId,
      action: "Routine progress saved",
      createdAt: now,
      metadata: { routineInstanceId: args.routineInstanceId, completedStepCount },
    });
  },
});

export const submitRoutine = mutation({
  args: routineSelectionArgs,
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const { completedStepCount } = await applyRoutineStepSelection(ctx, args, now);

    await ctx.db.patch(args.routineInstanceId, {
      status: "submitted",
      submittedAt: now,
      rejectedAt: undefined,
      rejectionNote: undefined,
    });
    await ctx.db.insert("auditEvents", {
      householdId: args.householdId,
      actorId: args.childId,
      action: "Routine submitted",
      createdAt: now,
      metadata: { routineInstanceId: args.routineInstanceId, completedStepCount },
    });
  },
});
