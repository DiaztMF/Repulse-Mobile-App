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
};

/** What the firmware drew before this was a setting — 2200 K with blue cut
 *  to 15% — so an app nobody has touched looks exactly as it always did. */
export const DEFAULT_SUNSET: Sunset = { color: "#ff9205", brightness: 40 };

const HEX = /^#[0-9a-f]{6}$/i;

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
