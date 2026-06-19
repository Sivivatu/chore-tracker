import { SignIn } from "@clerk/react";
import { hasClerkConfig, isE2EAuthBypass } from "@/app/providers";

export function SignInPage() {
  const configured = hasClerkConfig() && !isE2EAuthBypass();

  return (
    <section className="mx-auto grid min-h-[80vh] max-w-5xl place-items-center px-4 py-10">
      <div className="rounded-lg border border-ink/10 bg-white p-6 shadow-panel">
        <h1 className="mb-4 text-3xl font-black">Parent sign in</h1>
        {configured ? (
          <SignIn
            routing="path"
            path="/sign-in"
            signUpUrl="/sign-up"
            waitlistUrl="/waitlist"
            oauthFlow="redirect"
            fallbackRedirectUrl="/parent/dashboard"
          />
        ) : (
          <p className="max-w-sm text-sm text-ink/65">
            Add `VITE_CLERK_PUBLISHABLE_KEY` to `.env.local` to enable Clerk sign in.
          </p>
        )}
      </div>
    </section>
  );
}
