import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppShell } from "@/components/shell/AppShell";
import { Placeholder } from "@/screens/Placeholder";
import { KitchenSink } from "@/screens/KitchenSink";
import { Splash } from "@/screens/onboarding/Splash";
import { SignIn } from "@/screens/onboarding/SignIn";
import { Permissions } from "@/screens/onboarding/Permissions";
import { Autostart } from "@/screens/onboarding/Autostart";
import { SetupGuide } from "@/screens/onboarding/SetupGuide";
import { PairTrouble } from "@/screens/onboarding/PairTrouble";
import { PairBand } from "@/screens/onboarding/PairBand";
import { PairBedside } from "@/screens/onboarding/PairBedside";
import { Calibration } from "@/screens/onboarding/Calibration";
import { Contacts } from "@/screens/onboarding/Contacts";
import { Ready } from "@/screens/onboarding/Ready";
import { Home } from "@/screens/home/Home";
import { Session } from "@/screens/home/Session";
import { Vital } from "@/screens/vitals/Vital";
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
  { path: "/permissions/autostart", element: <Autostart /> },
  { path: "/setup-guide", element: <SetupGuide /> },
  { path: "/pair/band", element: <PairBand /> },
  { path: "/pair/bedside", element: <PairBedside /> },
  { path: "/pair/:device/trouble", element: <PairTrouble /> },
  { path: "/calibration", element: <Calibration /> },
  { path: "/contacts", element: <Contacts /> },
  { path: "/ready", element: <Ready /> },

  // Owns the whole screen while a session runs — no header, no tab bar.
  { path: "/tonight/session", element: <Session /> },

  // Three tabs — inside the shell
  {
    element: <AppShell />,
    children: [
      { path: "/tonight", element: <Home /> },

      { path: "/vitals", element: <Navigate to="/vitals/pulse" replace /> },
      { path: "/vitals/:metric", element: <Vital /> },

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
