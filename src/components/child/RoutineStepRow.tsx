import { Check } from "lucide-react";
import type { DailyStepInstance } from "@/types/domain";
import { StepIllustration } from "./StepIllustration";

type Props = {
  step: DailyStepInstance;
  checked: boolean;
  disabled?: boolean;
  onToggle: (stepId: string) => void;
};

export function RoutineStepRow({ step, checked, disabled = false, onToggle }: Props) {
  return (
    <li
      className="routine-row grid gap-4 rounded-lg border-2 bg-white p-4 shadow-poster md:grid-cols-[4rem_1fr_auto_auto] md:items-center"
      style={{ borderColor: step.accent }}
    >
      <div
        className="grid h-14 w-14 place-items-center rounded-full text-2xl font-black text-white"
        style={{ backgroundColor: step.accent }}
        aria-hidden
      >
        {step.snapshotOrder}
      </div>
      <div>
        <h3 className="text-2xl font-black">{step.snapshotTitle}</h3>
        <p className="mt-1 text-sm font-semibold text-ink/60">{step.snapshotDescription}</p>
        <p className="mt-2 text-xs font-bold uppercase tracking-normal text-ink/50">
          {step.snapshotPoints} points {step.snapshotRequired ? "required" : "optional"}
        </p>
      </div>
      <StepIllustration illustrationKey={step.snapshotIllustrationKey} accent={step.accent} />
      <button
        type="button"
        disabled={disabled}
        aria-pressed={checked}
        aria-label={`${checked ? "Untick" : "Tick"} ${step.snapshotTitle}`}
        onClick={() => onToggle(step.id)}
        className="completion-check grid h-16 w-16 place-items-center rounded-md border-2 border-ink/20 bg-paper text-ink transition disabled:cursor-not-allowed disabled:opacity-60 data-[checked=true]:border-emerald-500 data-[checked=true]:bg-emerald-500 data-[checked=true]:text-white"
        data-checked={checked}
      >
        {checked ? (
          <Check aria-hidden className="h-9 w-9" />
        ) : (
          <span className="sr-only">Not complete</span>
        )}
      </button>
    </li>
  );
}
