import { Navigate, Outlet } from "@tanstack/react-router";
import { readChildSession } from "@/lib/child-session";

export function ChildRouteGate() {
  if (!readChildSession()) {
    return <Navigate to="/child/unlock" replace />;
  }

  return <Outlet />;
}
