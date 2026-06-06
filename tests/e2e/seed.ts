import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import { getE2EEnv } from "./env";

export async function resetE2EDemoData() {
  const env = getE2EEnv();

  if (env.authBypass !== "true") {
    throw new Error("VITE_E2E_AUTH_BYPASS=true is required for e2e tests");
  }
  if (!env.clerkUserId) {
    throw new Error("VITE_E2E_CLERK_USER_ID is required for e2e tests");
  }
  if (!env.convexUrl) {
    throw new Error("VITE_CONVEX_URL is required for e2e tests");
  }

  const client = new ConvexHttpClient(env.convexUrl);
  await client.mutation(api.seed.e2eReset, { clerkUserId: env.clerkUserId });
}
