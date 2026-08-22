import { useParams, Navigate } from "react-router-dom";
import { PageHeader } from "@/components/shell/PageHeader";
import { Sparkline } from "@/components/ui/Sparkline";
import { Hypnogram } from "@/components/vitals/Hypnogram";
import { Timeline } from "@/components/home/Timeline";
import { MetricGrid } from "@/components/vitals/VitalLayout";
import { seriesFor, formatDuration, bandOfScore } from "@/data/mock";
import { useNight } from "@/data/store";
import { BAND_COLOR, BAND_LABEL, METRIC_COLOR } from "@/lib/metrics";
import { COPY } from "@/lib/copy";

/**
 * S2 — One night, in full. Two ways in: the hero on Home for last night,
 * and the history list for any other. One screen rather than a separate
 * "morning report", because they would only ever differ in which date
 * they were handed.
 */
export function NightDetail() {
  const { date } = useParams<{ date: string }>();
  const n = useNight(date);
  if (!n) return <Navigate to="/health" replace />;

  const s = seriesFor(n);
  const band = n.score !== null ? bandOfScore(n.score) : null;
  const polluted = n.light.pollutionMin > 25;

  return (
    <div className="pb-4">
      <PageHeader
        title={new Date(n.date + "T12:00:00").toLocaleDateString("en-GB", {
          weekday: "long",
          day: "numeric",
          month: "long",
        })}
      />

      <div className="px-5">
        {band ? (
          <>
            <p className="label mt-6" style={{ color: BAND_COLOR[band] }}>
              Sleep Score · {BAND_LABEL[band]}
            </p>
            <p className="num mt-2 text-[length:var(--text-hero)] leading-none">
              {n.score}
            </p>
            <p className="mt-5 text-[var(--color-ash)]">{n.insight}</p>

            <div className="mt-10">
              <Hypnogram n={n.sleep} />
            </div>

            <section className="mt-10">
              <h2 className="text-[length:var(--text-card)] font-medium">Pulse</h2>
              <Sparkline values={s.map((x) => x.bpm)} height={80} unit="bpm" />
              <h2 className="mt-8 text-[length:var(--text-card)] font-medium">
                Room temperature
              </h2>
              {/* Plotted one under the other rather than on shared axes:
                  two units on one grid invites reading a correlation off
                  the picture that the data may not support. */}
              <Sparkline
                values={s.map((x) => x.tempC)}
                color={METRIC_COLOR.room}
                height={60}
                unit="°C"
              />
            </section>

            <div className="mt-10">
              <MetricGrid
                items={[
                  { label: "Time asleep", value: formatDuration(n.sleep.durationMin) },
                  { label: "Resting Pulse", value: `${n.heart.resting} bpm` },
                  { label: "Restless", value: `${n.counts.restless} times` },
                  {
                    label: "Optimal Darkness",
                    value: formatDuration(n.light.darkOptimalMin),
                    note: polluted ? `${n.light.pollutionMin} min of leak` : undefined,
                  },
                ]}
              />
            </div>

            {n.breathing.desatPerHour >= 1 && (
              <section className="mt-10 rounded-[var(--radius-card)] bg-[var(--color-surface)] p-5">
                <p className="label text-[var(--color-ash)]">Breathing</p>
                <p className="num mt-2 text-[length:var(--text-metric)] leading-none">
                  {n.breathing.desatPerHour}
                </p>
                <p className="label mt-1 text-[var(--color-ash)]">dips per hour</p>
                <p className="mt-4">{COPY.breathingScreening}</p>
              </section>
            )}
          </>
        ) : (
          <>
            <p className="label mt-6 text-[var(--color-ash)]">Room only</p>
            <p className="num mt-2 text-[length:var(--text-hero)] leading-none">
              {formatDuration(n.light.darkOptimalMin)}
            </p>
            <p className="mt-5 text-[var(--color-ash)]">{n.insight}</p>
            <div className="mt-10">
              <MetricGrid
                items={[
                  { label: "Temperature", value: `${n.room.tempC} °C` },
                  { label: "Humidity", value: `${n.room.rh}%` },
                  { label: "Light", value: `${n.room.lux} lx` },
                  { label: "Noise", value: `${n.room.db} dB` },
                ]}
              />
            </div>
          </>
        )}

        {n.events.length > 0 && (
          <section className="mt-10">
            <h2 className="text-[length:var(--text-card)] font-medium">Timeline</h2>
            <Timeline night={n} />
          </section>
        )}

        <p className="label mt-8 text-center text-[var(--color-ash)]">
          {COPY.disclaimer}
        </p>
      </div>
    </div>
  );
}
