import { useMemo, useState } from "react";
import { useParams } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { RoutineStepRow } from "@/components/child/RoutineStepRow";
import { Button } from "@/components/ui/Button";
import { readChildSession } from "@/lib/child-session";

export function ChildRoutinePage() {
  const { routineInstanceId } = useParams({ strict: false }) as { routineInstanceId?: string };
  const context = useQuery(api.households.currentContext);
  const instance = useQuery(
    api.routines.getInstanceWithSteps,
    context?.household && routineInstanceId
      ? {
          householdId: context.household._id,
          routineInstanceId: routineInstanceId as Id<"routineInstances">,
        }
      : "skip",
  );
  const submitRoutine = useMutation(api.childMode.submitRoutine);
  const [toggledStepIds, setToggledStepIds] = useState(new Set<string>());
  const readOnly = instance?.status === "submitted" || instance?.status === "approved";
  const checkedSteps = useMemo(() => {
    if (!instance) return new Set<string>();

    return new Set(
      instance.steps
        .filter((step) => {
          const completed = Boolean(step.completedAt);
          return toggledStepIds.has(step.id) ? !completed : completed;
        })
        .map((step) => step.id),
    );
  }, [instance, toggledStepIds]);

  function toggleStep(stepId: string) {
    setToggledStepIds((current) => {
      const next = new Set(current);
      if (next.has(stepId)) next.delete(stepId);
      else next.add(stepId);
      return next;
    });
  }

  async function submit() {
    const childSession = readChildSession();
    if (!context?.household || !instance || !childSession) return;

    await submitRoutine({
      householdId: context.household._id,
      childId: childSession.childId as Id<"children">,
      routineInstanceId: instance._id,
      completedStepIds: Array.from(checkedSteps) as Id<"stepInstances">[],
    });
    setToggledStepIds(new Set());
  }

  if (instance === undefined) {
    return <section className="child-stage min-h-[calc(100vh-73px)] px-4 py-8">Loading...</section>;
  }

  if (instance === null) {
    return (
      <section className="child-stage min-h-[calc(100vh-73px)] px-4 py-8">
        Routine not found.
      </section>
    );
  }

  return (
    <section className="child-stage min-h-[calc(100vh-73px)] px-4 py-8">
      <div className="mx-auto max-w-4xl rounded-xl border-4 border-ink bg-cream p-4 shadow-poster md:p-8">
        <div className="text-center">
          <p className="text-sm font-black uppercase text-coral">
            {instance.status.replace("_", " ")}
          </p>
          <h1 className="text-5xl font-black">{instance.snapshotName}</h1>
          {instance.rejectionNote ? (
            <p className="mx-auto mt-3 max-w-xl rounded-md bg-rose-50 p-3 text-sm font-bold text-rose-700">
              Parent note: {instance.rejectionNote}
            </p>
          ) : null}
          {readOnly ? (
            <p className="mt-3 text-sm font-bold text-ink/60">
              Waiting for parent approval. This routine is read-only.
            </p>
          ) : null}
        </div>
        <ol className="mt-8 grid gap-4">
          {instance.steps
            .slice()
            .sort((a, b) => a.snapshotOrder - b.snapshotOrder)
            .map((step) => (
              <RoutineStepRow
                key={step.id}
                step={step}
                checked={checkedSteps.has(step.id)}
                disabled={readOnly}
                onToggle={toggleStep}
              />
            ))}
        </ol>
        <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-lg bg-white p-4 md:flex-row">
          <p className="text-lg font-black">
            {checkedSteps.size} of {instance.steps.length} steps ticked
          </p>
          <Button disabled={readOnly || checkedSteps.size === 0} onClick={submit}>
            Submit for approval
          </Button>
        </div>
      </div>
    </section>
  );
}
