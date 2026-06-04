import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { RoutineCard } from "@/components/child/RoutineCard";
import { demoRoutineDate } from "@/lib/demo-date";

export function ChildTodayPage() {
  const context = useQuery(api.households.currentContext);
  const todaysRoutines = useQuery(
    api.routines.listTodayWithSteps,
    context?.household ? { householdId: context.household._id, date: demoRoutineDate } : "skip",
  );

  return (
    <section className="child-stage min-h-[calc(100vh-73px)] px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-black uppercase text-coral">Today</p>
        <h1 className="text-5xl font-black">Your routines, {context?.child?.name ?? "there"}</h1>
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {(todaysRoutines ?? []).map((instance) => (
            <RoutineCard key={instance.id} instance={instance} />
          ))}
        </div>
      </div>
    </section>
  );
}
