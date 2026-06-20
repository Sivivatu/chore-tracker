import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthGate } from "./AuthGate";

const authState = vi.hoisted(() => ({
  hasConfig: true,
  e2eBypass: false,
  isLoaded: true,
  isSignedIn: true,
  isConvexLoading: false,
  isConvexAuthenticated: true,
  context: { household: { _id: "household-1" } } as object | null | undefined,
  createHousehold: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("@/app/providers", () => ({
  hasClerkConfig: () => authState.hasConfig,
  isE2EAuthBypass: () => authState.e2eBypass,
}));

vi.mock("@clerk/react", () => ({
  useAuth: () => ({
    isLoaded: authState.isLoaded,
    isSignedIn: authState.isSignedIn,
    signOut: authState.signOut,
  }),
}));

vi.mock("convex/react", () => ({
  useConvexAuth: () => ({
    isLoading: authState.isConvexLoading,
    isAuthenticated: authState.isConvexAuthenticated,
  }),
  useQuery: () => authState.context,
  useMutation: () => authState.createHousehold,
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
    authState.isConvexLoading = false;
    authState.isConvexAuthenticated = true;
    authState.context = { household: { _id: "household-1" } };
    authState.createHousehold.mockReset();
    authState.createHousehold.mockResolvedValue({ householdId: "household-1" });
    authState.signOut.mockReset();
    authState.signOut.mockResolvedValue(undefined);
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

  it("shows a loading state while Convex validates the Clerk session", () => {
    authState.isConvexLoading = true;

    render(
      <AuthGate>
        <p>Protected dashboard</p>
      </AuthGate>,
    );

    expect(screen.getByText("Checking sign in...")).toBeInTheDocument();
    expect(screen.queryByText("Protected dashboard")).not.toBeInTheDocument();
  });

  it("clears a stale Clerk session when Convex cannot authenticate it", async () => {
    const user = userEvent.setup();
    authState.isConvexAuthenticated = false;

    render(
      <AuthGate>
        <p>Protected dashboard</p>
      </AuthGate>,
    );

    await user.click(screen.getByRole("button", { name: "Return to sign in" }));

    expect(
      screen.getByText(/application backend could not verify the session/i),
    ).toBeInTheDocument();
    expect(authState.signOut).toHaveBeenCalledWith({ redirectUrl: "/sign-in" });
    expect(screen.queryByText("Protected dashboard")).not.toBeInTheDocument();
  });

  it("shows first-time setup when the signed-in account has no household membership", async () => {
    authState.context = null;

    render(
      <AuthGate>
        <p>Protected dashboard</p>
      </AuthGate>,
    );

    await waitFor(() => {
      expect(screen.getByText("Set up your household")).toBeInTheDocument();
    });
    expect(screen.queryByText("Protected dashboard")).not.toBeInTheDocument();
  });

  it("creates a fresh household from valid first-time setup details", async () => {
    const user = userEvent.setup();
    authState.context = null;

    render(
      <AuthGate>
        <p>Protected dashboard</p>
      </AuthGate>,
    );

    await user.type(screen.getByLabelText("Household name"), "The Example Household");
    await user.type(screen.getByLabelText("Parent name"), "Alex");
    await user.type(screen.getByLabelText("Child name"), "Sam");
    await user.type(screen.getByLabelText("Parent PIN"), "2468");
    await user.click(screen.getByRole("button", { name: "Create household" }));

    await waitFor(() => {
      expect(authState.createHousehold).toHaveBeenCalledWith({
        householdName: "The Example Household",
        parentName: "Alex",
        childName: "Sam",
        parentPin: "2468",
      });
    });
    expect(screen.queryByLabelText("Child PIN")).not.toBeInTheDocument();
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
