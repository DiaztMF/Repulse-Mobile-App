import { registerPlugin } from "@capacitor/core";

/**
 * The native half of the answer M0 forced.
 *
 * M0 measured a JavaScript timer inside the WebView across three nights.
 * The best run received 7 ticks of 511, and the ticks only ever arrived
 * while the screen was on. The process survived — a killed process could
 * not have resumed at all — so what stops is JavaScript execution while
 * the Activity is not visible. Anything that has to happen at 3am
 * therefore cannot be JavaScript.
 *
 * This plugin owns the two things that qualify:
 *
 *   1. Staying alive with the screen off, as a foreground service.
 *   2. Putting the ALERT screen in front of a sleeping person, over the
 *      lock screen, without anyone unlocking anything.
 *
 * It deliberately does NOT own detection. `BLE_GATT_CONTRACT.md` §3.5 and
 * PRD §4.1 put the escalation ladder inside the band's firmware precisely
 * so that a dead phone at 2am cannot switch off the feature that saves a
 * life. This is a mirror with a loud voice, not a second brain.
 */
export interface RepulseMonitorPlugin {
  /** Starts the foreground service. Safe to call twice. */
  start(options?: { title?: string; body?: string }): Promise<void>;
  stop(): Promise<void>;
  isRunning(): Promise<{ running: boolean }>;

  /**
   * Raises the full-screen alert: screen on, over the lock screen, at
   * alarm volume. This is what a stage-3 report from the band turns into
   * once the BLE half lands, and until then it is callable directly so
   * the path can be tested tonight rather than believed in.
   */
  raiseAlert(options: { stage: number; reason?: string }): Promise<void>;

  /** Stands the alert down without dismissing the service. */
  clearAlert(): Promise<void>;
}

export const RepulseMonitor = registerPlugin<RepulseMonitorPlugin>("RepulseMonitor");
