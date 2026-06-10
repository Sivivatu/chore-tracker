import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthGate } from "./AuthGate";

const authState = vi.hoisted(() => ({
  hasConfig: true,
  e2eBypass: false,
  isLoaded: true,
  isSignedIn: true,
}));

vi.mock("@/app/providers", () => ({
  hasClerkConfig: () => authState.hasConfig,
  isE2EAuthBypass: () => authState.e2eBypass,
}));

vi.mock("@clerk/clerk-react", () => ({
  useAuth: () => ({
    isLoaded: authState.isLoaded,
    isSignedIn: authState.isSignedIn,
  }),
}));

vi.mock("@tanstack/react-router", () => ({
  Navigate: ({ to }: { to: string }) => <div data-testid="redirect">{to}</div>,
}));

describe("AuthGate", () => {
  beforeEach(() => {
    authState.hasConfig = true;
    authState.e2eBypass = false;
    authState.isLoaded = true;
    authState.isSignedIn = true;
  });

  it("renders protected content when Clerk is configured and the user is signed in", () => {
    render(
      <AuthGate>
        <p>Protected dashboard</p>
      </AuthGate>,
    );

    expect(screen.getByText("Protected dashboard")).toBeInTheDocument();
  });

  it("redirects signed-out users to sign in", () => {
    authState.isSignedIn = false;

    render(
      <AuthGate>
        <p>Protected dashboard</p>
      </AuthGate>,
    );

    expect(screen.getByTestId("redirect")).toHaveTextContent("/sign-in");
    expect(screen.queryByText("Protected dashboard")).not.toBeInTheDocument();
  });

  it("blocks protected content when Clerk is not configured", () => {
    authState.hasConfig = false;

    render(
      <AuthGate>
        <p>Protected dashboard</p>
      </AuthGate>,
    );

    expect(screen.getByText("Sign in unavailable")).toBeInTheDocument();
    expect(screen.queryByText("Protected dashboard")).not.toBeInTheDocument();
  });

  it("shows a loading state while Clerk initialises", () => {
    authState.isLoaded = false;

    render(
      <AuthGate>
        <p>Protected dashboard</p>
      </AuthGate>,
    );

    expect(screen.getByText("Checking sign in...")).toBeInTheDocument();
    expect(screen.queryByText("Protected dashboard")).not.toBeInTheDocument();
  });

  it("renders protected content in e2e auth bypass mode", () => {
    authState.e2eBypass = true;
    authState.hasConfig = false;
    authState.isSignedIn = false;

    render(
      <AuthGate>
        <p>Protected dashboard</p>
      </AuthGate>,
    );

    expect(screen.getByText("Protected dashboard")).toBeInTheDocument();
  });
});
