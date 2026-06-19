import { SignUp } from "@clerk/clerk-react";
import { hasClerkConfig, isE2EAuthBypass } from "@/app/providers";

export function SignUpPage() {
  const configured = hasClerkConfig() && !isE2EAuthBypass();

  return (
    <section className="mx-auto grid min-h-[80vh] max-w-5xl place-items-center px-4 py-10">
      <div className="rounded-lg border border-ink/10 bg-white p-6 shadow-panel">
        <h1 className="mb-2 text-3xl font-black">Accept your invitation</h1>
        <p className="mb-4 max-w-sm text-sm text-ink/65">
          New accounts require waitlist approval. Use the invitation link from Clerk to continue.
        </p>
        {configured ? (
          <SignUp
            routing="path"
            path="/sign-up"
            signInUrl="/sign-in"
            waitlistUrl="/waitlist"
            oauthFlow="redirect"
            fallbackRedirectUrl="/parent/dashboard"
          />
        ) : (
          <p className="max-w-sm text-sm text-ink/65">
            Add `VITE_CLERK_PUBLISHABLE_KEY` to `.env.local` to enable Clerk sign up.
          </p>
        )}
      </div>
    </section>
  );
}
