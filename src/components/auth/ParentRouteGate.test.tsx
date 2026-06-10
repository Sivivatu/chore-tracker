import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ParentRouteGate } from "./ParentRouteGate";
import {
  clearChildSession,
  createChildSession,
  readParentReturnPath,
  saveChildSession,
} from "@/lib/child-session";

const routerState = vi.hoisted(() => ({
  pathname: "/parent/routines",
}));

vi.mock("@tanstack/react-router", () => ({
  Navigate: ({ to }: { to: string }) => <div data-testid="navigate">{to}</div>,
  Outlet: () => <div data-testid="parent-outlet">parent content</div>,
  useRouterState: ({ select }: { select: (state: { location: { pathname: string } }) => string }) =>
    select({ location: { pathname: routerState.pathname } }),
}));

describe("ParentRouteGate", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    window.history.pushState({}, "", "/");
    routerState.pathname = "/parent/routines";
  });

  it("renders parent content when child mode is not active", () => {
    render(<ParentRouteGate />);

    expect(screen.getByTestId("parent-outlet")).toBeInTheDocument();
  });

  it("redirects and stores the intended parent route while child mode is active", async () => {
    saveChildSession(createChildSession("child-1", "household-1"));
    window.history.pushState({}, "", "/parent/routines?tab=templates");

    render(<ParentRouteGate />);

    expect(screen.getByTestId("navigate")).toHaveTextContent("/child/parent-unlock");
    await waitFor(() => {
      expect(readParentReturnPath()).toBe("/parent/routines?tab=templates");
    });

    clearChildSession();
  });
});
