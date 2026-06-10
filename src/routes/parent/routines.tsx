import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { ArrowDown, ArrowUp, History, Pencil, Plus, Trash2 } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatBritishDateTime } from "@/lib/dates";
import type { RoutineType } from "@/types/domain";

type StepForm = {
  title: string;
  description: string;
  points: number;
  required: boolean;
  illustrationKey: string;
  accent: string;
};

type RoutineForm = {
  name: string;
  type: RoutineType;
  active: boolean;
  schedule: string[];
  steps: StepForm[];
  keepEditHistory: boolean;
};

type RoutineTemplateWithSteps = {
  _id: Id<"routineTemplates">;
  id: Id<"routineTemplates">;
  name: string;
  type: RoutineType;
  active: boolean;
  schedule: string[];
  steps: Array<StepForm & { id: Id<"choreSteps">; order: number }>;
};

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const routineTypes: RoutineType[] = ["morning", "evening", "weekend", "custom"];
const accentOptions = ["#f97316", "#14b8a6", "#eab308", "#38bdf8", "#a855f7", "#ef4444", "#22c55e"];

const blankStep = (): StepForm => ({
  title: "",
  description: "",
  points: 5,
  required: true,
  illustrationKey: "custom",
  accent: accentOptions[0],
});

const blankForm = (): RoutineForm => ({
  name: "",
  type: "custom",
  active: true,
  schedule: [],
  steps: [blankStep()],
  keepEditHistory: true,
});

function formFromRoutine(routine: RoutineTemplateWithSteps): RoutineForm {
  return {
    name: routine.name,
    type: routine.type,
    active: routine.active,
    schedule: routine.schedule,
    keepEditHistory: true,
    steps: routine.steps
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((step) => ({
        title: step.title,
        description: step.description,
        points: step.points,
        required: step.required,
        illustrationKey: step.illustrationKey,
        accent: step.accent,
      })),
  };
}

export function ParentRoutinesPage() {
  const context = useQuery(api.households.currentContext);
  const routineTemplates = useQuery(
    api.routines.listTemplatesWithSteps,
    context?.household ? { householdId: context.household._id } : "skip",
  ) as RoutineTemplateWithSteps[] | undefined;
  const createTemplate = useMutation(api.routines.createTemplate);
  const updateTemplate = useMutation(api.routines.updateTemplate);

  const [selectedRoutineId, setSelectedRoutineId] = useState<Id<"routineTemplates"> | "new">("new");
  const selectedRoutine = useMemo(
    () => routineTemplates?.find((routine) => routine._id === selectedRoutineId),
    [routineTemplates, selectedRoutineId],
  );
  const versions = useQuery(
    api.routines.listTemplateVersions,
    context?.household && selectedRoutine
      ? { householdId: context.household._id, routineTemplateId: selectedRoutine._id }
      : "skip",
  );
  const editorKey = selectedRoutine?._id ?? "new";

  return (
    <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 xl:grid-cols-[0.8fr_1.2fr]">
      <div>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase text-teal">Routine management</p>
            <h1 className="text-4xl font-black">Templates and chore steps</h1>
          </div>
          <Button onClick={() => setSelectedRoutineId("new")}>
            <Plus size={18} />
            Create routine
          </Button>
        </div>
        <div className="grid gap-4">
          {(routineTemplates ?? []).map((routine) => (
            <Card
              key={routine._id}
              className={routine._id === selectedRoutineId ? "border-teal ring-2 ring-teal/20" : ""}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-black uppercase text-coral">{routine.type}</p>
                  <h2 className="text-2xl font-black">{routine.name}</h2>
                  <p className="text-sm text-ink/60">
                    {routine.schedule.length ? routine.schedule.join(", ") : "No fixed schedule"}
                  </p>
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
              <Button
                className="mt-4"
                variant="secondary"
                onClick={() => setSelectedRoutineId(routine._id)}
              >
                <Pencil size={16} />
                Edit routine
              </Button>
            </Card>
          ))}
        </div>
      </div>

      <RoutineEditor
        key={editorKey}
        householdId={context?.household?._id}
        selectedRoutine={selectedRoutine}
        versions={versions}
        createTemplate={createTemplate}
        updateTemplate={updateTemplate}
        onCreated={setSelectedRoutineId}
      />
    </section>
  );
}

