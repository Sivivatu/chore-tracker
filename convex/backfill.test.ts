/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

function identity(id: string) {
  return {
    subject: id,
    tokenIdentifier: `https://clerk.example|${id}`,
    issuer: "https://clerk.example",
  };
}

async function setup() {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity(identity("owner"));
  const created = await owner.mutation(api.households.createInitialHousehold, {
    householdName: "Household",
    parentName: "Alex",
    childName: "Sam",
    parentPin: "2468",
  });
  const seeded = await t.run(async (ctx) => {
    await ctx.db.patch(created.householdId, { createdAt: "2026-06-01T10:00:00.000Z" });
    const child = await ctx.db
      .query("children")
      .withIndex("by_household", (q) => q.eq("householdId", created.householdId))
      .unique();
    if (!child) throw new Error("Missing child");
    const routineTemplateId = await ctx.db.insert("routineTemplates", {
      householdId: created.householdId,
      name: "Morning",
      type: "morning",
      active: true,
      schedule: ["Mon"],
      createdByParentId: created.parentId,
    });
    await ctx.db.insert("choreSteps", {
      householdId: created.householdId,
      routineTemplateId,
      title: "Brush teeth",
      description: "",
      order: 1,
      points: 5,
      required: true,
      illustrationKey: "teeth",
      accent: "#38bdf8",
    });
    await ctx.db.insert("choreSteps", {
      householdId: created.householdId,
      routineTemplateId,
      title: "Pack bag",
      description: "",
      order: 2,
      points: 7,
      required: true,
      illustrationKey: "bag",
      accent: "#14b8a6",
    });
    const choreId = await ctx.db.insert("chores", {
      householdId: created.householdId,
      title: "Water plants",
      description: "",
      frequency: "weekly",
      basePoints: 2,
      active: true,
      createdByParentId: created.parentId,
    });
    return { childId: child._id, routineTemplateId, choreId };
  });

  return { t, owner, ...created, ...seeded };
}

