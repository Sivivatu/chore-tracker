import { RoutineCard } from "@/components/child/RoutineCard";
import { child, routineInstances } from "@/data/seed";

export function ChildTodayPage() {
  const todaysRoutines = routineInstances.filter((instance) => instance.date === "2026-05-31");
  return (
    <section className="child-stage min-h-[calc(100vh-73px)] px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-black uppercase text-coral">Today</p>
        <h1 className="text-5xl font-black">Your routines, {child.name}</h1>
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {todaysRoutines.map((instance) => (
            <RoutineCard key={instance.id} instance={instance} />
          ))}
        </div>
      </div>
    </section>
  );
}
