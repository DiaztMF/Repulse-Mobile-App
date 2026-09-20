import { useRef, useState } from "react";
import {
  DEFAULT_SUNSET,
  hexToHs,
  hexToRgb,
  hsToHex,
  readSunset,
  SUNSET_RAMP_S,
  writeSunset,
  type Sunset,
} from "@/lib/sunset";

const STEP: Record<string, [number, number]> = {
  ArrowRight: [5, 0],
  ArrowLeft: [-5, 0],
  ArrowUp: [0, 0.05],
  ArrowDown: [0, -0.05],
};

/**
 * Hue round the edge, white in the middle: the angle picks the colour and
 * the distance from the centre how strong it is. Brightness is not on the
 * wheel — the lamp has its own slider — so every point here is a colour at
 * full strength, which is exactly what `light.rgb` carries.
 *
 * `onChange` follows the finger; `onCommit` saves once it lifts, so a drag
 * across the wheel is one write rather than a hundred.
 */
function ColorWheel({
  value,
  onChange,
  onCommit,
}: {
  value: string;
  onChange: (hex: string) => void;
  onCommit: (hex: string) => void;
}) {
  const { h, s } = hexToHs(value);
  const dragging = useRef(false);

  const pick = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    // Clockwise from 12 o'clock, the way conic-gradient draws it.
    const hue = ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360;
    const hex = hsToHex(hue, Math.min(1, Math.hypot(dx, dy) / (r.width / 2)));
    onChange(hex);
    return hex;
  };

  const rad = (h * Math.PI) / 180;

  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label="Sunset colour wheel. Arrow keys change hue and strength."
      aria-valuetext={value}
      onKeyDown={(e) => {
        const step = STEP[e.key];
        if (!step) return;
        e.preventDefault();
        const hex = hsToHex((h + step[0] + 360) % 360, Math.min(1, Math.max(0, s + step[1])));
        onChange(hex);
        onCommit(hex);
      }}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        dragging.current = true;
        pick(e);
      }}
      onPointerMove={(e) => {
        if (dragging.current) pick(e);
      }}
      onPointerUp={(e) => {
        dragging.current = false;
        onCommit(pick(e));
      }}
      onPointerCancel={() => {
        dragging.current = false;
        onCommit(value);
      }}
      className="relative mx-auto aspect-square w-full max-w-[240px] touch-none rounded-full outline-offset-4"
      style={{
        // White fading out over the hue ring is exactly full-value HSV: the
        // mix of white and a pure hue at saturation s.
        background:
          "radial-gradient(closest-side, #fff, rgb(255 255 255 / 0)), conic-gradient(red, yellow, lime, aqua, blue, magenta, red)",
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute size-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white shadow-[0_0_0_1px_rgb(0_0_0/0.4),0_2px_6px_rgb(0_0_0/0.5)]"
        style={{
          left: `${50 + Math.sin(rad) * s * 50}%`,
          top: `${50 - Math.cos(rad) * s * 50}%`,
          background: value,
        }}
      />
    </div>
  );
}

/**
 * The sunset's colour and starting brightness, saved as the default.
 *
 * One component for Settings and the test panel, so both edit the same
 * stored value — a colour tried on the bench is the colour the night uses.
 * `wire` adds what is actually sent, which only the test panel wants.
 */
export function SunsetControls({ wire }: { wire?: boolean }) {
  const [sunset, setSunset] = useState<Sunset>(readSunset);
  const save = (s: Sunset) => {
    setSunset(s);
    writeSunset(s);
  };

  return (
    <>
      {/* The switch that decides what "Start sleep" does. It sits above the
          colour because it is the one that can make the rest moot. */}
      <label className="flex items-start justify-between gap-4 py-4">
        <span className="min-w-0">
          <span className="block">Start with the sunset</span>
          <span className="mt-0.5 block text-[length:var(--text-meta)] text-[var(--color-ash)]">
            Start sleep opens with {Math.round(SUNSET_RAMP_S / 60)} minutes of dimming light.
            Off goes straight to dark. Either way the night is recorded from the tap.
          </span>
        </span>
        <input
          type="checkbox"
          checked={sunset.startWithSunset}
          onChange={(e) => save({ ...sunset, startWithSunset: e.target.checked })}
          className="mt-1 size-5 shrink-0 accent-[var(--color-pulse)]"
        />
      </label>

      {/* Drawn exactly as picked — the firmware no longer cuts the blue
          when a colour is sent, so the warning has to live here. */}
      <div className="py-4">
        <div className="flex items-start justify-between gap-4">
          <span className="min-w-0">
            <span className="block">Sunset colour</span>
            <span className="mt-0.5 block text-[length:var(--text-meta)] text-[var(--color-ash)]">
              Tap or drag on the wheel. Warm colours help you fall asleep; blue or white light
              before bed keeps you awake.
            </span>
          </span>
          <span
            aria-hidden
            className="mt-1 size-8 shrink-0 rounded-full border border-[var(--color-ash-dim)]"
            style={{ background: sunset.color }}
          />
        </div>
        <div className="mt-5">
          <ColorWheel
            value={sunset.color}
            onChange={(color) => setSunset((s) => ({ ...s, color }))}
            onCommit={(color) => save({ ...sunset, color })}
          />
        </div>
        {sunset.color !== DEFAULT_SUNSET.color && (
          <button
            onClick={() => save({ ...sunset, color: DEFAULT_SUNSET.color })}
            className="label mx-auto mt-4 block text-[var(--color-pulse)]"
          >
            Reset to amber
          </button>
        )}
      </div>
      <div className="py-4">
        <div className="flex items-baseline justify-between gap-4">
          <span>Sunset brightness</span>
          <span className="num text-[var(--color-ash)]">{sunset.brightness}%</span>
        </div>
        <input
          type="range"
          min={5}
          max={100}
          step={5}
          aria-label="Sunset brightness"
          value={sunset.brightness}
          onChange={(e) => save({ ...sunset, brightness: Number(e.target.value) })}
          className="mt-3 w-full accent-[var(--color-pulse)]"
        />
        <span className="mt-1 block text-[length:var(--text-meta)] text-[var(--color-ash)]">
          Where the lamp starts. It always dims to dark before you sleep.
        </span>
        {wire && (
          <span className="num mt-1 block text-[length:var(--text-meta)] text-[var(--color-ash-dim)]">
            sends rgb [{hexToRgb(sunset.color).join(", ")}] · brightness {sunset.brightness}
          </span>
        )}
      </div>
    </>
  );
}
