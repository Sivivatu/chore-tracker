import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { getCalendarSeries } from "@/lib/dashboard";
import { demoRoutineDate } from "@/lib/demo-date";

export function CompletionTrendChart() {
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
  const data = getCalendarSeries(routineInstances ?? [], pauses);

  return (
    <section
      className="h-72 rounded-lg border border-ink/10 bg-white p-5 shadow-panel"
      aria-label="Seven day completion trend"
    >
      <div className="mb-4">
        <h2 className="text-lg font-black">Completion trend</h2>
        <p className="text-sm text-ink/60">Approved, submitted and paused routines by day.</p>
      </div>
      <div className="overflow-x-auto">
        <BarChart data={data} width={720} height={190}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="approved" fill="#14b8a6" radius={[4, 4, 0, 0]} />
          <Bar dataKey="submitted" fill="#f97316" radius={[4, 4, 0, 0]} />
          <Bar dataKey="paused" fill="#64748b" radius={[4, 4, 0, 0]} />
        </BarChart>
      </div>
    </section>
  );
}
