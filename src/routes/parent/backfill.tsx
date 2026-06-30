import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { toDateKey } from "@/lib/dates";

type RoutineBackfill = {
  id: Id<"routineTemplates">;
  template: { name: string; schedule: string[] };
  scheduled: boolean;
  instance: { status: string } | null;
  steps: Array<{ order: number; title: string; points: number; completed: boolean }>;
};

type ChoreBackfill = {
  _id: Id<"chores">;
  id: Id<"chores">;
  title: string;
  frequency: string;
  earnedPoints: number;
  periodKey: string;
  repeatCount: number;
};

export function ParentBackfillPage() {
  const context = useQuery(api.households.currentContext);
  const today = toDateKey(new Date());
  const [date, setDate] = useState(today);
  const [childId, setChildId] = useState<Id<"children"> | "">("");
  const selectedChildId = (childId || context?.child?._id || context?.children?.[0]?._id) as
    | Id<"children">
    | undefined;
  const day = useQuery(
    api.backfill.listBackfillDay,
    context?.household && selectedChildId
      ? { householdId: context.household._id, childId: selectedChildId, date }
      : "skip",
  );
  const approveRoutine = useMutation(api.backfill.approvePastRoutine);
  const approveChore = useMutation(api.backfill.approvePastChore);
  const [selectedSteps, setSelectedSteps] = useState<Record<string, number[]>>({});
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [savingKey, setSavingKey] = useState("");
  const minDate = day?.bounds.minDate ?? context?.household?.createdAt?.slice(0, 10) ?? today;
  const maxDate = day?.bounds.maxDate ?? today;

  function selectedFor(routine: RoutineBackfill) {
    return (
      selectedSteps[routine.id] ??
      routine.steps.filter((step) => step.completed).map((step) => step.order)
    );
  }

  function toggleStep(routine: RoutineBackfill, order: number) {
    setSelectedSteps((current) => {
      const existing =
        current[routine.id] ??
        routine.steps.filter((step) => step.completed).map((step) => step.order);
      return {
        ...current,
        [routine.id]: existing.includes(order)
          ? existing.filter((item) => item !== order)
          : [...existing, order],
      };
    });
  }

  async function saveRoutine(routine: RoutineBackfill) {
    if (!context?.household || !selectedChildId) return;
    const completedStepOrders = selectedFor(routine);
    setSavingKey(`routine-${routine.id}`);
    setError("");
    setStatus("");
    try {
      const result = await approveRoutine({
        householdId: context.household._id,
        childId: selectedChildId,
        date,
        routineTemplateId: routine.id,
        completedStepOrders,
      });
      setStatus(`Added ${result.earnedPoints} points.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not approve past routine.");
    } finally {
      setSavingKey("");
    }
  }

  async function saveChore(chore: ChoreBackfill) {
    if (!context?.household || !selectedChildId) return;
    setSavingKey(`chore-${chore.id}`);
    setError("");
    setStatus("");
    try {
      const result = await approveChore({
        householdId: context.household._id,
        childId: selectedChildId,
        choreId: chore.id,
        completedOnDate: date,
      });
      setStatus(`Added ${result.earnedPoints} points.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not approve past chore.");
    } finally {
      setSavingKey("");
    }
  }

  return (
    <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 xl:grid-cols-[0.7fr_1.3fr]">
      <Card>
        <p className="text-sm font-black uppercase text-teal">Parent backfill</p>
        <h1 className="text-4xl font-black">Past completions</h1>
        <div className="mt-6 grid gap-4">
          <label className="grid gap-2 text-sm font-bold">
            Date
            <input
              type="date"
              min={minDate}
              max={maxDate}
              value={date}
              onChange={(event) => {
                setDate(event.target.value);
                setSelectedSteps({});
              }}
              className="h-12 rounded-md border border-ink/20 px-3 text-base"
            />
          </label>
          <label className="grid gap-2 text-sm font-bold">
            Child
            <select
              value={selectedChildId ?? ""}
              onChange={(event) => {
                setChildId(event.target.value as Id<"children">);
                setSelectedSteps({});
              }}
              className="h-12 rounded-md border border-ink/20 bg-white px-3 text-base"
            >
              {(context?.children ?? []).map((child) => (
                <option key={child._id} value={child._id}>
                  {child.name}
                </option>
              ))}
            </select>
          </label>
          {error ? (
            <p className="rounded-md bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</p>
          ) : null}
          {status ? (
            <p className="rounded-md bg-teal/10 p-3 text-sm font-bold text-teal">{status}</p>
          ) : null}
        </div>
      </Card>

      <div className="grid content-start gap-6">
        {day === undefined ? (
          <Card>Loading backfill day...</Card>
        ) : (
          <>
            <Card>
              <h2 className="text-2xl font-black">Routines</h2>
              <div className="mt-4 grid gap-4">
                {day.routines.length === 0 ? (
                  <p className="text-ink/65">No active routines yet.</p>
                ) : null}
                {(day.routines as RoutineBackfill[]).map((routine) => {
                  const selected = selectedFor(routine);
                  const points = routine.steps
                    .filter((step) => selected.includes(step.order))
                    .reduce((total, step) => total + step.points, 0);
                  const approved = routine.instance?.status === "approved";
                  return (
                    <div key={routine.id} className="rounded-md border border-ink/10 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="text-xl font-black">{routine.template.name}</h3>
                          <p className="text-sm text-ink/60">
                            {routine.scheduled ? "Scheduled" : "Not scheduled"} for this date
                          </p>
                        </div>
                        <span className="rounded-md bg-paper px-3 py-1 text-sm font-bold">
                          {points} pts
                        </span>
                      </div>
                      <div className="mt-4 grid gap-2">
                        {routine.steps.map((step) => (
                          <label
                            key={step.order}
                            className="flex items-center justify-between gap-3 rounded-md bg-paper p-3 text-sm font-bold"
                          >
                            <span className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={selected.includes(step.order)}
                                disabled={approved}
                                onChange={() => toggleStep(routine, step.order)}
                              />
                              {step.title}
                            </span>
                            <span>{step.points} pts</span>
                          </label>
                        ))}
                      </div>
                      {approved ? (
                        <p className="mt-3 text-sm font-bold text-ink/60">
                          This routine has already awarded points.
                        </p>
                      ) : (
                        <Button
                          className="mt-4"
                          onClick={() => saveRoutine(routine)}
                          disabled={savingKey === `routine-${routine.id}`}
                        >
                          Approve past routine
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
            <Card>
              <h2 className="text-2xl font-black">Chores</h2>
              <div className="mt-4 grid gap-4">
                {day.chores.length === 0 ? (
                  <p className="text-ink/65">No active chores yet.</p>
                ) : null}
                {(day.chores as ChoreBackfill[]).map((chore) => (
                  <div
                    key={chore.id}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-md border border-ink/10 p-4"
                  >
                    <div>
                      <h3 className="text-xl font-black">{chore.title}</h3>
                      <p className="text-sm text-ink/60">
                        {chore.frequency} · {chore.periodKey} · repeat {chore.repeatCount + 1}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-black">{chore.earnedPoints} pts</span>
                      <Button
                        onClick={() => saveChore(chore)}
                        disabled={savingKey === `chore-${chore.id}`}
                      >
                        Approve past chore
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </>
        )}
      </div>
    </section>
  );
}
