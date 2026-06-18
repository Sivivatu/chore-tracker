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

async function createHousehold(id = "owner") {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity(identity(id));
  const created = await owner.mutation(api.households.createInitialHousehold, {
    householdName: "The Example Household",
    parentName: "Alex",
    childName: "Sam",
    parentPin: "2468",
  });
  const childId = await t.run(async (ctx) => {
    const child = await ctx.db
      .query("children")
      .withIndex("by_household", (query) => query.eq("householdId", created.householdId))
      .unique();
    if (!child) throw new Error("Child not created");
    return child._id;
  });

  return { t, owner, childId, ...created };
}

describe("dashboard weekly overview", () => {
  it("aggregates live routine, chore approval and pause data for the household", async () => {
    const { t, owner, householdId, parentId, childId } = await createHousehold();

    await t.run(async (ctx) => {
      const routineTemplateId = await ctx.db.insert("routineTemplates", {
        householdId,
        name: "Morning routine",
        type: "morning",
        active: true,
        schedule: ["Mon"],
        createdByParentId: parentId,
      });
      const approvedRoutineId = await ctx.db.insert("routineInstances", {
        householdId,
        childId,
        routineTemplateId,
        date: "2026-06-15",
        status: "approved",
        snapshotName: "Morning routine",
        snapshotType: "morning",
        approvedAt: "2026-06-15T08:30:00.000Z",
        approvedByParentId: parentId,
      });
      await ctx.db.insert("stepInstances", {
        householdId,
        childId,
        routineInstanceId: approvedRoutineId,
        snapshotTitle: "Brush teeth",
        snapshotDescription: "Brush for two minutes.",
        snapshotOrder: 1,
        snapshotPoints: 5,
        snapshotRequired: true,
        snapshotIllustrationKey: "teeth",
        accent: "#38bdf8",
        completedAt: "2026-06-15T08:00:00.000Z",
        completedByChildId: childId,
      });
      await ctx.db.insert("routineInstances", {
        householdId,
        childId,
        routineTemplateId,
        date: "2026-06-16",
        status: "submitted",
        snapshotName: "Morning routine",
        snapshotType: "morning",
        submittedAt: "2026-06-16T08:20:00.000Z",
      });
      await ctx.db.insert("routineInstances", {
        householdId,
        childId,
        routineTemplateId,
        date: "2026-06-17",
        status: "rejected",
        snapshotName: "Morning routine",
        snapshotType: "morning",
        rejectedAt: "2026-06-17T08:40:00.000Z",
        rejectionNote: "Skipped required steps",
      });
      const choreId = await ctx.db.insert("chores", {
        householdId,
        title: "Water plants",
        description: "Water the kitchen plants.",
        frequency: "weekly",
        basePoints: 2,
        active: true,
        createdByParentId: parentId,
      });
      await ctx.db.insert("choreSubmissions", {
        householdId,
        childId,
        choreId,
        periodKey: "2026-W25",
        status: "approved",
        snapshotTitle: "Water plants",
        snapshotDescription: "Water the kitchen plants.",
        snapshotFrequency: "weekly",
        snapshotBasePoints: 2,
        snapshotMultiplier: 3,
        repeatCount: 1,
        repeatAdjustment: 0,
        earnedPoints: 6,
        submittedAt: "2026-06-16T12:00:00.000Z",
        approvedAt: "2026-06-16T13:00:00.000Z",
        approvedByParentId: parentId,
      });
      await ctx.db.insert("choreSubmissions", {
        householdId,
        childId,
        choreId,
        periodKey: "2026-W25-extra",
        status: "submitted",
        snapshotTitle: "Water plants",
        snapshotDescription: "Water the kitchen plants.",
        snapshotFrequency: "weekly",
        snapshotBasePoints: 2,
        snapshotMultiplier: 3,
        repeatCount: 2,
        repeatAdjustment: -1,
        earnedPoints: 5,
        submittedAt: "2026-06-17T12:00:00.000Z",
      });
      await ctx.db.insert("holidayPauses", {
        householdId,
        startDate: "2026-06-18",
        endDate: "2026-06-19",
        reason: "Family visit",
        createdByParentId: parentId,
      });
    });

    const overview = await owner.query(api.dashboard.weeklyOverview, {
      householdId,
      weekStart: "2026-06-15",
      today: "2026-06-18",
    });

    expect(overview.summary).toEqual({
      completionPercentage: 33,
      submittedCount: 2,
      pointsEarned: 11,
      pausedCount: 1,
    });
    expect(overview.days).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ date: "2026-06-15", scheduled: 1, approved: 1 }),
        expect.objectContaining({ date: "2026-06-16", scheduled: 1, submitted: 1 }),
        expect.objectContaining({ date: "2026-06-17", scheduled: 1, rejected: 1 }),
        expect.objectContaining({ date: "2026-06-18", paused: 1 }),
      ]),
    );
  });

  it("denies access to another household dashboard", async () => {
    const first = await createHousehold("first");
    const second = first.t.withIdentity(identity("second"));
    const secondHousehold = await second.mutation(api.households.createInitialHousehold, {
      householdName: "Another Household",
      parentName: "Jamie",
      childName: "Riley",
      parentPin: "2468",
    });

    await expect(
      first.owner.query(api.dashboard.weeklyOverview, {
        householdId: secondHousehold.householdId as Id<"households">,
        weekStart: "2026-06-15",
        today: "2026-06-18",
      }),
    ).rejects.toThrow("Household access denied");
  });
});
