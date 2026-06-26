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

async function setup() {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity(identity("owner"));
  const created = await owner.mutation(api.households.createInitialHousehold, {
    householdName: "Household",
    parentName: "Alex",
    childName: "Sam",
    parentPin: "2468",
  });
  const childId = await t.run(async (ctx) => {
    await ctx.db.patch(created.householdId, { createdAt: "2026-06-01T10:00:00.000Z" });
    const child = await ctx.db
      .query("children")
      .withIndex("by_household", (q) => q.eq("householdId", created.householdId))
      .unique();
    if (!child) throw new Error("Missing child");
    return child._id;
  });
  return { t, owner, ...created, childId };
}

describe("behaviours", () => {
  it("adds and subtracts behaviour points immediately", async () => {
    const { t, owner, householdId, childId } = await setup();

    await owner.mutation(api.behaviours.create, {
      householdId,
      childId,
      date: "2026-06-15",
      kind: "positive",
      categoryKey: "kindness",
      note: "Shared toys",
      points: 5,
    });
    await owner.mutation(api.behaviours.create, {
      householdId,
      childId,
      date: "2026-06-16",
      kind: "negative",
      categoryKey: "not_listening",
      note: "Ignored bedtime",
      points: 2,
    });

    const child = await t.run((ctx) => ctx.db.get(childId));
    expect(child?.pointsBalance).toBe(3);
  });

  it("validates category kind, note and date bounds", async () => {
    const { owner, householdId, childId } = await setup();

    await expect(
      owner.mutation(api.behaviours.create, {
        householdId,
        childId,
        date: "2026-06-15",
        kind: "positive",
        categoryKey: "not_listening",
        note: "Mismatch",
        points: 1,
      }),
    ).rejects.toThrow("category");

    await expect(
      owner.mutation(api.behaviours.create, {
        householdId,
        childId,
        date: "2026-06-15",
        kind: "positive",
        categoryKey: "kindness",
        note: " ",
        points: 1,
      }),
    ).rejects.toThrow("required");

    await expect(
      owner.mutation(api.behaviours.create, {
        householdId,
        childId,
        date: "2026-05-31",
        kind: "positive",
        categoryKey: "kindness",
        note: "Too early",
        points: 1,
      }),
    ).rejects.toThrow("before household creation");
  });

  it("lists bounded history for the selected child and date range", async () => {
    const { owner, householdId, childId } = await setup();
    await owner.mutation(api.behaviours.create, {
      householdId,
      childId,
      date: "2026-06-15",
      kind: "positive",
      categoryKey: "helpfulness",
      note: "Helped tidy",
      points: 4,
    });

    const entries = await owner.query(api.behaviours.listForChild, {
      householdId,
      childId,
      fromDate: "2026-06-14",
      toDate: "2026-06-16",
    });

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      categoryLabel: "Helpfulness",
      note: "Helped tidy",
      pointsDelta: 4,
    });
  });
});
