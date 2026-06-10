import { getCalendarSeries } from "@/lib/dashboard";
import { holidayPauses, routineInstances } from "@/data/seed";

export function CalendarCompletionView() {
  const days = getCalendarSeries(routineInstances, holidayPauses);
  return (
    <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-panel">
      <h2 className="text-lg font-black">Calendar view</h2>
      <div className="mt-4 grid grid-cols-7 gap-2">
        {days.map((day) => (
          <div key={day.date} className="min-h-24 rounded-md border border-ink/10 bg-paper p-3">
            <p className="text-xs font-bold text-ink/60">{day.label}</p>
            <p className="mt-3 text-2xl font-black">{day.approved}</p>
            <p className="text-xs text-ink/60">
              {day.paused ? "Paused" : day.submitted ? "Submitted" : "Approved"}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
