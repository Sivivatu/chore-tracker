import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { assertHouseholdAccess, requireParent } from "./security";
import { hashPin, verifyPin } from "./pins";
import type { Doc } from "./_generated/dataModel";

function publicHousehold(household: Doc<"households">) {
  return {
    _id: household._id,
    _creationTime: household._creationTime,
    name: household.name,
    createdAt: household.createdAt,
  };
}

function publicChild(child: Doc<"children"> | undefined) {
  if (!child) return null;

  return {
    _id: child._id,
    _creationTime: child._creationTime,
    householdId: child.householdId,
    name: child.name,
    avatarColour: child.avatarColour,
    pointsBalance: child.pointsBalance,
  };
}

export const current = query({
  args: {},
  handler: async (ctx) => {
    const parent = await requireParent(ctx);
    const household = await ctx.db.get(parent.householdId);
    if (!household) return null;

    return publicHousehold(household);
  },
});

export const currentContext = query({
  args: {},
  handler: async (ctx) => {
    const parent = await requireParent(ctx);
    const household = await ctx.db.get(parent.householdId);
    if (!household) throw new Error("Household not found");

    const child = (
      await ctx.db
        .query("children")
        .withIndex("by_household", (query) => query.eq("householdId", parent.householdId))
        .take(1)
    ).at(0);

    return { household: publicHousehold(household), parent, child: publicChild(child) };
  },
});

export const parentLockStatus = query({
  args: { householdId: v.id("households") },
  handler: async (ctx, args) => {
    await assertHouseholdAccess(ctx, args.householdId);
    const household = await ctx.db.get(args.householdId);
    if (!household) throw new Error("Household not found");

    return { configured: Boolean(household.parentLockPinHash) };
  },
});

export const setParentLockPin = mutation({
  args: { householdId: v.id("households"), pin: v.string() },
  handler: async (ctx, args) => {
    await assertHouseholdAccess(ctx, args.householdId);
    const pin = args.pin.trim();
    if (!/^\d{4,8}$/.test(pin)) {
      throw new Error("Parent lock PIN must be 4 to 8 digits");
    }

    await ctx.db.patch(args.householdId, {
      parentLockPinHash: await hashPin(pin, args.householdId),
    });
    return { configured: true };
  },
});

export const verifyParentLockPin = query({
  args: { householdId: v.id("households"), pin: v.string() },
  handler: async (ctx, args) => {
    await assertHouseholdAccess(ctx, args.householdId);
    const household = await ctx.db.get(args.householdId);
    if (!household) throw new Error("Household not found");

    return await verifyPin(args.pin, household.parentLockPinHash, args.householdId);
  },
});
