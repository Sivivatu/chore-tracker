import {
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
  Navigate,
} from "@tanstack/react-router";
import { AuthGate } from "@/components/auth/AuthGate";
import { ChildRouteGate } from "@/components/auth/ChildRouteGate";
import { ParentRouteGate } from "@/components/auth/ParentRouteGate";
import { AppLayout } from "@/components/layout/AppLayout";
import { SignInPage } from "@/routes/sign-in";
import { SignUpPage } from "@/routes/sign-up";
import { WaitlistPage } from "@/routes/waitlist";
import { ParentDashboardPage } from "@/routes/parent/dashboard";
import { ParentRoutinesPage } from "@/routes/parent/routines";
import { ParentApprovalsPage } from "@/routes/parent/approvals";
import { ParentChoresPage } from "@/routes/parent/chores";
import { ParentRewardsPage } from "@/routes/parent/rewards";
import { ParentPausesPage } from "@/routes/parent/pauses";
import { ParentSettingsPage } from "@/routes/parent/settings";
import { ChildUnlockPage } from "@/routes/child/unlock";
import { ChildParentUnlockPage } from "@/routes/child/parent-unlock";
import { ChildTodayPage } from "@/routes/child/today";
import { ChildChoresPage } from "@/routes/child/chores";
import { ChildRoutinePage } from "@/routes/child/routine";

const rootRoute = createRootRoute({
  component: () => (
    <AppLayout>
      <Outlet />
    </AppLayout>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: () => <Navigate to="/parent/dashboard" />,
});

const signInRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/sign-in",
  component: SignInPage,
});

const signInCallbackRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/sign-in/$",
  component: SignInPage,
});

const signUpRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/sign-up",
  component: SignUpPage,
});

const signUpCallbackRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/sign-up/$",
  component: SignUpPage,
});

const waitlistRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/waitlist",
  component: WaitlistPage,
});

const parentRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/parent",
  component: () => (
    <AuthGate>
      <ParentRouteGate />
    </AuthGate>
  ),
});

const childRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/child",
  component: () => <Outlet />,
});

const childSessionRoute = createRoute({
  getParentRoute: () => childRoute,
  id: "child-session",
  component: ChildRouteGate,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  signInRoute,
  signInCallbackRoute,
  signUpRoute,
  signUpCallbackRoute,
  waitlistRoute,
  parentRoute.addChildren([
    createRoute({
      getParentRoute: () => parentRoute,
      path: "/dashboard",
      component: ParentDashboardPage,
    }),
    createRoute({
      getParentRoute: () => parentRoute,
      path: "/routines",
      component: ParentRoutinesPage,
    }),
    createRoute({
      getParentRoute: () => parentRoute,
      path: "/approvals",
      component: ParentApprovalsPage,
    }),
    createRoute({
      getParentRoute: () => parentRoute,
      path: "/chores",
      component: ParentChoresPage,
    }),
    createRoute({
      getParentRoute: () => parentRoute,
      path: "/rewards",
      component: ParentRewardsPage,
    }),
    createRoute({
      getParentRoute: () => parentRoute,
      path: "/pauses",
      component: ParentPausesPage,
    }),
    createRoute({
      getParentRoute: () => parentRoute,
      path: "/settings",
      component: ParentSettingsPage,
    }),
  ]),
  childRoute.addChildren([
    createRoute({
      getParentRoute: () => childRoute,
      path: "/unlock",
      component: ChildUnlockPage,
    }),
    childSessionRoute.addChildren([
      createRoute({
        getParentRoute: () => childSessionRoute,
        path: "/parent-unlock",
        component: ChildParentUnlockPage,
      }),
      createRoute({
        getParentRoute: () => childSessionRoute,
        path: "/today",
        component: ChildTodayPage,
      }),
      createRoute({
        getParentRoute: () => childSessionRoute,
        path: "/chores",
        component: ChildChoresPage,
      }),
      createRoute({
        getParentRoute: () => childSessionRoute,
        path: "/routine/$routineInstanceId",
        component: ChildRoutinePage,
      }),
    ]),
  ]),
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
