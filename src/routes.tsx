import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppShell } from "@/components/shell/AppShell";
import { OnboardingProgress } from "@/components/shell/OnboardingProgress";
import { RequireAuth } from "@/firebase/auth";
import { Splash } from "@/screens/onboarding/Splash";
import { Home } from "@/screens/home/Home";
import { Wordmark } from "@/components/brand/Wordmark";
import { RouteErrorBoundary } from "@/components/ui/ErrorBoundary";
import { EscalationRoute } from "@/state/monitor";

/**
 * Helper to dynamically load route components (code-splitting)
 * while handling named exports from screen modules and auto-reloading
 * if a deployment rendered old chunk hashes stale.
 */
function lazyRoute<T extends Record<string, any>>(
  factory: () => Promise<T>,
  exportName: keyof T
) {
  return async () => {
    try {
      const module = await factory();
      // Cleared on success, or the one retry is spent for the whole
      // session and the next real deploy shows the error screen instead.
      sessionStorage.removeItem("chunk_retry");
      return { Component: module[exportName] };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isChunkError =
        msg.includes("Failed to fetch dynamically imported module") ||
        msg.includes("Importing a module script failed");

      if (isChunkError && !sessionStorage.getItem("chunk_retry")) {
        sessionStorage.setItem("chunk_retry", "true");
        window.location.reload();
      }
      throw err;
    }
  };
}

/**
 * Routes with code-splitting. Critical entry points (Splash, Home, Wordmark)
 * remain eagerly imported for zero latency on cold start. All secondary screens
 * are loaded lazily on demand.
 */
export const router = createBrowserRouter([
  {
    errorElement: <RouteErrorBoundary />,
    // Wraps everything so the ladder can take over from any screen.
    element: <EscalationRoute />,
    children: [
      // Onboarding & Dev Tools — outside the shell, no tab bar
      { path: "/", element: <Splash /> },
      { path: "/brand", element: <Wordmark /> },
      { path: "/kitchen-sink", lazy: lazyRoute(() => import("@/screens/KitchenSink"), "KitchenSink") },
      { path: "/sign-in", lazy: lazyRoute(() => import("@/screens/onboarding/SignIn"), "SignIn") },

  // Wrapped so the step reached is recorded once, in one place, instead
  // of beside every forward button on every screen below.
  {
    element: <OnboardingProgress />,
    children: [
      { path: "/permissions", lazy: lazyRoute(() => import("@/screens/onboarding/Permissions"), "Permissions") },
      { path: "/permissions/autostart", lazy: lazyRoute(() => import("@/screens/onboarding/Autostart"), "Autostart") },
      { path: "/setup-guide", lazy: lazyRoute(() => import("@/screens/onboarding/SetupGuide"), "SetupGuide") },
      { path: "/pair/band", lazy: lazyRoute(() => import("@/screens/onboarding/PairBand"), "PairBand") },
      { path: "/pair/bedside", lazy: lazyRoute(() => import("@/screens/onboarding/PairBedside"), "PairBedside") },
      { path: "/pair/:device/trouble", lazy: lazyRoute(() => import("@/screens/onboarding/PairTrouble"), "PairTrouble") },
      { path: "/calibration", lazy: lazyRoute(() => import("@/screens/onboarding/Calibration"), "Calibration") },
      { path: "/onboarding/contacts", lazy: lazyRoute(() => import("@/screens/onboarding/Contacts"), "Contacts") },
      { path: "/ready", lazy: lazyRoute(() => import("@/screens/onboarding/Ready"), "Ready") },
    ],
  },

  // Owns the whole screen while a session runs — no header, no tab bar.
  { path: "/tonight/session", lazy: lazyRoute(() => import("@/screens/home/Session"), "Session") },

  // Three tabs — inside the shell. Everything here needs a session; the
  // emergency routes below deliberately do not. PRD §10.2a.
  {
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [
      { path: "/tonight", element: <Home /> },

      { path: "/vitals", element: <Navigate to="/vitals/pulse" replace /> },
      { path: "/vitals/:metric", lazy: lazyRoute(() => import("@/screens/vitals/Vital"), "Vital") },

      { path: "/health", lazy: lazyRoute(() => import("@/screens/health/Health"), "Health") },
      { path: "/health/night/:date", lazy: lazyRoute(() => import("@/screens/health/NightDetail"), "NightDetail") },
      { path: "/health/breathing", lazy: lazyRoute(() => import("@/screens/health/BreathingTrend"), "BreathingTrend") },
      { path: "/health/insights", lazy: lazyRoute(() => import("@/screens/health/Insights"), "Insights") },

      { path: "/settings", lazy: lazyRoute(() => import("@/screens/settings/Settings"), "SettingsScreen") },
      { path: "/devices", lazy: lazyRoute(() => import("@/screens/settings/Devices"), "Devices") },
      { path: "/contacts", lazy: lazyRoute(() => import("@/screens/onboarding/Contacts"), "Contacts") },
      { path: "/test-panel", lazy: lazyRoute(() => import("@/screens/settings/TestPanel"), "TestPanel") },
      { path: "/conformance", lazy: lazyRoute(() => import("@/screens/settings/Conformance"), "Conformance") },
      { path: "/export", lazy: lazyRoute(() => import("@/screens/settings/Export"), "Export") },
    ],
  },

  // Outside navigation — takes over the screen
  { path: "/alert", lazy: lazyRoute(() => import("@/screens/emergency/Alert"), "Alert") },
  { path: "/sos", lazy: lazyRoute(() => import("@/screens/emergency/Sos"), "Sos") },

  { path: "*", element: <Navigate to="/tonight" replace /> },
    ],
  },
]);

