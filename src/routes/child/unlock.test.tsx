import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChildUnlockPage } from "./unlock";
import { readChildSession } from "@/lib/child-session";

vi.mock("convex/react", () => ({
  useQuery: () => ({
    household: { _id: "household-1" },
    child: { _id: "child-1", name: "Maya" },
  }),
}));

vi.mock("../../../convex/_generated/api", () => ({
  api: { households: { currentContext: {} } },
}));

vi.mock("@tanstack/react-router", () => ({
  Navigate: ({ to }: { to: string }) => <div data-testid="redirect">{to}</div>,
}));

describe("ChildUnlockPage", () => {
  beforeEach(() => localStorage.clear());

  it("enters child mode directly without asking for a PIN", () => {
    render(<ChildUnlockPage />);

    expect(screen.queryByLabelText(/pin/i)).not.toBeInTheDocument();
    expect(screen.getByTestId("redirect")).toHaveTextContent("/child/today");
    expect(readChildSession()).toMatchObject({
      childId: "child-1",
      householdId: "household-1",
    });
  });
});
