import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SignInPage } from "./sign-in";

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
  SignIn: (props: Record<string, unknown>) => {
    state.props = props;
    return <div data-testid="sign-in" />;
  },
}));

describe("SignInPage", () => {
  beforeEach(() => {
    state.configured = true;
    state.e2eBypass = false;
    state.props = undefined;
  });

  it("uses path routing and redirect-based OAuth", () => {
    render(<SignInPage />);

    expect(screen.getByTestId("sign-in")).toBeInTheDocument();
    expect(state.props).toMatchObject({
      routing: "path",
      path: "/sign-in",
      signUpUrl: "/sign-up",
      waitlistUrl: "/waitlist",
      oauthFlow: "redirect",
      fallbackRedirectUrl: "/parent/dashboard",
    });
  });

  it("does not render Clerk when authentication is unavailable", () => {
    state.configured = false;

    render(<SignInPage />);

    expect(screen.getByText(/VITE_CLERK_PUBLISHABLE_KEY/)).toBeInTheDocument();
    expect(screen.queryByTestId("sign-in")).not.toBeInTheDocument();
  });
});
