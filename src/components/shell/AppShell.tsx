import { useState, Suspense, createContext, useContext } from "react";
import { Outlet } from "react-router-dom";
import { TabBar } from "./TabBar";
import { ActionSheet } from "./ActionSheet";
import { Drawer } from "./Drawer";
import { useSession } from "@/state/session";
import { LoadingScreen } from "@/components/ui/LoadingScreen";

const DrawerContext = createContext<{ openDrawer: () => void }>({ openDrawer: () => {} });
export const useDrawer = () => useContext(DrawerContext);

export function AppShell() {
  const { isNight } = useSession();
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
