import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { routineTemplates } from "@/data/seed";

export function ParentRoutinesPage() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-black uppercase text-teal">Routine management</p>
          <h1 className="text-4xl font-black">Templates and chore steps</h1>
        </div>
        <Button>Create routine</Button>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {routineTemplates.map((routine) => (
          <Card key={routine.id}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-black uppercase text-coral">{routine.type}</p>
                <h2 className="text-2xl font-black">{routine.name}</h2>
                <p className="text-sm text-ink/60">{routine.schedule.join(", ")}</p>
              </div>
              <span className="rounded-md bg-teal/10 px-3 py-1 text-sm font-bold text-teal">
                {routine.active ? "Active" : "Inactive"}
              </span>
            </div>
            <ol className="mt-5 grid gap-2">
              {routine.steps.map((step) => (
                <li
                  key={step.id}
                  className="flex items-center justify-between rounded-md bg-paper p-3"
                >
                  <span className="font-semibold">
                    {step.order}. {step.title}
                  </span>
                  <span className="text-sm font-bold text-ink/60">{step.points} pts</span>
                </li>
              ))}
            </ol>
          </Card>
        ))}
      </div>
    </section>
  );
}
