import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChildChoresPage } from "./chores";

const convexState = vi.hoisted(() => ({
  submitChore: vi.fn(),
  context: {
    household: { _id: "household-1", name: "The Parker Household" },
    child: { _id: "child-1", name: "Maya" },
  },
  chores: [
    {
      _id: "chore-1",
      id: "chore-1",
      title: "Water the plants",
      description: "Check the kitchen plants.",
      frequency: "weekly",
      basePoints: 2,
      multiplier: 3,
      repeatCount: 0,
      repeatAdjustment: 1,
      earnedPoints: 6,
    },
    {
      _id: "chore-2",
      id: "chore-2",
      title: "Sort the recycling",
      description: "",
      frequency: "monthly",
      basePoints: 4,
      multiplier: 10,
      repeatCount: 1,
      repeatAdjustment: 0.5,
      earnedPoints: 20,
    },
    {
      _id: "chore-3",
      id: "chore-3",
      title: "Wipe the table",
      description: "",
      frequency: "daily",
      basePoints: 1,
      multiplier: 1,
      repeatCount: 1,
      repeatAdjustment: 0,
      earnedPoints: 0,
    },
  ],
}));

vi.mock("@/lib/child-session", () => ({
  readChildSession: () => ({ childId: "child-1", householdId: "household-1", name: "Maya" }),
}));

vi.mock("convex/react", () => ({
  useMutation: () => convexState.submitChore,
  useQuery: (query: { _name?: string }) => {
    if (query._name?.includes("currentContext")) return convexState.context;
    if (query._name?.includes("listForChild")) return convexState.chores;
    return undefined;
  },
}));

vi.mock("../../../convex/_generated/api", () => ({
  api: {
    households: { currentContext: { _name: "currentContext" } },
    chores: {
      listForChild: { _name: "listForChild" },
      submit: { _name: "submit" },
    },
  },
}));

describe("ChildChoresPage", () => {
  beforeEach(() => {
    convexState.submitChore.mockReset();
    convexState.submitChore.mockResolvedValue("submission-1");
  });

  it("shows full, repeat, and zero reward states", () => {
    render(<ChildChoresPage />);

    expect(screen.getByRole("heading", { name: /extra chores/i })).toBeInTheDocument();
    expect(screen.getByText("Full reward: 2 x 3")).toBeInTheDocument();
    expect(screen.getByText("Repeat reward: 4 x 10")).toBeInTheDocument();
    expect(screen.getByText("No extra points this time: 1 x 1")).toBeInTheDocument();
  });

  it("submits a chore for approval", async () => {
    const user = userEvent.setup();
    render(<ChildChoresPage />);

    await user.click(screen.getAllByRole("button", { name: /submit for approval/i })[0]);

    expect(convexState.submitChore).toHaveBeenCalledWith({
      householdId: "household-1",
      childId: "child-1",
      choreId: "chore-1",
    });
    expect(await screen.findByRole("button", { name: /submitted/i })).toBeDisabled();
  });
});
