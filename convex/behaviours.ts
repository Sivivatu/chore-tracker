import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { assertHouseholdAccess } from "./security";
import { validateHouseholdDateBounds } from "./dateValidation";

const categories = {
  positive: [
    { key: "listening", label: "Listening well", kind: "positive" as const },
    { key: "following_instructions", label: "Following instructions", kind: "positive" as const },
    { key: "tidying_up", label: "Tidying up", kind: "positive" as const },
    { key: "kindness", label: "Kindness", kind: "positive" as const },
    { key: "helpfulness", label: "Helpfulness", kind: "positive" as const },
  ],
  negative: [
    { key: "not_listening", label: "Not listening", kind: "negative" as const },
    {
      key: "refusing_instructions",
      label: "Not doing what they were told",
      kind: "negative" as const,
    },
    { key: "not_tidying", label: "Not tidying up", kind: "negative" as const },
    { key: "unkind_words", label: "Unkind words", kind: "negative" as const },
    { key: "unsafe_behaviour", label: "Unsafe behaviour", kind: "negative" as const },
  ],
};

const behaviourKind = v.union(v.literal("positive"), v.literal("negative"));

export const listCategories = query({
  args: {},
  handler: async () => categories,
});

export const listForChild = query({
  args: {
    householdId: v.id("households"),
    childId: v.id("children"),
    fromDate: v.string(),
    toDate: v.string(),
  },
  handler: async (ctx, args) => {
    await assertHouseholdAccess(ctx, args.householdId);
    const child = await ctx.db.get(args.childId);
    if (!child || child.householdId !== args.householdId)
      throw new Error("Child profile not found");
    const household = await ctx.db.get(args.householdId);
    if (!household) throw new Error("Household not found");
    validateHouseholdDateBounds({ date: args.fromDate, householdCreatedAt: household.createdAt });
    validateHouseholdDateBounds({ date: args.toDate, householdCreatedAt: household.createdAt });
    if (args.fromDate > args.toDate) throw new Error("Date range is invalid");

    const entries = await ctx.db
      .query("behaviourEntries")
      .withIndex("by_child_and_date", (q) =>
        q.eq("childId", args.childId).gte("date", args.fromDate).lte("date", args.toDate),
      )
      .order("desc")
      .take(100);

    return entries
      .filter((entry) => entry.householdId === args.householdId)
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
      .map((entry) => ({ id: entry._id, ...entry }));
  },
});

export const create = mutation({
  args: {
    householdId: v.id("households"),
    childId: v.id("children"),
    date: v.string(),
    kind: behaviourKind,
    categoryKey: v.string(),
    note: v.string(),
    points: v.number(),
  },
  handler: async (ctx, args) => {
    const parent = await assertHouseholdAccess(ctx, args.householdId);
    const household = await ctx.db.get(args.householdId);
    if (!household) throw new Error("Household not found");
    const child = await ctx.db.get(args.childId);
    if (!child || child.householdId !== args.householdId)
      throw new Error("Child profile not found");
    validateHouseholdDateBounds({ date: args.date, householdCreatedAt: household.createdAt });

    const category = categories[args.kind].find((item) => item.key === args.categoryKey);
    if (!category) throw new Error("Behaviour category is invalid");
    const note = args.note.trim();
    if (!note) throw new Error("What happened is required");
    if (!Number.isInteger(args.points) || args.points <= 0) {
      throw new Error("Points must be a positive whole number");
    }

    const pointsDelta = args.kind === "positive" ? args.points : -args.points;
    const now = new Date().toISOString();
    const entryId = await ctx.db.insert("behaviourEntries", {
      householdId: args.householdId,
      childId: args.childId,
      parentId: parent._id,
      date: args.date,
      kind: args.kind,
      categoryKey: category.key,
      categoryLabel: category.label,
      note,
      pointsDelta,
      createdAt: now,
    });

    await ctx.db.patch(child._id, { pointsBalance: child.pointsBalance + pointsDelta });
    await ctx.db.insert("auditEvents", {
      householdId: args.householdId,
      actorId: parent._id,
      action: "Behaviour points added",
      createdAt: now,
      metadata: { entryId, childId: args.childId, date: args.date, pointsDelta },
    });

    return { entryId, pointsDelta };
  },
});
