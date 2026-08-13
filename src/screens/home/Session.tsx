import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check } from "lucide-react";
import { EcgTrace } from "@/components/home/EcgTrace";
import { SampleBadge } from "@/components/shell/SampleBadge";
import { useLastNight } from "@/data/store";

type State = "monitoring" | "wind_down" | "comfort" | "wake_window" | "offline";

/** Same frame throughout; only the status line and the card change. A
 *  different layout per state would make a half-asleep user re-read the
 *  screen every time. */
const STATUS: Record<State, string> = {
  monitoring: "Monitoring · 3h 44m",
  wind_down: "Dimming · 18 min left",
  comfort: "Settling · white noise",
  wake_window: "Waiting for light sleep",
  offline: "Band disconnected",
};

const IDLE_MS = 30_000;
/** Not black. The screen must stay on for the foreground service, but it
 *  must not light the room — that would fight the product's whole point. */
const DIM = 0.85;

export function Session() {
  const navigate = useNavigate();
  const night = useLastNight();
  const [state] = useState<State>("monitoring");
  const [dim, setDim] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const press = useRef<number | undefined>(undefined);

  // Night tokens: text, accent and surfaces all step down together.
  // The status bar comes too — it is painted by the OS from the meta tag,
  // so a light-mode user would otherwise sleep beside a linen strip all
  // night. ThemeProvider repaints it on the way out.
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    const was = meta?.getAttribute("content");
    document.documentElement.dataset.night = "true";
    meta?.setAttribute("content", "#100D0A");
    return () => {
      document.documentElement.dataset.night = "false";
      if (was) meta?.setAttribute("content", was);
    };
  }, []);

  useEffect(() => {
    let t: number;
    const arm = () => {
      window.clearTimeout(t);
      setDim(false);
      t = window.setTimeout(() => setDim(true), IDLE_MS);
    };
    arm();
    window.addEventListener("pointerdown", arm);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("pointerdown", arm);
    };
  }, []);

  const latest = night.events.find((e) => e.type === "comfort");

  return (
    <div className="relative min-h-screen bg-[var(--color-base)] px-5 pb-8">
      {/* This screen owns the display, so it carries the badge itself —
          the two headers that normally do it are gone here, and DESIGN §12
          requires it on every screen while the mock layer is on. It is the
          screen showing the most invented numbers in the app. */}
      <SampleBadge />

      {/* Long-press the clock for the test panel. Invisible to a normal
          user, always reachable during a demo — the tab bar is gone and
          the escalation ladder has to be triggerable from here. */}
      <button
        onPointerDown={() => {
          press.current = window.setTimeout(() => navigate("/test-panel"), 2000);
        }}
        onPointerUp={() => window.clearTimeout(press.current)}
        onPointerLeave={() => window.clearTimeout(press.current)}
        className="num block py-4 pt-[calc(env(safe-area-inset-top)+1rem)] text-[length:var(--text-card)] text-[var(--color-ash)]"
      >
        02:14
      </button>

      <p className="label mt-6 text-[var(--color-ivory)]">{STATUS[state]}</p>

      {/* Left-aligned number with the trace flowing right, the way a
          bedside monitor reads. A ring here would be the template
          answer and the wrong convention. */}
      <div className="mt-8 flex items-end gap-5">
        <div>
          <p className="num text-[length:var(--text-hero)] leading-none">58</p>
          <p className="label mt-1 text-[var(--color-ash)]">bpm</p>
        </div>
        <div className="mb-2 min-w-0 flex-1">
          <EcgTrace />
        </div>
      </div>

      <p className="mt-6 text-[var(--color-ash)]">
        Deep sleep · SpO₂ {night.breathing.spo2DeltaPct}% from baseline
      </p>

      {latest && (
        <div className="mt-10 rounded-[var(--radius-card)] bg-[var(--color-surface)] p-5">
          <p className="num text-[length:var(--text-meta)] text-[var(--color-ash)]">
            01:20
          </p>
          <p className="mt-2">{latest.title}</p>
          {latest.settleSec != null && (
            <p className="mt-2 flex items-center gap-2 text-[length:var(--text-meta)] text-[var(--color-pulse)]">
              <Check className="size-3.5" strokeWidth={2.5} />
              settled in {Math.floor(latest.settleSec / 60)}m {latest.settleSec % 60}s
            </p>
          )}
        </div>
      )}

      <div className="mt-10 flex divide-x divide-[var(--color-ash-dim)]/30">
        {[
          [`${night.room.tempC}°`, "Temp"],
          [`${night.room.rh}%`, "RH"],
          [`${night.room.lux} lx`, "Light"],
          [`${night.room.db} dB`, "Noise"],
        ].map(([v, l], i) => (
          <div key={l} className={i ? "px-3 last:pr-0" : "pr-3"}>
            <p className="num whitespace-nowrap text-[length:var(--text-body)]">{v}</p>
            <p className="label mt-1 text-[var(--color-ash)]">{l}</p>
          </div>
        ))}
      </div>

      <div className="h-24" />

      {/* Two taps, not a dialog. A modal in a dark room is harder to read
          than a button that changes its own label. */}
      <button
        onClick={() =>
          confirming ? navigate("/tonight", { replace: true }) : setConfirming(true)
        }
        className="label h-14 w-full rounded-[var(--radius-pill)] border border-[var(--color-ash-dim)] text-[var(--color-ash)]"
      >
        {confirming ? "Tap again to end the session" : "End session"}
      </button>

      <p className="label mt-6 flex justify-between text-[var(--color-ash-dim)]">
        <span>Band 71% · bedside on</span>
        <span>Screen dims in 30s</span>
      </p>

      {/* Overlay rather than a brightness API: it works the same on every
          device and reverses instantly on touch. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-black transition-opacity duration-[1200ms]"
        style={{ opacity: dim ? DIM : 0 }}
      />
    </div>
  );
}
