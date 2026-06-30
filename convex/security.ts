import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { env } from "./_generated/server";

type Ctx = QueryCtx | MutationCtx;

function getE2EClerkUserId() {
  if (env.E2E_AUTH_BYPASS !== "true") return null;

  const clerkUserId = env.E2E_CLERK_USER_ID;
  if (!clerkUserId) {
    throw new Error("E2E auth bypass requires E2E_CLERK_USER_ID");
  }

  return clerkUserId;
}

export async function requireParent(ctx: Ctx) {
  const parent = await currentParent(ctx);
  if (!parent) throw new Error("Parent membership required");
  return parent;
}

export async function currentParent(ctx: Ctx, options: { allowUnauthenticated?: boolean } = {}) {
  const identity = await ctx.auth.getUserIdentity();
  const clerkUserId = identity?.tokenIdentifier ?? getE2EClerkUserId();
  if (!clerkUserId) {
    if (options.allowUnauthenticated) return null;
    throw new Error("Unauthenticated");
  }

  const parent = await ctx.db
    .query("parents")
    .withIndex("by_clerk_user", (query) => query.eq("clerkUserId", clerkUserId))
    .unique();
  if (parent || !identity || identity.subject === clerkUserId) return parent;

  return await ctx.db
    .query("parents")
    .withIndex("by_clerk_user", (query) => query.eq("clerkUserId", identity.subject))
    .unique();
}

export async function currentClerkUserId(ctx: Ctx) {
  const identity = await ctx.auth.getUserIdentity();
  const clerkUserId = identity?.tokenIdentifier ?? getE2EClerkUserId();
  if (!clerkUserId) throw new Error("Unauthenticated");
  return clerkUserId;
}

export async function assertHouseholdAccess(ctx: Ctx, householdId: Id<"households">) {
  const parent = await requireParent(ctx);
  if (parent.householdId !== householdId) throw new Error("Household access denied");
  return parent;
}
