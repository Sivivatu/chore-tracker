import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { getCalendarSeries } from "@/lib/dashboard";
import { demoRoutineDate } from "@/lib/demo-date";

export function CalendarCompletionView() {
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
  const days = getCalendarSeries(routineInstances ?? [], pauses);

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
