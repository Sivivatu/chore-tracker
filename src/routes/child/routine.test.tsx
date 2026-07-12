import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChildRoutinePage } from "./routine";

const convexState = vi.hoisted(() => ({
  saveRoutineProgress: vi.fn(),
  submitRoutine: vi.fn(),
  context: {
    household: { _id: "household-1", name: "The Parker Household" },
  },
  instance: {
    _id: "routine-1",
    id: "routine-1",
    householdId: "household-1",
    childId: "child-1",
    routineTemplateId: "template-1",
    date: "2026-06-29",
    status: "not_started",
    snapshotName: "School Morning",
    snapshotType: "morning",
    rejectedAt: undefined as string | undefined,
    rejectionNote: undefined as string | undefined,
    steps: [
      {
        _id: "step-1",
        id: "step-1",
        householdId: "household-1",
        childId: "child-1",
        routineInstanceId: "routine-1",
        snapshotTitle: "Brush teeth",
        snapshotDescription: "Brush for two minutes.",
        snapshotOrder: 1,
        snapshotPoints: 5,
        snapshotRequired: true,
        snapshotIllustrationKey: "teeth",
        accent: "#38bdf8",
      },
      {
        _id: "step-2",
        id: "step-2",
        householdId: "household-1",
        childId: "child-1",
        routineInstanceId: "routine-1",
        snapshotTitle: "Pack bag",
        snapshotDescription: "Pack your school bag.",
        snapshotOrder: 2,
        snapshotPoints: 5,
        snapshotRequired: true,
        snapshotIllustrationKey: "bag",
        accent: "#f97316",
      },
    ],
  },
}));

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    useParams: () => ({ routineInstanceId: "routine-1" }),
  };
});

vi.mock("@/lib/child-session", () => ({
  readChildSession: () => ({ childId: "child-1", householdId: "household-1", name: "Maya" }),
}));

vi.mock("convex/react", () => ({
  useMutation: (mutation: { _name?: string }) =>
    mutation._name?.includes("saveRoutineProgress")
      ? convexState.saveRoutineProgress
      : convexState.submitRoutine,
  useQuery: (query: { _name?: string }) => {
    if (query._name?.includes("currentContext")) return convexState.context;
    if (query._name?.includes("getInstanceWithSteps")) return convexState.instance;
    return undefined;
  },
}));

vi.mock("../../../convex/_generated/api", () => ({
  api: {
    childMode: {
      saveRoutineProgress: { _name: "saveRoutineProgress" },
      submitRoutine: { _name: "submitRoutine" },
    },
    households: { currentContext: { _name: "currentContext" } },
    routines: { getInstanceWithSteps: { _name: "getInstanceWithSteps" } },
  },
}));

describe("ChildRoutinePage", () => {
  beforeEach(() => {
    convexState.saveRoutineProgress.mockReset();
    convexState.submitRoutine.mockReset();
    convexState.saveRoutineProgress.mockResolvedValue(null);
    convexState.submitRoutine.mockResolvedValue(null);
    convexState.instance = {
      ...convexState.instance,
      status: "not_started",
      rejectionNote: undefined,
      steps: convexState.instance.steps.map((step) => ({
        ...step,
        completedAt: undefined,
        completedByChildId: undefined,
      })),
    };
  });

  it("renders separate save and submit actions for editable routines", async () => {
    render(<ChildRoutinePage />);

    expect(screen.getByRole("button", { name: /save progress/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /submit for approval/i })).toBeDisabled();

    await userEvent.click(screen.getByRole("button", { name: /tick brush teeth/i }));

    expect(screen.getByRole("button", { name: /save progress/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /submit for approval/i })).toBeEnabled();
  });

  it("saves progress without submitting", async () => {
    const user = userEvent.setup();
    render(<ChildRoutinePage />);

    await user.click(screen.getByRole("button", { name: /tick brush teeth/i }));
    await user.click(screen.getByRole("button", { name: /save progress/i }));

    expect(convexState.saveRoutineProgress).toHaveBeenCalledWith({
      householdId: "household-1",
      childId: "child-1",
      routineInstanceId: "routine-1",
      completedStepIds: ["step-1"],
    });
    expect(convexState.submitRoutine).not.toHaveBeenCalled();
  });

  it("keeps submitted, approved and paused routines read-only", () => {
    for (const status of ["submitted", "approved", "paused"] as const) {
      convexState.instance = { ...convexState.instance, status };
      const { unmount } = render(<ChildRoutinePage />);

      expect(screen.queryByRole("button", { name: /save progress/i })).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /submit for approval/i }),
      ).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: /tick brush teeth/i })).toBeDisabled();

      unmount();
    }
  });

  it("allows rejected routines to be edited with the parent note visible", async () => {
    const user = userEvent.setup();
    convexState.instance = {
      ...convexState.instance,
      status: "rejected",
      rejectionNote: "Please try again.",
    };
    render(<ChildRoutinePage />);

    expect(screen.getByText(/parent note: please try again/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /tick brush teeth/i }));
    await user.click(screen.getByRole("button", { name: /submit for approval/i }));

    expect(convexState.submitRoutine).toHaveBeenCalledWith(
      expect.objectContaining({ completedStepIds: ["step-1"] }),
    );
  });

  it("shows saved steps when continuing an in-progress routine", async () => {
    convexState.instance = {
      ...convexState.instance,
      status: "in_progress",
      steps: convexState.instance.steps.map((step, index) =>
        index === 0
          ? {
              ...step,
              completedAt: "2026-06-29T07:15:00.000Z",
              completedByChildId: "child-1",
            }
          : step,
      ),
    };
    render(<ChildRoutinePage />);

    expect(screen.getByText("Saved progress")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /untick brush teeth/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: /submit for approval/i })).toBeEnabled();
  });
});
