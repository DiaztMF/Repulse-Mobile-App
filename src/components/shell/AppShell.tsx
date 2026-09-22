import { useState, Suspense, createContext, useContext } from "react";
import { Outlet } from "react-router-dom";
import { TabBar } from "./TabBar";
import { ActionSheet } from "./ActionSheet";
import { Drawer } from "./Drawer";
import { useNavigate } from "react-router-dom";
import { useMonitor } from "@/state/monitor";
import { LoadingScreen } from "@/components/ui/LoadingScreen";

const DrawerContext = createContext<{ openDrawer: () => void }>({ openDrawer: () => {} });
export const useDrawer = () => useContext(DrawerContext);

/**
 * The way out of a sounding alarm, from any screen in the app.
 *
 * The emergency screen comes to you once and is explicitly not allowed to
 * hold you there, so a person can walk off it with the siren still going
 * and no control anywhere in sight. That is the state to be in front of a
 * room full of judges with nothing to tap.
 *
 * Only ever visible while the machine is actually in an emergency, and it
 * does exactly what the SOS screen's own button does.
 */
function AlarmBar() {
  const { phase, standDown } = useMonitor();
  const navigate = useNavigate();
  if (phase !== "ALERT" && phase !== "SOS_SENT") return null;

  return (
    <div className="sticky top-0 z-40 flex items-center justify-between gap-3 bg-[var(--color-danger)] px-4 py-3 text-white">
      <span className="label">
        {phase === "SOS_SENT" ? "Alarm sounding" : "Checking on you"}
      </span>
      <button
        onClick={() => {
          standDown();
          navigate("/tonight", { replace: true });
        }}
        className="label shrink-0 rounded-[var(--radius-pill)] bg-white/20 px-4 py-2"
      >
        I am okay
      </button>
    </div>
  );
}

export function AppShell() {
  // Was a context with no provider, so this was permanently false and the
  // chrome never hid. It now follows the phase the machine is actually in.
  const { isNight } = useMonitor();
  const [sheet, setSheet] = useState(false);
  const [drawer, setDrawer] = useState(false);

  return (
    <DrawerContext.Provider value={{ openDrawer: () => setDrawer(true) }}>
      <div className="min-h-screen bg-[var(--color-base)] text-[var(--color-ivory)] transition-colors duration-200">
        <AlarmBar />
        <main className={isNight ? "" : "pb-28"}>
          <Suspense fallback={<LoadingScreen />}>
            <Outlet />
          </Suspense>
        </main>
        {!isNight && <TabBar onAction={() => setSheet(true)} />}
        <ActionSheet open={sheet} onClose={() => setSheet(false)} />
        <Drawer open={drawer} onClose={() => setDrawer(false)} />
      </div>
    </DrawerContext.Provider>
  );
}
