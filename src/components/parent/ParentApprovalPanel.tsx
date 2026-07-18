import { Link } from "@tanstack/react-router";
import { Check, X } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export function ParentApprovalPanel() {
  const context = useQuery(api.households.currentContext);
  const queue = useQuery(
    api.approvals.queue,
    context?.household ? { householdId: context.household._id } : "skip",
  );
  const choreQueue = useQuery(
    api.chores.submittedQueue,
    context?.household ? { householdId: context.household._id } : "skip",
  );
  const approveChore = useMutation(api.chores.approve);
  const rejectChore = useMutation(api.chores.reject);

  async function approveChoreSubmission(submissionId: Id<"choreSubmissions">) {
    if (!context?.household) return;
    await approveChore({ householdId: context.household._id, submissionId });
  }

  async function rejectChoreSubmission(submissionId: Id<"choreSubmissions">) {
    if (!context?.household) return;
    await rejectChore({
      householdId: context.household._id,
      submissionId,
      note: "Please check this chore again.",
    });
  }

  return (
    <div className="grid gap-4">
      {(queue ?? []).map((instance) => (
        <Card
          key={instance.id}
          className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
        >
          <div>
            <p className="text-sm font-bold uppercase text-coral">Waiting for review</p>
            <h2 className="text-xl font-black">{instance.snapshotName}</h2>
            <p className="text-sm text-ink/60">
              {instance.steps.filter((step) => step.completedAt).length} of {instance.steps.length}{" "}
              steps ticked
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              to="/parent/approvals/$routineInstanceId"
              params={{ routineInstanceId: instance._id }}
              className="inline-flex min-h-11 items-center justify-center rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white shadow-button hover:bg-black"
            >
              Review routine
            </Link>
          </div>
        </Card>
      ))}
      {(queue ?? []).length === 0 && (choreQueue ?? []).length === 0 ? (
        <Card><p className="font-bold text-ink/65">No submissions are waiting for review.</p></Card>
      ) : null}
      {(choreQueue ?? []).map((submission) => (
        <Card
          key={submission.id}
          data-testid="chore-approval-card"
          className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
        >
          <div>
            <p className="text-sm font-bold uppercase text-teal">Chore waiting for review</p>
            <h2 className="text-xl font-black">{submission.snapshotTitle}</h2>
            <p className="text-sm text-ink/60">
              {submission.snapshotFrequency} chore worth {submission.earnedPoints} points
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => rejectChoreSubmission(submission._id)}>
              <X aria-hidden className="h-4 w-4" />
              Reject
            </Button>
            <Button onClick={() => approveChoreSubmission(submission._id)}>
              <Check aria-hidden className="h-4 w-4" />
              Approve
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
