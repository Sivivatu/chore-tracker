import { CalendarCompletionView } from "@/components/parent/CalendarCompletionView";
import { CompletionTrendChart } from "@/components/parent/CompletionTrendChart";
import { DashboardMetricCard } from "@/components/parent/DashboardMetricCard";
import { child, holidayPauses, routineInstances } from "@/data/seed";
import { getDashboardSummary } from "@/lib/dashboard";

export function ParentDashboardPage() {
  const summary = getDashboardSummary(routineInstances, holidayPauses);
  return (
    <section className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8 flex flex-col gap-2">
        <p className="text-sm font-black uppercase text-teal">Parent dashboard</p>
        <h1 className="text-4xl font-black">Today for {child.name}</h1>
        <p className="max-w-2xl text-ink/65">
          Review routine progress, approve submissions, and keep points tied to verified completion.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.8fr]">
        <CompletionTrendChart />
        <CalendarCompletionView />
      </div>
    </section>
  );
}
