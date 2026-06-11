import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Pencil, Plus } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

type ChoreFrequency = "daily" | "weekly" | "monthly";

type Chore = {
  _id: Id<"chores">;
  id: Id<"chores">;
  title: string;
  description: string;
  frequency: ChoreFrequency;
  basePoints: number;
  active: boolean;
  multiplier: number;
  fullPoints: number;
};

type ChoreForm = {
  title: string;
  description: string;
  frequency: ChoreFrequency;
  basePoints: number;
  active: boolean;
};

const blankForm: ChoreForm = {
  title: "",
  description: "",
  frequency: "daily",
  basePoints: 1,
  active: true,
};

function formFromChore(chore: Chore): ChoreForm {
  return {
    title: chore.title,
    description: chore.description,
    frequency: chore.frequency,
    basePoints: chore.basePoints,
    active: chore.active,
  };
}

export function ParentChoresPage() {
  const context = useQuery(api.households.currentContext);
  const chores = useQuery(
    api.chores.list,
    context?.household ? { householdId: context.household._id } : "skip",
  ) as Chore[] | undefined;
  const createChore = useMutation(api.chores.create);
  const updateChore = useMutation(api.chores.update);
  const [selectedChoreId, setSelectedChoreId] = useState<Id<"chores"> | "new">("new");
  const selectedChore = useMemo(
    () => chores?.find((chore) => chore._id === selectedChoreId),
    [chores, selectedChoreId],
  );

  return (
    <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 xl:grid-cols-[0.8fr_1.2fr]">
      <div>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase text-teal">Chore management</p>
            <h1 className="text-4xl font-black">Chores</h1>
          </div>
          <Button onClick={() => setSelectedChoreId("new")}>
            <Plus size={18} />
            Create chore
          </Button>
        </div>
        <div className="grid gap-4">
          {(chores ?? []).map((chore) => (
            <Card
              key={chore._id}
              className={chore._id === selectedChoreId ? "border-teal ring-2 ring-teal/20" : ""}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-black uppercase text-coral">{chore.frequency}</p>
                  <h2 className="text-2xl font-black">{chore.title}</h2>
                  <p className="mt-1 text-sm text-ink/60">{chore.description || "No notes"}</p>
                </div>
                <span className="rounded-md bg-teal/10 px-3 py-1 text-sm font-bold text-teal">
                  {chore.active ? "Active" : "Inactive"}
                </span>
              </div>
              <p className="mt-4 text-sm font-bold text-ink/70">
                {chore.basePoints} base x {chore.multiplier} = {chore.fullPoints} points
              </p>
              <Button
                className="mt-4"
                variant="secondary"
                onClick={() => setSelectedChoreId(chore._id)}
              >
                <Pencil size={16} />
                Edit chore
              </Button>
            </Card>
          ))}
        </div>
      </div>

      <ChoreEditor
        key={selectedChore?._id ?? "new"}
        householdId={context?.household?._id}
        selectedChore={selectedChore}
        createChore={createChore}
        updateChore={updateChore}
        onCreated={setSelectedChoreId}
      />
    </section>
  );
}

function ChoreEditor({
  householdId,
  selectedChore,
  createChore,
  updateChore,
  onCreated,
}: {
  householdId?: Id<"households">;
  selectedChore?: Chore;
  createChore: ReturnType<typeof useMutation<typeof api.chores.create>>;
  updateChore: ReturnType<typeof useMutation<typeof api.chores.update>>;
  onCreated: (choreId: Id<"chores">) => void;
}) {
  const [form, setForm] = useState<ChoreForm>(
    selectedChore ? formFromChore(selectedChore) : blankForm,
  );
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  function validateForm() {
    if (!form.title.trim()) return "Chore title is required.";
    if (form.basePoints < 0) return "Chore points cannot be negative.";
    return "";
  }

  async function saveChore(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!householdId) {
      setError("Household context is still loading. Try again in a moment.");
      return;
    }

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError("");
    setStatus("");
    try {
      if (selectedChore) {
        await updateChore({ householdId, choreId: selectedChore._id, ...form });
        setStatus("Chore saved.");
      } else {
        const choreId = await createChore({ householdId, ...form });
        onCreated(choreId);
        setStatus("Chore created.");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not save chore.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <h2 className="text-2xl font-black">{selectedChore ? "Edit chore" : "Create chore"}</h2>
      <form onSubmit={saveChore} className="mt-5 grid gap-4">
        <label className="grid gap-2 text-sm font-bold" htmlFor="chore-title">
          Chore title
          <input
            id="chore-title"
            value={form.title}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            className="h-12 rounded-md border border-ink/20 px-3 text-base"
          />
        </label>
        <label className="grid gap-2 text-sm font-bold" htmlFor="chore-description">
          Description
          <textarea
            id="chore-description"
            value={form.description}
            onChange={(event) =>
              setForm((current) => ({ ...current, description: event.target.value }))
            }
            className="min-h-24 rounded-md border border-ink/20 px-3 py-2 text-base"
          />
        </label>
        <label className="grid gap-2 text-sm font-bold" htmlFor="chore-frequency">
          Frequency
          <select
            id="chore-frequency"
            value={form.frequency}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                frequency: event.target.value as ChoreFrequency,
              }))
            }
            className="h-12 rounded-md border border-ink/20 bg-white px-3 text-base"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-bold" htmlFor="chore-base-points">
          Base points
          <input
            id="chore-base-points"
            type="number"
            min={0}
            value={form.basePoints}
            onChange={(event) =>
              setForm((current) => ({ ...current, basePoints: Number(event.target.value) }))
            }
            className="h-12 rounded-md border border-ink/20 px-3 text-base"
          />
        </label>
        <label className="inline-flex items-center gap-2 text-sm font-bold">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(event) =>
              setForm((current) => ({ ...current, active: event.target.checked }))
            }
            className="h-4 w-4"
          />
          Active
        </label>
        {error ? <p className="text-sm font-bold text-rose-700">{error}</p> : null}
        {status ? <p className="text-sm font-bold text-teal">{status}</p> : null}
        <Button type="submit" disabled={saving}>
          {selectedChore ? "Save changes" : "Create chore"}
        </Button>
      </form>
    </Card>
  );
}
