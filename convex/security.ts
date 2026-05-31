import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

type Ctx = QueryCtx | MutationCtx;

export async function requireParent(ctx: Ctx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthenticated");

  const parent = await ctx.db
    .query("parents")
    .withIndex("by_clerk_user", (query) => query.eq("clerkUserId", identity.subject))
    .unique();

  if (!parent) throw new Error("Parent membership required");
  return parent;
}

export async function assertHouseholdAccess(ctx: Ctx, householdId: Id<"households">) {
  const parent = await requireParent(ctx);
  if (parent.householdId !== householdId) throw new Error("Household access denied");
  return parent;
}
