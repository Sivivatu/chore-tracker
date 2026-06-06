import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatBritishDateTime } from "@/lib/dates";

export function ParentSettingsPage() {
  const [pin, setPin] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");
  const context = useQuery(api.households.currentContext);
  const parentLockStatus = useQuery(
    api.households.parentLockStatus,
    context?.household ? { householdId: context.household._id } : "skip",
  );
  const auditEvents = useQuery(
    api.auditEvents.list,
    context?.household ? { householdId: context.household._id } : "skip",
  );
  const setParentLockPin = useMutation(api.households.setParentLockPin);

  async function saveParentPin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setStatusMessage("");
    if (!context?.household) return;

    if (!/^\d{4,8}$/.test(pin.trim())) {
      setError("Use a 4 to 8 digit parent PIN.");
      return;
    }

    try {
      await setParentLockPin({ householdId: context.household._id, pin });
      setPin("");
      setStatusMessage("Parent lock PIN saved.");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not save parent lock PIN.");
    }
  }

  return (
    <section className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[0.8fr_1fr]">
      <Card>
        <p className="text-sm font-black uppercase text-teal">Household</p>
        <h1 className="mt-2 text-3xl font-black">{context?.household.name ?? "Household"}</h1>
        <p className="mt-4 text-sm text-ink/60">
          Parent: {context?.parent.name ?? "Loading"}
        </p>
        <p className="text-sm text-ink/60">Child profile: {context?.child?.name ?? "Loading"}</p>
        <form onSubmit={saveParentPin} className="mt-6 rounded-md bg-paper p-4">
          <p className="text-base font-black">Parent lock PIN</p>
          <p className="mt-1 text-sm text-ink/60">
            {parentLockStatus?.configured
              ? "A parent PIN is set for leaving child mode."
              : "Set a parent PIN before using child mode on a shared device."}
          </p>
          <label htmlFor="parent-lock-pin" className="mt-4 block text-sm font-bold">
            New parent PIN
          </label>
          <input
            id="parent-lock-pin"
            value={pin}
            inputMode="numeric"
            maxLength={8}
            onChange={(event) => {
              setPin(event.target.value);
              setError("");
              setStatusMessage("");
            }}
            className="mt-2 h-12 w-full rounded-md border border-ink/20 bg-white px-3 text-lg font-bold"
            aria-describedby={[error ? "parent-lock-error" : "", statusMessage ? "parent-lock-status" : ""]
              .filter(Boolean)
              .join(" ") || undefined}
          />
          {error ? (
            <p id="parent-lock-error" className="mt-2 text-sm font-bold text-rose-700">
              {error}
            </p>
          ) : null}
          {statusMessage ? (
            <p id="parent-lock-status" className="mt-2 text-sm font-bold text-teal">
              {statusMessage}
            </p>
          ) : null}
          <Button className="mt-4" type="submit" disabled={!context?.household || !pin}>
            Save parent PIN
          </Button>
        </form>
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
