import { useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { Sparkline } from "@/components/ui/Sparkline";
import {
  VitalLayout,
  RowList,
  type KeyMetric,
  type Row,
} from "@/components/vitals/VitalLayout";
import { Hypnogram } from "@/components/vitals/Hypnogram";
import { seriesFor, formatDuration, bandOfScore } from "@/data/mock";
import { useStore } from "@/data/store";
import { METRIC_COLOR, BAND_LABEL } from "@/lib/metrics";
import { COPY } from "@/lib/copy";

const KEYS = ["sleep", "pulse", "breathing", "movement", "room"] as const;
type Key = (typeof KEYS)[number];


export function Vital() {
  const { metric } = useParams<{ metric: Key }>();
  // Hooks run before the guard: an early return above them changes the
  // hook count between renders and tears the component down.
  const { nights } = useStore();
  const [date, setDate] = useState(nights[0]!.date);

  if (!metric || !KEYS.includes(metric)) return <Navigate to="/vitals/pulse" replace />;

  const n = nights.find((x) => x.date === date) ?? nights[0]!;
  const s = seriesFor(n);
  const total = n.sleep.durationMin || 1;

  if (metric === "sleep") {
    const band = n.score ? bandOfScore(n.score) : "fair";
    const rows: Row[] = n.contributors.map((c) => ({
      label: c.label,
      value: c.value,
      level: (c.delta + 6) / 12,
      attention: c.delta < 0,
    }));
    return (
      <VitalLayout
        night={n}
        title="Sleep Score"
        date={n.date}
        onDate={setDate}
        value={n.score !== null ? String(n.score) : "—"}
        unit={n.score !== null ? BAND_LABEL[band] : "no band data"}
        caption={n.insight}
        chart={n.sleep.durationMin ? <Hypnogram n={n.sleep} /> : undefined}
      >
        {/* The point of this screen: a score nobody can decompose is a
            number somebody made up. */}
        <RowList title="What moved it" rows={rows} />
      </VitalLayout>
    );
  }

  if (metric === "pulse") {
    const metrics: KeyMetric[] = [
      { label: "Resting Pulse", value: `${n.heart.resting} bpm`, note: "your baseline" },
      { label: "Average", value: `${n.heart.avg} bpm` },
      { label: "Lowest", value: `${n.heart.min} bpm` },
      { label: "HRV", value: `${n.heart.hrv} ms` },
    ];
    return (
      <VitalLayout
        night={n}
        title="Pulse"
        date={n.date}
        onDate={setDate}
        value={String(n.heart.avg)}
        unit="average bpm"
        caption={`Lowest ${n.heart.min}, highest ${n.heart.max}.`}
        chart={<Sparkline values={s.map((x) => x.bpm)} height={90} unit="bpm" />}
        metrics={metrics}
      >
        <RowList
          title="What moved it"
          rows={[
            {
              label: "Room temperature",
              // A room nobody measured is not a comfortable room. Drawing a
              // dash costs one row; drawing 0 °C invents a cold night.
              value: n.room.tempC != null ? `${n.room.tempC} °C` : "Not measured",
              level: n.room.tempC != null ? Math.min(1, (n.room.tempC - 22) / 8) : 0,
              attention: (n.room.tempC ?? 0) > 28,
            },
            {
              label: "Restless spells",
              value: `${n.counts.restless}`,
              level: Math.min(1, n.counts.restless / 12),
              attention: n.counts.restless > 6,
            },
          ]}
        />
      </VitalLayout>
    );
  }

  if (metric === "breathing") {
    const metrics: KeyMetric[] = [
      { label: "Dips per hour", value: `${n.breathing.desatPerHour}` },
      { label: "Snoring", value: `${n.breathing.snoreMin} min` },
      { label: "Lowest dip", value: `${n.breathing.spo2DeltaPct}%`, note: "from baseline" },
      { label: "Position", value: "Supine", note: "most dips" },
    ];
    return (
      <VitalLayout
        night={n}
        title="Breathing"
        date={n.date}
        onDate={setDate}
        // Never an absolute SpO₂ figure: wrist error is ±3-4% and the
        // threshold is 3%, so the absolute number would claim a
        // precision the sensor does not have.
        value={`${n.breathing.spo2DeltaPct}%`}
        unit="from your baseline"
        caption="Measured as change against your own sleeping baseline, not as a blood oxygen reading."
        chart={
          <Sparkline
            values={s.map((x) => x.spo2Delta)}
            color={METRIC_COLOR.breath}
            height={90}
            unit="% from baseline"
          />
        }
        metrics={metrics}
        footnote={
          n.breathing.desatPerHour >= 1 ? (
            <div className="rounded-[var(--radius-card)] bg-[var(--color-surface)] p-5">
              <p>{COPY.breathingScreening}</p>
              <p className="label mt-4 text-[var(--color-ash)]">
                {COPY.disclaimer}
              </p>
            </div>
          ) : (
            <p className="label text-[var(--color-ash)]">{COPY.disclaimer}</p>
          )
        }
      />
    );
  }

  if (metric === "movement") {
    const pos = n.positions;
    return (
      <VitalLayout
        night={n}
        title="Movement & position"
        date={n.date}
        onDate={setDate}
        value={String(n.counts.restless)}
        unit="restless spells"
        caption="Movement is what cancels an alert. The band watches for it before anything is sent."
        chart={
          <Sparkline
            values={s.map((x) => x.movement)}
            color={METRIC_COLOR.sleep}
            height={90}
            unit="mg of movement"
          />
        }
      >
        <RowList
          title="Time in each position"
          rows={[
            { label: "On your back", value: formatDuration(pos.supine), level: pos.supine / total },
            { label: "Left side", value: formatDuration(pos.left), level: pos.left / total },
            { label: "Right side", value: formatDuration(pos.right), level: pos.right / total },
            { label: "Face down", value: formatDuration(pos.prone), level: pos.prone / total },
          ]}
        />
      </VitalLayout>
    );
  }

  const polluted = n.light.pollutionMin > 25;
  return (
    <VitalLayout
        night={n}
      title="Room"
      date={n.date}
      onDate={setDate}
      value={`${n.room.tempC}°`}
      unit="average temperature"
      caption={
        polluted
          ? `Light was leaking in for ${n.light.pollutionMin} minutes.`
          : `Dark enough for ${formatDuration(n.light.darkOptimalMin)}.`
      }
      chart={
        <Sparkline values={s.map((x) => x.lux)} color={METRIC_COLOR.room} height={90} unit="lux" />
      }
      metrics={[
        { label: "Humidity", value: `${n.room.rh}%` },
        { label: "Light", value: `${n.room.lux} lx`, note: "average" },
        { label: "Noise", value: `${n.room.db} dB` },
        { label: "Optimal Darkness", value: formatDuration(n.light.darkOptimalMin) },
      ]}
    >
      <RowList
        title="What moved it"
        rows={[
          {
            label: "Light pollution",
            value: `${n.light.pollutionMin} min`,
            level: Math.min(1, n.light.pollutionMin / 60),
            attention: polluted,
          },
          {
            label: "Temperature above 28°",
            value: n.room.tempC == null ? "Not measured" : n.room.tempC > 28 ? "yes" : "no",
            level: n.room.tempC != null ? Math.min(1, (n.room.tempC - 22) / 8) : 0,
            attention: (n.room.tempC ?? 0) > 28,
          },
        ]}
      />
    </VitalLayout>
  );
}
