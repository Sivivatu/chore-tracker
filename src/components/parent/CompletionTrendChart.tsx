import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DashboardDay } from "@/components/parent/CalendarCompletionView";
import { formatBritishDateLabel } from "@/lib/dates";

type Props = {
  days: DashboardDay[];
  weekEnd: string;
};

export function CompletionTrendChart({ days, weekEnd }: Props) {
  const data = days.map((day) => ({
    ...day,
    label: formatBritishDateLabel(day.date, weekEnd),
  }));
  return (
    <section
      className="h-80 w-full max-w-full overflow-hidden rounded-lg border border-ink/10 bg-white p-4 shadow-panel sm:h-72 sm:p-5"
      aria-label="Seven day completion trend"
    >
      <div className="mb-4">
        <h2 className="text-lg font-black">Completion trend</h2>
        <p className="text-sm text-ink/60">Approved, submitted and paused routines by day.</p>
      </div>
      <div className="h-[220px] min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 4, bottom: 18, left: -24 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              interval={0}
              tick={{ fontSize: 10 }}
              tickFormatter={(label: string) => label.split(" ")[0] ?? label}
              tickMargin={8}
            />
            <YAxis allowDecimals={false} width={32} />
            <Tooltip />
            <Bar dataKey="approved" fill="#14b8a6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="submitted" fill="#f97316" radius={[4, 4, 0, 0]} />
            <Bar dataKey="paused" fill="#64748b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
