import { mutation, query } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { assertHouseholdAccess } from "./security";
import type { Doc, Id } from "./_generated/dataModel";
import {
  calculateEarnedPoints,
  countPriorActiveSubmissions,
  getChoreSettings,
  multiplierFor,
  periodKeyFor,
  type ChoreSettings,
} from "./choreCalculations";

const choreFrequency = v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly"));

function validateChoreInput(args: { title: string; basePoints: number }) {
  if (!args.title.trim()) throw new Error("Chore title is required");
  if (args.basePoints < 0) throw new Error("Chore points cannot be negative");
}

function validateMultiplier(value: number, label: string) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} multiplier must be a non-negative whole number`);
  }
}

function publicSettings(settings: ChoreSettings) {
  return {
    dailyMultiplier: settings.dailyMultiplier,
    weeklyMultiplier: settings.weeklyMultiplier,
    monthlyMultiplier: settings.monthlyMultiplier,
  };
}

async function choreWithPreview(
  ctx: QueryCtx,
  chore: Doc<"chores">,
  childId: Id<"children">,
  settings: ChoreSettings,
) {
  const periodKey = periodKeyFor(chore.frequency);
  const repeatCount = await countPriorActiveSubmissions(ctx, childId, chore._id, periodKey);
  const multiplier = multiplierFor(settings, chore.frequency);
  const preview = calculateEarnedPoints({
    basePoints: chore.basePoints,
    multiplier,
    frequency: chore.frequency,
    repeatCount,
  });

  return {
    id: chore._id,
    ...chore,
    periodKey,
    multiplier,
    repeatCount,
    ...preview,
  };
}

export const list = query({
  args: { householdId: v.id("households") },
  handler: async (ctx, args) => {
    await assertHouseholdAccess(ctx, args.householdId);
    const settings = await getChoreSettings(ctx, args.householdId);
    const chores = await ctx.db
      .query("chores")
      .withIndex("by_household", (query) => query.eq("householdId", args.householdId))
      .collect();

    return chores.map((chore) => ({
      id: chore._id,
      ...chore,
      multiplier: multiplierFor(settings, chore.frequency),
      fullPoints: chore.basePoints * multiplierFor(settings, chore.frequency),
    }));
  },
});

export const listForChild = query({
  args: { householdId: v.id("households"), childId: v.id("children") },
  handler: async (ctx, args) => {
    await assertHouseholdAccess(ctx, args.householdId);
    const child = await ctx.db.get(args.childId);
    if (!child || child.householdId !== args.householdId) {
      throw new Error("Child profile not found");
    }

    const settings = await getChoreSettings(ctx, args.householdId);
    const chores = await ctx.db
      .query("chores")
      .withIndex("by_household", (query) => query.eq("householdId", args.householdId))
      .collect();

    return await Promise.all(
      chores
        .filter((chore) => chore.active)
        .map((chore) => choreWithPreview(ctx, chore, args.childId, settings)),
    );
  },
});

export const getSettingsForHousehold = query({
  args: { householdId: v.id("households") },
  handler: async (ctx, args) => {
    await assertHouseholdAccess(ctx, args.householdId);
    return publicSettings(await getChoreSettings(ctx, args.householdId));
  },
});

export const upsertSettings = mutation({
  args: {
    householdId: v.id("households"),
    dailyMultiplier: v.number(),
    weeklyMultiplier: v.number(),
    monthlyMultiplier: v.number(),
  },
  handler: async (ctx, args) => {
    const parent = await assertHouseholdAccess(ctx, args.householdId);
    validateMultiplier(args.dailyMultiplier, "Daily");
    validateMultiplier(args.weeklyMultiplier, "Weekly");
    validateMultiplier(args.monthlyMultiplier, "Monthly");

    const existing = await ctx.db
      .query("choreSettings")
      .withIndex("by_household", (query) => query.eq("householdId", args.householdId))
      .unique();
    const settings = {
      dailyMultiplier: args.dailyMultiplier,
      weeklyMultiplier: args.weeklyMultiplier,
      monthlyMultiplier: args.monthlyMultiplier,
    };

    if (existing) {
      await ctx.db.patch(existing._id, settings);
    } else {
      await ctx.db.insert("choreSettings", { householdId: args.householdId, ...settings });
    }

    await ctx.db.insert("auditEvents", {
      householdId: args.householdId,
      actorId: parent._id,
      action: "Chore settings updated",
      createdAt: new Date().toISOString(),
      metadata: settings,
    });

    return settings;
  },
});

export const create = mutation({
  args: {
    householdId: v.id("households"),
    title: v.string(),
    description: v.string(),
    frequency: choreFrequency,
    basePoints: v.number(),
    active: v.boolean(),
  },
  handler: async (ctx, args) => {
    const parent = await assertHouseholdAccess(ctx, args.householdId);
    validateChoreInput(args);
    const choreId = await ctx.db.insert("chores", {
      householdId: args.householdId,
      title: args.title.trim(),
      description: args.description.trim(),
      frequency: args.frequency,
      basePoints: args.basePoints,
      active: args.active,
      createdByParentId: parent._id,
    });

    await ctx.db.insert("auditEvents", {
      householdId: args.householdId,
      actorId: parent._id,
      action: "Chore created",
      createdAt: new Date().toISOString(),
      metadata: { choreId, frequency: args.frequency, basePoints: args.basePoints },
    });

    return choreId;
  },
});

export const update = mutation({
  args: {
    householdId: v.id("households"),
    choreId: v.id("chores"),
    title: v.string(),
    description: v.string(),
    frequency: choreFrequency,
    basePoints: v.number(),
    active: v.boolean(),
  },
  handler: async (ctx, args) => {
    const parent = await assertHouseholdAccess(ctx, args.householdId);
    validateChoreInput(args);
    const chore = await ctx.db.get(args.choreId);
    if (!chore || chore.householdId !== args.householdId) {
      throw new Error("Chore not found");
    }

    await ctx.db.patch(args.choreId, {
      title: args.title.trim(),
      description: args.description.trim(),
      frequency: args.frequency,
      basePoints: args.basePoints,
      active: args.active,
    });

    await ctx.db.insert("auditEvents", {
      householdId: args.householdId,
      actorId: parent._id,
      action: "Chore edited",
      createdAt: new Date().toISOString(),
      metadata: { choreId: args.choreId, frequency: args.frequency, basePoints: args.basePoints },
    });

    return args.choreId;
  },
});

export const submit = mutation({
  args: {
    householdId: v.id("households"),
    childId: v.id("children"),
    choreId: v.id("chores"),
  },
  handler: async (ctx, args) => {
    const chore = await ctx.db.get(args.choreId);
    if (!chore || chore.householdId !== args.householdId || !chore.active) {
      throw new Error("Chore not found");
    }
    const child = await ctx.db.get(args.childId);
    if (!child || child.householdId !== args.householdId) {
      throw new Error("Child profile not found");
    }

    const settings = await getChoreSettings(ctx, args.householdId);
    const periodKey = periodKeyFor(chore.frequency);
    const repeatCount = await countPriorActiveSubmissions(
      ctx,
      args.childId,
      args.choreId,
      periodKey,
    );
    const multiplier = multiplierFor(settings, chore.frequency);
    const calculated = calculateEarnedPoints({
      basePoints: chore.basePoints,
      multiplier,
      frequency: chore.frequency,
      repeatCount,
    });

    return await ctx.db.insert("choreSubmissions", {
      householdId: args.householdId,
      childId: args.childId,
      choreId: args.choreId,
      periodKey,
      status: "submitted",
      snapshotTitle: chore.title,
      snapshotDescription: chore.description,
      snapshotFrequency: chore.frequency,
      snapshotBasePoints: chore.basePoints,
      snapshotMultiplier: multiplier,
      repeatCount,
      repeatAdjustment: calculated.repeatAdjustment,
      earnedPoints: calculated.earnedPoints,
      completedOnDate: new Date().toISOString().slice(0, 10),
      submittedAt: new Date().toISOString(),
    });
  },
});

export const submittedQueue = query({
  args: { householdId: v.id("households") },
  handler: async (ctx, args) => {
    await assertHouseholdAccess(ctx, args.householdId);
    const submissions = await ctx.db
      .query("choreSubmissions")
      .withIndex("by_household", (query) => query.eq("householdId", args.householdId))
      .collect();

    return submissions
      .filter((submission) => submission.status === "submitted")
      .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt))
      .map((submission) => ({ id: submission._id, ...submission }));
  },
});

export const approve = mutation({
  args: {
    householdId: v.id("households"),
    submissionId: v.id("choreSubmissions"),
  },
  handler: async (ctx, args) => {
    const parent = await assertHouseholdAccess(ctx, args.householdId);
    const submission = await ctx.db.get(args.submissionId);
    if (!submission || submission.householdId !== args.householdId) {
      throw new Error("Chore submission not found");
    }
    if (submission.status !== "submitted") {
      throw new Error("Only submitted chores can be approved");
    }
    const child = await ctx.db.get(submission.childId);
    if (!child || child.householdId !== args.householdId) {
      throw new Error("Child profile not found");
    }

    await ctx.db.patch(args.submissionId, {
      status: "approved",
      approvedAt: new Date().toISOString(),
      approvedByParentId: parent._id,
    });
    await ctx.db.patch(child._id, {
      pointsBalance: child.pointsBalance + submission.earnedPoints,
    });
    await ctx.db.insert("auditEvents", {
      householdId: args.householdId,
      actorId: parent._id,
      action: "Chore approved",
      createdAt: new Date().toISOString(),
      metadata: { submissionId: args.submissionId, earnedPoints: submission.earnedPoints },
    });
  },
});

export const reject = mutation({
  args: {
    householdId: v.id("households"),
    submissionId: v.id("choreSubmissions"),
    note: v.string(),
  },
  handler: async (ctx, args) => {
    const parent = await assertHouseholdAccess(ctx, args.householdId);
    const submission = await ctx.db.get(args.submissionId);
    if (!submission || submission.householdId !== args.householdId) {
      throw new Error("Chore submission not found");
    }
    if (submission.status !== "submitted") {
      throw new Error("Only submitted chores can be rejected");
    }

    await ctx.db.patch(args.submissionId, {
      status: "rejected",
      rejectedAt: new Date().toISOString(),
      rejectionNote: args.note,
    });
    await ctx.db.insert("auditEvents", {
      householdId: args.householdId,
      actorId: parent._id,
      action: "Chore rejected",
      createdAt: new Date().toISOString(),
      metadata: { submissionId: args.submissionId },
    });
  },
});
