import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChildRouteGate } from "./ChildRouteGate";

vi.mock("@tanstack/react-router", () => ({
  Navigate: ({ to }: { to: string }) => <div data-testid="navigate">{to}</div>,
  Outlet: () => <div data-testid="child-outlet">child content</div>,
}));

describe("ChildRouteGate", () => {
  beforeEach(() => localStorage.clear());

  it("sends a legacy session to child unlock so it can receive a server session", () => {
    localStorage.setItem(
      "chore-tracker-child-session",
      JSON.stringify({ childId: "child-1", householdId: "household-1" }),
    );

    render(<ChildRouteGate />);

    expect(screen.getByTestId("navigate")).toHaveTextContent("/child/unlock");
  });
});
