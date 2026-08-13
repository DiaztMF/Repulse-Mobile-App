import { useState, Suspense } from "react";
import { Outlet } from "react-router-dom";
import { TabBar } from "./TabBar";
import { ActionSheet } from "./ActionSheet";
import { useSession } from "@/state/session";
import { BrandSpinner } from "@/components/brand/BrandSpinner";

/**
 * Owns the tab bar and nothing else. Headers belong to screens, because
 * a tab root and a detail view need different ones and stacking both is
 * the obvious failure.
 */
export function AppShell() {
  const { isNight } = useSession();
  const [sheet, setSheet] = useState(false);

  return (
    <div className="min-h-full">
      <main className={isNight ? "" : "pb-28"}>
        <Suspense fallback={<BrandSpinner size="fullscreen" label="LOADING..." />}>
          <Outlet />
        </Suspense>
      </main>
      {!isNight && <TabBar onAction={() => setSheet(true)} />}
      <ActionSheet open={sheet} onClose={() => setSheet(false)} />
    </div>
  );
}
