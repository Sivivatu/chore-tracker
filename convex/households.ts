import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { assertHouseholdAccess, requireParent } from "./security";

export const current = query({
  args: {},
  handler: async (ctx) => {
    const parent = await requireParent(ctx);
    return await ctx.db.get(parent.householdId);
  },
});

export const currentContext = query({
  args: {},
  handler: async (ctx) => {
    const parent = await requireParent(ctx);
    const household = await ctx.db.get(parent.householdId);
    if (!household) throw new Error("Household not found");

    const child = await ctx.db
      .query("children")
      .withIndex("by_household", (query) => query.eq("householdId", parent.householdId))
      .unique();

    return { household, parent, child };
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

    await ctx.db.patch(args.householdId, { parentLockPinHash: pin });
    return { configured: true };
  },
});

export const verifyParentLockPin = query({
  args: { householdId: v.id("households"), pin: v.string() },
  handler: async (ctx, args) => {
    await assertHouseholdAccess(ctx, args.householdId);
    const household = await ctx.db.get(args.householdId);
    if (!household) throw new Error("Household not found");

    return Boolean(household.parentLockPinHash && household.parentLockPinHash === args.pin.trim());
  },
});
