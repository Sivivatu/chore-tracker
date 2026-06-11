import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ParentSettingsPage } from "./settings";

const convexState = vi.hoisted(() => ({
  setParentLockPin: vi.fn(),
  updateHouseholdIdentity: vi.fn(),
  updateChildIdentity: vi.fn(),
  upsertChoreSettings: vi.fn(),
  context: {
    household: { _id: "household-1", name: "The Parker Household" },
    parent: {
      _id: "parent-1",
      householdId: "household-1",
      clerkUserId: "clerk-user-1",
      name: "Alex",
    },
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
}));

vi.mock("convex/react", () => ({
  useMutation: (mutation: { _name?: string }) => {
    if (mutation._name?.includes("updateHouseholdIdentity")) {
      return convexState.updateHouseholdIdentity;
    }
    if (mutation._name?.includes("updateChildIdentity")) return convexState.updateChildIdentity;
    if (mutation._name?.includes("upsertSettings")) return convexState.upsertChoreSettings;
    return convexState.setParentLockPin;
  },
  useQuery: (query: { _name?: string }) => {
    if (query._name?.includes("currentContext")) return convexState.context;
    if (query._name?.includes("parentLockStatus")) return convexState.parentLockStatus;
    if (query._name?.includes("getSettingsForHousehold")) return convexState.choreSettings;
    if (query._name?.includes("auditEvents")) return convexState.auditEvents;
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
      updateChildIdentity: { _name: "updateChildIdentity" },
    },
    chores: {
      getSettingsForHousehold: { _name: "getSettingsForHousehold" },
      upsertSettings: { _name: "upsertSettings" },
    },
  },
}));

describe("ParentSettingsPage", () => {
  beforeEach(() => {
    convexState.setParentLockPin.mockReset();
    convexState.updateHouseholdIdentity.mockReset();
    convexState.updateChildIdentity.mockReset();
    convexState.upsertChoreSettings.mockReset();
    convexState.setParentLockPin.mockResolvedValue({ configured: true });
    convexState.updateHouseholdIdentity.mockResolvedValue({});
    convexState.updateChildIdentity.mockResolvedValue({});
    convexState.upsertChoreSettings.mockResolvedValue({});
  });

  it("renders current household and child identity from Convex context", () => {
    render(<ParentSettingsPage />);

    expect(screen.getByRole("heading", { name: "The Parker Household" })).toBeInTheDocument();
    expect(screen.getByLabelText(/household name/i)).toHaveValue("The Parker Household");
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
    await user.clear(screen.getByLabelText(/child name/i));
    await user.click(screen.getByRole("button", { name: /save child profile/i }));

    expect(screen.getByText("Household name is required.")).toBeInTheDocument();
    expect(screen.getByText("Child name is required.")).toBeInTheDocument();
    expect(convexState.updateHouseholdIdentity).not.toHaveBeenCalled();
    expect(convexState.updateChildIdentity).not.toHaveBeenCalled();
  });

  it("keeps parent PIN saving working", async () => {
    const user = userEvent.setup();
    render(<ParentSettingsPage />);

    await user.type(screen.getByLabelText(/new parent pin/i), "8642");
    await user.click(screen.getByRole("button", { name: /save parent pin/i }));

    expect(convexState.setParentLockPin).toHaveBeenCalledWith({
      householdId: "household-1",
      pin: "8642",
    });
    expect(await screen.findByText("Parent lock PIN saved.")).toBeInTheDocument();
  });

  it("shows backend failures independently for identity forms", async () => {
    convexState.updateHouseholdIdentity.mockRejectedValue(new Error("Household save failed"));
    convexState.updateChildIdentity.mockRejectedValue(new Error("Child save failed"));
    const user = userEvent.setup();
    render(<ParentSettingsPage />);

    await user.click(screen.getByRole("button", { name: /save household/i }));
    await user.click(screen.getByRole("button", { name: /save child profile/i }));

    expect(await screen.findByText("Household save failed")).toBeInTheDocument();
    expect(await screen.findByText("Child save failed")).toBeInTheDocument();
  });

  it("validates parent PIN format before saving", async () => {
    const user = userEvent.setup();
    render(<ParentSettingsPage />);

    await user.type(screen.getByLabelText(/new parent pin/i), "12");
    await user.click(screen.getByRole("button", { name: /save parent pin/i }));

    expect(screen.getByText("Use a 4 to 8 digit parent PIN.")).toBeInTheDocument();
    expect(convexState.setParentLockPin).not.toHaveBeenCalled();
  });

  it("shows parent PIN backend failures", async () => {
    convexState.setParentLockPin.mockRejectedValue(new Error("PIN save failed"));
    const user = userEvent.setup();
    render(<ParentSettingsPage />);

    await user.type(screen.getByLabelText(/new parent pin/i), "8642");
    await user.click(screen.getByRole("button", { name: /save parent pin/i }));

    expect(await screen.findByText("PIN save failed")).toBeInTheDocument();
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
