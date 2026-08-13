import { Outlet } from "react-router-dom";
import { TabBar } from "./TabBar";
import { useSession } from "@/state/session";

/**
 * Owns the tab bar and nothing else. Headers belong to screens, because
 * a tab root and a detail view need different ones and stacking both is
 * the obvious failure.
 */
export function AppShell() {
  const { isNight } = useSession();

  return (
    <div className="min-h-full">
      <main className={isNight ? "" : "pb-28"}>
        <Outlet />
      </main>
      {!isNight && <TabBar />}
    </div>
  );
}
