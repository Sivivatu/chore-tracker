import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WaitlistPage } from "./waitlist";

const state = vi.hoisted(() => ({
  configured: true,
  e2eBypass: false,
}));

vi.mock("@/app/providers", () => ({
  hasClerkConfig: () => state.configured,
  isE2EAuthBypass: () => state.e2eBypass,
}));

vi.mock("@clerk/react", () => ({
  Waitlist: ({ signInUrl }: { signInUrl: string }) => (
    <div data-testid="waitlist">Sign in at {signInUrl}</div>
  ),
}));

describe("WaitlistPage", () => {
  beforeEach(() => {
    state.configured = true;
    state.e2eBypass = false;
  });

  it("renders the Clerk waitlist for configured deployments", () => {
    render(<WaitlistPage />);

    expect(screen.getByRole("heading", { name: "Join the waitlist" })).toBeInTheDocument();
    expect(screen.getByTestId("waitlist")).toHaveTextContent("/sign-in");
  });

  it("shows configuration guidance when Clerk is unavailable", () => {
    state.configured = false;

    render(<WaitlistPage />);

    expect(screen.getByText(/VITE_CLERK_PUBLISHABLE_KEY/)).toBeInTheDocument();
    expect(screen.queryByTestId("waitlist")).not.toBeInTheDocument();
  });

  it("does not render Clerk UI during e2e auth bypass", () => {
    state.e2eBypass = true;

    render(<WaitlistPage />);

    expect(screen.getByText(/VITE_CLERK_PUBLISHABLE_KEY/)).toBeInTheDocument();
    expect(screen.queryByTestId("waitlist")).not.toBeInTheDocument();
  });
});
