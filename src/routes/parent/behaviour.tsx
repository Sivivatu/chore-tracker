import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { addDaysToDateKey, toDateKey } from "@/lib/dates";
import type { BehaviourKind } from "@/types/domain";

export function ParentBehaviourPage() {
  const context = useQuery(api.households.currentContext);
  const today = toDateKey(new Date());
  const [childId, setChildId] = useState<Id<"children"> | "">("");
  const selectedChildId = (childId || context?.child?._id || context?.children?.[0]?._id) as
    | Id<"children">
    | undefined;
  const [date, setDate] = useState(today);
  const [kind, setKind] = useState<BehaviourKind>("positive");
  const [categoryKey, setCategoryKey] = useState("");
  const [note, setNote] = useState("");
  const [points, setPoints] = useState(5);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const categories = useQuery(api.behaviours.listCategories);
  const createEntry = useMutation(api.behaviours.create);
  const minDate = context?.household?.createdAt?.slice(0, 10) ?? today;
  const history = useQuery(
    api.behaviours.listForChild,
    context?.household && selectedChildId
      ? {
          householdId: context.household._id,
          childId: selectedChildId,
          fromDate: addDaysToDateKey(today, -60) < minDate ? minDate : addDaysToDateKey(today, -60),
          toDate: today,
        }
      : "skip",
  );
  const visibleCategories = useMemo(() => categories?.[kind] ?? [], [categories, kind]);
  const selectedCategory = categoryKey || visibleCategories[0]?.key || "";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!context?.household || !selectedChildId) return;
    if (!note.trim()) {
      setError("What happened is required.");
      return;
    }
    if (!Number.isInteger(points) || points <= 0) {
      setError("Points must be a positive whole number.");
      return;
    }
    setError("");
    setStatus("");
    try {
      const result = await createEntry({
        householdId: context.household._id,
        childId: selectedChildId,
        date,
        kind,
        categoryKey: selectedCategory,
        note,
        points,
      });
      setStatus(`${result.pointsDelta > 0 ? "+" : ""}${result.pointsDelta} points saved.`);
      setNote("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save behaviour points.");
    }
  }

  return (
    <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 xl:grid-cols-[0.8fr_1.2fr]">
      <Card>
        <p className="text-sm font-black uppercase text-teal">Behaviour</p>
        <h1 className="text-4xl font-black">Behaviour points</h1>
        <form onSubmit={submit} className="mt-6 grid gap-4">
          <label className="grid gap-2 text-sm font-bold">
            Child
            <select value={selectedChildId ?? ""} onChange={(event) => setChildId(event.target.value as Id<"children">)} className="h-12 rounded-md border border-ink/20 bg-white px-3 text-base">
              {(context?.children ?? []).map((child) => (
                <option key={child._id} value={child._id}>{child.name}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-bold">
            Date
            <input type="date" min={minDate} max={today} value={date} onChange={(event) => setDate(event.target.value)} className="h-12 rounded-md border border-ink/20 px-3 text-base" />
          </label>
          <div className="grid grid-cols-2 gap-2 rounded-md bg-paper p-1">
            <button type="button" className={`rounded-md px-3 py-2 text-sm font-black ${kind === "positive" ? "bg-teal text-white" : ""}`} onClick={() => { setKind("positive"); setCategoryKey(""); }}>
              Good
            </button>
            <button type="button" className={`rounded-md px-3 py-2 text-sm font-black ${kind === "negative" ? "bg-coral text-white" : ""}`} onClick={() => { setKind("negative"); setCategoryKey(""); }}>
              Bad
            </button>
          </div>
          <label className="grid gap-2 text-sm font-bold">
            Category
            <select value={selectedCategory} onChange={(event) => setCategoryKey(event.target.value)} className="h-12 rounded-md border border-ink/20 bg-white px-3 text-base">
              {visibleCategories.map((category) => (
                <option key={category.key} value={category.key}>{category.label}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-bold">
            What happened?
            <textarea value={note} onChange={(event) => setNote(event.target.value)} className="min-h-24 rounded-md border border-ink/20 px-3 py-2 text-base" />
          </label>
          <label className="grid gap-2 text-sm font-bold">
            Points {kind === "positive" ? `+${points || 0}` : `-${points || 0}`}
            <input type="number" min={1} step={1} value={points} onChange={(event) => setPoints(Number(event.target.value))} className="h-12 rounded-md border border-ink/20 px-3 text-base" />
          </label>
          {error ? <p className="rounded-md bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</p> : null}
          {status ? <p className="rounded-md bg-teal/10 p-3 text-sm font-bold text-teal">{status}</p> : null}
          <Button type="submit">{kind === "positive" ? "Add positive points" : "Add negative points"}</Button>
        </form>
      </Card>

      <Card>
        <h2 className="text-2xl font-black">Recent behaviour history</h2>
        <div className="mt-4 grid gap-3">
          {(history ?? []).length === 0 ? <p className="text-ink/65">No behaviour entries yet.</p> : null}
          {(history ?? []).map((entry) => {
            const child = context?.children?.find((item) => item._id === entry.childId);
            return (
              <div key={entry.id} className={`rounded-md border p-4 ${entry.pointsDelta >= 0 ? "border-teal/30 bg-teal/5" : "border-coral/30 bg-coral/5"}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-ink/60">{entry.date} · {child?.name ?? "Child"}</p>
                    <h3 className="text-lg font-black">{entry.categoryLabel}</h3>
                  </div>
                  <span className={`text-xl font-black ${entry.pointsDelta >= 0 ? "text-teal" : "text-coral"}`}>
                    {entry.pointsDelta > 0 ? "+" : ""}{entry.pointsDelta}
                  </span>
                </div>
                <p className="mt-2 text-sm text-ink/75">{entry.note}</p>
              </div>
            );
          })}
        </div>
      </Card>
    </section>
  );
}
