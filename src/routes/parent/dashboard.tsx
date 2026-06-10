import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { CalendarCompletionView } from "@/components/parent/CalendarCompletionView";
import { CompletionTrendChart } from "@/components/parent/CompletionTrendChart";
import { DashboardMetricCard } from "@/components/parent/DashboardMetricCard";
import { getDashboardSummary } from "@/lib/dashboard";
import { demoRoutineDate } from "@/lib/demo-date";

export function ParentDashboardPage() {
  const context = useQuery(api.households.currentContext);
  const routineInstances = useQuery(
    api.routines.listTodayWithSteps,
    context?.household ? { householdId: context.household._id, date: demoRoutineDate } : "skip",
  );
  const holidayPauses = useQuery(
    api.holidayPauses.list,
    context?.household ? { householdId: context.household._id } : "skip",
  );
  const pauses = (holidayPauses ?? []).map((pause) => ({ id: pause._id, ...pause }));
  const summary = getDashboardSummary(routineInstances ?? [], pauses);

  return (
    <section className="mx-auto w-full max-w-7xl overflow-x-hidden px-3 py-8 sm:px-4">
      <div className="mb-8 flex flex-col gap-2">
        <p className="text-sm font-black uppercase text-teal">Parent dashboard</p>
        <h1 className="break-words text-3xl font-black sm:text-4xl">
          Today for {context?.child?.name ?? "your child"}
        </h1>
        <p className="max-w-2xl text-ink/65">
          Review routine progress, approve submissions, and keep points tied to verified completion.
        </p>
      </div>
      <div className="grid min-w-0 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <DashboardMetricCard
          label="Completion"
          value={`${summary.completionPercentage}%`}
          detail="Approved routines today"
        />
        <DashboardMetricCard
          label="Approval queue"
          value={`${summary.submittedCount}`}
          detail="Submitted by child mode"
        />
        <DashboardMetricCard
          label="Points earned"
          value={`${summary.pointsEarned}`}
          detail="Approved points only"
        />
        <DashboardMetricCard
          label="Holiday pauses"
          value={`${summary.pausedCount}`}
          detail="Active or scheduled ranges"
        />
      </div>
      <div className="mt-6 grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
        <CompletionTrendChart />
        <CalendarCompletionView />
      </div>
    </section>
  );
}
