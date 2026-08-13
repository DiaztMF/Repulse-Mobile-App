import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppShell } from "@/components/shell/AppShell";
import { Placeholder } from "@/screens/Placeholder";
import { KitchenSink } from "@/screens/KitchenSink";
import { Splash } from "@/screens/onboarding/Splash";
import { SignIn } from "@/screens/onboarding/SignIn";
import { Permissions } from "@/screens/onboarding/Permissions";
import { Wordmark } from "@/components/brand/Wordmark";

/**
 * Every screen gets its route up front, even unbuilt ones — adding
 * routes later means rearranging navigation later.
 * Screen codes (O1, M1, V2, ...) match the spec.
 */
export const router = createBrowserRouter([
  // Onboarding — outside the shell, no tab bar
  { path: "/", element: <Splash /> },
  { path: "/brand", element: <Wordmark /> },
  { path: "/sign-in", element: <SignIn /> },
  { path: "/permissions", element: <Permissions /> },
  { path: "/permissions/autostart", element: <Placeholder code="O4" name="Autostart permission" /> },
  { path: "/setup-guide", element: <Placeholder code="O5" name="Setup guide" /> },
  { path: "/pair/band", element: <Placeholder code="O6" name="Pair band" /> },
  { path: "/pair/bedside", element: <Placeholder code="O7" name="Pair bedside" /> },
  { path: "/calibration", element: <Placeholder code="O8" name="Baseline calibration" /> },
  { path: "/contacts", element: <Placeholder code="O9 · D3" name="Emergency contacts" /> },
  { path: "/ready", element: <Placeholder code="O10" name="Ready" /> },

  // Three tabs — inside the shell
  {
    element: <AppShell />,
    children: [
      { path: "/tonight", element: <Placeholder code="M1" name="Home" /> },
      { path: "/tonight/session", element: <Placeholder code="M2" name="Active session" /> },

      { path: "/vitals", element: <Navigate to="/vitals/pulse" replace /> },
      { path: "/vitals/sleep", element: <Placeholder code="V1" name="Sleep Score" /> },
      { path: "/vitals/pulse", element: <Placeholder code="V2" name="Pulse" /> },
      { path: "/vitals/breathing", element: <Placeholder code="V3" name="Breathing" /> },
      { path: "/vitals/movement", element: <Placeholder code="V4" name="Movement & position" /> },
      { path: "/vitals/room", element: <Placeholder code="V5" name="Room" /> },

      { path: "/health", element: <Placeholder code="S1" name="History" /> },
      { path: "/health/night/:date", element: <Placeholder code="S2" name="Night detail" /> },
      { path: "/health/breathing", element: <Placeholder code="S3" name="Breathing trend" /> },
      { path: "/health/insights", element: <Placeholder code="S4" name="Intervention insights" /> },

      { path: "/settings", element: <Placeholder code="D1" name="Settings" /> },
      { path: "/devices", element: <Placeholder code="D2" name="Devices & battery" /> },
      { path: "/test-panel", element: <Placeholder code="D4" name="Test panel" /> },
      { path: "/family", element: <Placeholder code="D5" name="Family — manage" /> },
      { path: "/export", element: <Placeholder code="D6" name="Export" /> },
      { path: "/ecg", element: <Placeholder code="D7" name="Record ECG" /> },

      // Token check page. Drop before shipping.
      { path: "/kitchen-sink", element: <KitchenSink /> },
    ],
  },

  // Outside navigation — takes over the screen
  { path: "/alert", element: <Placeholder code="X1" name="ALERT" /> },
  { path: "/sos", element: <Placeholder code="X2" name="SOS" /> },
  { path: "/family/view", element: <Placeholder code="X4" name="Family — viewer" /> },
  { path: "/emergency/watched", element: <Placeholder code="X5" name="Watched person emergency" /> },

  { path: "*", element: <Navigate to="/tonight" replace /> },
]);
