import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ParentSettingsPage } from "./settings";

const convexState = vi.hoisted(() => ({
  setParentLockPin: vi.fn(),
  updateHouseholdIdentity: vi.fn(),
  updateParentIdentity: vi.fn(),
  updateChildIdentity: vi.fn(),
  upsertChoreSettings: vi.fn(),
  createInvitation: vi.fn(),
  revokeInvitation: vi.fn(),
  context: {
    household: { _id: "household-1", name: "The Parker Household" },
    parent: {
      _id: "parent-1",
      householdId: "household-1",
      clerkUserId: "clerk-user-1",
      name: "Alex",
    },
    parents: [
      {
        _id: "parent-1",
        householdId: "household-1",
        clerkUserId: "clerk-user-1",
        name: "Alex",
      },
    ],
    child: {
      _id: "child-1",
      householdId: "household-1",
      name: "Maya",
      avatarColour: "#ffcf5a",
      avatarPreset: "star",
      pointsBalance: 42,
    },
    children: [
      {
        _id: "child-1",
        householdId: "household-1",
        name: "Maya",
        avatarColour: "#ffcf5a",
        avatarPreset: "star",
        pointsBalance: 42,
      },
    ],
  },
  parentLockStatus: { configured: true },
  choreSettings: { dailyMultiplier: 1, weeklyMultiplier: 3, monthlyMultiplier: 10 },
  auditEvents: [
    {
      _id: "audit-1",
      action: "Demo data seeded",
      createdAt: "2026-05-31T08:00:00.000Z",
    },
  ],
  invitations: [] as Array<{ _id: string; expiresAt: string }>,
}));

vi.mock("convex/react", () => ({
  useMutation: (mutation: { _name?: string }) => {
    if (mutation._name?.includes("updateHouseholdIdentity")) {
      return convexState.updateHouseholdIdentity;
    }
    if (mutation._name?.includes("updateParentIdentity")) return convexState.updateParentIdentity;
    if (mutation._name?.includes("updateChildIdentity")) return convexState.updateChildIdentity;
    if (mutation._name?.includes("upsertSettings")) return convexState.upsertChoreSettings;
    if (mutation._name?.includes("parentInvitations.create")) return convexState.createInvitation;
    if (mutation._name?.includes("parentInvitations.revoke")) return convexState.revokeInvitation;
    return convexState.setParentLockPin;
  },
  useQuery: (query: { _name?: string }) => {
    if (query._name?.includes("currentContext")) return convexState.context;
    if (query._name?.includes("parentLockStatus")) return convexState.parentLockStatus;
    if (query._name?.includes("getSettingsForHousehold")) return convexState.choreSettings;
    if (query._name?.includes("auditEvents")) return convexState.auditEvents;
    if (query._name?.includes("parentInvitations.list")) return convexState.invitations;
    return undefined;
  },
}));

vi.mock("../../../convex/_generated/api", () => ({
  api: {
    auditEvents: { list: { _name: "auditEvents.list" } },
    households: {
      currentContext: { _name: "currentContext" },
      parentLockStatus: { _name: "parentLockStatus" },
      setParentLockPin: { _name: "setParentLockPin" },
      updateHouseholdIdentity: { _name: "updateHouseholdIdentity" },
      updateParentIdentity: { _name: "updateParentIdentity" },
      updateChildIdentity: { _name: "updateChildIdentity" },
    },
    chores: {
      getSettingsForHousehold: { _name: "getSettingsForHousehold" },
      upsertSettings: { _name: "upsertSettings" },
    },
    parentInvitations: {
      listForHousehold: { _name: "parentInvitations.list" },
      create: { _name: "parentInvitations.create" },
      revoke: { _name: "parentInvitations.revoke" },
    },
  },
}));

