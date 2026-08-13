import { Outlet } from "react-router-dom";
import { Header } from "./Header";
import { TabBar } from "./TabBar";
import { useSession } from "@/state/session";

/**
 * While a sleep session runs the header and tab bar disappear entirely.
 * The screen is lit in a dark room and can be brushed by accident, so
 * only one action remains and it lives on the session screen itself.
 */
export function AppShell() {
  const { isNight, devices } = useSession();

  return (
    <div className="min-h-full">
      {!isNight && <Header devices={devices} />}
      <main className={isNight ? "" : "pb-28"}>
        <Outlet />
      </main>
      {!isNight && <TabBar />}
    </div>
  );
}
