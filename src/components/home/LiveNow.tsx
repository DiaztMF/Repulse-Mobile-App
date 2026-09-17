import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { useMonitor } from "@/state/monitor";

/**
 * What the band is reading right now, at the top of the home screen.
 *
 * There is no watch any more, so this is the only place a person can see
 * that the thing on their wrist works. Without it the first night is an
 * act of faith: put the band on, see nothing, and wait until morning to
 * find out whether it was recording at all.
 *
 * Everything below this card on the home screen is last night. The split
 * is the point — the screen answers "is it working now" before it answers
 * "how did I sleep".
 */

/** Older than this is not "now" any more. §3.1 sends vitals every second
 *  and §4.1 the room every five, so half a minute of silence is a fault,
 *  not a gap. */
const STALE_MS = 30_000;

export function LiveNow() {
  const navigate = useNavigate();
  const monitor = useMonitor();
  const [now, setNow] = useState(Date.now());

  // The readings carry their own timestamps, and a number that stopped
  // moving looks identical to a live one until something ages it.
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 2000);
    return () => window.clearInterval(id);
  }, []);

  const bandUp = monitor.links.band === "connected";
  const running = monitor.sessionAt != null || monitor.isNight;

  const vitals = monitor.vitals && now - monitor.vitals.at < STALE_MS ? monitor.vitals : null;
  const room = monitor.room && now - monitor.room.at < STALE_MS ? monitor.room : null;
  const live = vitals != null || room != null;

  const bpm = vitals?.worn && vitals.bpm > 0 ? vitals.bpm : null;
  const spo2 = vitals?.worn && monitor.oxygen && monitor.oxygen.spo2Pct > 0
    ? monitor.oxygen.spo2Pct
    : null;

  const dash = "—";

  return (
    <section className="mx-5 mt-2 rounded-[var(--radius-card)] bg-[var(--color-surface)] p-5">
      <div className="flex items-baseline justify-between gap-4">
        <span className="label flex items-center gap-2 text-[var(--color-ash)]">
          {live && (
            <span className="size-1.5 animate-pulse rounded-full bg-[var(--color-pulse)]" />
          )}
          {live ? "Live" : "Now"}
        </span>
        <span className="label text-[var(--color-ash)]">
          {running ? "Recording" : bandUp ? "Not recording" : "Band not connected"}
        </span>
      </div>

      {bandUp ? (
        <>
          <div className="mt-4 flex items-end gap-5">
            <div>
              <p className="num text-[length:var(--text-hero)] leading-none">{bpm ?? dash}</p>
              <p className="label mt-1 text-[var(--color-ash)]">bpm</p>
            </div>
            <div className="mb-1 flex flex-1 flex-wrap gap-x-5 gap-y-2">
              {[
                ["SpO₂", spo2 != null ? `${spo2}%` : dash],
                ["Movement", vitals ? `${monitor.motionMg} mg` : dash],
                ["Room", room?.tempC != null ? `${room.tempC}°` : dash],
                ["Light", room ? `${room.lux} lx` : dash],
              ].map(([label, value]) => (
                <span key={label}>
                  <span className="num block text-[length:var(--text-body)]">{value}</span>
                  <span className="label text-[var(--color-ash)]">{label}</span>
                </span>
              ))}
            </div>
          </div>

          {/* §3.1: to the sensor an unworn band and a stopped heart read the
              same, so this is the difference between "no pulse" and "on the
              table" — and the first thing to check when the figure is a
              dash. */}
          {!live && (
            <p className="mt-4 text-[length:var(--text-meta)] text-[var(--color-ash)]">
              Nothing arriving from the band yet.
            </p>
          )}
          {live && vitals && !vitals.worn && (
            <p className="mt-4 text-[length:var(--text-meta)] text-[var(--color-ash)]">
              Band not worn. Press the sensor flat against your wrist.
            </p>
          )}
        </>
      ) : (
        <p className="mt-4 text-[var(--color-ash)]">
          Nothing is being read. The band reconnects on its own once it is in range and
          switched on.
        </p>
      )}

      <div className="mt-5 flex items-center gap-4">
        {bandUp ? (
          <Button
            variant="secondary"
            className="h-9 w-auto px-4 text-[length:var(--text-label)]"
            onClick={() => navigate("/tonight/session")}
          >
            {running ? "Open night view" : "Start sleep"}
          </Button>
        ) : (
          <Button
            variant="secondary"
            className="h-9 w-auto px-4 text-[length:var(--text-label)]"
            onClick={() => navigate("/devices")}
          >
            Check devices
          </Button>
        )}
      </div>

      {/* M0 measured this: the readings stop with the screen. Saying so here
          is what keeps a dark phone from reading as a dead monitor. */}
      <p className="mt-4 text-[length:var(--text-meta)] text-[var(--color-ash)]">
        These figures update while this screen is on. Monitoring carries on with the
        screen off.
      </p>
    </section>
  );
}
