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

async function createHousehold() {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity(identity("owner"));
  const created = await owner.mutation(api.households.createInitialHousehold, {
    householdName: "The Example Household",
    parentName: "Alex",
    childName: "Sam",
    parentPin: "2468",
  });
  return { t, owner, ...created };
}

describe("parent invitations", () => {
  it("creates a seven-day invitation and accepts it once", async () => {
    const { t, owner, householdId } = await createHousehold();
    const invitation = await owner.mutation(api.parentInvitations.create, { householdId });

    expect(Date.parse(invitation.expiresAt) - Date.now()).toBeGreaterThan(
      6.9 * 24 * 60 * 60 * 1000,
    );
    expect(await t.query(api.parentInvitations.inspect, { token: invitation.token })).toMatchObject(
      {
        status: "active",
        householdName: "The Example Household",
      },
    );

    const secondParent = t.withIdentity(identity("second-parent"));
    await secondParent.mutation(api.parentInvitations.accept, {
      token: invitation.token,
      name: "Jamie",
    });

    await expect(
      secondParent.mutation(api.parentInvitations.accept, {
        token: invitation.token,
        name: "Jamie",
      }),
    ).rejects.toThrow();
    expect(await t.query(api.parentInvitations.inspect, { token: invitation.token })).toEqual({
      status: "accepted",
    });
  });

  it("rejects revoked invitations", async () => {
    const { t, owner, householdId } = await createHousehold();
    const invitation = await owner.mutation(api.parentInvitations.create, { householdId });

    await owner.mutation(api.parentInvitations.revoke, {
      invitationId: invitation.invitationId,
    });

    expect(await t.query(api.parentInvitations.inspect, { token: invitation.token })).toEqual({
      status: "revoked",
    });
    await expect(
      t.withIdentity(identity("second-parent")).mutation(api.parentInvitations.accept, {
        token: invitation.token,
        name: "Jamie",
      }),
    ).rejects.toThrow("Invitation has been revoked");
  });

  it("enforces the two-parent limit", async () => {
    const { t, owner, householdId } = await createHousehold();
    const invitation = await owner.mutation(api.parentInvitations.create, { householdId });
    await t.withIdentity(identity("second-parent")).mutation(api.parentInvitations.accept, {
      token: invitation.token,
      name: "Jamie",
    });

    await expect(owner.mutation(api.parentInvitations.create, { householdId })).rejects.toThrow(
      "This household already has two parents",
    );
  });
});