describe("ParentSettingsPage", () => {
  beforeEach(() => {
    convexState.setParentLockPin.mockReset();
    convexState.updateHouseholdIdentity.mockReset();
    convexState.updateParentIdentity.mockReset();
    convexState.updateChildIdentity.mockReset();
    convexState.upsertChoreSettings.mockReset();
    convexState.createInvitation.mockReset();
    convexState.revokeInvitation.mockReset();
    convexState.setParentLockPin.mockResolvedValue({ configured: true });
    convexState.updateHouseholdIdentity.mockResolvedValue({});
    convexState.updateParentIdentity.mockResolvedValue({});
    convexState.updateChildIdentity.mockResolvedValue({});
    convexState.upsertChoreSettings.mockResolvedValue({});
    convexState.createInvitation.mockResolvedValue({
      token: "a".repeat(64),
      expiresAt: "2026-06-22T00:00:00.000Z",
    });
    convexState.revokeInvitation.mockResolvedValue(null);
  });

  it("renders current household and child identity from Convex context", () => {
    render(<ParentSettingsPage />);

    expect(screen.getByRole("heading", { name: "The Parker Household" })).toBeInTheDocument();
    expect(screen.getByLabelText(/household name/i)).toHaveValue("The Parker Household");
    expect(screen.getByLabelText(/parent name/i)).toHaveValue("Alex");
    expect(screen.getByLabelText(/child name/i)).toHaveValue("Maya");
    expect(screen.getByLabelText(/custom avatar colour/i)).toHaveValue("#ffcf5a");
    expect(screen.getByRole("button", { name: /use star avatar/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("saves edited household identity", async () => {
    const user = userEvent.setup();
    render(<ParentSettingsPage />);

    await user.clear(screen.getByLabelText(/household name/i));
    await user.type(screen.getByLabelText(/household name/i), "The Singh Household");
    await user.click(screen.getByRole("button", { name: /save household/i }));

    expect(convexState.updateHouseholdIdentity).toHaveBeenCalledWith({
      householdId: "household-1",
      name: "The Singh Household",
    });
    expect(await screen.findByText("Household identity saved.")).toBeInTheDocument();
  });

  it("saves edited parent identity", async () => {
    const user = userEvent.setup();
    render(<ParentSettingsPage />);

    await user.clear(screen.getByLabelText(/parent name/i));
    await user.type(screen.getByLabelText(/parent name/i), "Sam");
    await user.click(screen.getByRole("button", { name: /save parent profile/i }));

    expect(convexState.updateParentIdentity).toHaveBeenCalledWith({
      householdId: "household-1",
      name: "Sam",
    });
    expect(await screen.findByText("Parent identity saved.")).toBeInTheDocument();
  });

  it("saves edited child identity", async () => {
    const user = userEvent.setup();
    render(<ParentSettingsPage />);

    await user.clear(screen.getByLabelText(/child name/i));
    await user.type(screen.getByLabelText(/child name/i), "Ivy");
    await user.click(screen.getByRole("button", { name: /use avatar colour #14b8a6/i }));
    await user.click(screen.getByRole("button", { name: /use rocket avatar/i }));
    await user.click(screen.getByRole("button", { name: /save child profile/i }));

    expect(convexState.updateChildIdentity).toHaveBeenCalledWith({
      householdId: "household-1",
      childId: "child-1",
      name: "Ivy",
      avatarColour: "#14b8a6",
      avatarPreset: "rocket",
    });
    expect(await screen.findByText("Child profile saved.")).toBeInTheDocument();
  });

  it("blocks empty identity names", async () => {
    const user = userEvent.setup();
    render(<ParentSettingsPage />);

    await user.clear(screen.getByLabelText(/household name/i));
    await user.click(screen.getByRole("button", { name: /save household/i }));
    await user.clear(screen.getByLabelText(/parent name/i));
    await user.click(screen.getByRole("button", { name: /save parent profile/i }));
    await user.clear(screen.getByLabelText(/child name/i));
    await user.click(screen.getByRole("button", { name: /save child profile/i }));

    expect(screen.getByText("Household name is required.")).toBeInTheDocument();
    expect(screen.getByText("Parent name is required.")).toBeInTheDocument();
    expect(screen.getByText("Child name is required.")).toBeInTheDocument();
    expect(convexState.updateHouseholdIdentity).not.toHaveBeenCalled();
    expect(convexState.updateParentIdentity).not.toHaveBeenCalled();
    expect(convexState.updateChildIdentity).not.toHaveBeenCalled();
  });

  it("keeps parent PIN saving working", async () => {
    const user = userEvent.setup();
    render(<ParentSettingsPage />);

    await user.type(screen.getByLabelText(/^new parent pin$/i), "8642");
    await user.type(screen.getByLabelText(/confirm new parent pin/i), "8642");
    await user.click(screen.getByRole("button", { name: /reset parent pin/i }));

    expect(convexState.setParentLockPin).toHaveBeenCalledWith({
      householdId: "household-1",
      pin: "8642",
    });
    expect(await screen.findByText("Parent PIN reset.")).toBeInTheDocument();
  });

  it("shows backend failures independently for identity forms", async () => {
    convexState.updateHouseholdIdentity.mockRejectedValue(new Error("Household save failed"));
    convexState.updateParentIdentity.mockRejectedValue(new Error("Parent save failed"));
    convexState.updateChildIdentity.mockRejectedValue(new Error("Child save failed"));
    const user = userEvent.setup();
    render(<ParentSettingsPage />);

    await user.click(screen.getByRole("button", { name: /save household/i }));
    await user.click(screen.getByRole("button", { name: /save parent profile/i }));
    await user.click(screen.getByRole("button", { name: /save child profile/i }));

    expect(await screen.findByText("Household save failed")).toBeInTheDocument();
    expect(await screen.findByText("Parent save failed")).toBeInTheDocument();
    expect(await screen.findByText("Child save failed")).toBeInTheDocument();
  });

  it("validates parent PIN format before saving", async () => {
    const user = userEvent.setup();
    render(<ParentSettingsPage />);

    await user.type(screen.getByLabelText(/^new parent pin$/i), "12");
    await user.click(screen.getByRole("button", { name: /reset parent pin/i }));

    expect(screen.getByText("Use a 4 to 8 digit parent PIN.")).toBeInTheDocument();
    expect(convexState.setParentLockPin).not.toHaveBeenCalled();
  });

  it("shows parent PIN backend failures", async () => {
    convexState.setParentLockPin.mockRejectedValue(new Error("PIN save failed"));
    const user = userEvent.setup();
    render(<ParentSettingsPage />);

    await user.type(screen.getByLabelText(/^new parent pin$/i), "8642");
    await user.type(screen.getByLabelText(/confirm new parent pin/i), "8642");
    await user.click(screen.getByRole("button", { name: /reset parent pin/i }));

    expect(await screen.findByText("PIN save failed")).toBeInTheDocument();
  });

  it("requires matching parent PIN confirmation", async () => {
    const user = userEvent.setup();
    render(<ParentSettingsPage />);

    await user.type(screen.getByLabelText(/^new parent pin$/i), "8642");
    await user.type(screen.getByLabelText(/confirm new parent pin/i), "2468");
    await user.click(screen.getByRole("button", { name: /reset parent pin/i }));

    expect(screen.getByText("Parent PINs do not match.")).toBeInTheDocument();
    expect(convexState.setParentLockPin).not.toHaveBeenCalled();
  });

  it("creates a shareable invitation for a second parent", async () => {
    const user = userEvent.setup();
    render(<ParentSettingsPage />);

    await user.click(screen.getByRole("button", { name: /invite another parent/i }));

    expect(convexState.createInvitation).toHaveBeenCalledWith({ householdId: "household-1" });
    expect(await screen.findByLabelText(/parent invitation link/i)).toHaveValue(
      `${window.location.origin}/invite/${"a".repeat(64)}`,
    );
  });

  it("saves a custom avatar colour", async () => {
    const user = userEvent.setup();
    render(<ParentSettingsPage />);

    await user.clear(screen.getByLabelText(/custom avatar colour/i));
    await user.type(screen.getByLabelText(/custom avatar colour/i), "#123abc");
    await user.click(screen.getByRole("button", { name: /save child profile/i }));

    expect(convexState.updateChildIdentity).toHaveBeenCalledWith(
      expect.objectContaining({ avatarColour: "#123abc" }),
    );
  });

  it("saves chore reward multipliers", async () => {
    const user = userEvent.setup();
    render(<ParentSettingsPage />);

    await user.clear(screen.getByLabelText(/weekly/i));
    await user.type(screen.getByLabelText(/weekly/i), "4");
    await user.click(screen.getByRole("button", { name: /save chore multipliers/i }));

    expect(convexState.upsertChoreSettings).toHaveBeenCalledWith({
      householdId: "household-1",
      dailyMultiplier: 1,
      weeklyMultiplier: 4,
      monthlyMultiplier: 10,
    });
    expect(await screen.findByText("Chore multipliers saved.")).toBeInTheDocument();
  });

  it("keeps chore multiplier inputs contained within their grid columns", () => {
    render(<ParentSettingsPage />);

    for (const input of [
      screen.getByLabelText(/daily/i),
      screen.getByLabelText(/weekly/i),
      screen.getByLabelText(/monthly/i),
    ]) {
      expect(input).toHaveClass("min-w-0", "w-full");
      expect(input.parentElement).toHaveClass("min-w-0");
    }
  });

  it("validates chore reward multipliers", async () => {
    render(<ParentSettingsPage />);

    fireEvent.change(screen.getByLabelText(/monthly/i), { target: { value: "1.5" } });
    fireEvent.click(screen.getByRole("button", { name: /save chore multipliers/i }));

    expect(
      screen.getByText("Chore multipliers must be non-negative whole numbers."),
    ).toBeInTheDocument();
    expect(convexState.upsertChoreSettings).not.toHaveBeenCalled();
  });

  it("shows chore multiplier save failures", async () => {
    convexState.upsertChoreSettings.mockRejectedValue(new Error("Multiplier save failed"));
    const user = userEvent.setup();
    render(<ParentSettingsPage />);

    await user.click(screen.getByRole("button", { name: /save chore multipliers/i }));

    expect(await screen.findByText("Multiplier save failed")).toBeInTheDocument();
  });
});
