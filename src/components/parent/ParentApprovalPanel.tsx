import { Check, X } from "lucide-react";
import { routineInstances } from "@/data/seed";
import { getApprovalQueue } from "@/lib/dashboard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export function ParentApprovalPanel() {
  const queue = getApprovalQueue(routineInstances);
  return (
    <div className="grid gap-4">
      {queue.map((instance) => (
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
            <Button variant="secondary">
              <X aria-hidden className="h-4 w-4" />
              Reject
            </Button>
            <Button>
              <Check aria-hidden className="h-4 w-4" />
              Approve
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
