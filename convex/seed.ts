import { mutation } from "./_generated/server";

export const demo = mutation({
  args: {},
  handler: async (ctx) => {
    const householdId = await ctx.db.insert("households", {
      name: "The Parker Household",
      createdAt: new Date().toISOString(),
    });
    const parentId = await ctx.db.insert("parents", {
      householdId,
      clerkUserId: "user_parent_1",
      name: "Alex",
    });
    const childId = await ctx.db.insert("children", {
      householdId,
      name: "Maya",
      pinHash: "1234",
      avatarColour: "#ffcf5a",
      pointsBalance: 0,
    });
    return { householdId, parentId, childId };
  },
});
