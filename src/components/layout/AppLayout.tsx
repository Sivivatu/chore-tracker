import { Link, useRouterState } from "@tanstack/react-router";
import { type PropsWithChildren, useEffect, useRef, useState } from "react";
import {
  CalendarCheck,
  ClipboardCheck,
  Home,
  KeyRound,
  ListChecks,
  Menu,
  Scale,
  Settings,
  Star,
  X,
} from "lucide-react";
import { AccountControls } from "@/components/auth/AccountControls";
import { hasActiveChildSession } from "@/lib/child-session";

const nav = [
  { to: "/parent/dashboard", label: "Dashboard", icon: Home },
  { to: "/parent/routines", label: "Routines", icon: ClipboardCheck },
  { to: "/parent/approvals", label: "Approvals", icon: KeyRound },
  { to: "/parent/chores", label: "Chores", icon: ListChecks },
  { to: "/parent/backfill", label: "Backfill", icon: CalendarCheck },
  { to: "/parent/behaviour", label: "Behaviour", icon: Scale },
  { to: "/parent/rewards", label: "Rewards", icon: Star },
  { to: "/parent/settings", label: "Settings", icon: Settings },
];

export function AppLayout({ children }: PropsWithChildren) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuToggleRef = useRef<HTMLButtonElement | null>(null);
  const mobileMenuPanelRef = useRef<HTMLDivElement | null>(null);
  const childModeActive = hasActiveChildSession();

  useEffect(() => {
    const timeout = window.setTimeout(() => setMobileMenuOpen(false), 0);
    return () => window.clearTimeout(timeout);
  }, [pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    function closeOnOutsidePointer(event: MouseEvent | TouchEvent) {
      const target = event.target as Node | null;
      if (!target) return;
      if (mobileMenuToggleRef.current?.contains(target)) return;
      if (mobileMenuPanelRef.current?.contains(target)) return;
      setMobileMenuOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setMobileMenuOpen(false);
    }

    document.addEventListener("mousedown", closeOnOutsidePointer);
    document.addEventListener("touchstart", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("mousedown", closeOnOutsidePointer);
      document.removeEventListener("touchstart", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [mobileMenuOpen]);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="border-b border-ink/10 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <Link
            to={childModeActive ? "/child/today" : "/parent/dashboard"}
            className="flex items-center gap-3"
          >
            <span className="grid h-10 w-10 place-items-center rounded-md bg-sun text-lg font-black text-ink">
              CT
            </span>
            <div>
              <p className="text-base font-black">Chore Tracker</p>
              <p className="text-xs text-ink/60">
                {childModeActive ? "Child routine mode" : "Single-household routine board"}
              </p>
            </div>
          </Link>
          <div className="ml-auto flex items-center justify-end gap-2 md:gap-3">
            <button
              ref={mobileMenuToggleRef}
              type="button"
              className="inline-flex min-h-10 items-center gap-2 rounded-md border border-ink/15 px-3 text-sm font-semibold text-ink hover:bg-ink/5 md:hidden"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-main-navigation"
              onClick={() => setMobileMenuOpen((open) => !open)}
            >
              {mobileMenuOpen ? (
                <X aria-hidden className="h-4 w-4" />
              ) : (
                <Menu aria-hidden className="h-4 w-4" />
              )}
              {mobileMenuOpen ? "Close" : "Menu"}
            </button>
            <div className="hidden md:flex md:flex-wrap md:items-center md:justify-end md:gap-3">
              <nav className="flex flex-wrap gap-1" aria-label="Main navigation">
                {childModeActive ? (
                  <>
                    <Link
                      to="/child/today"
                      className="inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold text-ink/75 hover:bg-ink/5 [&.active]:bg-ink [&.active]:text-white"
                    >
                      <Home aria-hidden className="h-4 w-4" />
                      Today
                    </Link>
                    <Link
                      to="/child/chores"
                      className="inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold text-ink/75 hover:bg-ink/5 [&.active]:bg-ink [&.active]:text-white"
                    >
                      <ListChecks aria-hidden className="h-4 w-4" />
                      Chores
                    </Link>
                    <Link
                      to="/child/parent-unlock"
                      className="inline-flex min-h-10 items-center gap-2 rounded-md bg-coral px-3 text-sm font-bold text-white hover:bg-coral/90"
                    >
                      Parent unlock
                    </Link>
                  </>
                ) : (
                  <>
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
                  </>
                )}
              </nav>
              {childModeActive ? null : <AccountControls />}
            </div>
            {childModeActive ? null : (
              <div className="md:hidden">
                <AccountControls />
              </div>
            )}
          </div>

          {mobileMenuOpen ? (
            <div ref={mobileMenuPanelRef} className="w-full md:hidden" id="mobile-main-navigation">
              <nav
                className="grid gap-2 rounded-md border border-ink/10 bg-white p-2"
                aria-label="Main navigation"
              >
                {childModeActive ? (
                  <>
                    <Link
                      to="/child/today"
                      className="inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold text-ink/75 hover:bg-ink/5 [&.active]:bg-ink [&.active]:text-white"
                    >
                      <Home aria-hidden className="h-4 w-4" />
                      Today
                    </Link>
                    <Link
                      to="/child/chores"
                      className="inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold text-ink/75 hover:bg-ink/5 [&.active]:bg-ink [&.active]:text-white"
                    >
                      <ListChecks aria-hidden className="h-4 w-4" />
                      Chores
                    </Link>
                    <Link
                      to="/child/parent-unlock"
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-coral px-3 text-sm font-bold text-white hover:bg-coral/90"
                    >
                      Parent unlock
                    </Link>
                  </>
                ) : (
                  <>
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
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-coral px-3 text-sm font-bold text-white hover:bg-coral/90"
                    >
                      Child mode
                    </Link>
                  </>
                )}
              </nav>
            </div>
          ) : null}
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
