import { Navigate } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { hasClerkConfig, isE2EAuthBypass } from "@/app/providers";
import { createChildSession, saveChildSession } from "@/lib/child-session";

export function ChildUnlockPage() {
  const context = useQuery(api.households.currentContext);

  if (context?.household && context.child) {
    saveChildSession(createChildSession(context.child._id, context.household._id));
    return <Navigate to="/child/today" replace />;
  }

  if (context === null) {
    const signInAvailable = hasClerkConfig() && !isE2EAuthBypass();

    return (
      <section className="child-stage min-h-[calc(100vh-73px)] px-4 py-8">
        <div className="mx-auto max-w-md rounded-lg border-4 border-ink bg-white p-6 text-center shadow-poster">
          <p className="text-sm font-black uppercase text-coral">Child mode</p>
          <h1 className="mt-2 text-4xl font-black">Parent sign in needed</h1>
          <p className="mt-3 text-sm font-bold text-ink/65">
            Sign in as a parent on this device before opening child mode.
          </p>
          {signInAvailable ? (
            <a
              className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white shadow-button transition hover:bg-black"
              href="/sign-in"
            >
              Parent sign in
            </a>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section className="child-stage min-h-[calc(100vh-73px)] px-4 py-8">
      <p className="mx-auto max-w-md text-center text-sm font-bold text-ink/65">
        Opening child mode...
      </p>
    </section>
  );
}
