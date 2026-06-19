import { Navigate } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { createChildSession, saveChildSession } from "@/lib/child-session";

export function ChildUnlockPage() {
  const context = useQuery(api.households.currentContext);

  if (context?.household && context.child) {
    saveChildSession(createChildSession(context.child._id, context.household._id));
    return <Navigate to="/child/today" replace />;
  }

  return (
    <section className="child-stage min-h-[calc(100vh-73px)] px-4 py-8">
      <p className="mx-auto max-w-md text-center text-sm font-bold text-ink/65">
        Opening child mode...
      </p>
    </section>
  );
}
