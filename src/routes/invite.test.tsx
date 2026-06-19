import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ParentInvitePage } from "./invite";

const state = vi.hoisted(() => ({
  invitation: {
    status: "active",
    householdName: "The Example Household",
    expiresAt: "2026-06-22T00:00:00.000Z",
  } as { status: string; householdName?: string; expiresAt?: string } | undefined,
  accept: vi.fn(),
  navigate: vi.fn(),
  hasConfig: true,
  isLoaded: true,
  isSignedIn: true,
  isConvexLoading: false,
  isAuthenticated: true,
}));

vi.mock("@/app/providers", () => ({
  hasClerkConfig: () => state.hasConfig,
  isE2EAuthBypass: () => false,
}));

vi.mock("@clerk/react", () => ({
  useAuth: () => ({ isLoaded: state.isLoaded, isSignedIn: state.isSignedIn }),
}));

vi.mock("convex/react", () => ({
  useConvexAuth: () => ({
    isLoading: state.isConvexLoading,
    isAuthenticated: state.isAuthenticated,
  }),
  useQuery: () => state.invitation,
  useMutation: () => state.accept,
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
  useParams: () => ({ token: "a".repeat(64) }),
  useNavigate: () => state.navigate,
}));

describe("ParentInvitePage", () => {
  beforeEach(() => {
    state.accept.mockReset();
    state.accept.mockResolvedValue({});
    state.navigate.mockReset();
    state.hasConfig = true;
    state.isLoaded = true;
    state.isSignedIn = true;
    state.isConvexLoading = false;
    state.isAuthenticated = true;
    state.invitation = {
      status: "active",
      householdName: "The Example Household",
      expiresAt: "2026-06-22T00:00:00.000Z",
    };
  });

  it("accepts an active invitation for the signed-in parent", async () => {
    const user = userEvent.setup();
    render(<ParentInvitePage />);

    await user.type(screen.getByLabelText(/your name/i), "Jamie");
    await user.click(screen.getByRole("button", { name: /join household/i }));

    expect(state.accept).toHaveBeenCalledWith({ token: "a".repeat(64), name: "Jamie" });
    expect(state.navigate).toHaveBeenCalledWith({ to: "/parent/dashboard" });
  });

  it("shows an unavailable state for a revoked invitation", () => {
    state.invitation = { status: "revoked" };
    render(<ParentInvitePage />);

    expect(screen.getByText("This invitation has been revoked.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /join household/i })).not.toBeInTheDocument();
  });

  it.each([
    ["invalid", "This invitation link is invalid."],
    ["accepted", "This invitation has already been used."],
    ["expired", "This invitation has expired."],
  ])("shows the %s invitation state", (status, message) => {
    state.invitation = { status };
    render(<ParentInvitePage />);

    expect(screen.getByText(message)).toBeInTheDocument();
  });

  it("shows loading while the invitation is inspected", () => {
    state.invitation = undefined;
    render(<ParentInvitePage />);

    expect(screen.getByText("Checking invitation...")).toBeInTheDocument();
  });

  it("reports unavailable authentication configuration", () => {
    state.hasConfig = false;
    render(<ParentInvitePage />);

    expect(screen.getByText("Clerk is not configured.")).toBeInTheDocument();
  });

  it("offers sign-in and sign-up when the recipient is signed out", () => {
    state.isSignedIn = false;
    state.isAuthenticated = false;
    render(<ParentInvitePage />);

    expect(screen.getByText(/sign in or create a parent account/i)).toBeInTheDocument();
    expect(screen.getByText("Sign in")).toBeInTheDocument();
    expect(screen.getByText("Create account")).toBeInTheDocument();
  });

  it("shows loading while authentication is initialising", () => {
    state.isLoaded = false;
    render(<ParentInvitePage />);

    expect(screen.getByText("Checking sign in...")).toBeInTheDocument();
  });

  it("validates the invited parent's name", async () => {
    const user = userEvent.setup();
    render(<ParentInvitePage />);

    await user.click(screen.getByRole("button", { name: /join household/i }));

    expect(screen.getByText("Enter your name.")).toBeInTheDocument();
    expect(state.accept).not.toHaveBeenCalled();
  });

  it("shows invitation acceptance failures", async () => {
    state.accept.mockRejectedValue(new Error("Invitation has expired"));
    const user = userEvent.setup();
    render(<ParentInvitePage />);

    await user.type(screen.getByLabelText(/your name/i), "Jamie");
    await user.click(screen.getByRole("button", { name: /join household/i }));

    expect(await screen.findByText("Invitation has expired")).toBeInTheDocument();
  });
});
