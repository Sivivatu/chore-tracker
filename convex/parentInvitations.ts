import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { assertHouseholdAccess, currentClerkUserId, currentParent } from "./security";

const INVITE_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_PARENTS = 2;

async function hashToken(token: string) {
  const bytes = new TextEncoder().encode(token.trim());
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function validToken(token: string) {
  return /^[0-9a-f]{64}$/i.test(token.trim());
}

export const listForHousehold = query({
  args: { householdId: v.id("households") },
  handler: async (ctx, args) => {
    await assertHouseholdAccess(ctx, args.householdId);
    const now = Date.now();
    const invitations = await ctx.db
      .query("parentInvitations")
      .withIndex("by_household", (query) => query.eq("householdId", args.householdId))
      .take(20);
    return invitations.filter(
      (invite) => !invite.acceptedAt && !invite.revokedAt && Date.parse(invite.expiresAt) > now,
    );
  },
});

export const create = mutation({
  args: { householdId: v.id("households") },
  handler: async (ctx, args) => {
    const parent = await assertHouseholdAccess(ctx, args.householdId);
    const parents = await ctx.db
      .query("parents")
      .withIndex("by_household", (query) => query.eq("householdId", args.householdId))
      .take(MAX_PARENTS);
    if (parents.length >= MAX_PARENTS) throw new Error("This household already has two parents");

    const now = new Date();
    const token = `${crypto.randomUUID().replaceAll("-", "")}${crypto.randomUUID().replaceAll("-", "")}`;
    const invitationId = await ctx.db.insert("parentInvitations", {
      householdId: args.householdId,
      tokenHash: await hashToken(token),
      createdByParentId: parent._id,
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + INVITE_LIFETIME_MS).toISOString(),
    });
    await ctx.db.insert("auditEvents", {
      householdId: args.householdId,
      actorId: parent._id,
      action: "Parent invitation created",
      createdAt: now.toISOString(),
      metadata: { invitationId },
    });
    return {
      invitationId,
      token,
      expiresAt: new Date(now.getTime() + INVITE_LIFETIME_MS).toISOString(),
    };
  },
});

export const inspect = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    if (!validToken(args.token)) return { status: "invalid" as const };
    const tokenHash = await hashToken(args.token);
    const invitation = await ctx.db
      .query("parentInvitations")
      .withIndex("by_tokenHash", (query) => query.eq("tokenHash", tokenHash))
      .unique();
    if (!invitation) return { status: "invalid" as const };
    if (invitation.acceptedAt) return { status: "accepted" as const };
    if (invitation.revokedAt) return { status: "revoked" as const };
    if (Date.parse(invitation.expiresAt) <= Date.now()) return { status: "expired" as const };
    const household = await ctx.db.get(invitation.householdId);
    if (!household) return { status: "invalid" as const };
    return {
      status: "active" as const,
      householdName: household.name,
      expiresAt: invitation.expiresAt,
    };
  },
});

export const revoke = mutation({
  args: { invitationId: v.id("parentInvitations") },
  handler: async (ctx, args) => {
    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation) throw new Error("Invitation not found");
    const parent = await assertHouseholdAccess(ctx, invitation.householdId);
    if (invitation.acceptedAt) throw new Error("Accepted invitations cannot be revoked");
    if (invitation.revokedAt) return null;
    const revokedAt = new Date().toISOString();
    await ctx.db.patch(args.invitationId, { revokedAt });
    await ctx.db.insert("auditEvents", {
      householdId: invitation.householdId,
      actorId: parent._id,
      action: "Parent invitation revoked",
      createdAt: revokedAt,
      metadata: { invitationId: args.invitationId },
    });
    return null;
  },
});

export const accept = mutation({
  args: { token: v.string(), name: v.string() },
  handler: async (ctx, args) => {
    if (!validToken(args.token)) throw new Error("Invitation is invalid");
    const existingParent = await currentParent(ctx);
    if (existingParent) throw new Error("This account already belongs to a household");
    const clerkUserId = await currentClerkUserId(ctx);

    const tokenHash = await hashToken(args.token);
    const invitation = await ctx.db
      .query("parentInvitations")
      .withIndex("by_tokenHash", (query) => query.eq("tokenHash", tokenHash))
      .unique();
    if (!invitation) throw new Error("Invitation is invalid");
    if (invitation.acceptedAt) throw new Error("Invitation has already been used");
    if (invitation.revokedAt) throw new Error("Invitation has been revoked");
    if (Date.parse(invitation.expiresAt) <= Date.now()) throw new Error("Invitation has expired");

    const parents = await ctx.db
      .query("parents")
      .withIndex("by_household", (query) => query.eq("householdId", invitation.householdId))
      .take(MAX_PARENTS);
    if (parents.length >= MAX_PARENTS) throw new Error("This household already has two parents");
    const name = args.name.trim();
    if (!name || name.length > 80)
      throw new Error("Parent name must be between 1 and 80 characters");

    const acceptedAt = new Date().toISOString();
    const parentId = await ctx.db.insert("parents", {
      householdId: invitation.householdId,
      clerkUserId,
      name,
    });
    await ctx.db.patch(invitation._id, { acceptedAt, acceptedByParentId: parentId });
    await ctx.db.insert("auditEvents", {
      householdId: invitation.householdId,
      actorId: parentId,
      action: "Parent invitation accepted",
      createdAt: acceptedAt,
      metadata: { invitationId: invitation._id },
    });
    return { householdId: invitation.householdId, parentId };
  },
});
