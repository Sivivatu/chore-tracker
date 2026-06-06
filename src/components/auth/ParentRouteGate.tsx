import { Navigate, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { hasActiveChildSession, saveParentReturnPath } from "@/lib/child-session";

export function ParentRouteGate() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const locked = hasActiveChildSession();

  useEffect(() => {
    if (!locked) return;
    saveParentReturnPath(`${pathname}${window.location.search}`);
  }, [locked, pathname]);

  if (locked) {
    return <Navigate to="/child/parent-unlock" replace />;
  }

  return <Outlet />;
}
