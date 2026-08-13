import { useEffect, useState } from "react";
import { HeartPulse, Wind, Home } from "lucide-react";
import { Wordmark } from "@/components/brand/Wordmark";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { StepBar } from "@/components/ui/StepBar";
import { ValueArc } from "@/components/ui/ValueArc";
import { Card, Empty } from "@/components/ui/Card";
import { BAND_COLOR, BAND_LABEL, bandOf } from "@/lib/metrics";
import { COPY } from "@/lib/copy";

/** The page must never scroll horizontally. One overflowing element
 *  stretches <body> and shifts every centered composition, with the
 *  symptom showing up somewhere unrelated. */
function Viewport() {
  const [v, setV] = useState("");
  useEffect(() => {
    const read = () =>
      setV(
        `${window.innerWidth} viewport · ${document.documentElement.scrollWidth} dokumen`,
      );
    read();
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, []);

  const overflow =
    document.documentElement.scrollWidth > window.innerWidth + 1;

  return (
    <p
      className="label"
      style={{ color: overflow ? "var(--color-band-poor)" : "var(--color-ash)" }}
    >
      {v}
      {overflow && " · MELEBAR"}
    </p>
  );
}

/** Not part of the app. Renders every token and primitive on one page
 *  so they can be checked before screens are built on top. */
export function KitchenSink() {
  const score = 78;
  const band = bandOf(score);

  return (
    <div className="space-y-10 px-5 py-8">
      <Viewport />

      <section className="space-y-4">
        <p className="label text-[var(--color-ash)]">Wordmark</p>
        {/* If the dash math breaks, all three rows render identically. */}
        {[0.35, 0.7, 1].map((p) => (
          <Wordmark key={p} progress={p} className="block h-auto w-[260px]" />
        ))}
        <Wordmark strokeWidth={6} className="block h-auto w-[118px]" />
        <p className="text-[var(--color-ash)]">
          Header size — stroke raised to 6 so it stays above one pixel.
        </p>
      </section>

      <section className="space-y-3">
        <p className="label text-[var(--color-ash)]">Buttons</p>
        <Button variant="primary" register="system">
          Mulai kalibrasi
        </Button>
        <Button variant="secondary">Saya punya perangkat</Button>
        <Button variant="inverse">Lihat linimasa lengkap</Button>
        <Button variant="ghost">Lewati — saya paham risikonya</Button>
        <Button disabled>Nonaktif sampai isian sah</Button>
        <Button variant="sos" register="system">
          Kirim SOS
        </Button>
      </section>

      <section className="space-y-4">
        <p className="label text-[var(--color-ash)]">Register</p>
        <p className="label text-center text-[var(--color-ash)]">
          Mencari gelang…
        </p>
        <h2 className="text-[length:var(--text-title)] font-medium">
          Kamar Anda siap untuk tidur
        </h2>
      </section>

      <section>
        <p className="label mb-3 text-[var(--color-ash)]">Value arc</p>
        <ValueArc value={score} color={BAND_COLOR[band]} />
        <div className="mt-2">
          <p className="label" style={{ color: BAND_COLOR[band] }}>
            {BAND_LABEL[band]}
          </p>
          <p className="num text-[length:var(--text-hero)] leading-none">
            {score}
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <p className="label text-[var(--color-ash)]">Fields</p>
        <Field label="Nomor WhatsApp" defaultValue="0812 3456 7890" />
        <Field label="Nama" error="Wajib diisi" placeholder="Ibu Sari" />
      </section>

      <section>
        <p className="label mb-3 text-[var(--color-ash)]">Step bar</p>
        <StepBar total={4} current={2} />
      </section>

      <section className="space-y-3">
        <p className="label text-[var(--color-ash)]">Cards</p>

        <Card
          metric="pulse"
          icon={<HeartPulse className="size-5" strokeWidth={1.5} />}
          title="Nadi"
          status="Semalam"
          onOpen={() => {}}
        >
          <p className="num text-[length:var(--text-metric)] leading-none">
            58
          </p>
          <p className="label mt-1 text-[var(--color-ash)]">bpm rata-rata</p>
          <p className="mt-3 text-[var(--color-ash)]">
            Nadi Istirahat Anda 61 — turun 1 dari pekan lalu.
          </p>
        </Card>

        <Card
          metric="breath"
          icon={<Wind className="size-5" strokeWidth={1.5} />}
          title="Napas"
          status="Sudah siap"
          onOpen={() => {}}
        >
          <p className="num text-[length:var(--text-metric)] leading-none">
            −2%
          </p>
          <p className="label mt-1 text-[var(--color-ash)]">
            dari baseline Anda
          </p>
        </Card>

        <Card
          metric="room"
          icon={<Home className="size-5" strokeWidth={1.5} />}
          title="Kamar"
        >
          <Empty>
            Butuh 3 malam untuk mulai melihat pola. Baru ada 1.
          </Empty>
        </Card>
      </section>

      <section className="space-y-2">
        <p className="label text-[var(--color-ash)]">Regulated copy</p>
        <p className="text-[var(--color-ash)]">{COPY.breathingScreening}</p>
        <p className="text-[var(--color-ash)]">{COPY.sosPending}</p>
        <p className="label text-[var(--color-ash-dim)]">{COPY.disclaimer}</p>
      </section>
    </div>
  );
}
