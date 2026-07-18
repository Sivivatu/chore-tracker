import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChildParentUnlockPage } from "./parent-unlock";
import {
  createChildSession,
  readChildSession,
  saveChildSession,
  saveParentReturnPath,
} from "@/lib/child-session";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  query: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mocks.navigate,
}));

vi.mock("convex/react", () => ({
  useConvex: () => ({ query: mocks.query }),
  useQuery: () => ({ household: { _id: "household-1" } }),
}));

vi.mock("../../../convex/_generated/api", () => ({
  api: {
    households: {
      currentContext: { _name: "currentContext" },
      verifyParentLockPin: { _name: "verifyParentLockPin" },
    },
  },
}));

describe("ChildParentUnlockPage", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    mocks.navigate.mockReset();
    mocks.query.mockReset();
    saveChildSession(
      createChildSession("child-1", "household-1", "test-session", "2099-01-01T00:00:00.000Z"),
    );
    saveParentReturnPath("/parent/routines");
  });

  it("clears child mode and navigates to the stored parent route on correct PIN", async () => {
    mocks.query.mockResolvedValue(true);
    const user = userEvent.setup();
    render(<ChildParentUnlockPage />);

    await user.type(screen.getByLabelText(/enter parent pin/i), "2468");
    await user.click(screen.getByRole("button", { name: /unlock parent pages/i }));

    expect(mocks.query).toHaveBeenCalledWith(expect.anything(), {
      householdId: "household-1",
      pin: "2468",
    });
    expect(readChildSession()).toBeNull();
    expect(mocks.navigate).toHaveBeenCalledWith({ to: "/parent/routines" });
  });

  it("keeps child mode active when the PIN is wrong", async () => {
    mocks.query.mockResolvedValue(false);
    const user = userEvent.setup();
    render(<ChildParentUnlockPage />);

    await user.type(screen.getByLabelText(/enter parent pin/i), "0000");
    await user.click(screen.getByRole("button", { name: /unlock parent pages/i }));

    expect(await screen.findByText("That parent PIN did not work.")).toBeInTheDocument();
    expect(readChildSession()).not.toBeNull();
    expect(mocks.navigate).not.toHaveBeenCalled();
  });
});