function RoutineEditor({
  householdId,
  selectedRoutine,
  versions,
  createTemplate,
  updateTemplate,
  onCreated,
}: {
  householdId?: Id<"households">;
  selectedRoutine?: RoutineTemplateWithSteps;
  versions:
    | Array<{
        _id: Id<"routineTemplateVersions">;
        snapshotName: string;
        snapshotType: RoutineType;
        snapshotActive: boolean;
        snapshotSchedule: string[];
        archivedAt: string;
        snapshotSteps: Array<{ order: number; title: string; points: number }>;
      }>
    | undefined;
  createTemplate: ReturnType<typeof useMutation<typeof api.routines.createTemplate>>;
  updateTemplate: ReturnType<typeof useMutation<typeof api.routines.updateTemplate>>;
  onCreated: (routineTemplateId: Id<"routineTemplates">) => void;
}) {
  const [form, setForm] = useState<RoutineForm>(
    selectedRoutine ? formFromRoutine(selectedRoutine) : blankForm,
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function validateForm() {
    if (!form.name.trim()) return "Routine name is required.";
    if (form.type !== "custom" && form.schedule.length === 0) {
      return "Choose at least one scheduled day.";
    }
    if (form.steps.length === 0) return "Add at least one step.";
    if (form.steps.some((step) => !step.title.trim())) return "Each step needs a title.";
    if (form.steps.some((step) => step.points < 0)) return "Step points cannot be negative.";
    return "";
  }

  async function saveRoutine(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!householdId) return;

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    const payload = {
      householdId,
      name: form.name,
      type: form.type,
      active: form.active,
      schedule: form.schedule,
      steps: form.steps,
    };

    setSaving(true);
    setError("");
    try {
      if (selectedRoutine) {
        await updateTemplate({
          ...payload,
          routineTemplateId: selectedRoutine._id,
          keepEditHistory: form.keepEditHistory,
        });
      } else {
        const routineTemplateId = await createTemplate(payload);
        onCreated(routineTemplateId);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Routine could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  function updateStep(index: number, patch: Partial<StepForm>) {
    setForm((current) => ({
      ...current,
      steps: current.steps.map((step, stepIndex) =>
        stepIndex === index ? { ...step, ...patch } : step,
      ),
    }));
  }

  function moveStep(index: number, direction: -1 | 1) {
    setForm((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.steps.length) return current;
      const steps = current.steps.slice();
      const [step] = steps.splice(index, 1);
      steps.splice(nextIndex, 0, step);
      return { ...current, steps };
    });
  }

  function toggleDay(day: string) {
    setForm((current) => ({
      ...current,
      schedule: current.schedule.includes(day)
        ? current.schedule.filter((scheduledDay) => scheduledDay !== day)
        : [...current.schedule, day],
    }));
  }

  return (
    <div className="grid content-start gap-6">
      <Card>
        <form onSubmit={saveRoutine} className="grid gap-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-black uppercase text-teal">
                {selectedRoutine ? "Edit template" : "New template"}
              </p>
              <h2 className="text-3xl font-black">
                {selectedRoutine ? form.name || selectedRoutine.name : "Create routine"}
              </h2>
            </div>
            <label className="flex items-center gap-2 rounded-md bg-paper px-3 py-2 text-sm font-bold">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(event) =>
                  setForm((current) => ({ ...current, active: event.target.checked }))
                }
              />
              Active
            </label>
          </div>

          <label className="grid gap-2 text-sm font-bold">
            Routine name
            <input
              className="rounded-md border border-ink/15 bg-white px-3 py-2"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold">
              Type
              <select
                className="rounded-md border border-ink/15 bg-white px-3 py-2"
                value={form.type}
                onChange={(event) =>
                  setForm((current) => ({ ...current, type: event.target.value as RoutineType }))
                }
              >
                {routineTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid gap-2">
              <span className="text-sm font-bold">Schedule</span>
              <div className="flex flex-wrap gap-2">
                {days.map((day) => (
                  <button
                    key={day}
                    type="button"
                    className={`rounded-md border px-3 py-2 text-sm font-bold ${
                      form.schedule.includes(day)
                        ? "border-teal bg-teal text-white"
                        : "border-ink/15 bg-white"
                    }`}
                    onClick={() => toggleDay(day)}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-3">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-xl font-black">Steps</h3>
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  setForm((current) => ({ ...current, steps: [...current.steps, blankStep()] }))
                }
              >
                <Plus size={16} />
                Add step
              </Button>
            </div>
            {form.steps.map((step, index) => (
              <div key={index} className="grid gap-3 rounded-md bg-paper p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-black">Step {index + 1}</p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="quiet"
                      aria-label={`Move step ${index + 1} up`}
                      onClick={() => moveStep(index, -1)}
                      disabled={index === 0}
                    >
                      <ArrowUp size={16} />
                    </Button>
                    <Button
                      type="button"
                      variant="quiet"
                      aria-label={`Move step ${index + 1} down`}
                      onClick={() => moveStep(index, 1)}
                      disabled={index === form.steps.length - 1}
                    >
                      <ArrowDown size={16} />
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      aria-label={`Remove step ${index + 1}`}
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          steps: current.steps.filter((_, stepIndex) => stepIndex !== index),
                        }))
                      }
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="grid gap-2 text-sm font-bold">
                    Title
                    <input
                      className="rounded-md border border-ink/15 bg-white px-3 py-2"
                      value={step.title}
                      onChange={(event) => updateStep(index, { title: event.target.value })}
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-bold">
                    Illustration key
                    <input
                      className="rounded-md border border-ink/15 bg-white px-3 py-2"
                      value={step.illustrationKey}
                      onChange={(event) =>
                        updateStep(index, { illustrationKey: event.target.value })
                      }
                    />
                  </label>
                </div>
                <label className="grid gap-2 text-sm font-bold">
                  Description
                  <textarea
                    className="min-h-20 rounded-md border border-ink/15 bg-white px-3 py-2"
                    value={step.description}
                    onChange={(event) => updateStep(index, { description: event.target.value })}
                  />
                </label>
                <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                  <label className="grid gap-2 text-sm font-bold">
                    Points
                    <input
                      className="rounded-md border border-ink/15 bg-white px-3 py-2"
                      type="number"
                      min="0"
                      value={step.points}
                      onChange={(event) =>
                        updateStep(index, { points: Number(event.target.value) })
                      }
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-bold">
                    Accent
                    <select
                      className="rounded-md border border-ink/15 bg-white px-3 py-2"
                      value={step.accent}
                      onChange={(event) => updateStep(index, { accent: event.target.value })}
                    >
                      {accentOptions.map((accent) => (
                        <option key={accent} value={accent}>
                          {accent}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex items-center gap-2 self-end rounded-md bg-white px-3 py-2 text-sm font-bold">
                    <input
                      type="checkbox"
                      checked={step.required}
                      onChange={(event) => updateStep(index, { required: event.target.checked })}
                    />
                    Required
                  </label>
                </div>
              </div>
            ))}
          </div>

          {selectedRoutine ? (
            <label className="flex items-center gap-2 rounded-md bg-teal/10 px-3 py-2 text-sm font-bold text-teal">
              <input
                type="checkbox"
                checked={form.keepEditHistory}
                onChange={(event) =>
                  setForm((current) => ({ ...current, keepEditHistory: event.target.checked }))
                }
              />
              Keep edit history
            </label>
          ) : null}
          {error ? (
            <p className="rounded-md bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</p>
          ) : null}
          <Button type="submit" disabled={saving}>
            {saving ? "Saving" : selectedRoutine ? "Save changes" : "Create routine"}
          </Button>
        </form>
      </Card>

      {selectedRoutine ? (
        <Card>
          <div className="flex items-center gap-2">
            <History size={20} />
            <h2 className="text-2xl font-black">Edit history</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {(versions ?? []).length === 0 ? (
              <p className="rounded-md bg-paper p-3 text-sm text-ink/65">
                No archived versions yet.
              </p>
            ) : (
              versions?.map((version) => (
                <details key={version._id} className="rounded-md bg-paper p-3">
                  <summary className="cursor-pointer font-bold">
                    {version.snapshotName} archived {formatBritishDateTime(version.archivedAt)}
                  </summary>
                  <p className="mt-2 text-sm text-ink/65">
                    {version.snapshotType} · {version.snapshotActive ? "Active" : "Inactive"} ·{" "}
                    {version.snapshotSchedule.length
                      ? version.snapshotSchedule.join(", ")
                      : "No fixed schedule"}
                  </p>
                  <ol className="mt-3 grid gap-2">
                    {version.snapshotSteps.map((step) => (
                      <li
                        key={`${version._id}-${step.order}`}
                        className="rounded-md bg-white p-2 text-sm"
                      >
                        <strong>
                          {step.order}. {step.title}
                        </strong>{" "}
                        {step.points} pts
                      </li>
                    ))}
                  </ol>
                </details>
              ))
            )}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
