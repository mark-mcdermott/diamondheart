import { lazy, Suspense, useEffect, type ComponentType } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, MemoryRouter, Route, Routes, useNavigate } from "react-router";
import { ApiError } from "./api";
import { AppShell } from "./AppShell";
import { NATIVE } from "./platform";
import { isAppletPath } from "./paths";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * The applet: one `client:only` island holding the whole signed-in app
 * (docs/PORT-PLAN.md, Phase 4). Every section page mounts this same root, so
 * moving between sections is a client-side route change, and a link out to a
 * public page is a full navigation (see `link.tsx`).
 *
 * One QueryClient, created once at module level (Decision 5): `networkMode:
 * "always"` because Capacitor webviews lie about `navigator.onLine`, a 4xx is
 * never retried, and nothing is persisted, since this is health, medical and
 * financial data on a device that may be shared.
 */

function retry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.status < 500) return false;
  return failureCount < 1;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, networkMode: "always", retry },
    mutations: { networkMode: "always", retry: false },
  },
});

/** `lazy()` wants a default export; the route modules use named ones. */
const page = <T,>(loader: () => Promise<T>, name: { [K in keyof T]: T[K] extends ComponentType ? K : never }[keyof T]) =>
  lazy(() => loader().then((module) => ({ default: module[name] as ComponentType })));

const DashboardRoute = page(() => import("./routes/dashboard"), "DashboardRoute");
const MetricsRoute = page(() => import("./routes/metrics"), "MetricsRoute");
const MetricDetailRoute = page(() => import("./routes/metrics"), "MetricDetailRoute");
const MetricEditRoute = page(() => import("./routes/metrics"), "MetricEditRoute");
const EntryRoute = page(() => import("./routes/entry"), "EntryRoute");
const FoodRoute = page(() => import("./routes/food"), "FoodRoute");
const SettingsRoute = page(() => import("./routes/settings"), "SettingsRoute");
const AccountRoute = page(() => import("./routes/account"), "AccountRoute");
const IntegrationsRoute = page(() => import("./routes/account"), "IntegrationsRoute");
const RemindersRoute = page(() => import("./routes/account"), "RemindersRoute");
const MeditateRoute = page(() => import("./routes/meditate"), "MeditateRoute");
const MeditateEditRoute = page(() => import("./routes/meditate"), "MeditateEditRoute");
const TrackingRoute = page(() => import("./routes/tracking"), "TrackingRoute");
const MedicalRoute = page(() => import("./routes/medical"), "MedicalRoute");
const AppointmentsRoute = page(() => import("./routes/appointments"), "AppointmentsRoute");
const EntertainmentRoute = page(() => import("./routes/entertainment"), "EntertainmentRoute");
const WorkoutRoute = page(() => import("./routes/workout"), "WorkoutRoute");
const RecordsRoute = page(() => import("./routes/workout"), "RecordsRoute");
const FinancesRoute = page(() => import("./routes/finances"), "FinancesRoute");
const FinanceAccountsRoute = page(() => import("./routes/finances"), "FinanceAccountsRoute");
const FinanceTransactionsRoute = page(() => import("./routes/finances"), "FinanceTransactionsRoute");
const FinanceBudgetsRoute = page(() => import("./routes/finances"), "FinanceBudgetsRoute");
const FinanceInvestmentsRoute = page(() => import("./routes/finances"), "FinanceInvestmentsRoute");
const FinanceRetirementRoute = page(() => import("./routes/finances"), "FinanceRetirementRoute");
const FinancePropertyRoute = page(() => import("./routes/finances"), "FinancePropertyRoute");
const FinanceImportRoute = page(() => import("./routes/finances"), "FinanceImportRoute");
const FeedRoute = page(() => import("./routes/feed"), "FeedRoute");
const NotificationsRoute = page(() => import("./routes/notifications"), "NotificationsRoute");
const NotFoundRoute = page(() => import("./routes/not-found"), "NotFoundRoute");

