import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SignUpPage } from "./sign-up";

const state = vi.hoisted(() => ({
  configured: true,
  e2eBypass: false,
  props: undefined as Record<string, unknown> | undefined,
}));

vi.mock("@/app/providers", () => ({
  hasClerkConfig: () => state.configured,
  isE2EAuthBypass: () => state.e2eBypass,
}));

vi.mock("@clerk/react", () => ({
  SignUp: (props: Record<string, unknown>) => {
    state.props = props;
    return <div data-testid="sign-up" />;
  },
}));

describe("SignUpPage", () => {
  beforeEach(() => {
    state.configured = true;
    state.e2eBypass = false;
    state.props = undefined;
  });

  it("uses the invitation route and redirect-based OAuth", () => {
    render(<SignUpPage />);

    expect(screen.getByTestId("sign-up")).toBeInTheDocument();
    expect(state.props).toMatchObject({
      routing: "path",
      path: "/sign-up",
      signInUrl: "/sign-in",
      waitlistUrl: "/waitlist",
      oauthFlow: "redirect",
      fallbackRedirectUrl: "/parent/dashboard",
    });
  });

  it("does not render Clerk during the E2E authentication bypass", () => {
    state.e2eBypass = true;

    render(<SignUpPage />);

    expect(screen.getByText(/VITE_CLERK_PUBLISHABLE_KEY/)).toBeInTheDocument();
    expect(screen.queryByTestId("sign-up")).not.toBeInTheDocument();
  });
});
