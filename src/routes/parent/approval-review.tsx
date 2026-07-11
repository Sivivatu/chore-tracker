import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/Button";

export function ParentApprovalReviewPage() {
  const { routineInstanceId } = useParams({ strict: false }) as { routineInstanceId?: string };
  const navigate = useNavigate();
  const context = useQuery(api.households.currentContext);
  const review = useQuery(api.approvals.review, context?.household && routineInstanceId
    ? { householdId: context.household._id, routineInstanceId: routineInstanceId as Id<"routineInstances"> } : "skip");
  const approve = useMutation(api.approvals.approve);
  const reject = useMutation(api.approvals.reject);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  if (review === undefined) return <section className="mx-auto max-w-4xl p-8">Loading review…</section>;
  if (!review || review.status !== "submitted") return <section className="mx-auto max-w-4xl p-8"><h1 className="text-3xl font-black">This routine is no longer awaiting review.</h1><Link to="/parent/approvals" className="mt-4 inline-block underline">Back to submissions</Link></section>;
  const submittedReview = review;
  async function decide(kind: "approve" | "reject") {
    if (!context?.household) return;
    if (kind === "reject" && !note.trim()) { setError("Enter a note for the child before rejecting."); return; }
    setSaving(true); setError("");
    try {
      if (kind === "approve") await approve({ householdId: context.household._id, routineInstanceId: submittedReview._id, expectedSubmissionRevision: submittedReview.submissionRevision });
      else await reject({ householdId: context.household._id, routineInstanceId: submittedReview._id, expectedSubmissionRevision: submittedReview.submissionRevision, note });
      await navigate({ to: "/parent/approvals" });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save the review."); }
    finally { setSaving(false); }
  }
  return <section className="mx-auto max-w-4xl p-4 py-8">
    <Link to="/parent/approvals" className="text-sm font-bold underline">Back to submissions</Link>
    <h1 className="mt-4 text-4xl font-black">{review.snapshotName}</h1>
    <p className="mt-2 text-ink/65">{review.childName} · {new Date(`${review.date}T12:00:00Z`).toLocaleDateString("en-GB")} · submitted {review.latestSubmittedAt ? new Date(review.latestSubmittedAt).toLocaleString("en-GB") : "just now"}</p>
    {review.submissionRevision > 1 ? <p className="mt-3 font-bold text-teal">Updated since first submission · revision {review.submissionRevision}</p> : null}
    <ol className="mt-6 grid gap-3">{review.steps.map((step) => <li key={step.id} className="rounded-md border p-4"><strong>{step.snapshotTitle}</strong> — {step.completedAt ? "Done" : "Not done"} · {step.snapshotRequired ? "Required" : "Optional"} · {step.snapshotPoints} points</li>)}</ol>
    <p className="mt-5 font-bold">{review.completedStepCount} complete · {review.missedRequiredStepCount} required steps missed · {review.projectedPoints} points if approved</p>
    <label className="mt-6 block font-bold" htmlFor="rejection-note">Rejection note</label>
    <textarea id="rejection-note" value={note} maxLength={500} onChange={(event) => setNote(event.target.value)} className="mt-2 min-h-24 w-full rounded-md border p-3" />
    {error ? <p className="mt-2 font-bold text-rose-700" aria-live="polite">{error}</p> : null}
    <div className="mt-4 flex gap-3"><Button disabled={saving} variant="secondary" onClick={() => void decide("reject")}>Reject</Button><Button disabled={saving} onClick={() => void decide("approve")}>Approve</Button></div>
  </section>;
}
