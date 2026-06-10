import { Link } from "@tanstack/react-router";
import type { DailyRoutineInstance } from "@/types/domain";
import { getCompletedPoints } from "@/lib/points";

export function RoutineCard({ instance }: { instance: DailyRoutineInstance }) {
  const complete = instance.steps.filter((step) => step.completedAt).length;
  return (
    <article className="rounded-lg border-2 border-ink bg-white p-5 shadow-poster">
      <p className="text-sm font-black uppercase text-coral">{instance.status.replace("_", " ")}</p>
      <h2 className="mt-2 text-3xl font-black">{instance.snapshotName}</h2>
      <p className="mt-2 text-sm font-semibold text-ink/65">
        {complete} of {instance.steps.length} steps complete. {getCompletedPoints(instance)} points
        ready.
      </p>
      <Link
        to="/child/routine/$routineInstanceId"
        params={{ routineInstanceId: instance.id }}
        className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white shadow-button hover:bg-black"
      >
        Open routine
      </Link>
    </article>
  );
}
