import { query } from "./_generated/server";
import { v } from "convex/values";
import { assertHouseholdAccess } from "./security";

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_WEEKLY_ROUTINES = 200;
const MAX_APPROVAL_QUEUE_ITEMS = 200;
const MAX_WEEKLY_CHORES = 200;
const MAX_WEEKLY_BEHAVIOURS = 200;
const MAX_HOLIDAY_PAUSES = 200;
const MAX_STEPS_PER_ROUTINE = 100;

function parseDateKey(dateKey: string) {
  if (!DATE_KEY_PATTERN.test(dateKey)) throw new Error("Invalid date");

  const date = new Date(`${dateKey}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== dateKey) {
    throw new Error("Invalid date");
  }
  return date;
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(dateKey: string, days: number) {
  const date = parseDateKey(dateKey);
  date.setUTCDate(date.getUTCDate() + days);
  return toDateKey(date);
}

function mondayFor(dateKey: string) {
  const date = parseDateKey(dateKey);
  const daysSinceMonday = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - daysSinceMonday);
  return toDateKey(date);
}

export const weeklyOverview = query({
  args: {
    householdId: v.id("households"),
    weekStart: v.string(),
    today: v.string(),
  },
  handler: async (ctx, args) => {
    const parent = await assertHouseholdAccess(ctx, args.householdId);
    parseDateKey(args.weekStart);
    parseDateKey(args.today);

    const signupDate = toDateKey(new Date(parent._creationTime));
    const currentWeekStart = mondayFor(args.today);
    const requestedWeekStart = mondayFor(args.weekStart);
    const earliestRoutineInstances = await ctx.db
      .query("routineInstances")
      .withIndex("by_household_date", (query) =>
        query.eq("householdId", args.householdId).lte("date", currentWeekStart),
      )
      .take(1);
    const choreActivityForBounds = await ctx.db
      .query("choreSubmissions")
      .withIndex("by_household_and_completedOnDate", (query) =>
        query
          .eq("householdId", args.householdId)
          .gte("completedOnDate", "")
          .lte("completedOnDate", addDays(currentWeekStart, 6)),
      )
      .take(MAX_WEEKLY_CHORES);
    const legacyChoreActivityForBounds = await ctx.db
      .query("choreSubmissions")
      .withIndex("by_household_and_approvedAt", (query) =>
        query
          .eq("householdId", args.householdId)
          .gt("approvedAt", undefined)
          .lte("approvedAt", `${addDays(currentWeekStart, 6)}T23:59:59.999Z`),
      )
      .take(MAX_WEEKLY_CHORES);
    const earliestApprovedChoreDate = [
      ...choreActivityForBounds,
      ...legacyChoreActivityForBounds.filter((submission) => !submission.completedOnDate),
    ]
      .filter((submission) => submission.status === "approved")
      .map((submission) => submission.completedOnDate ?? submission.approvedAt?.slice(0, 10))
      .filter((date): date is string => Boolean(date && date <= addDays(currentWeekStart, 6)))
      .sort()[0];
    const earliestHolidayPauses = await ctx.db
      .query("holidayPauses")
      .withIndex("by_household", (query) => query.eq("householdId", args.householdId))
      .take(MAX_HOLIDAY_PAUSES);
    const earliestActivityDate = [
      signupDate,
      earliestRoutineInstances[0]?.date,
      earliestApprovedChoreDate,
      earliestHolidayPauses
        .filter((pause) => pause.startDate <= addDays(currentWeekStart, 6))
        .sort((a, b) => a.startDate.localeCompare(b.startDate))[0]?.startDate,
    ]
      .filter((date): date is string => Boolean(date))
      .sort()[0];
    const earliestWeekStart = mondayFor(earliestActivityDate);
    const weekStart =
      requestedWeekStart < earliestWeekStart
        ? earliestWeekStart
        : requestedWeekStart > currentWeekStart
          ? currentWeekStart
          : requestedWeekStart;
    const weekEnd = addDays(weekStart, 6);

    const routineInstances = await ctx.db
      .query("routineInstances")
      .withIndex("by_household_date", (query) =>
        query.eq("householdId", args.householdId).gte("date", weekStart).lte("date", weekEnd),
      )
      .take(MAX_WEEKLY_ROUTINES);
    const pendingRoutines = await ctx.db
      .query("routineInstances")
      .withIndex("by_household_and_status", (query) =>
        query.eq("householdId", args.householdId).eq("status", "submitted"),
      )
      .take(MAX_APPROVAL_QUEUE_ITEMS);
    const pendingChores = await ctx.db
      .query("choreSubmissions")
      .withIndex("by_household_and_status", (query) =>
        query.eq("householdId", args.householdId).eq("status", "submitted"),
      )
      .take(MAX_APPROVAL_QUEUE_ITEMS);
    const completedDateChores = await ctx.db
      .query("choreSubmissions")
      .withIndex("by_household_and_completedOnDate", (query) =>
        query
          .eq("householdId", args.householdId)
          .gte("completedOnDate", weekStart)
          .lte("completedOnDate", weekEnd),
      )
      .take(MAX_WEEKLY_CHORES);
    const legacyApprovedChores = await ctx.db
      .query("choreSubmissions")
      .withIndex("by_household_and_approvedAt", (query) =>
        query
          .eq("householdId", args.householdId)
          .gte("approvedAt", `${weekStart}T00:00:00.000Z`)
          .lte("approvedAt", `${weekEnd}T23:59:59.999Z`),
      )
      .take(MAX_WEEKLY_CHORES);
    const weekApprovedChores = [
      ...completedDateChores,
      ...legacyApprovedChores.filter((chore) => !chore.completedOnDate),
    ].filter((chore) => {
      if (chore.status !== "approved") return false;
      const completedDate = chore.completedOnDate ?? chore.approvedAt?.slice(0, 10);
      return Boolean(completedDate && completedDate >= weekStart && completedDate <= weekEnd);
    });
    const behaviourEntries = await ctx.db
      .query("behaviourEntries")
      .withIndex("by_household_and_date", (query) =>
        query.eq("householdId", args.householdId).gte("date", weekStart).lte("date", weekEnd),
      )
      .take(MAX_WEEKLY_BEHAVIOURS);
    const holidayPauses = earliestHolidayPauses;

    const approvedRoutinePoints = await Promise.all(
      routineInstances
        .filter((instance) => instance.status === "approved")
        .map(async (instance) => {
          const steps = await ctx.db
            .query("stepInstances")
            .withIndex("by_routine_instance", (query) =>
              query.eq("routineInstanceId", instance._id),
            )
            .take(MAX_STEPS_PER_ROUTINE);
          return steps
            .filter((step) => step.completedAt)
            .reduce((total, step) => total + step.snapshotPoints, 0);
        }),
    );

    const approvedCount = routineInstances.filter(
      (instance) => instance.status === "approved",
    ).length;
    const completedCount = routineInstances.filter((instance) =>
      ["approved", "submitted", "rejected"].includes(instance.status),
    ).length;
    const overlappingPauses = holidayPauses.filter(
      (pause) => pause.startDate <= weekEnd && pause.endDate >= weekStart,
    );
    const dateKeys = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));

    return {
      weekStart,
      weekEnd,
      signupDate,
      earliestWeekStart,
      currentWeekStart,
      summary: {
        completionPercentage:
          completedCount === 0 ? 0 : Math.round((approvedCount / completedCount) * 100),
        submittedCount: pendingRoutines.length + pendingChores.length,
        pointsEarned:
          approvedRoutinePoints.reduce((total, points) => total + points, 0) +
          weekApprovedChores.reduce((total, chore) => total + chore.earnedPoints, 0) +
          behaviourEntries.reduce((total, entry) => total + entry.pointsDelta, 0),
        pausedCount: overlappingPauses.length,
      },
      days: dateKeys.map((date) => {
        const dayInstances = routineInstances.filter((instance) => instance.date === date);
        return {
          date,
          scheduled: dayInstances.length,
          approved: dayInstances.filter((instance) => instance.status === "approved").length,
          submitted: dayInstances.filter((instance) => instance.status === "submitted").length,
          rejected: dayInstances.filter((instance) => instance.status === "rejected").length,
          paused: overlappingPauses.some(
            (pause) => date >= pause.startDate && date <= pause.endDate,
          )
            ? 1
            : 0,
          isBeforeSignup: date < signupDate,
        };
      }),
    };
  },
});
