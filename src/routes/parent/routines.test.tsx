import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ParentRoutinesPage } from "./routines";

const convexState = vi.hoisted(() => ({
  createTemplate: vi.fn(),
  updateTemplate: vi.fn(),
  context: {
    household: { _id: "household-1", name: "The Parker Household" },
  },
  routines: [
    {
      _id: "routine-template-morning",
      id: "routine-template-morning",
      name: "My Morning Routine",
      type: "morning",
      active: true,
      schedule: ["Mon", "Tue"],
      steps: [
        {
          id: "step-1",
          title: "Get dressed",
          description: "Pick clothes.",
          order: 1,
          points: 5,
          required: true,
          illustrationKey: "dressed",
          accent: "#f97316",
        },
      ],
    },
  ],
  versions: [
    {
      _id: "version-1",
      snapshotName: "Old Morning Routine",
      snapshotType: "morning",
      snapshotActive: true,
      snapshotSchedule: ["Mon"],
      archivedAt: "2026-06-04T08:00:00.000Z",
      snapshotSteps: [
        {
          order: 1,
          title: "Old step",
          points: 3,
        },
      ],
    },
  ],
}));

vi.mock("convex/react", () => ({
  useMutation: (mutation: { _name?: string }) =>
    mutation._name?.includes("updateTemplate")
      ? convexState.updateTemplate
      : convexState.createTemplate,
  useQuery: (query: { _name?: string }) => {
    if (query._name?.includes("currentContext")) return convexState.context;
    if (query._name?.includes("listTemplatesWithSteps")) return convexState.routines;
    if (query._name?.includes("listTemplateVersions")) return convexState.versions;
    return undefined;
  },
}));

vi.mock("../../../convex/_generated/api", () => ({
  api: {
    households: { currentContext: { _name: "currentContext" } },
    routines: {
      listTemplatesWithSteps: { _name: "listTemplatesWithSteps" },
      listTemplateVersions: { _name: "listTemplateVersions" },
      createTemplate: { _name: "createTemplate" },
      updateTemplate: { _name: "updateTemplate" },
    },
  },
}));

describe("ParentRoutinesPage", () => {
  beforeEach(() => {
    convexState.createTemplate.mockReset();
    convexState.updateTemplate.mockReset();
    convexState.createTemplate.mockResolvedValue("routine-template-new");
    convexState.updateTemplate.mockResolvedValue("routine-template-morning");
    convexState.versions = [
      {
        _id: "version-1",
        snapshotName: "Old Morning Routine",
        snapshotType: "morning",
        snapshotActive: true,
        snapshotSchedule: ["Mon"],
        archivedAt: "2026-06-04T08:00:00.000Z",
        snapshotSteps: [
          {
            order: 1,
            title: "Old step",
            points: 3,
          },
        ],
      },
    ];
  });

  it("edits a seeded routine and keeps edit history by default", async () => {
    const user = userEvent.setup();
    render(<ParentRoutinesPage />);

    await user.click(screen.getByRole("button", { name: /edit routine/i }));
    expect(screen.getByLabelText(/keep edit history/i)).toBeChecked();
    expect(screen.getByText(/Old Morning Routine archived/i)).toBeInTheDocument();

    await user.clear(screen.getByLabelText(/routine name/i));
    await user.type(screen.getByLabelText(/routine name/i), "School Morning");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(convexState.updateTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        householdId: "household-1",
        routineTemplateId: "routine-template-morning",
        name: "School Morning",
        keepEditHistory: true,
      }),
    );
  });

  it("creates a routine with steps", async () => {
    const user = userEvent.setup();
    render(<ParentRoutinesPage />);

    await user.type(screen.getByLabelText(/routine name/i), "Weekend Reset");
    await user.type(screen.getByLabelText(/^Title$/i), "Clear breakfast plates");
    await user.click(screen.getAllByRole("button", { name: /create routine/i }).at(-1)!);

    expect(convexState.createTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        householdId: "household-1",
        name: "Weekend Reset",
        steps: [expect.objectContaining({ title: "Clear breakfast plates" })],
      }),
    );
  });

  it("blocks saving invalid routines", async () => {
    const user = userEvent.setup();
    render(<ParentRoutinesPage />);

    await user.click(screen.getAllByRole("button", { name: /create routine/i }).at(-1)!);

    expect(screen.getByText("Routine name is required.")).toBeInTheDocument();
    expect(convexState.createTemplate).not.toHaveBeenCalled();
  });

  it("updates step controls, schedule, active state and history preference", async () => {
    const user = userEvent.setup();
    render(<ParentRoutinesPage />);

    await user.click(screen.getByRole("button", { name: /edit routine/i }));
    await user.click(screen.getByLabelText(/active/i));
    await user.click(screen.getByRole("button", { name: "Mon" }));
    await user.click(screen.getByRole("button", { name: "Wed" }));
    await user.selectOptions(screen.getByLabelText(/type/i), "custom");
    await user.click(screen.getByRole("button", { name: /add step/i }));

    const titleFields = screen.getAllByLabelText(/^Title$/i);
    await user.type(titleFields[1], "Brush teeth");
    await user.clear(screen.getAllByLabelText(/illustration key/i)[1]);
    await user.type(screen.getAllByLabelText(/illustration key/i)[1], "teeth");
    await user.type(screen.getAllByLabelText(/description/i)[1], "Brush for two minutes.");
    await user.clear(screen.getAllByLabelText(/points/i)[1]);
    await user.type(screen.getAllByLabelText(/points/i)[1], "7");
    await user.selectOptions(screen.getAllByLabelText(/accent/i)[1], "#38bdf8");
    await user.click(screen.getAllByLabelText(/required/i)[1]);
    await user.click(screen.getByRole("button", { name: /move step 2 up/i }));
    await user.click(screen.getByLabelText(/keep edit history/i));
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(convexState.updateTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        active: false,
        schedule: ["Tue", "Wed"],
        keepEditHistory: false,
        steps: [
          expect.objectContaining({ title: "Brush teeth" }),
          expect.objectContaining({ title: "Get dressed" }),
        ],
      }),
    );
  });

  it("shows an empty history state and handles save failures", async () => {
    convexState.versions = [];
    convexState.updateTemplate.mockRejectedValue(new Error("Backend rejected edit"));
    const user = userEvent.setup();
    render(<ParentRoutinesPage />);

    await user.click(screen.getByRole("button", { name: /edit routine/i }));
    expect(screen.getByText("No archived versions yet.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(await screen.findByText("Backend rejected edit")).toBeInTheDocument();
  });
});
