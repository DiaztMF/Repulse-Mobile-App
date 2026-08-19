import { registerPlugin, type PermissionState } from "@capacitor/core";

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
  /**
   * Starts the foreground service. Safe to call twice.
   *
   * Asks for Nearby devices first: Android 14+ refuses a `connectedDevice`
   * service outright unless it is granted. `started: false` means the
   * person said no, and the night will not be held open — the one answer
   * this must never give silently.
   */
  start(options?: { title?: string; body?: string }): Promise<{ started: boolean }>;
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

  /**
   * Nearby devices — BLUETOOTH_CONNECT and BLUETOOTH_SCAN, declared as one
   * alias because Android asks for them in one dialog and there is no
   * useful state where the app holds one and not the other.
   *
   * Provided by Capacitor's own Plugin base class from the `permissions`
   * array on the Kotlin side; there is no method here to implement. `start`
   * asks for these itself, but O3 has to be able to ask before anything is
   * running, and to show the truth rather than a checkbox somebody ticked.
   */
  checkPermissions(): Promise<{ nearby: PermissionState }>;
  requestPermissions(): Promise<{ nearby: PermissionState }>;

  /**
   * O4. Only the manufacturer, and only for the wording.
   *
   * An earlier version also reported whether a vendor autostart screen
   * resolved, and that answer could not be trusted twice over: package
   * visibility hides those packages from us on Android 11+, and ColorOS 15
   * guards its startup manager with a signature permission no third-party
   * app can hold — the component resolves and still refuses to open.
   * Whether the step matters is a fact about the vendor, not about what we
   * are allowed to see.
   */
  autostart(): Promise<{ manufacturer: string }>;

  /**
   * Tries each known vendor autostart screen, then the app's own settings
   * page, which exists everywhere. `vendor` says which one it reached, and
   * the screen changes what it asks of the person accordingly — there is
   * no honest way to give directions without knowing where they landed.
   */
  openAutostart(): Promise<{ opened: boolean; vendor: boolean }>;
}

export const RepulseMonitor = registerPlugin<RepulseMonitorPlugin>("RepulseMonitor");
