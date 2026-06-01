import { useAuth } from "@clerk/clerk-react";
import { Navigate } from "@tanstack/react-router";
import type { PropsWithChildren } from "react";
import { hasClerkConfig } from "@/app/providers";

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
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <section className="grid min-h-[60vh] place-items-center px-4 py-10">
        <p className="text-sm font-bold text-ink/65">Checking sign in...</p>
      </section>
    );
  }

  if (!isSignedIn) {
    return <Navigate to="/sign-in" replace />;
  }

  return children;
}

export function AuthGate({ children }: PropsWithChildren) {
  if (!hasClerkConfig()) {
    return <MissingAuthConfig />;
  }

  return <ClerkAuthGate>{children}</ClerkAuthGate>;
}
