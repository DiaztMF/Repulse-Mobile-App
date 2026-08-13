import { Capacitor } from "@capacitor/core";
import { ForegroundService } from "@capawesome-team/capacitor-android-foreground-service";
import { BatteryOptimization } from "@capawesome-team/capacitor-android-battery-optimization";
import { get, ref, set } from "firebase/database";
import { rtdb } from "@/firebase/app";

/**
 * M0 — the architecture gate. PRD §3.5 and §14.
 *
 * The foreground service plugin states outright that it does not
 * guarantee JavaScript keeps running in the background; that is up to the
 * OS. This app's whole detection loop is JavaScript inside a WebView, so
 * "the service is alive" and "setInterval is still firing" are two
 * different claims and only the second one matters.
 *
 * This measures the second one. A tick every 30 seconds, written where it
 * survives the app being killed, so the morning after tells the truth
 * even if the process did not live to report it.
 *
 * Acceptance A1: an eight-hour run with the screen off and no gap longer
 * than 60 seconds. Anything worse and PRD §3 has to be reopened before
 * the detection loop is built on top of it.
 */

export const TICK_MS = 30_000;

/** A1's threshold. A gap wider than this is a failure, not a hiccup. */
export const MAX_GAP_MS = 60_000;

export type Run = {
  startedAt: number;
  ticks: number[];
};

export type Verdict = {
  ticks: number;
  /** Wall-clock span from first tick to last. */
  spanMs: number;
  worstGapMs: number;
  /** Every gap over the threshold, newest last. */
  breaks: { at: number; gapMs: number }[];
  passed: boolean;
};

/** Under `/live/{uid}` so the existing database rule already covers it —
 *  a gate check is not worth a rules migration. */
const runRef = (uid: string) => ref(rtdb!, `live/${uid}/m0`);

let timer: number | undefined;

/** Survives a reload of the page, which the overnight run should not have
 *  but might. Reading it is how the panel knows a run is in progress. */
const LOCAL_KEY = "m0.startedAt";

export function isRunning() {
  return timer !== undefined;
}

export function startedAt(): number | null {
  const v = localStorage.getItem(LOCAL_KEY);
  return v ? Number(v) : null;
}

/**
 * Asks for what Android needs, then starts ticking. Permissions are
 * requested rather than assumed: a run that dies at 03:00 because a
 * dialog was never shown proves nothing about the architecture.
 */
export async function start(uid: string) {
  if (!rtdb) throw new Error("Realtime Database is not configured");
  if (timer !== undefined) return;

  // On the web the plugins do not exist, and the answer there is already
  // known — a browser tab is not what we are asking about. The timer and
  // the writes still run, so the data path can be proven before a night
  // is spent on it.
  if (Capacitor.isNativePlatform()) {
    const { display } = await ForegroundService.requestPermissions();
    if (display !== "granted") {
      throw new Error(
        "Notifications were declined, and without them Android will not keep a foreground service alive.",
      );
    }

    // Doze is the thing being tested, so the exemption has to be in place
    // or the result only measures Doze.
    const { enabled } = await BatteryOptimization.isBatteryOptimizationEnabled();
    if (enabled) await BatteryOptimization.requestIgnoreBatteryOptimization();

    // No serviceType passed on purpose: the type comes from the manifest,
    // where it is `dataSync`. The plugin only exposes location and
    // microphone, and neither is what this is doing.
    await ForegroundService.startForegroundService({
      id: 4001,
      title: "RePulse background check",
      body: "Recording a tick every 30 seconds until morning.",
      // Ships with the generated project, so this needs no new asset. It
      // is a test harness notification; a proper monochrome glyph belongs
      // with the real service, not with the thing measuring whether the
      // real service is even possible.
      smallIcon: "ic_launcher_foreground",
    });
  }

  const begin = Date.now();
  localStorage.setItem(LOCAL_KEY, String(begin));
  await set(runRef(uid), { startedAt: begin, ticks: {} });

  const tick = () => {
    const now = Date.now();
    // Keyed by the tick's own time: a write that never lands leaves a
    // hole rather than overwriting the evidence of the one before it.
    void set(ref(rtdb!, `live/${uid}/m0/ticks/${now}`), now);
  };

  tick();
  timer = window.setInterval(tick, TICK_MS);
}

export async function stop() {
  if (timer !== undefined) {
    window.clearInterval(timer);
    timer = undefined;
  }
  localStorage.removeItem(LOCAL_KEY);
  if (!Capacitor.isNativePlatform()) return;
  await ForegroundService.stopForegroundService().catch(() => {
    // Already gone, or the OS took it — which is itself the result.
  });
}

/** Reads the run back and says whether A1 passed. */
export async function verdict(uid: string): Promise<Verdict | null> {
  if (!rtdb) return null;
  const snap = await get(runRef(uid));
  const run = snap.val() as { startedAt?: number; ticks?: Record<string, number> } | null;
  if (!run?.ticks) return null;

  const ticks = Object.values(run.ticks).sort((a, b) => a - b);
  if (ticks.length < 2) {
    return { ticks: ticks.length, spanMs: 0, worstGapMs: 0, breaks: [], passed: false };
  }

  const breaks: { at: number; gapMs: number }[] = [];
  let worst = 0;

  for (let i = 1; i < ticks.length; i++) {
    const gap = ticks[i]! - ticks[i - 1]!;
    if (gap > worst) worst = gap;
    if (gap > MAX_GAP_MS) breaks.push({ at: ticks[i - 1]!, gapMs: gap });
  }

  return {
    ticks: ticks.length,
    spanMs: ticks[ticks.length - 1]! - ticks[0]!,
    worstGapMs: worst,
    breaks,
    passed: breaks.length === 0,
  };
}

export async function clear(uid: string) {
  if (rtdb) await set(runRef(uid), null);
}
