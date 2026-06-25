/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "./_generated/api";
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

describe("routines", () => {
  it("materialises active templates for a child's day", async () => {
    const { owner, householdId, childId } = await createHousehold();

    await owner.mutation(api.routines.createTemplate, {
      householdId,
      name: "School Morning",
      type: "morning",
      active: true,
      schedule: ["Tue"],
      steps: [
        {
          title: "Brush teeth",
          description: "Brush for two minutes.",
          points: 5,
          required: true,
          illustrationKey: "teeth",
          accent: "#38bdf8",
        },
      ],
    });

    await expect(
      owner.query(api.routines.listTodayWithSteps, {
        householdId,
        date: "2026-06-23",
      }),
    ).resolves.toEqual([]);

    await owner.mutation(api.routines.ensureTodayForChild, {
      householdId,
      childId,
      date: "2026-06-23",
    });

    await owner.mutation(api.routines.ensureTodayForChild, {
      householdId,
      childId,
      date: "2026-06-23",
    });

    const routines = await owner.query(api.routines.listTodayWithSteps, {
      householdId,
      date: "2026-06-23",
    });

    expect(routines).toHaveLength(1);
    expect(routines[0]).toMatchObject({
      childId,
      date: "2026-06-23",
      status: "not_started",
      snapshotName: "School Morning",
      snapshotType: "morning",
    });
    expect(routines[0].steps).toEqual([
      expect.objectContaining({
        childId,
        snapshotTitle: "Brush teeth",
        snapshotOrder: 1,
        snapshotPoints: 5,
      }),
    ]);
  });

  it("does not materialise custom routines without scheduled days", async () => {
    const { owner, householdId, childId } = await createHousehold();

    await owner.mutation(api.routines.createTemplate, {
      householdId,
      name: "Ad hoc reset",
      type: "custom",
      active: true,
      schedule: [],
      steps: [
        {
          title: "Tidy desk",
          description: "Clear the workspace.",
          points: 5,
          required: true,
          illustrationKey: "desk",
          accent: "#38bdf8",
        },
      ],
    });

    await expect(
      owner.mutation(api.routines.ensureTodayForChild, {
        householdId,
        childId,
        date: "2026-06-23",
      }),
    ).resolves.toEqual({ createdCount: 0 });

    await expect(
      owner.query(api.routines.listTodayWithSteps, {
        householdId,
        date: "2026-06-23",
      }),
    ).resolves.toEqual([]);
  });

  it("does not materialise routines during holiday pauses", async () => {
    const { owner, householdId, childId } = await createHousehold();

    await owner.mutation(api.routines.createTemplate, {
      householdId,
      name: "School Morning",
      type: "morning",
      active: true,
      schedule: ["Tue"],
      steps: [
        {
          title: "Brush teeth",
          description: "Brush for two minutes.",
          points: 5,
          required: true,
          illustrationKey: "teeth",
          accent: "#38bdf8",
        },
      ],
    });
    await owner.mutation(api.holidayPauses.create, {
      householdId,
      startDate: "2026-06-22",
      endDate: "2026-06-24",
      reason: "Family trip",
    });

    await expect(
      owner.mutation(api.routines.ensureTodayForChild, {
        householdId,
        childId,
        date: "2026-06-23",
      }),
    ).resolves.toEqual({ createdCount: 0 });

    await expect(
      owner.query(api.routines.listTodayWithSteps, {
        householdId,
        date: "2026-06-23",
      }),
    ).resolves.toEqual([]);
  });

  it("marks existing actionable routines paused when a holiday pause is added later", async () => {
    const { owner, householdId, childId } = await createHousehold();

    await owner.mutation(api.routines.createTemplate, {
      householdId,
      name: "School Morning",
      type: "morning",
      active: true,
      schedule: ["Tue"],
      steps: [
        {
          title: "Brush teeth",
          description: "Brush for two minutes.",
          points: 5,
          required: true,
          illustrationKey: "teeth",
          accent: "#38bdf8",
        },
      ],
    });
    await owner.mutation(api.routines.ensureTodayForChild, {
      householdId,
      childId,
      date: "2026-06-23",
    });
    await owner.mutation(api.holidayPauses.create, {
      householdId,
      startDate: "2026-06-23",
      endDate: "2026-06-23",
      reason: "Inset day",
    });

    await expect(
      owner.mutation(api.routines.ensureTodayForChild, {
        householdId,
        childId,
        date: "2026-06-23",
      }),
    ).resolves.toEqual({ createdCount: 0 });

    const routines = await owner.query(api.routines.listTodayWithSteps, {
      householdId,
      childId,
      date: "2026-06-23",
    });

    expect(routines).toHaveLength(1);
    expect(routines[0]).toMatchObject({
      childId,
      date: "2026-06-23",
      status: "paused",
      snapshotName: "School Morning",
    });
  });
});
