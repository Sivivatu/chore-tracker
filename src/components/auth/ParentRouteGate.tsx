import { Navigate, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { hasActiveChildSession, saveParentReturnPath } from "@/lib/child-session";

function ParentLockRedirect({ returnPath }: { returnPath: string }) {
  useEffect(() => {
    saveParentReturnPath(returnPath);
  }, [returnPath]);

  return <Navigate to="/child/parent-unlock" replace />;
}

export function ParentRouteGate() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const locked = hasActiveChildSession();

  if (locked) {
    return <ParentLockRedirect returnPath={`${pathname}${window.location.search}`} />;
  }

  return <Outlet />;
}
