import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useConvex, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/Button";
import {
  clearChildSession,
  clearParentReturnPath,
  readParentReturnPath,
} from "@/lib/child-session";

export function ChildParentUnlockPage() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const convex = useConvex();
  const context = useQuery(api.households.currentContext);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!context?.household) return;

    const unlocked = await convex.query(api.households.verifyParentLockPin, {
      householdId: context.household._id,
      pin,
    });

    if (!unlocked) {
      setError("That parent PIN did not work.");
      return;
    }

    const returnPath = readParentReturnPath() ?? "/parent/dashboard";
    clearChildSession();
    clearParentReturnPath();
    void navigate({ to: returnPath });
  }

  return (
    <section className="child-stage min-h-[calc(100vh-73px)] px-4 py-8">
      <form
        onSubmit={submit}
        className="mx-auto max-w-md rounded-lg border-4 border-ink bg-white p-6 shadow-poster"
      >
        <p className="text-sm font-black uppercase text-coral">Parent lock</p>
        <h1 className="mt-2 text-4xl font-black">Unlock parent pages</h1>
        <label htmlFor="parent-pin" className="mt-6 block text-lg font-black">
          Enter parent PIN
        </label>
        <input
          id="parent-pin"
          value={pin}
          inputMode="numeric"
          maxLength={8}
          onChange={(event) => {
            setPin(event.target.value);
            setError("");
          }}
          className="mt-2 h-16 w-full rounded-md border-2 border-ink bg-paper px-4 text-center text-3xl font-black tracking-[0.4em]"
          aria-describedby={error ? "parent-pin-error" : undefined}
        />
        {error ? (
          <p id="parent-pin-error" className="mt-3 text-sm font-bold text-rose-700">
            {error}
          </p>
        ) : null}
        <Button className="mt-6 w-full" type="submit" disabled={!context?.household || !pin}>
          Unlock parent pages
        </Button>
      </form>
    </section>
  );
}
