import { Show, SignInButton, UserButton } from "@clerk/react";
import { useRouterState } from "@tanstack/react-router";
import { LogIn } from "lucide-react";
import { hasClerkConfig, isE2EAuthBypass } from "@/app/providers";
import { Button } from "@/components/ui/Button";

function ClerkAccountControls() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isSignInPage = pathname === "/sign-in" || pathname.startsWith("/sign-in/");

  return (
    <div className="flex min-h-10 items-center justify-end gap-2">
      <Show when="signed-in">
        <UserButton
          appearance={{
            elements: {
              avatarBox: "h-10 w-10",
              userButtonPopoverCard: "rounded-md",
            },
          }}
        />
      </Show>
      <Show when="signed-out">
        {isSignInPage ? null : (
          <SignInButton mode="redirect" forceRedirectUrl="/parent/dashboard">
            <Button type="button" className="min-h-10 px-3">
              <LogIn aria-hidden className="h-4 w-4" />
              Log in
            </Button>
          </SignInButton>
        )}
      </Show>
    </div>
  );
}

export function AccountControls() {
  if (isE2EAuthBypass()) {
    return (
      <Button type="button" variant="secondary" className="min-h-10 px-3" disabled>
        <LogIn aria-hidden className="h-4 w-4" />
        Test auth
      </Button>
    );
  }

  if (!hasClerkConfig()) {
    return (
      <Button type="button" variant="secondary" className="min-h-10 px-3" disabled>
        <LogIn aria-hidden className="h-4 w-4" />
        Log in
      </Button>
    );
  }

  return <ClerkAccountControls />;
}
