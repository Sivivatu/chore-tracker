import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

export type ChoreFrequency = "daily" | "weekly" | "monthly";

export type ChoreSettings = {
  dailyMultiplier: number;
  weeklyMultiplier: number;
  monthlyMultiplier: number;
};

export const defaultChoreMultipliers = {
  dailyMultiplier: 1,
  weeklyMultiplier: 3,
  monthlyMultiplier: 10,
} satisfies ChoreSettings;

function isoWeekKey(date: Date) {
  const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((utcDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${utcDate.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function dateFromDateKey(dateKey: string) {
  return new Date(`${dateKey}T12:00:00.000Z`);
}

export function periodKeyFor(frequency: ChoreFrequency, date = new Date()) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  if (frequency === "daily") return `${year}-${month}-${day}`;
  if (frequency === "weekly") return isoWeekKey(date);
  return `${year}-${month}`;
}

export function multiplierFor(settings: ChoreSettings, frequency: ChoreFrequency) {
  if (frequency === "daily") return settings.dailyMultiplier;
  if (frequency === "weekly") return settings.weeklyMultiplier;
  return settings.monthlyMultiplier;
}

export async function getChoreSettings(ctx: QueryCtx | MutationCtx, householdId: Id<"households">) {
  const stored = await ctx.db
    .query("choreSettings")
    .withIndex("by_household", (query) => query.eq("householdId", householdId))
    .unique();

  return stored ?? { householdId, ...defaultChoreMultipliers };
}

export async function countPriorActiveSubmissions(
  ctx: QueryCtx | MutationCtx,
  childId: Id<"children">,
  choreId: Id<"chores">,
  periodKey: string,
) {
  const submissions = await ctx.db
    .query("choreSubmissions")
    .withIndex("by_child_and_chore_and_period", (query) =>
      query.eq("childId", childId).eq("choreId", choreId).eq("periodKey", periodKey),
    )
    .collect();

  return submissions.filter((submission) => submission.status !== "rejected").length;
}

export function repeatAdjustment(frequency: ChoreFrequency, repeatCount: number) {
  if (repeatCount === 0) return 1;
  if (frequency === "daily") return 0;
  if (repeatCount === 1) return 0.5;
  return 0;
}

export function calculateEarnedPoints(args: {
  basePoints: number;
  multiplier: number;
  frequency: ChoreFrequency;
  repeatCount: number;
}) {
  const adjustment = repeatAdjustment(args.frequency, args.repeatCount);
  return {
    repeatAdjustment: adjustment,
    earnedPoints: Math.floor(args.basePoints * args.multiplier * adjustment),
  };
}
