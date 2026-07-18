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

const createSession = vi.hoisted(() => vi.fn());

vi.mock("convex/react", () => ({
  useQuery: () => queryState.context,
  useMutation: () => createSession,
}));

vi.mock("@/app/providers", () => ({
  hasClerkConfig: () => true,
  isE2EAuthBypass: () => false,
}));

vi.mock("../../../convex/_generated/api", () => ({
  api: { households: { currentContext: {} }, childMode: { createSession: {} } },
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
    createSession.mockReset();
    createSession.mockResolvedValue({
      childId: "child-1",
      householdId: "household-1",
      token: "session-token",
      expiresAt: "2099-01-01T00:00:00.000Z",
    });
  });

  it("enters child mode directly without asking for a PIN", async () => {
    render(<ChildUnlockPage />);

    expect(screen.queryByLabelText(/pin/i)).not.toBeInTheDocument();
    expect(await screen.findByTestId("redirect")).toHaveTextContent("/child/today");
    expect(readChildSession()).toMatchObject({
      childId: "child-1",
      householdId: "household-1",
      token: "session-token",
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
