import { Navigate, Outlet } from "@tanstack/react-router";
import { hasActiveChildSession } from "@/lib/child-session";

export function ChildRouteGate() {
  if (!hasActiveChildSession()) {
    return <Navigate to="/child/unlock" replace />;
  }

  return <Outlet />;
}
