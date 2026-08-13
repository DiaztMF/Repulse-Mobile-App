import { useState, Suspense } from "react";
import { Outlet } from "react-router-dom";
import { TabBar } from "./TabBar";
import { ActionSheet } from "./ActionSheet";
import { useSession } from "@/state/session";

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
        {/* Blank, not a spinner — DESIGN.md §8 bans circular spinners and
            §11 repeats it. These are local code-split chunks, so the gap
            is a frame or two; anything drawn in it is noise in a dark room. */}
        <Suspense fallback={null}>
          <Outlet />
        </Suspense>
      </main>
      {!isNight && <TabBar onAction={() => setSheet(true)} />}
      <ActionSheet open={sheet} onClose={() => setSheet(false)} />
    </div>
  );
}
