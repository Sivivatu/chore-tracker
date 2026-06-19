import { formatBritishDateLabel } from "@/lib/dates";

export type DashboardDay = {
  date: string;
  scheduled: number;
  approved: number;
  submitted: number;
  rejected: number;
  paused: number;
  isBeforeSignup: boolean;
};

type Props = {
  days: DashboardDay[];
  weekEnd: string;
};

function activityLabel(day: DashboardDay) {
  if (day.isBeforeSignup) return "Before signup";
  if (day.paused) return "Paused";

  const parts = [
    day.approved ? `${day.approved} approved` : "",
    day.submitted ? `${day.submitted} submitted` : "",
    day.rejected ? `${day.rejected} rejected` : "",
  ].filter(Boolean);
  if (parts.length > 0) return parts.join(", ");
  return day.scheduled > 0 ? "In progress" : "No routines";
}

function isWeekend(dateKey: string) {
  const day = new Date(`${dateKey}T12:00:00.000Z`).getUTCDay();
  return day === 0 || day === 6;
}

export function CalendarCompletionView({ days, weekEnd }: Props) {
  return (
    <section className="flex w-full max-w-full flex-col overflow-hidden rounded-lg border border-ink/10 bg-white p-4 shadow-panel sm:p-5">
      <h2 className="text-lg font-black">Calendar view</h2>
      <div className="mt-4 grid min-w-0 flex-1 content-center grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
        {days.map((day) => {
          const weekend = isWeekend(day.date);
          const dayStyle = day.isBeforeSignup
            ? "bg-ink/5 text-ink/45"
            : weekend
              ? "border-teal/20 bg-teal/5"
              : "bg-paper";

          return (
            <div
              key={day.date}
              data-weekend={weekend}
              className={`min-h-24 min-w-0 rounded-md border border-ink/10 px-1.5 py-2 text-center ${dayStyle}`}
            >
              <p className="whitespace-nowrap text-xs font-bold leading-tight text-ink/60">
                {formatBritishDateLabel(day.date, weekEnd)}
              </p>
              <p className="mt-2 text-2xl font-black leading-none">{day.approved}</p>
              <p className="mt-1 text-[10px] leading-tight text-ink/60">{activityLabel(day)}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
