import { defineApp } from "convex/server";
import { v } from "convex/values";

const app = defineApp({
  env: {
    E2E_AUTH_BYPASS: v.optional(v.string()),
    E2E_CLERK_USER_ID: v.optional(v.string()),
  },
});

export default app;
