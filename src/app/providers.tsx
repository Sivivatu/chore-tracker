import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import type { PropsWithChildren } from "react";

const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const convexUrl = import.meta.env.VITE_CONVEX_URL ?? "https://placeholder.convex.cloud";
const convex = new ConvexReactClient(convexUrl);

export function isE2EAuthBypass() {
  return import.meta.env.VITE_E2E_AUTH_BYPASS === "true";
}

export function hasClerkConfig() {
  return typeof clerkKey === "string" && /^pk_(test|live)_/.test(clerkKey);
}

export function AppProviders({ children }: PropsWithChildren) {
  if (isE2EAuthBypass()) {
    return <ConvexProvider client={convex}>{children}</ConvexProvider>;
  }

  if (!hasClerkConfig()) {
    return <ConvexProvider client={convex}>{children}</ConvexProvider>;
  }

  return (
    <ClerkProvider publishableKey={clerkKey}>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
