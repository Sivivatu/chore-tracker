import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChildTodayPage } from "./today";

const convexState = vi.hoisted(() => ({
  ensureTodayForChild: vi.fn(),
  queryCalls: [] as Array<{ query?: { _name?: string }; args: unknown }>,
  context: {
    household: { _id: "household-1", name: "The Parker Household" },
    child: { _id: "child-1", name: "Maya" },
  },
  routines: [
    {
      _id: "routine-1",
      id: "routine-1",
      householdId: "household-1",
      childId: "child-1",
      routineTemplateId: "template-1",
      date: "2026-06-23",
      status: "not_started",
      snapshotName: "School Morning",
      snapshotType: "morning",
      steps: [],
    },
  ],
}));

vi.mock("@/lib/child-session", () => ({
  readChildSession: () => ({ childId: "child-1", householdId: "household-1", name: "Maya" }),
}));

vi.mock("@/components/child/RoutineCard", () => ({
  RoutineCard: ({ instance }: { instance: { snapshotName: string } }) => (
    <article>{instance.snapshotName}</article>
  ),
}));

vi.mock("convex/react", () => ({
  useMutation: () => convexState.ensureTodayForChild,
  useQuery: (query: { _name?: string }, args: unknown) => {
    convexState.queryCalls.push({ query, args });
    if (query._name?.includes("currentContext")) return convexState.context;
    if (query._name?.includes("listTodayWithSteps")) return convexState.routines;
    return undefined;
  },
}));

vi.mock("../../../convex/_generated/api", () => ({
  api: {
    households: { currentContext: { _name: "currentContext" } },
    routines: {
      ensureTodayForChild: { _name: "ensureTodayForChild" },
      listTodayWithSteps: { _name: "listTodayWithSteps" },
    },
  },
}));

describe("ChildTodayPage", () => {
  beforeEach(() => {
    convexState.ensureTodayForChild.mockReset();
    convexState.ensureTodayForChild.mockResolvedValue({ createdCount: 1 });
    convexState.queryCalls = [];
  });

  it("materialises and reads today's routines for the active child", async () => {
    render(<ChildTodayPage />);

    await waitFor(() => {
      expect(convexState.ensureTodayForChild).toHaveBeenCalledWith({
        householdId: "household-1",
        childId: "child-1",
        date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      });
    });
    expect(convexState.queryCalls).toContainEqual({
      query: { _name: "listTodayWithSteps" },
      args: {
        householdId: "household-1",
        childId: "child-1",
        date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      },
    });
  });
});
