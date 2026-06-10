import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { auditEvents, child, household, parents } from "@/data/seed";

export function ParentSettingsPage() {
  return (
    <section className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[0.8fr_1fr]">
      <Card>
        <p className="text-sm font-black uppercase text-teal">Household</p>
        <h1 className="mt-2 text-3xl font-black">{household.name}</h1>
        <p className="mt-4 text-sm text-ink/60">
          Parents: {parents.map((parent) => parent.name).join(", ")}
        </p>
        <p className="text-sm text-ink/60">Child profile: {child.name}</p>
        <Button className="mt-5">Reset child PIN</Button>
      </Card>
      <Card>
        <h2 className="text-2xl font-black">Audit trail</h2>
        <ol className="mt-4 grid gap-3">
          {auditEvents.map((event) => (
            <li key={event.id} className="rounded-md bg-paper p-3">
              <p className="font-semibold">{event.action}</p>
              <p className="text-sm text-ink/60">
                {new Date(event.createdAt).toLocaleString("en-GB")}
              </p>
            </li>
          ))}
        </ol>
      </Card>
    </section>
  );
}
