import type { AuthConfig } from "convex/server";

const clerkIssuer = process.env.CLERK_JWT_ISSUER_DOMAIN;

if (!clerkIssuer) {
  throw new Error(
    "CLERK_JWT_ISSUER_DOMAIN is required. Set it to the Clerk Frontend API URL for this Convex deployment.",
  );
}

export default {
  providers: [
    {
      domain: clerkIssuer,
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;
