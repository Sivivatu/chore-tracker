import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { routineInstances } from "@/data/seed";
import { RoutineStepRow } from "../RoutineStepRow";

describe("RoutineStepRow", () => {
  it("announces and toggles child completion state", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    const step = routineInstances[0].steps[0];

    render(<RoutineStepRow step={step} checked={false} onToggle={onToggle} />);

    expect(screen.getByRole("heading", { name: step.snapshotTitle })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /tick get dressed/i }));
    expect(onToggle).toHaveBeenCalledWith(step.id);
  });

  it("prevents editing submitted routines", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    const step = routineInstances[0].steps[0];

    render(<RoutineStepRow step={step} checked disabled onToggle={onToggle} />);

    await user.click(screen.getByRole("button", { name: /untick get dressed/i }));
    expect(onToggle).not.toHaveBeenCalled();
  });
});
