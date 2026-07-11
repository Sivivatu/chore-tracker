import { mutation, type MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { assertHouseholdAccess } from "./security";
import { householdDateKey } from "./householdTime";

const childSessionLifetimeMs = 12 * 60 * 60 * 1000;

type RoutineStepSelectionArgs = {
  householdId: Id<"households">;
  childId: Id<"children">;
  routineInstanceId: Id<"routineInstances">;
  completedStepIds: Id<"stepInstances">[];
};

function createSessionToken() {
  return `${crypto.randomUUID()}${crypto.randomUUID()}`;
}

async function assertChildSession(
  ctx: MutationCtx,
  householdId: Id<"households">,
  sessionToken: string | undefined,
  legacyChildId: Id<"children"> | undefined,
) {
  if (!sessionToken) {
    await assertHouseholdAccess(ctx, householdId);
    if (!legacyChildId) throw new Error("Child session is required");
    const child = await ctx.db.get(legacyChildId);
    if (!child || child.householdId !== householdId) throw new Error("Child session is invalid");
    return { session: null, child };
  }
  const session = await ctx.db
    .query("childModeSessions")
    .withIndex("by_token", (query) => query.eq("token", sessionToken))
    .unique();
  if (!session || session.householdId !== householdId || session.expiresAt <= new Date().toISOString()) {
    throw new Error("Child session has expired. Ask a parent to open child mode again.");
  }
  const child = await ctx.db.get(session.childId);
  if (!child || child.householdId !== householdId) throw new Error("Child session is invalid");
  return { session, child };
}

async function applyRoutineStepSelection(
  ctx: MutationCtx,
  args: RoutineStepSelectionArgs,
  now: string,
) {
  const instance = await ctx.db.get(args.routineInstanceId);
  if (!instance || instance.householdId !== args.householdId || instance.childId !== args.childId) {
    throw new Error("Routine not found");
  }

  const steps = await ctx.db
    .query("stepInstances")
    .withIndex("by_routine_instance", (query) => query.eq("routineInstanceId", args.routineInstanceId))
    .collect();
  const validStepIds = new Set(steps.map((step) => step._id));
  const completedStepIds = new Set(args.completedStepIds);
  for (const completedStepId of completedStepIds) {
    if (!validStepIds.has(completedStepId)) throw new Error("Routine step mismatch");
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
  sessionToken: v.optional(v.string()),
  childId: v.optional(v.id("children")),
  routineInstanceId: v.id("routineInstances"),
  completedStepIds: v.array(v.id("stepInstances")),
};

export const createSession = mutation({
  args: { householdId: v.id("households"), childId: v.id("children") },
  handler: async (ctx, args) => {
    await assertHouseholdAccess(ctx, args.householdId);
    const child = await ctx.db.get(args.childId);
    if (!child || child.householdId !== args.householdId) throw new Error("Child profile not found");
    const now = new Date();
    const expiresAt = new Date(now.getTime() + childSessionLifetimeMs).toISOString();
    const token = createSessionToken();
    await ctx.db.insert("childModeSessions", {
      token,
      householdId: args.householdId,
      childId: args.childId,
      createdAt: now.toISOString(),
      expiresAt,
    });
    return { token, childId: child._id, householdId: args.householdId, expiresAt };
  },
});

export const saveRoutineProgress = mutation({
  args: routineSelectionArgs,
  handler: async (ctx, args) => {
    const { child } = await assertChildSession(ctx, args.householdId, args.sessionToken, args.childId);
    const now = new Date().toISOString();
    const { instance, completedStepCount } = await applyRoutineStepSelection(
      ctx, { ...args, childId: child._id }, now,
    );
    if (["submitted", "approved", "paused"].includes(instance.status)) throw new Error("Routine is read-only");
    await ctx.db.patch(args.routineInstanceId, {
      status: completedStepCount > 0 ? "in_progress" : "not_started",
      rejectedAt: undefined,
      rejectionNote: undefined,
    });
    await ctx.db.insert("auditEvents", {
      householdId: args.householdId,
      actorId: child._id,
      action: "Routine progress saved",
      createdAt: now,
      metadata: { routineInstanceId: args.routineInstanceId, completedStepCount },
    });
  },
});

export const submitRoutine = mutation({
  args: routineSelectionArgs,
  handler: async (ctx, args) => {
    const { child } = await assertChildSession(ctx, args.householdId, args.sessionToken, args.childId);
    const now = new Date().toISOString();
    const { instance, completedStepCount } = await applyRoutineStepSelection(
      ctx, { ...args, childId: child._id }, now,
    );
    if (["submitted", "approved", "paused"].includes(instance.status)) throw new Error("Routine is read-only");
    const revision = (instance.submissionRevision ?? 0) + 1;
    await ctx.db.patch(args.routineInstanceId, {
      status: "submitted",
      submittedAt: instance.submittedAt ?? now,
      lastSubmittedAt: now,
      submissionRevision: revision,
      rejectedAt: undefined,
      rejectionNote: undefined,
    });
    await ctx.db.insert("auditEvents", {
      householdId: args.householdId,
      actorId: child._id,
      action: "Routine submitted",
      createdAt: now,
      metadata: { routineInstanceId: args.routineInstanceId, completedStepCount, revision },
    });
  },
});

export const updateSubmittedRoutine = mutation({
  args: routineSelectionArgs,
  handler: async (ctx, args) => {
    const { child } = await assertChildSession(ctx, args.householdId, args.sessionToken, args.childId);
    const routine = await ctx.db.get(args.routineInstanceId);
    const household = await ctx.db.get(args.householdId);
    if (!routine || !household || routine.status !== "submitted") throw new Error("Routine is read-only");
    if (routine.childId !== child._id) throw new Error("Routine not found");
    if (routine.date !== householdDateKey(household.timeZone)) {
      throw new Error("Submitted routines can only be updated on their scheduled day");
    }
    const now = new Date().toISOString();
    const beforeCompletedStepCount = (await ctx.db
      .query("stepInstances")
      .withIndex("by_routine_instance", (query) => query.eq("routineInstanceId", args.routineInstanceId))
      .collect()).filter((step) => step.completedAt).length;
    const { completedStepCount } = await applyRoutineStepSelection(ctx, { ...args, childId: child._id }, now);
    const revision = (routine.submissionRevision ?? 1) + 1;
    await ctx.db.patch(args.routineInstanceId, { lastSubmittedAt: now, submissionRevision: revision });
    await ctx.db.insert("auditEvents", {
      householdId: args.householdId,
      actorId: child._id,
      action: "Submitted routine updated",
      createdAt: now,
      metadata: { routineInstanceId: args.routineInstanceId, revision, beforeCompletedStepCount, completedStepCount },
    });
    return { revision };
  },
});
