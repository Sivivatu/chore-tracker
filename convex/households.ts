import { query } from "./_generated/server";
import { requireParent } from "./security";

export const current = query({
  args: {},
  handler: async (ctx) => {
    const parent = await requireParent(ctx);
    return await ctx.db.get(parent.householdId);
  },
});
