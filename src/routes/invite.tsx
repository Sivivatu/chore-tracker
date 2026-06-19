import { useAuth } from "@clerk/react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/Button";
import { hasClerkConfig, isE2EAuthBypass } from "@/app/providers";

export function ParentInvitePage() {
  const { token } = useParams({ from: "/invite/$token" });
  const invitation = useQuery(api.parentInvitations.inspect, { token });
  const authAvailable = hasClerkConfig() && !isE2EAuthBypass();

  if (invitation === undefined) return <InviteMessage title="Checking invitation..." />;
  if (invitation.status !== "active") {
    const messages = {
      invalid: "This invitation link is invalid.",
      accepted: "This invitation has already been used.",
      revoked: "This invitation has been revoked.",
      expired: "This invitation has expired.",
    };
    return <InviteMessage title="Invitation unavailable" body={messages[invitation.status]} />;
  }

  if (!authAvailable) {
    return <InviteMessage title="Sign in unavailable" body="Clerk is not configured." />;
  }

  return <AuthenticatedInvite token={token} invitation={invitation} />;
}

function AuthenticatedInvite({
  token,
  invitation,
}: {
  token: string;
  invitation: { householdName: string; expiresAt: string };
}) {
  const { isLoaded, isSignedIn } = useAuth();
  const { isLoading, isAuthenticated } = useConvexAuth();
  const acceptInvitation = useMutation(api.parentInvitations.accept);
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const returnUrl = `/invite/${token}`;

  async function accept(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Enter your name.");
      return;
    }
    setSubmitting(true);
    try {
      await acceptInvitation({ token, name });
      void navigate({ to: "/parent/dashboard" });
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not accept invitation.");
      setSubmitting(false);
    }
  }

  if (!isLoaded || isLoading) return <InviteMessage title="Checking sign in..." />;

  if (!isSignedIn || !isAuthenticated) {
    const redirect = encodeURIComponent(returnUrl);
    return (
      <InviteMessage
        title={`Join ${invitation.householdName}`}
        body="Sign in or create a parent account to accept this invitation."
      >
        <div className="mt-5 flex gap-3">
          <Link className="font-bold text-teal underline" to={`/sign-in?redirect_url=${redirect}`}>
            Sign in
          </Link>
          <Link className="font-bold text-teal underline" to={`/sign-up?redirect_url=${redirect}`}>
            Create account
          </Link>
        </div>
      </InviteMessage>
    );
  }

  return (
    <section className="mx-auto grid min-h-[80vh] max-w-5xl place-items-center px-4 py-10">
      <form
        onSubmit={accept}
        className="w-full max-w-md rounded-lg border border-ink/10 bg-white p-6 shadow-panel"
      >
        <p className="text-sm font-black uppercase text-teal">Parent invitation</p>
        <h1 className="mt-2 text-3xl font-black">Join {invitation.householdName}</h1>
        <label htmlFor="invited-parent-name" className="mt-6 block text-sm font-bold">
          Your name
        </label>
        <input
          id="invited-parent-name"
          value={name}
          maxLength={80}
          onChange={(event) => {
            setName(event.target.value);
            setError("");
          }}
          className="mt-2 h-12 w-full rounded-md border border-ink/20 bg-white px-3 text-base font-semibold"
          autoComplete="name"
        />
        {error ? <p className="mt-3 text-sm font-bold text-rose-700">{error}</p> : null}
        <Button className="mt-5 w-full" type="submit" disabled={submitting}>
          {submitting ? "Joining household..." : "Join household"}
        </Button>
      </form>
    </section>
  );
}

function InviteMessage({
  title,
  body,
  children,
}: {
  title: string;
  body?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="mx-auto grid min-h-[80vh] max-w-5xl place-items-center px-4 py-10">
      <div className="rounded-lg border border-ink/10 bg-white p-6 shadow-panel">
        <h1 className="text-3xl font-black">{title}</h1>
        {body ? <p className="mt-3 max-w-md text-sm text-ink/65">{body}</p> : null}
        {children}
      </div>
    </section>
  );
}
