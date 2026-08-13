import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { HeartPulse, Wind, Home as HomeIcon, Moon, X } from "lucide-react";
import { Card, Empty } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Sparkline } from "@/components/ui/Sparkline";
import { Header } from "@/components/shell/Header";
import { Drawer } from "@/components/shell/Drawer";
import { ScoreChips } from "@/components/home/ScoreChips";
import { Timeline } from "@/components/home/Timeline";
import { seriesFor, formatDuration, bandOfScore } from "@/data/mock";
import { useLastNight } from "@/data/store";
import { BAND_COLOR, BAND_LABEL, METRIC_COLOR } from "@/lib/metrics";

/**
 * The hero background is the room, not a stock photograph: brightness
 * follows measured lux and hue follows the lamp's colour temperature.
 * It carries data — a glance shows the room was too bright before a
 * single number is read — and at 2am the correct hero is one you can
 * barely see.
 */
function heroClass(lux: number, pollution: boolean) {
  if (pollution) return "hero-polluted";
  return lux < 3 ? "hero-dark" : "hero-day";
}

const HEADLINE: Record<string, string> = {
  good: "A quiet night",
  fair: "Broken in places",
  poor: "A rough night",
};

export function Home() {
  const navigate = useNavigate();
  const [menu, setMenu] = useState(false);
  const night = useLastNight();
  const series = seriesFor(night.date);
  const scored = night.score !== null;
  const band = scored ? bandOfScore(night.score!) : "fair";

  // TODO: read the real schedule. Kept here so the banner state is
  // reachable while the session store is still a stub.
  const sunsetAt = "21:40";
  const showSunsetBanner = false;

  return (
    <div className="pb-4">
      <Header devices="both" onMenu={() => setMenu(true)} onDevices={() => navigate("/devices")} />
      <Drawer open={menu} onClose={() => setMenu(false)} />

      <div className="px-5 pt-2">
        <ScoreChips night={night} />
      </div>

      {/* Hero */}
      <section
        className={`mt-6 px-5 py-10 ${heroClass(night.room.lux, night.light.pollutionMin > 25)}`}
      >
        {scored ? (
          <>
            <Moon className="size-5" strokeWidth={1.5} style={{ color: METRIC_COLOR.sleep }} />
            <p className="label mt-3" style={{ color: BAND_COLOR[band] }}>
              Sleep Score · {BAND_LABEL[band]}
            </p>
            <p className="num mt-2 text-[length:var(--text-hero)] leading-none">
              {night.score}
            </p>
            <h1 className="mt-5 text-[length:var(--text-title)] font-medium">
              {HEADLINE[band]}
            </h1>
            <p className="mt-3 max-w-[34ch] text-[var(--color-ash)]">
              You slept {formatDuration(night.sleep.durationMin)} with{" "}
              {night.counts.restless} restless spells.
            </p>
          </>
        ) : (
          <>
            {/* The bedside unit runs whether or not the band is worn, so
                there is always something true to show. */}
            <HomeIcon className="size-5" strokeWidth={1.5} style={{ color: METRIC_COLOR.room }} />
            <p className="label mt-3 text-[var(--color-ash)]">Room last night</p>
            <p className="num mt-2 text-[length:var(--text-hero)] leading-none">
              {formatDuration(night.light.darkOptimalMin)}
            </p>
            <h1 className="mt-5 text-[length:var(--text-title)] font-medium">
              Dark enough to sleep
            </h1>
            <p className="mt-3 max-w-[34ch] text-[var(--color-ash)]">
              The band was not worn last night.
            </p>
          </>
        )}

        <Button
          variant="secondary"
          className="mt-7 w-auto px-6"
          onClick={() => navigate(`/health/night/${night.date}`)}
        >
          See more
        </Button>
      </section>

      <div className="space-y-3 px-5 pt-6">
        {showSunsetBanner && (
          <div className="rounded-[var(--radius-card)] bg-[var(--color-raised)] p-5">
            <div className="flex items-start justify-between gap-4">
              <p className="text-[length:var(--text-card)]">
                Sunset begins at {sunsetAt}
              </p>
              <X className="size-5 shrink-0 text-[var(--color-ash)]" strokeWidth={1.5} />
            </div>
            <p className="mt-1 text-[length:var(--text-meta)] text-[var(--color-ash)]">
              The lights dim over 25 minutes.
            </p>
            <div className="mt-4 flex items-center gap-6">
              <Button variant="secondary" className="h-9 w-auto px-4 text-[length:var(--text-label)]">
                Delay 30m
              </Button>
              <button className="label text-[var(--color-pulse)]">Start now</button>
            </div>
          </div>
        )}

        <Card
          metric="pulse"
          icon={<HeartPulse className="size-5" strokeWidth={1.5} />}
          title="Pulse"
          status="Last night"
          onOpen={() => navigate("/vitals/pulse")}
        >
          {scored ? (
            <>
              <p className="num text-[length:var(--text-metric)] leading-none">
                {night.heart.avg}
              </p>
              <p className="label mt-1 text-[var(--color-ash)]">average bpm</p>
              <p className="mt-3 text-[var(--color-ash)]">
                Your Resting Pulse is {night.heart.resting}.
              </p>
              <div className="mt-4">
                <Sparkline values={series.map((s) => s.bpm)} />
              </div>
            </>
          ) : (
            <Empty>No pulse recorded — the band was not worn.</Empty>
          )}
        </Card>

        {/* Only shown when there is something to report. A night with no
            findings does not produce an empty card saying so. */}
        {scored && night.breathing.desatPerHour >= 1 && (
          <Card
            metric="breath"
            icon={<Wind className="size-5" strokeWidth={1.5} />}
            title="Breathing"
            status="Worth a look"
            onOpen={() => navigate("/vitals/breathing")}
          >
            <p className="num text-[length:var(--text-metric)] leading-none">
              {night.breathing.spo2DeltaPct}%
            </p>
            <p className="label mt-1 text-[var(--color-ash)]">from your baseline</p>
            <p className="mt-3 text-[var(--color-ash)]">
              {night.breathing.desatPerHour} dips per hour, and{" "}
              {night.breathing.snoreMin} minutes of snoring.
            </p>
          </Card>
        )}

        <Card
          metric="room"
          icon={<HomeIcon className="size-5" strokeWidth={1.5} />}
          title="Room"
          status={night.light.pollutionMin > 25 ? "Light leaked in" : "Optimal Darkness"}
          onOpen={() => navigate("/vitals/room")}
        >
          {/* Bare data row, not four equal cards — column widths follow
              the values rather than being split evenly. */}
          <div className="flex divide-x divide-[var(--color-ash-dim)]/30">
            {[
              [`${night.room.tempC}°`, "Temp"],
              [`${night.room.rh}%`, "RH"],
              [`${night.room.lux} lx`, "Light"],
              [`${night.room.db} dB`, "Noise"],
            ].map(([v, l], i) => (
              <div key={l} className={i ? "px-3 last:pr-0" : "pr-3"}>
                <p className="num whitespace-nowrap text-[length:var(--text-body)]">
                  {v}
                </p>
                <p className="label mt-1 text-[var(--color-ash)]">{l}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {night.events.length > 0 && (
        <section className="px-5 pt-8">
          <h2 className="text-[length:var(--text-card)] font-medium">Timeline</h2>
          <Timeline night={night} limit={3} />
          <Button
            variant="inverse"
            onClick={() => navigate(`/health/night/${night.date}`)}
          >
            View full timeline
          </Button>
        </section>
      )}
    </div>
  );
}
