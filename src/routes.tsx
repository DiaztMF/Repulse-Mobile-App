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
import { Health } from "@/screens/health/Health";
import { NightDetail } from "@/screens/health/NightDetail";
import { BreathingTrend } from "@/screens/health/BreathingTrend";
import { Insights } from "@/screens/health/Insights";
import { SettingsScreen } from "@/screens/settings/Settings";
import { Devices } from "@/screens/settings/Devices";
import { TestPanel } from "@/screens/settings/TestPanel";
import { Family } from "@/screens/settings/Family";
import { Export } from "@/screens/settings/Export";
import { Ecg } from "@/screens/settings/Ecg";
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

      { path: "/health", element: <Health /> },
      { path: "/health/night/:date", element: <NightDetail /> },
      { path: "/health/breathing", element: <BreathingTrend /> },
      { path: "/health/insights", element: <Insights /> },

      { path: "/settings", element: <SettingsScreen /> },
      { path: "/devices", element: <Devices /> },
      { path: "/test-panel", element: <TestPanel /> },
      { path: "/family", element: <Family /> },
      { path: "/export", element: <Export /> },
      { path: "/ecg", element: <Ecg /> },

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
