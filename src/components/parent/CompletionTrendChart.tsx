import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import { getCalendarSeries } from "@/lib/dashboard";
import { holidayPauses, routineInstances } from "@/data/seed";

export function CompletionTrendChart() {
  const data = getCalendarSeries(routineInstances, holidayPauses);
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
