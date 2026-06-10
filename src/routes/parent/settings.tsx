import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatBritishDateTime } from "@/lib/dates";

export function ParentSettingsPage() {
  const context = useQuery(api.households.currentContext);
  const auditEvents = useQuery(
    api.auditEvents.list,
    context?.household ? { householdId: context.household._id } : "skip",
  );

  return (
    <section className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[0.8fr_1fr]">
      <Card>
        <p className="text-sm font-black uppercase text-teal">Household</p>
        <h1 className="mt-2 text-3xl font-black">{context?.household.name ?? "Household"}</h1>
        <p className="mt-4 text-sm text-ink/60">
          Parent: {context?.parent.name ?? "Loading"}
        </p>
        <p className="text-sm text-ink/60">Child profile: {context?.child?.name ?? "Loading"}</p>
        <Button className="mt-5">Reset child PIN</Button>
      </Card>
      <Card>
        <h2 className="text-2xl font-black">Audit trail</h2>
        <ol className="mt-4 grid gap-3">
          {(auditEvents ?? []).map((event) => (
            <li key={event._id} className="rounded-md bg-paper p-3">
              <p className="font-semibold">{event.action}</p>
              <p className="text-sm text-ink/60">
                {formatBritishDateTime(event.createdAt)}
              </p>
            </li>
          ))}
        </ol>
      </Card>
    </section>
  );
}
