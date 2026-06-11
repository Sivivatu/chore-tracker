import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ParentChoresPage } from "./chores";

const convexState = vi.hoisted(() => ({
  createChore: vi.fn(),
  updateChore: vi.fn(),
  context: {
    household: { _id: "household-1", name: "The Parker Household" },
  },
  chores: [
    {
      _id: "chore-1",
      id: "chore-1",
      title: "Water the plants",
      description: "Check the kitchen plants.",
      frequency: "weekly",
      basePoints: 2,
      active: true,
      multiplier: 3,
      fullPoints: 6,
    },
  ],
}));

vi.mock("convex/react", () => ({
  useMutation: (mutation: { _name?: string }) =>
    mutation._name?.includes("update") ? convexState.updateChore : convexState.createChore,
  useQuery: (query: { _name?: string }) => {
    if (query._name?.includes("currentContext")) return convexState.context;
    if (query._name?.includes("chores.list")) return convexState.chores;
    return undefined;
  },
}));

vi.mock("../../../convex/_generated/api", () => ({
  api: {
    households: { currentContext: { _name: "currentContext" } },
    chores: {
      list: { _name: "chores.list" },
      create: { _name: "chores.create" },
      update: { _name: "chores.update" },
    },
  },
}));

describe("ParentChoresPage", () => {
  beforeEach(() => {
    convexState.createChore.mockReset();
    convexState.updateChore.mockReset();
    convexState.createChore.mockResolvedValue("chore-new");
    convexState.updateChore.mockResolvedValue("chore-1");
  });

  it("shows existing chores with calculated points", () => {
    render(<ParentChoresPage />);

    expect(screen.getByRole("heading", { name: "Chores" })).toBeInTheDocument();
    expect(screen.getByText("Water the plants")).toBeInTheDocument();
    expect(screen.getByText("2 base x 3 = 6 points")).toBeInTheDocument();
  });

  it("creates a chore", async () => {
    const user = userEvent.setup();
    render(<ParentChoresPage />);

    await user.type(screen.getByLabelText(/chore title/i), "Clean the car");
    await user.type(screen.getByLabelText(/description/i), "Wash the outside.");
    await user.selectOptions(screen.getByLabelText(/frequency/i), "monthly");
    await user.clear(screen.getByLabelText(/base points/i));
    await user.type(screen.getByLabelText(/base points/i), "5");
    await user.click(screen.getAllByRole("button", { name: /create chore/i }).at(-1)!);

    expect(convexState.createChore).toHaveBeenCalledWith({
      householdId: "household-1",
      title: "Clean the car",
      description: "Wash the outside.",
      frequency: "monthly",
      basePoints: 5,
      active: true,
    });
  });

  it("edits a chore", async () => {
    const user = userEvent.setup();
    render(<ParentChoresPage />);

    await user.click(screen.getByRole("button", { name: /edit chore/i }));
    await user.clear(screen.getByLabelText(/chore title/i));
    await user.type(screen.getByLabelText(/chore title/i), "Water every plant");
    await user.click(screen.getByLabelText(/active/i));
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(convexState.updateChore).toHaveBeenCalledWith(
      expect.objectContaining({
        householdId: "household-1",
        choreId: "chore-1",
        title: "Water every plant",
        active: false,
      }),
    );
  });

  it("blocks invalid chores", async () => {
    const user = userEvent.setup();
    render(<ParentChoresPage />);

    await user.click(screen.getAllByRole("button", { name: /create chore/i }).at(-1)!);

    expect(screen.getByText("Chore title is required.")).toBeInTheDocument();
    expect(convexState.createChore).not.toHaveBeenCalled();
  });
});
