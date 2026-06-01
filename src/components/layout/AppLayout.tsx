import { Link } from "@tanstack/react-router";
import type { PropsWithChildren } from "react";
import { ClipboardCheck, Home, KeyRound, Settings, Star } from "lucide-react";
import { AccountControls } from "@/components/auth/AccountControls";

const nav = [
  { to: "/parent/dashboard", label: "Dashboard", icon: Home },
  { to: "/parent/routines", label: "Routines", icon: ClipboardCheck },
  { to: "/parent/approvals", label: "Approvals", icon: KeyRound },
  { to: "/parent/rewards", label: "Rewards", icon: Star },
  { to: "/parent/settings", label: "Settings", icon: Settings },
];

export function AppLayout({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="border-b border-ink/10 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <Link to="/parent/dashboard" className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-md bg-sun text-lg font-black text-ink">
              CT
            </span>
            <div>
              <p className="text-base font-black">Chore Tracker</p>
              <p className="text-xs text-ink/60">Single-household routine board</p>
            </div>
          </Link>
          <div className="ml-auto flex flex-wrap items-center justify-end gap-3">
            <nav className="flex flex-wrap gap-1" aria-label="Main navigation">
              {nav.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold text-ink/75 hover:bg-ink/5 [&.active]:bg-ink [&.active]:text-white"
                  >
                    <Icon aria-hidden className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
              <Link
                to="/child/unlock"
                className="inline-flex min-h-10 items-center gap-2 rounded-md bg-coral px-3 text-sm font-bold text-white hover:bg-coral/90"
              >
                Child mode
              </Link>
            </nav>
            <AccountControls />
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
