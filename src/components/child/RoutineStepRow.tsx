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
  const titleId = `routine-step-${step.id}-title`;
  const descriptionId = `routine-step-${step.id}-description`;

  return (
    <li>
      <h3 id={titleId} className="sr-only">
        {step.snapshotTitle}
      </h3>
      <p id={descriptionId} className="sr-only">
        {step.snapshotDescription}. {step.snapshotPoints} points{" "}
        {step.snapshotRequired ? "required" : "optional"}.
      </p>
      <button
        type="button"
        disabled={disabled}
        aria-pressed={checked}
        aria-label={`${checked ? "Untick" : "Tick"} ${step.snapshotTitle}`}
        aria-describedby={descriptionId}
        onClick={() => onToggle(step.id)}
        className="routine-row grid w-full gap-4 rounded-lg border-2 bg-white p-4 text-left text-ink shadow-poster transition hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#111827] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-poster data-[checked=true]:border-emerald-500 data-[checked=true]:bg-emerald-50 data-[checked=true]:text-emerald-950 md:grid-cols-[4rem_1fr_auto_auto] md:items-center"
        style={{ borderColor: checked ? undefined : step.accent }}
        data-checked={checked}
      >
        <span
          className="grid h-14 w-14 place-items-center rounded-full text-2xl font-black text-white"
          style={{ backgroundColor: checked ? "#10b981" : step.accent }}
          aria-hidden
        >
          {step.snapshotOrder}
        </span>
        <span aria-hidden>
          <span className="block text-2xl font-black">{step.snapshotTitle}</span>
          <span className="mt-1 block text-sm font-semibold text-ink/60">
            {step.snapshotDescription}
          </span>
          <span className="mt-2 block text-xs font-bold uppercase tracking-normal text-ink/50">
            {step.snapshotPoints} points {step.snapshotRequired ? "required" : "optional"}
          </span>
        </span>
        <StepIllustration illustrationKey={step.snapshotIllustrationKey} accent={step.accent} />
        <span
          className="flex min-h-16 min-w-16 items-center justify-center gap-2 rounded-md border-2 border-ink/15 bg-paper px-3 text-sm font-black uppercase text-ink/50 data-[checked=true]:border-emerald-500 data-[checked=true]:bg-emerald-500 data-[checked=true]:text-white"
          data-checked={checked}
          aria-hidden
        >
          <Check className="h-7 w-7" />
          {checked ? <span>Done</span> : null}
        </span>
      </button>
    </li>
  );
}
