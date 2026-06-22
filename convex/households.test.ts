/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

function identity(id: string) {
  return {
    subject: id,
    tokenIdentifier: `https://clerk.example|${id}`,
    issuer: "https://clerk.example",
  };
}

describe("household context", () => {
  it("returns null for unauthenticated requests", async () => {
    const t = convexTest(schema, modules);

    await expect(t.query(api.households.currentContext)).resolves.toBeNull();
  });

  it("returns null for authenticated parents without household membership", async () => {
    const t = convexTest(schema, modules);

    await expect(
      t.withIdentity(identity("new-parent")).query(api.households.currentContext),
    ).resolves.toBeNull();
  });
});
