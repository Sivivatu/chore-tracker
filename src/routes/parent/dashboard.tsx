import { useState } from "react";
import { useQuery } from "convex/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { CalendarCompletionView } from "@/components/parent/CalendarCompletionView";
import { CompletionTrendChart } from "@/components/parent/CompletionTrendChart";
import { DashboardMetricCard } from "@/components/parent/DashboardMetricCard";
import { Button } from "@/components/ui/Button";
import {
  addDaysToDateKey,
  formatBritishWeekRange,
  getWeekStartDateKey,
  toDateKey,
} from "@/lib/dates";

export function ParentDashboardPage() {
  const context = useQuery(api.households.currentContext);
  const today = toDateKey(new Date());
  const currentWeekStart = getWeekStartDateKey(today);
  const [selectedWeekStart, setSelectedWeekStart] = useState(currentWeekStart);
  const dashboard = useQuery(
    api.dashboard.weeklyOverview,
    context?.household
      ? {
          householdId: context.household._id,
          weekStart: selectedWeekStart,
          today,
        }
      : "skip",
  );
  const summary = dashboard?.summary;
  const canGoBack = Boolean(dashboard && selectedWeekStart > dashboard.earliestWeekStart);
  const canGoForward = selectedWeekStart < currentWeekStart;

  function showPreviousWeek() {
    setSelectedWeekStart(addDaysToDateKey(selectedWeekStart, -7));
  }

  function showNextWeek() {
    setSelectedWeekStart(addDaysToDateKey(selectedWeekStart, 7));
  }

  return (
    <section className="mx-auto w-full max-w-7xl overflow-x-hidden px-3 py-8 sm:px-4">
      <div className="mb-8 flex flex-col gap-2">
        <p className="text-sm font-black uppercase text-teal">Parent dashboard</p>
        <h1 className="break-words text-3xl font-black sm:text-4xl">
          This week for {context?.child?.name ?? "your child"}
        </h1>
        <p className="max-w-2xl text-ink/65">
          Review routine progress, approve submissions, and keep points tied to verified completion.
        </p>
      </div>
      <div className="grid min-w-0 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <DashboardMetricCard
          label="Completion"
          value={summary ? `${summary.completionPercentage}%` : "—"}
          detail="Approved completed routines this week"
        />
        <DashboardMetricCard
          label="Approval queue"
          value={summary ? `${summary.submittedCount}` : "—"}
          detail="Pending routine and chore submissions"
        />
        <DashboardMetricCard
          label="Points earned"
          value={summary ? `${summary.pointsEarned}` : "—"}
          detail="Approved points in this week"
        />
        <DashboardMetricCard
          label="Holiday pauses"
          value={summary ? `${summary.pausedCount}` : "—"}
          detail="Ranges overlapping this week"
        />
      </div>
      <div className="mt-6 flex flex-col gap-3 rounded-lg border border-ink/10 bg-white p-4 shadow-panel sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-ink/60">
            {selectedWeekStart === currentWeekStart ? "Current week" : "Previous week"}
          </p>
          <h2 className="text-xl font-black">
            {dashboard
              ? formatBritishWeekRange(dashboard.weekStart, dashboard.weekEnd)
              : "Loading week…"}
          </h2>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={showPreviousWeek}
            disabled={!canGoBack}
            aria-label="Previous week"
          >
            <ChevronLeft aria-hidden="true" size={18} />
            Previous
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={showNextWeek}
            disabled={!canGoForward}
            aria-label="Next week"
          >
            Next
            <ChevronRight aria-hidden="true" size={18} />
          </Button>
        </div>
      </div>
      <div className="mt-6 grid min-w-0 gap-6 xl:grid-cols-2">
        <CompletionTrendChart days={dashboard?.days ?? []} weekEnd={dashboard?.weekEnd ?? today} />
        <CalendarCompletionView
          days={dashboard?.days ?? []}
          weekEnd={dashboard?.weekEnd ?? today}
        />
      </div>
    </section>
  );
}
