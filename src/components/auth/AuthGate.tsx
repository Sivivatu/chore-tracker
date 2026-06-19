import { useAuth } from "@clerk/clerk-react";
import { Navigate } from "@tanstack/react-router";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useState, type PropsWithChildren } from "react";
import { api } from "../../../convex/_generated/api";
import { hasClerkConfig, isE2EAuthBypass } from "@/app/providers";
import { Button } from "@/components/ui/Button";

function MissingAuthConfig() {
  return (
    <section className="mx-auto grid min-h-[80vh] max-w-5xl place-items-center px-4 py-10">
      <div className="rounded-lg border border-ink/10 bg-white p-6 shadow-panel">
        <h1 className="mb-3 text-3xl font-black">Sign in unavailable</h1>
        <p className="max-w-sm text-sm text-ink/65">
          Clerk is not configured for this deployment, so protected pages are blocked.
        </p>
      </div>
    </section>
  );
}

function ClerkAuthGate({ children }: PropsWithChildren) {
  const { isLoaded, isSignedIn, signOut } = useAuth();
  const { isLoading: isConvexLoading, isAuthenticated: isConvexAuthenticated } = useConvexAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

  if (!isLoaded || isConvexLoading) {
    return (
      <section className="grid min-h-[60vh] place-items-center px-4 py-10">
        <p className="text-sm font-bold text-ink/65">Checking sign in...</p>
      </section>
    );
  }

  if (!isSignedIn) {
    return <Navigate to="/sign-in" replace />;
  }

  if (!isConvexAuthenticated) {
    return (
      <section className="mx-auto grid min-h-[80vh] max-w-5xl place-items-center px-4 py-10">
        <div className="rounded-lg border border-ink/10 bg-white p-6 shadow-panel">
          <h1 className="mb-3 text-3xl font-black">Unable to verify sign in</h1>
          <p className="max-w-md text-sm text-ink/65">
            Clerk signed you in, but the application backend could not verify the session. Return to
            sign in to start a fresh session. If this continues, the Clerk and Convex authentication
            settings need attention.
          </p>
          <Button
            className="mt-5"
            type="button"
            disabled={isSigningOut}
            onClick={() => {
              setIsSigningOut(true);
              void signOut({ redirectUrl: "/sign-in" }).catch(() => setIsSigningOut(false));
            }}
          >
            {isSigningOut ? "Returning to sign in..." : "Return to sign in"}
          </Button>
        </div>
      </section>
    );
  }

  return <HouseholdMembershipGate>{children}</HouseholdMembershipGate>;
}

function HouseholdMembershipGate({ children }: PropsWithChildren) {
  const context = useQuery(api.households.currentContext);

  if (context === undefined) {
    return (
      <section className="grid min-h-[60vh] place-items-center px-4 py-10">
        <p className="text-sm font-bold text-ink/65">Loading household...</p>
      </section>
    );
  }

  if (context === null) {
    return <HouseholdSetupForm />;
  }

  return children;
}

function HouseholdSetupForm() {
  const createInitialHousehold = useMutation(api.households.createInitialHousehold);
  const [householdName, setHouseholdName] = useState("");
  const [parentName, setParentName] = useState("");
  const [childName, setChildName] = useState("");
  const [parentPin, setParentPin] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!householdName.trim() || !parentName.trim() || !childName.trim()) {
      setError("Enter a household, parent, and child name.");
      return;
    }
    if (!/^\d{4,8}$/.test(parentPin)) {
      setError("Use 4 to 8 digits for the parent PIN.");
      return;
    }

    setIsSubmitting(true);
    try {
      await createInitialHousehold({
        householdName,
        parentName,
        childName,
        parentPin,
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not create the household.");
      setIsSubmitting(false);
    }
  }

  const inputClass =
    "mt-2 h-12 w-full rounded-md border border-ink/20 bg-white px-3 text-base font-semibold";

  return (
    <section className="mx-auto grid min-h-[80vh] w-full max-w-5xl place-items-center px-4 py-10">
      <form
        onSubmit={submit}
        className="w-full max-w-xl rounded-lg border border-ink/10 bg-white p-6 shadow-panel"
      >
        <p className="text-sm font-black uppercase text-teal">First-time setup</p>
        <h1 className="mt-2 text-3xl font-black">Set up your household</h1>
        <p className="mt-2 text-sm text-ink/65">
          Create a fresh household for this production account. You can change names and appearance
          later in Settings.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label htmlFor="setup-household-name" className="text-sm font-bold sm:col-span-2">
            Household name
            <input
              id="setup-household-name"
              value={householdName}
              maxLength={80}
              onChange={(event) => setHouseholdName(event.target.value)}
              className={inputClass}
              autoComplete="organization"
            />
          </label>
          <label htmlFor="setup-parent-name" className="text-sm font-bold">
            Parent name
            <input
              id="setup-parent-name"
              value={parentName}
              maxLength={80}
              onChange={(event) => setParentName(event.target.value)}
              className={inputClass}
              autoComplete="name"
            />
          </label>
          <label htmlFor="setup-child-name" className="text-sm font-bold">
            Child name
            <input
              id="setup-child-name"
              value={childName}
              maxLength={80}
              onChange={(event) => setChildName(event.target.value)}
              className={inputClass}
              autoComplete="off"
            />
          </label>
          <div>
            <label htmlFor="setup-parent-pin" className="text-sm font-bold">
              Parent PIN
            </label>
            <input
              id="setup-parent-pin"
              value={parentPin}
              inputMode="numeric"
              maxLength={8}
              onChange={(event) => setParentPin(event.target.value)}
              className={inputClass}
              aria-describedby="parent-pin-help"
            />
            <span id="parent-pin-help" className="mt-1 block text-xs font-normal text-ink/60">
              4 to 8 digits for returning to parent mode.
            </span>
          </div>
        </div>

        {error ? (
          <p className="mt-4 text-sm font-bold text-rose-700" role="alert">
            {error}
          </p>
        ) : null}

        <Button className="mt-6 w-full" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating household..." : "Create household"}
        </Button>
      </form>
    </section>
  );
}

export function AuthGate({ children }: PropsWithChildren) {
  if (isE2EAuthBypass()) {
    return children;
  }

  if (!hasClerkConfig()) {
    return <MissingAuthConfig />;
  }

  return <ClerkAuthGate>{children}</ClerkAuthGate>;
}
