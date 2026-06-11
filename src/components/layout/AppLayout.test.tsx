import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppLayout } from "./AppLayout";
import { createChildSession, saveChildSession } from "@/lib/child-session";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...props }: { to: string; children: React.ReactNode }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useRouterState: ({ select }: { select: (state: { location: { pathname: string } }) => string }) =>
    select({ location: { pathname: "/child/today" } }),
}));

vi.mock("@/components/auth/AccountControls", () => ({
  AccountControls: () => <div>Account controls</div>,
}));

describe("AppLayout", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("hides parent navigation and account controls in child mode", () => {
    saveChildSession(createChildSession("child-1", "household-1"));

    render(<AppLayout>Child content</AppLayout>);

    expect(screen.queryByRole("link", { name: /routines/i })).not.toBeInTheDocument();
    expect(screen.queryByText("Account controls")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /today/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /chores/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /parent unlock/i })).toBeInTheDocument();
  });

  it("shows parent navigation when child mode is not active", () => {
    render(<AppLayout>Parent content</AppLayout>);

    expect(screen.getByRole("link", { name: /routines/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /chores/i })).toBeInTheDocument();
    expect(screen.getAllByText("Account controls")).toHaveLength(2);
  });

  it("opens and closes the mobile menu", async () => {
    const user = userEvent.setup();
    render(<AppLayout>Parent content</AppLayout>);

    await user.click(screen.getByRole("button", { name: /menu/i }));
    expect(screen.getAllByRole("link", { name: /chores/i })).toHaveLength(2);

    await user.click(screen.getByRole("button", { name: /close/i }));
    expect(screen.getByRole("button", { name: /menu/i })).toBeInTheDocument();
  });
});
