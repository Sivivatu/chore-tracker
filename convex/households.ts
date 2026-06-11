import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { assertHouseholdAccess, requireParent } from "./security";
import { hashPin, verifyPin } from "./pins";
import type { Doc } from "./_generated/dataModel";

const MAX_IDENTITY_NAME_LENGTH = 80;

function normaliseIdentityName(name: string, field: string) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error(`${field} is required`);
  if (trimmed.length > MAX_IDENTITY_NAME_LENGTH) {
    throw new Error(`${field} must be ${MAX_IDENTITY_NAME_LENGTH} characters or fewer`);
  }
  return trimmed;
}

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
    avatarPreset: child.avatarPreset,
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

    const children = await ctx.db
      .query("children")
      .withIndex("by_household", (query) => query.eq("householdId", parent.householdId))
      .take(20);
    const publicChildren = children.map(publicChild).filter((child) => child !== null);

    return {
      household: publicHousehold(household),
      parent,
      child: publicChildren.at(0) ?? null,
      children: publicChildren,
    };
  },
});

export const updateHouseholdIdentity = mutation({
  args: { householdId: v.id("households"), name: v.string() },
  handler: async (ctx, args) => {
    const parent = await assertHouseholdAccess(ctx, args.householdId);
    const household = await ctx.db.get(args.householdId);
    if (!household) throw new Error("Household not found");

    const name = normaliseIdentityName(args.name, "Household name");
    await ctx.db.patch(args.householdId, { name });

    await ctx.db.insert("auditEvents", {
      householdId: args.householdId,
      actorId: parent._id,
      action: "Household identity updated",
      createdAt: new Date().toISOString(),
      metadata: { name },
    });

    return publicHousehold({ ...household, name });
  },
});

export const updateChildIdentity = mutation({
  args: {
    householdId: v.id("households"),
    childId: v.id("children"),
    name: v.string(),
    avatarColour: v.string(),
    avatarPreset: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const parent = await assertHouseholdAccess(ctx, args.householdId);
    const child = await ctx.db.get(args.childId);
    if (!child || child.householdId !== args.householdId) {
      throw new Error("Child profile not found");
    }

    const name = normaliseIdentityName(args.name, "Child name");
    const avatarColour = args.avatarColour.trim();
    if (!/^#[0-9a-fA-F]{6}$/.test(avatarColour)) {
      throw new Error("Avatar colour must be a hex colour");
    }
    const avatarPreset = args.avatarPreset?.trim() || undefined;

    await ctx.db.patch(args.childId, { name, avatarColour, avatarPreset });

    await ctx.db.insert("auditEvents", {
      householdId: args.householdId,
      actorId: parent._id,
      action: "Child identity updated",
      createdAt: new Date().toISOString(),
      metadata: { childId: args.childId, name, avatarColour, avatarPreset },
    });

    return publicChild({ ...child, name, avatarColour, avatarPreset });
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
