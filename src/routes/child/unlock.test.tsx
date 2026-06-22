import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChildUnlockPage } from "./unlock";
import { readChildSession } from "@/lib/child-session";

const queryState = vi.hoisted(() => ({
  context: {
    household: { _id: "household-1" },
    child: { _id: "child-1", name: "Maya" },
  } as object | null | undefined,
}));

vi.mock("convex/react", () => ({
  useQuery: () => queryState.context,
}));

vi.mock("@/app/providers", () => ({
  hasClerkConfig: () => true,
  isE2EAuthBypass: () => false,
}));

vi.mock("../../../convex/_generated/api", () => ({
  api: { households: { currentContext: {} } },
}));

vi.mock("@tanstack/react-router", () => ({
  Navigate: ({ to }: { to: string }) => <div data-testid="redirect">{to}</div>,
}));

describe("ChildUnlockPage", () => {
  beforeEach(() => {
    localStorage.clear();
    queryState.context = {
      household: { _id: "household-1" },
      child: { _id: "child-1", name: "Maya" },
    };
  });

  it("enters child mode directly without asking for a PIN", () => {
    render(<ChildUnlockPage />);

    expect(screen.queryByLabelText(/pin/i)).not.toBeInTheDocument();
    expect(screen.getByTestId("redirect")).toHaveTextContent("/child/today");
    expect(readChildSession()).toMatchObject({
      childId: "child-1",
      householdId: "household-1",
    });
  });

  it("shows a parent sign-in prompt when no household context is available", () => {
    queryState.context = null;

    render(<ChildUnlockPage />);

    expect(screen.getByText("Parent sign in needed")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Parent sign in" })).toHaveAttribute(
      "href",
      "/sign-in",
    );
    expect(readChildSession()).toBeNull();
  });
});
