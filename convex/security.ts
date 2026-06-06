import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

type Ctx = QueryCtx | MutationCtx;

function getE2EClerkUserId() {
  if (process.env.E2E_AUTH_BYPASS !== "true") return null;

  const clerkUserId = process.env.E2E_CLERK_USER_ID;
  if (!clerkUserId) {
    throw new Error("E2E auth bypass requires E2E_CLERK_USER_ID");
  }

  return clerkUserId;
}

export async function requireParent(ctx: Ctx) {
  const identity = await ctx.auth.getUserIdentity();
  const clerkUserId = identity?.subject ?? getE2EClerkUserId();
  if (!clerkUserId) throw new Error("Unauthenticated");

  const parent = await ctx.db
    .query("parents")
    .withIndex("by_clerk_user", (query) => query.eq("clerkUserId", clerkUserId))
    .unique();

  if (!parent) throw new Error("Parent membership required");
  return parent;
}

export async function assertHouseholdAccess(ctx: Ctx, householdId: Id<"households">) {
  const parent = await requireParent(ctx);
  if (parent.householdId !== householdId) throw new Error("Household access denied");
  return parent;
}
