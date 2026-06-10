import { mutation, query } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { assertHouseholdAccess } from "./security";

const rewardVisual = v.union(
  v.object({
    type: v.literal("icon"),
    iconKey: v.string(),
  }),
  v.object({
    type: v.literal("upload"),
    imageUrl: v.string(),
    uploadThingKey: v.string(),
    imageName: v.string(),
  }),
);

function validateRewardInput(args: { title: string; pointsCost: number }) {
  if (!args.title.trim()) throw new Error("Reward title is required");
  if (args.pointsCost < 0) throw new Error("Reward points cost cannot be negative");
}

function rewardWithVisualDefaults<
  Reward extends {
    visualType?: "icon" | "upload";
    iconKey?: string;
    imageUrl?: string;
    uploadThingKey?: string;
    imageName?: string;
  },
>(reward: Reward) {
  if (
    reward.visualType === "upload" &&
    reward.imageUrl &&
    reward.uploadThingKey &&
    reward.imageName
  ) {
    return reward;
  }

  return {
    ...reward,
    visualType: "icon" as const,
    iconKey: reward.iconKey ?? "treat",
    imageUrl: undefined,
    uploadThingKey: undefined,
    imageName: undefined,
  };
}

function visualFields(
  visual:
    | {
        type: "icon";
        iconKey: string;
      }
    | {
        type: "upload";
        imageUrl: string;
        uploadThingKey: string;
        imageName: string;
      },
) {
  if (visual.type === "icon") {
    if (!visual.iconKey.trim()) throw new Error("Reward icon is required");
    return {
      visualType: visual.type,
      iconKey: visual.iconKey.trim(),
      imageUrl: undefined,
      uploadThingKey: undefined,
      imageName: undefined,
    };
  }

  if (!visual.imageUrl.trim()) throw new Error("Reward image URL is required");
  if (!visual.uploadThingKey.trim()) throw new Error("Reward upload key is required");
  if (!visual.imageName.trim()) throw new Error("Reward image name is required");

  return {
    visualType: visual.type,
    iconKey: undefined,
    imageUrl: visual.imageUrl.trim(),
    uploadThingKey: visual.uploadThingKey.trim(),
    imageName: visual.imageName.trim(),
  };
}

export const list = query({
  args: { householdId: v.id("households"), paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    await assertHouseholdAccess(ctx, args.householdId);
    const page = await ctx.db
      .query("rewards")
      .withIndex("by_household", (query) => query.eq("householdId", args.householdId))
      .paginate(args.paginationOpts);

    return {
      ...page,
      page: page.page.map(rewardWithVisualDefaults),
    };
  },
});

export const create = mutation({
  args: {
    householdId: v.id("households"),
    title: v.string(),
    pointsCost: v.number(),
    active: v.boolean(),
    visual: rewardVisual,
  },
  handler: async (ctx, args) => {
    const parent = await assertHouseholdAccess(ctx, args.householdId);
    validateRewardInput(args);
    const visual = visualFields(args.visual);
    const rewardId = await ctx.db.insert("rewards", {
      householdId: args.householdId,
      title: args.title.trim(),
      pointsCost: args.pointsCost,
      active: args.active,
      ...visual,
    });

    await ctx.db.insert("auditEvents", {
      householdId: args.householdId,
      actorId: parent._id,
      action: "Reward created",
      createdAt: new Date().toISOString(),
      metadata: { rewardId, pointsCost: args.pointsCost, visualType: visual.visualType },
    });

    return rewardId;
  },
});

export const update = mutation({
  args: {
    householdId: v.id("households"),
    rewardId: v.id("rewards"),
    title: v.string(),
    pointsCost: v.number(),
    active: v.boolean(),
    visual: rewardVisual,
  },
  handler: async (ctx, args) => {
    const parent = await assertHouseholdAccess(ctx, args.householdId);
    validateRewardInput(args);
    const visual = visualFields(args.visual);

    const reward = await ctx.db.get(args.rewardId);
    if (!reward || reward.householdId !== args.householdId) {
      throw new Error("Reward not found");
    }

    await ctx.db.patch(args.rewardId, {
      title: args.title.trim(),
      pointsCost: args.pointsCost,
      active: args.active,
      ...visual,
    });

    await ctx.db.insert("auditEvents", {
      householdId: args.householdId,
      actorId: parent._id,
      action: "Reward edited",
      createdAt: new Date().toISOString(),
      metadata: {
        rewardId: args.rewardId,
        pointsCost: args.pointsCost,
        active: args.active,
        visualType: visual.visualType,
      },
    });

    return args.rewardId;
  },
});
