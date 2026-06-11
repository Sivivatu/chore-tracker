import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/Button";
import { readChildSession } from "@/lib/child-session";

type ChoreForChild = {
  _id: Id<"chores">;
  id: Id<"chores">;
  title: string;
  description: string;
  frequency: "daily" | "weekly" | "monthly";
  basePoints: number;
  multiplier: number;
  repeatCount: number;
  repeatAdjustment: number;
  earnedPoints: number;
};

function repeatLabel(chore: ChoreForChild) {
  if (chore.repeatCount === 0) return "Full reward";
  if (chore.repeatAdjustment === 0.5) return "Repeat reward";
  return "No extra points this time";
}

export function ChildChoresPage() {
  const context = useQuery(api.households.currentContext);
  const childSession = readChildSession();
  const chores = useQuery(
    api.chores.listForChild,
    context?.household && childSession
      ? {
          householdId: context.household._id,
          childId: childSession.childId as Id<"children">,
        }
      : "skip",
  ) as ChoreForChild[] | undefined;
  const submitChore = useMutation(api.chores.submit);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [submittedIds, setSubmittedIds] = useState(new Set<string>());

  async function submit(choreId: Id<"chores">) {
    if (!context?.household || !childSession) return;

    setSubmittingId(choreId);
    try {
      await submitChore({
        householdId: context.household._id,
        childId: childSession.childId as Id<"children">,
        choreId,
      });
      setSubmittedIds((current) => new Set(current).add(choreId));
    } finally {
      setSubmittingId(null);
    }
  }

  return (
    <section className="child-stage min-h-[calc(100vh-73px)] px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-black uppercase text-coral">Chores</p>
        <h1 className="text-5xl font-black">Extra chores, {context?.child?.name ?? "there"}</h1>
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {(chores ?? []).map((chore) => {
            const submitted = submittedIds.has(chore._id);
            return (
              <article
                key={chore._id}
                className="rounded-xl border-4 border-ink bg-cream p-5 shadow-poster"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-black uppercase text-teal">{chore.frequency}</p>
                    <h2 className="text-3xl font-black">{chore.title}</h2>
                  </div>
                  <span className="rounded-md bg-white px-3 py-1 text-sm font-black text-ink">
                    {chore.earnedPoints} pts
                  </span>
                </div>
                {chore.description ? (
                  <p className="mt-3 text-sm font-bold text-ink/70">{chore.description}</p>
                ) : null}
                <p className="mt-5 text-sm font-black text-ink/70">
                  {repeatLabel(chore)}: {chore.basePoints} x {chore.multiplier}
                </p>
                <Button
                  className="mt-5 w-full"
                  disabled={submittingId === chore._id || submitted}
                  onClick={() => submit(chore._id)}
                >
                  {submitted ? (
                    <>
                      <CheckCircle2 aria-hidden className="h-4 w-4" />
                      Submitted
                    </>
                  ) : (
                    "Submit for approval"
                  )}
                </Button>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
