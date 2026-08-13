import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/Button";

type Field = { label: string; value: string; note?: string };

function DeviceCard({
  name,
  serial,
  fields,
}: {
  name: string;
  serial: string;
  fields: Field[];
}) {
  return (
    <section className="rounded-[var(--radius-card)] bg-[var(--color-surface)] p-5">
      <div className="flex items-center gap-3">
        <span className="size-2 rounded-full bg-[var(--color-pulse)]" />
        <h2 className="text-[length:var(--text-card)] font-medium">{name}</h2>
      </div>
      <p className="num mt-1 text-[length:var(--text-meta)] text-[var(--color-ash)]">
        {serial}
      </p>

      <dl className="mt-5 space-y-3">
        {fields.map((f) => (
          <div key={f.label} className="flex items-baseline justify-between gap-4">
            <dt className="text-[var(--color-ash)]">{f.label}</dt>
            <dd className="num text-right">
              {f.value}
              {f.note && (
                <span className="ml-2 text-[length:var(--text-meta)] text-[var(--color-ash)]">
                  {f.note}
                </span>
              )}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-6 flex items-center gap-4">
        {/* Disconnecting is a BLE operation. Until that layer exists the
            control says so instead of failing quietly. */}
        <Button
          variant="secondary"
          disabled
          className="h-9 w-auto px-4 text-[length:var(--text-label)]"
        >
          Disconnect
        </Button>
        <span className="text-[length:var(--text-meta)] text-[var(--color-ash)]">
          Needs the Bluetooth link
        </span>
      </div>
    </section>
  );
}

/**
 * D2 — Devices. Worn and Clock are shown because both are silent failure
 * modes: an unworn band reads like a missing pulse, and a drifted clock
 * corrupts settle times without ever looking wrong.
 */
export function Devices() {
  return (
    <div className="pb-8">
      <PageHeader title="Devices" showMenu />

      <div className="space-y-3 px-5">
        <DeviceCard
          name="Band"
          serial="RePulse Band 4C0521039"
          fields={[
            { label: "Battery", value: "87%" },
            { label: "Signal", value: "strong", note: "−52 dBm" },
            { label: "Worn", value: "yes" },
            { label: "Clock", value: "in sync" },
            { label: "Firmware", value: "1.2.0" },
          ]}
        />

        <DeviceCard
          name="Bedside unit"
          serial="RePulse Bedside 2A19"
          fields={[
            { label: "Power", value: "plugged in" },
            { label: "Signal", value: "strong", note: "−48 dBm" },
            { label: "Firmware", value: "1.1.4" },
            // Users are entitled to know the hardware can act on its own.
            { label: "Standalone siren", value: "armed" },
          ]}
        />

        <section className="rounded-[var(--radius-card)] bg-[var(--color-surface)] p-5">
          <h2 className="label text-[var(--color-ash)]">Offline buffer</h2>
          <p className="mt-2">Empty</p>
          <p className="mt-1 text-[length:var(--text-meta)] text-[var(--color-ash)]">
            Last rebuilt 11 Aug, 06:12
          </p>
        </section>

        <p className="px-1 pt-4 text-[length:var(--text-meta)] text-[var(--color-ash)]">
          The bedside unit sounds its siren on its own if your phone is
          unreachable during an alert. It cannot be commanded to stay quiet
          from here.
        </p>
      </div>
    </div>
  );
}
