/**
 * The sunset's colour and starting brightness, and where that choice lives.
 *
 * Device-local, like the white noise level: it decides what this phone
 * asks the bedside for tonight, and nothing else depends on it. The lamp
 * always dims to dark from here — sleeping itself happens with it off,
 * PRD §4.4 — so this only chooses how the evening begins.
 */
const KEY = "repulse.sunset";

export type Sunset = {
  /** `#rrggbb`, straight from `<input type="color">`. */
  color: string;
  /** §4.3 wire brightness the sunset starts at. The firmware caps it at
   *  LED_MAX_BRIGHTNESS (100) to protect the supply, so 100 is the top. */
  brightness: number;
  /**
   * Whether "Start sleep" opens with the sunset or goes straight to dark.
   *
   * There used to be two buttons — Wind down and Start sleep — and nothing
   * on either of them said that only the second one recorded anything.
   * Someone winding down and falling asleep lost the night. One button and
   * this switch say the same thing without the trap.
   */
  startWithSunset: boolean;
  /**
   * §5.1. How long the lamp takes to reach dark, and therefore how long
   * WIND_DOWN lasts — it is sent to the bedside as `ramp_s` and used as
   * the timer that ends the sunset here. Two uses, one number, so it can
   * never be the case that the lamp is still dimming after the app has
   * decided the sunset is over.
   */
  rampS: number;
};

/** What the ramp was before it could be changed. */
export const SUNSET_RAMP_S = 1500;

/** Five minutes is the shortest that still reads as dimming rather than
 *  switching off; an hour is longer than anyone waits awake for a lamp. */
export const RAMP_LIMITS = { min: 300, max: 3600, step: 300 };

/** What the firmware drew before this was a setting — 2200 K with blue cut
 *  to 15% — so an app nobody has touched looks exactly as it always did. */
export const DEFAULT_SUNSET: Sunset = {
  color: "#ff9205",
  brightness: 40,
  startWithSunset: true,
  rampS: SUNSET_RAMP_S,
};

const HEX = /^#[0-9a-f]{6}$/i;

/* A stored zero would end WIND_DOWN on the same tick it started and send
 * the bedside a ramp of nothing — the lamp would snap off instead of
 * fading, which is the one thing the sunset exists to avoid. */
const ramp = (n: number) =>
  Number.isFinite(n) && n >= RAMP_LIMITS.min && n <= RAMP_LIMITS.max
    ? Math.round(n)
    : SUNSET_RAMP_S;

export function readSunset(): Sunset {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? "null") as Partial<Sunset> | null;
    const b = Number(s?.brightness);
    return {
      color:
        typeof s?.color === "string" && HEX.test(s.color)
          ? s.color.toLowerCase()
          : DEFAULT_SUNSET.color,
      brightness: Number.isInteger(b) && b >= 1 && b <= 100 ? b : DEFAULT_SUNSET.brightness,
      // Only an explicit false turns it off, so a setting saved before this
      // existed keeps the sunset it already had.
      startWithSunset: s?.startWithSunset !== false,
      rampS: ramp(Number(s?.rampS)),
    };
  } catch {
    return DEFAULT_SUNSET;
  }
}

export function writeSunset(s: Sunset) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // Storage refused. The default amber still works.
  }
}

/** `#rrggbb` → §4.3 `light.rgb`. */
export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * A point on the colour wheel → `#rrggbb`. `h` is degrees clockwise from
 * 12 o'clock, `s` is 0 at the white centre to 1 at the edge. Always full
 * value: how bright the lamp is belongs to the brightness slider, not to
 * the colour it is sent.
 */
export function hsToHex(h: number, s: number): string {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return 1 - s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  const byte = (x: number) => Math.round(x * 255).toString(16).padStart(2, "0");
  return `#${byte(f(5))}${byte(f(3))}${byte(f(1))}`;
}

/** Where a colour sits on the wheel, so the dot can be drawn back from it. */
export function hexToHs(hex: string): { h: number; s: number } {
  const [r, g, b] = hexToRgb(hex);
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  let h = 0;
  if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, s: max === 0 ? 0 : d / max };
}