describe("backfill", () => {
  it("approves selected routine steps and awards only their points", async () => {
    const { t, owner, householdId, childId, routineTemplateId } = await setup();

    const result = await owner.mutation(api.backfill.approvePastRoutine, {
      householdId,
      childId,
      routineTemplateId,
      date: "2026-06-15",
      completedStepOrders: [2],
    });

    expect(result.earnedPoints).toBe(7);
    const child = await t.run((ctx) => ctx.db.get(childId));
    expect(child?.pointsBalance).toBe(7);
  });

  it("rejects duplicate routine awards once approved", async () => {
    const { owner, householdId, childId, routineTemplateId } = await setup();
    const args = {
      householdId,
      childId,
      routineTemplateId,
      date: "2026-06-15",
      completedStepOrders: [1],
    };

    await owner.mutation(api.backfill.approvePastRoutine, args);

    await expect(owner.mutation(api.backfill.approvePastRoutine, args)).rejects.toThrow(
      "already awarded",
    );
  });

  it("uses existing routine step snapshot points when approving an old instance", async () => {
    const { t, owner, householdId, childId, routineTemplateId } = await setup();
    await t.run(async (ctx) => {
      const routineInstanceId = await ctx.db.insert("routineInstances", {
        householdId,
        childId,
        routineTemplateId,
        date: "2026-06-15",
        status: "submitted",
        snapshotName: "Morning",
        snapshotType: "morning",
        submittedAt: "2026-06-15T08:00:00.000Z",
      });
      await ctx.db.insert("stepInstances", {
        householdId,
        childId,
        routineInstanceId,
        snapshotTitle: "Old brush teeth",
        snapshotDescription: "",
        snapshotOrder: 1,
        snapshotPoints: 11,
        snapshotRequired: true,
        snapshotIllustrationKey: "teeth",
        accent: "#38bdf8",
      });
      const currentStep = await ctx.db
        .query("choreSteps")
        .withIndex("by_routine", (q) => q.eq("routineTemplateId", routineTemplateId))
        .collect()
        .then((steps) => steps.find((step) => step.order === 1));
      if (!currentStep) throw new Error("Missing current step");
      await ctx.db.patch(currentStep._id, { points: 99 });
    });

    const result = await owner.mutation(api.backfill.approvePastRoutine, {
      householdId,
      childId,
      routineTemplateId,
      date: "2026-06-15",
      completedStepOrders: [1],
    });

    expect(result.earnedPoints).toBe(11);
    const child = await t.run((ctx) => ctx.db.get(childId));
    expect(child?.pointsBalance).toBe(11);
  });

  it("lists existing routine steps from snapshots instead of current template steps", async () => {
    const { t, owner, householdId, childId, routineTemplateId } = await setup();
    await t.run(async (ctx) => {
      const routineInstanceId = await ctx.db.insert("routineInstances", {
        householdId,
        childId,
        routineTemplateId,
        date: "2026-06-15",
        status: "submitted",
        snapshotName: "Morning",
        snapshotType: "morning",
        submittedAt: "2026-06-15T08:00:00.000Z",
      });
      await ctx.db.insert("stepInstances", {
        householdId,
        childId,
        routineInstanceId,
        snapshotTitle: "Historical step",
        snapshotDescription: "",
        snapshotOrder: 3,
        snapshotPoints: 13,
        snapshotRequired: true,
        snapshotIllustrationKey: "history",
        accent: "#38bdf8",
        completedAt: "2026-06-15T08:05:00.000Z",
        completedByChildId: childId,
      });
    });

    const day = await owner.query(api.backfill.listBackfillDay, {
      householdId,
      childId,
      date: "2026-06-15",
    });

    const routine = day.routines.find((row) => row.id === routineTemplateId);
    expect(routine?.steps).toEqual([
      expect.objectContaining({
        order: 3,
        title: "Historical step",
        points: 13,
        completed: true,
      }),
    ]);
  });

  it("allows an existing inactive routine instance to be backfilled", async () => {
    const { t, owner, householdId, childId, routineTemplateId } = await setup();
    await t.run(async (ctx) => {
      await ctx.db.patch(routineTemplateId, { active: false });
      const routineInstanceId = await ctx.db.insert("routineInstances", {
        householdId,
        childId,
        routineTemplateId,
        date: "2026-06-15",
        status: "submitted",
        snapshotName: "Morning",
        snapshotType: "morning",
        submittedAt: "2026-06-15T08:00:00.000Z",
      });
      await ctx.db.insert("stepInstances", {
        householdId,
        childId,
        routineInstanceId,
        snapshotTitle: "Old inactive step",
        snapshotDescription: "",
        snapshotOrder: 1,
        snapshotPoints: 9,
        snapshotRequired: true,
        snapshotIllustrationKey: "history",
        accent: "#38bdf8",
      });
    });

    const day = await owner.query(api.backfill.listBackfillDay, {
      householdId,
      childId,
      date: "2026-06-15",
    });
    expect(day.routines.some((row) => row.id === routineTemplateId)).toBe(true);

    const result = await owner.mutation(api.backfill.approvePastRoutine, {
      householdId,
      childId,
      routineTemplateId,
      date: "2026-06-15",
      completedStepOrders: [1],
    });

    expect(result.earnedPoints).toBe(9);
  });

  it("approves a past chore using the completion date period", async () => {
    const { t, owner, householdId, childId, choreId } = await setup();

    const first = await owner.mutation(api.backfill.approvePastChore, {
      householdId,
      childId,
      choreId,
      completedOnDate: "2026-06-15",
    });
    const second = await owner.mutation(api.backfill.approvePastChore, {
      householdId,
      childId,
      choreId,
      completedOnDate: "2026-06-16",
    });

    expect(first.earnedPoints).toBe(6);
    expect(second.earnedPoints).toBe(3);
    const submissions = await t.run(async (ctx) =>
      ctx.db
        .query("choreSubmissions")
        .withIndex("by_child_and_chore_and_period", (q) =>
          q.eq("childId", childId).eq("choreId", choreId).eq("periodKey", "2026-W25"),
        )
        .collect(),
    );
    expect(submissions.map((row) => row.completedOnDate)).toEqual(["2026-06-15", "2026-06-16"]);
  });

  it("rejects dates outside household bounds and other-household children", async () => {
    const first = await setup();
    const secondOwner = first.t.withIdentity(identity("second-owner"));
    const secondCreated = await secondOwner.mutation(api.households.createInitialHousehold, {
      householdName: "Other",
      parentName: "Jamie",
      childName: "Riley",
      parentPin: "2468",
    });
    const secondChildId = await first.t.run(async (ctx) => {
      const child = await ctx.db
        .query("children")
        .withIndex("by_household", (q) => q.eq("householdId", secondCreated.householdId))
        .unique();
      if (!child) throw new Error("Missing second child");
      return child._id;
    });

    await expect(
      first.owner.mutation(api.backfill.approvePastChore, {
        householdId: first.householdId,
        childId: first.childId,
        choreId: first.choreId,
        completedOnDate: "2026-05-31",
      }),
    ).rejects.toThrow("before household creation");

    await expect(
      first.owner.mutation(api.backfill.approvePastChore, {
        householdId: first.householdId,
        childId: secondChildId as Id<"children">,
        choreId: first.choreId,
        completedOnDate: "2026-06-15",
      }),
    ).rejects.toThrow("Child profile not found");
  });
});
