import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { holidayPauses } from "@/data/seed";

export function ParentPausesPage() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-black uppercase text-teal">Holiday pause</p>
          <h1 className="text-4xl font-black">Paused date ranges</h1>
        </div>
        <Button>Create pause</Button>
      </div>
      <div className="grid gap-4">
        {holidayPauses.map((pause) => (
          <Card key={pause.id}>
            <h2 className="text-xl font-black">{pause.reason}</h2>
            <p className="mt-2 text-ink/65">
              {pause.startDate} to {pause.endDate}. These days do not count as missed and do not
              break streaks.
            </p>
          </Card>
        ))}
      </div>
    </section>
  );
}
