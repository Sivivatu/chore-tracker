import { useEffect, useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { RoutineCard } from "@/components/child/RoutineCard";
import { readChildSession } from "@/lib/child-session";
import { toTimeZoneDateKey } from "@/lib/dates";

export function ChildTodayPage() {
  const context = useQuery(api.households.currentContext);
  const childSession = readChildSession();
  const childId = childSession?.childId;
  const householdId = context?.household?._id;
  const today = useMemo(
    () => toTimeZoneDateKey(new Date(), context?.household?.timeZone ?? "Europe/London"),
    [context?.household?.timeZone],
  );
  const ensureTodayForChild = useMutation(api.routines.ensureTodayForChild);
  const todaysRoutines = useQuery(
    api.routines.listTodayWithSteps,
    householdId && childId
      ? {
          householdId,
          childId: childId as Id<"children">,
          date: today,
        }
      : "skip",
  );

  useEffect(() => {
    if (!householdId || !childId) return;

    void ensureTodayForChild({
      householdId,
      childId: childId as Id<"children">,
      date: today,
    });
  }, [childId, ensureTodayForChild, householdId, today]);

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
