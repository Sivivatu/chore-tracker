import { Gift } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card } from "@/components/ui/Card";

export function ParentRewardsPage() {
  const context = useQuery(api.households.currentContext);
  const rewardOptions = useQuery(
    api.rewards.list,
    context?.household ? { householdId: context.household._id } : "skip",
  );

  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      <p className="text-sm font-black uppercase text-teal">Rewards</p>
      <h1 className="text-4xl font-black">
        Points balance: {context?.child?.pointsBalance ?? 0}
      </h1>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {(rewardOptions ?? []).map((reward) => (
          <Card key={reward._id}>
            <Gift aria-hidden className="h-8 w-8 text-coral" />
            <h2 className="mt-4 text-xl font-black">{reward.title}</h2>
            <p className="mt-2 text-sm font-semibold text-ink/60">{reward.pointsCost} points</p>
            <p className="mt-4 text-sm text-ink/60">Redemption requests are a future milestone.</p>
          </Card>
        ))}
      </div>
    </section>
  );
}
