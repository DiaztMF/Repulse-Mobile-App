import { useState, Suspense, createContext, useContext } from "react";
import { Outlet } from "react-router-dom";
import { TabBar } from "./TabBar";
import { ActionSheet } from "./ActionSheet";
import { Drawer } from "./Drawer";
import { useMonitor } from "@/state/monitor";
import { LoadingScreen } from "@/components/ui/LoadingScreen";

const DrawerContext = createContext<{ openDrawer: () => void }>({ openDrawer: () => {} });
export const useDrawer = () => useContext(DrawerContext);

export function AppShell() {
  // Was a context with no provider, so this was permanently false and the
  // chrome never hid. It now follows the phase the machine is actually in.
  const { isNight } = useMonitor();
  const [sheet, setSheet] = useState(false);
  const [drawer, setDrawer] = useState(false);

  return (
    <DrawerContext.Provider value={{ openDrawer: () => setDrawer(true) }}>
      <div className="min-h-screen bg-[var(--color-base)] text-[var(--color-ivory)] transition-colors duration-200">
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
