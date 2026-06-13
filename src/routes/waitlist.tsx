import { Waitlist } from "@clerk/clerk-react";
import { hasClerkConfig } from "@/app/providers";

export function WaitlistPage() {
  const configured = hasClerkConfig();

  return (
    <section className="mx-auto grid min-h-[80vh] max-w-5xl place-items-center px-4 py-10">
      <div className="rounded-lg border border-ink/10 bg-white p-6 shadow-panel">
        <h1 className="mb-2 text-3xl font-black">Join the waitlist</h1>
        <p className="mb-4 max-w-sm text-sm text-ink/65">
          Request access to create a parent account. Approved applicants will receive an invitation
          by email.
        </p>
        {configured ? (
          <Waitlist signInUrl="/sign-in" />
        ) : (
          <p className="max-w-sm text-sm text-ink/65">
            Add `VITE_CLERK_PUBLISHABLE_KEY` to `.env.local` to enable the waitlist.
          </p>
        )}
      </div>
    </section>
  );
}