function PageSkeleton() {
  return (
    <div className="max-w-3xl mx-auto" aria-busy="true" aria-label="Loading">
      <div className="flex items-center gap-4 mb-8">
        <Skeleton className="w-5 h-5 rounded" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-7 w-40 rounded-lg" />
          <Skeleton className="h-3.5 w-64" />
        </div>
      </div>
      <Skeleton className="h-48 rounded-2xl mb-6" />
      <Skeleton className="h-24 rounded-2xl" />
    </div>
  );
}

/**
 * A deep link into the bundle (`https://www.diamondheart.app/<section>`)
 * becomes a route change in the memory history.
 */
function DeepLinks() {
  const navigate = useNavigate();
  useEffect(() => {
    if (!NATIVE) return;
    let remove: (() => void) | undefined;
    void import("@capacitor/app").then(({ App }) =>
      App.addListener("appUrlOpen", ({ url }) => {
        const { pathname, search } = new URL(url);
        if (isAppletPath(pathname)) navigate(pathname + search);
      }).then((handle) => {
        remove = () => void handle.remove();
      })
    );
    return () => remove?.();
  }, [navigate]);
  return null;
}

interface AppRootProps {
  /** The bundle has no URL bar: memory history, starting at the dashboard. */
  router?: "browser" | "memory";
  /** The bundle's way out when the session is gone; the web build navigates to sign in. */
  onSignedOut?: () => void;
}

export function AppRoot({ router = "browser", onSignedOut }: AppRootProps) {
  const Router = router === "memory" ? MemoryRouter : BrowserRouter;
  return (
    <QueryClientProvider client={queryClient}>
      <Router {...(router === "memory" ? { initialEntries: ["/dashboard"] } : {})}>
        <DeepLinks />
        <AppShell onSignedOut={onSignedOut}>
          <Suspense fallback={<PageSkeleton />}>
            <Routes>
              <Route path="/dashboard" element={<DashboardRoute />} />
              <Route path="/metrics" element={<MetricsRoute />} />
              <Route path="/metrics/:id" element={<MetricDetailRoute />} />
              <Route path="/metrics/:id/edit" element={<MetricEditRoute />} />
              <Route path="/entry" element={<EntryRoute />} />
              <Route path="/food" element={<FoodRoute />} />
              <Route path="/settings" element={<SettingsRoute />} />
              <Route path="/account" element={<AccountRoute />} />
              <Route path="/account/integrations" element={<IntegrationsRoute />} />
              <Route path="/account/reminders" element={<RemindersRoute />} />
              <Route path="/meditate" element={<MeditateRoute />} />
              <Route path="/meditate/edit" element={<MeditateEditRoute />} />
              <Route path="/tracking" element={<TrackingRoute />} />
              <Route path="/medical" element={<MedicalRoute />} />
              <Route path="/appointments" element={<AppointmentsRoute />} />
              <Route path="/entertainment" element={<EntertainmentRoute />} />
              <Route path="/workout" element={<WorkoutRoute />} />
              <Route path="/records" element={<RecordsRoute />} />
              <Route path="/finances" element={<FinancesRoute />} />
              <Route path="/finances/accounts" element={<FinanceAccountsRoute />} />
              <Route path="/finances/transactions" element={<FinanceTransactionsRoute />} />
              <Route path="/finances/budgets" element={<FinanceBudgetsRoute />} />
              <Route path="/finances/investments" element={<FinanceInvestmentsRoute />} />
              <Route path="/finances/retirement" element={<FinanceRetirementRoute />} />
              <Route path="/finances/property" element={<FinancePropertyRoute />} />
              <Route path="/finances/import" element={<FinanceImportRoute />} />
              <Route path="/feed" element={<FeedRoute />} />
              <Route path="/notifications" element={<NotificationsRoute />} />
              <Route path="*" element={<NotFoundRoute />} />
            </Routes>
          </Suspense>
        </AppShell>
      </Router>
    </QueryClientProvider>
  );
}
