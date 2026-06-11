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
  const approve = useMutation(api.approvals.approve);
  const reject = useMutation(api.approvals.reject);
  const approveChore = useMutation(api.chores.approve);
  const rejectChore = useMutation(api.chores.reject);

  async function approveRoutine(routineInstanceId: Id<"routineInstances">) {
    if (!context?.household) return;
    await approve({ householdId: context.household._id, routineInstanceId });
  }

  async function rejectRoutine(routineInstanceId: Id<"routineInstances">) {
    if (!context?.household) return;
    await reject({
      householdId: context.household._id,
      routineInstanceId,
      note: "Please check this routine again.",
    });
  }

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
            <Button variant="secondary" onClick={() => rejectRoutine(instance._id)}>
              <X aria-hidden className="h-4 w-4" />
              Reject
            </Button>
            <Button onClick={() => approveRoutine(instance._id)}>
              <Check aria-hidden className="h-4 w-4" />
              Approve
            </Button>
          </div>
        </Card>
      ))}
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
