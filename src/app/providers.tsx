import { ClerkProvider } from "@clerk/clerk-react";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import type { PropsWithChildren } from "react";

const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const convexUrl = import.meta.env.VITE_CONVEX_URL ?? "https://placeholder.convex.cloud";
const convex = new ConvexReactClient(convexUrl);

export function hasClerkConfig() {
  return typeof clerkKey === "string" && /^pk_(test|live)_/.test(clerkKey);
}

export function AppProviders({ children }: PropsWithChildren) {
  if (!hasClerkConfig()) {
    return <ConvexProvider client={convex}>{children}</ConvexProvider>;
  }

  return (
    <ClerkProvider publishableKey={clerkKey}>
      <ConvexProvider client={convex}>{children}</ConvexProvider>
    </ClerkProvider>
  );
}
