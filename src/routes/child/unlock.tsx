import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useConvex, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/Button";
import { createChildSession, saveChildSession } from "@/lib/child-session";

export function ChildUnlockPage() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const convex = useConvex();
  const context = useQuery(api.households.currentContext);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!context?.household) return;

    const unlocked = await convex.query(api.childMode.unlock, {
      householdId: context.household._id,
      pin,
    });

    if (!unlocked) {
      setError("That PIN did not work. Ask your parent to check it with you.");
      return;
    }

    saveChildSession(createChildSession(unlocked.childId, unlocked.householdId));
    void navigate({ to: "/child/today" });
  }

  return (
    <section className="child-stage min-h-[calc(100vh-73px)] px-4 py-8">
      <form
        onSubmit={submit}
        className="mx-auto max-w-md rounded-lg border-4 border-ink bg-white p-6 shadow-poster"
      >
        <p className="text-sm font-black uppercase text-coral">Child mode</p>
        <h1 className="mt-2 text-4xl font-black">Hi {context?.child?.name ?? "there"}</h1>
        <label htmlFor="pin" className="mt-6 block text-lg font-black">
          Enter your PIN
        </label>
        <input
          id="pin"
          value={pin}
          inputMode="numeric"
          maxLength={4}
          onChange={(event) => setPin(event.target.value)}
          className="mt-2 h-16 w-full rounded-md border-2 border-ink bg-paper px-4 text-center text-3xl font-black tracking-[0.4em]"
          aria-describedby={error ? "pin-error" : undefined}
        />
        {error ? (
          <p id="pin-error" className="mt-3 text-sm font-bold text-rose-700">
            {error}
          </p>
        ) : null}
        <Button className="mt-6 w-full" type="submit" disabled={!context?.household}>
          Unlock routines
        </Button>
      </form>
    </section>
  );
}
