import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { HeartPulse, Wind, Home as HomeIcon, Moon, X } from "lucide-react";
import { Card, Empty } from "@/components/ui/Card";
import { NoNights } from "@/components/ui/NoNights";
import { Button } from "@/components/ui/Button";
import { Sparkline } from "@/components/ui/Sparkline";
import { Header, deviceStateFrom } from "@/components/shell/Header";
import { useDrawer } from "@/components/shell/AppShell";
import { ScoreChips } from "@/components/home/ScoreChips";
import { Timeline } from "@/components/home/Timeline";
import { LiveNow } from "@/components/home/LiveNow";
import { seriesFor, formatDuration, bandOfScore } from "@/data/mock";
import { useLastNight } from "@/data/store";
import { useMonitor } from "@/state/monitor";
import { Share } from "@capacitor/share";
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
  const { openDrawer } = useDrawer();
  const night = useLastNight();
  const { links, windDown, monitorOnly, vitals } = useMonitor();
  const liveBpm = vitals?.worn && vitals.bpm > 0 ? vitals.bpm : null;

  // Driven by the clock rather than a constant. The previous version
  // pinned this false, which made the banner unreachable in every state
  // the app could actually be in.
  const [delayMin, setDelayMin] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const now = new Date();
  const minutesNow = now.getHours() * 60 + now.getMinutes();
  const sunsetMin = 21 * 60 + 40 + delayMin;
  const sunsetAt = `${String(Math.floor(sunsetMin / 60) % 24).padStart(2, "0")}:${String(sunsetMin % 60).padStart(2, "0")}`;
  const showSunsetBanner =
    !dismissed && minutesNow >= sunsetMin - 15 && minutesNow < sunsetMin + 25;

  const devices = deviceStateFrom(links);

  /* Before the first night there is nothing true to draw. This screen used
   * to show a synthetic score, trend and timeline to a brand-new account. */
  if (!night) {
    return (
      <div className="pb-4">
        <Header
          title="Tonight"
          devices={devices}
          liveBpm={liveBpm}
          onMenu={openDrawer}
          onDevices={() => navigate("/devices")}
        />
        {/* The live card comes before the empty state on purpose: on the
            first evening, "the band is reading you" is the whole answer,
            and "no nights yet" is only the rest of it. */}
        <LiveNow />
        <NoNights />
      </div>
    );
  }

  const series = seriesFor(night);
  const scored = night.score !== null;
  const band = scored ? bandOfScore(night.score!) : "fair";

  /* Sharing an unscored night would send somebody a row of dashes, so the
   * button is absent until there is a score to talk about. */
  const share = () =>
    void Share.share({
      title: "RePulse",
      text: [
        `Sleep Score ${night.score} on ${night.date}.`,
        `${formatDuration(night.sleep.durationMin)} asleep, resting pulse ${night.heart.resting} bpm.`,
        "Recorded with RePulse. Not a medical device.",
      ].join(" "),
    }).catch(() => {
      // No share sheet on this platform, or the user dismissed it.
    });

  return (
    <div className="pb-4">
      <Header
        night={night}
        devices={devices}
        liveBpm={liveBpm}
        onMenu={openDrawer}
        onDevices={() => navigate("/devices")}
        onShare={scored ? share : undefined}
      />

      <LiveNow />

      {/* Everything from here down is last night, and it says so once
          rather than on each card. The screen used to open on a score with
          no date near it, on a tab called Tonight. */}
      <h2 className="label mt-8 px-5 text-[var(--color-ash)]">Last night</h2>

      <div className="px-5 pt-2">
        <ScoreChips night={night} />
      </div>

      {/* Hero */}
      <section
        className={`mt-6 px-5 py-10 ${heroClass(night.room.lux ?? 0, night.light.pollutionMin > 25)}`}
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
        {/* The banner Settings promises. Without it, a night that quietly
            ran no interventions looked exactly like one where they all
            failed. */}
        {monitorOnly && (
          <div className="rounded-[var(--radius-card)] border border-[var(--color-ash-dim)] p-5">
            <p className="label text-[var(--color-ash)]">Monitor only</p>
            <p className="mt-1 text-[length:var(--text-meta)] text-[var(--color-ash)]">
              Recording as usual. No white noise, aroma or lamp tonight. Alerts and the
              siren still work.
            </p>
          </div>
        )}

        {showSunsetBanner && (
          <div className="rounded-[var(--radius-card)] bg-[var(--color-raised)] p-5">
            <div className="flex items-start justify-between gap-4">
              <p className="text-[length:var(--text-card)]">
                Sunset begins at {sunsetAt}
              </p>
              <button onClick={() => setDismissed(true)} aria-label="Dismiss">
                <X className="size-5 shrink-0 text-[var(--color-ash)]" strokeWidth={1.5} />
              </button>
            </div>
            <p className="mt-1 text-[length:var(--text-meta)] text-[var(--color-ash)]">
              The lights dim over 25 minutes.
            </p>
            <div className="mt-4 flex items-center gap-6">
              <Button
                variant="secondary"
                className="h-9 w-auto px-4 text-[length:var(--text-label)]"
                onClick={() => setDelayMin((d) => d + 30)}
              >
                Delay 30m
              </Button>
              <button
                // Starts the sunset itself. This used to open the session
                // screen, which skips the sunset — the one thing the banner
                // is about.
                onClick={() => {
                  windDown();
                  setDismissed(true);
                }}
                className="label text-[var(--color-pulse)]"
              >
                Start now
              </button>
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
            <Empty>No pulse recorded. The band was not worn.</Empty>
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
      {/* Last on the page, like every other scrolling screen. At night
          the banner above and the round button beside the tab bar both
          reach this without scrolling. */}
      <div className="px-5 pt-8">
        <Button
          size="lg"
          register="system"
          onClick={() => navigate("/tonight/session")}
        >
          Start sleep
        </Button>
        <p className="label mt-3 text-center text-[var(--color-ash)]">
          Wake 06:00–06:30 · sunset {sunsetAt}
        </p>
      </div>
    </div>
  );
}
