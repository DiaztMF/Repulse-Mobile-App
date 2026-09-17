import { PageHeader } from "@/components/shell/PageHeader";
import { useMonitor } from "@/state/monitor";
import { Button } from "@/components/ui/Button";

type Field = { label: string; value: string; note?: string };

function DeviceCard({
  name,
  serial,
  fields,
  connected,
  onDisconnect,
}: {
  name: string;
  serial: string;
  fields: Field[];
  connected: boolean;
  onDisconnect: () => void;
}) {
  return (
    <section className="rounded-[var(--radius-card)] bg-[var(--color-surface)] p-5">
      <div className="flex items-center gap-3">
        {/* Lit only when it is actually attached. It was pinned to the
            live colour, so this screen — the one built to catch silent
            failures — showed a healthy green dot beside a device that was
            not there. */}
        <span
          className={
            connected
              ? "size-2 rounded-full bg-[var(--color-pulse)]"
              : "size-2 rounded-full border border-[var(--color-ash-dim)]"
          }
        />
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
        {/* It now does what it says. The comment here used to read "until
            that layer exists" — the layer exists, and a permanently
            disabled control is its own kind of lie. */}
        <Button
          variant="secondary"
          disabled={!connected}
          onClick={onDisconnect}
          className="h-9 w-auto px-4 text-[length:var(--text-label)]"
        >
          Disconnect
        </Button>
        <span className="text-[length:var(--text-meta)] text-[var(--color-ash)]">
          {connected ? "Reconnects on its own" : "Not connected"}
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
  const { links, vitals, bandStatus, release } = useMonitor();

  // A dash, never a plausible number. Every row on this screen exists
  // because it is a silent failure mode, and a screen invented to catch
  // silent failures cannot itself invent values — this page said "Battery
  // 87%, Worn yes, Clock in sync" for as long as it was a picture, which
  // is the exact reading a band that is not there would need to hide.
  const dash = "—";
  const attached = links.band === "connected";

  const clock = !bandStatus
    ? dash
    : bandStatus.epochS === 0
      ? "never set"
      : Math.abs(bandStatus.epochS * 1000 - Date.now()) < 120_000
        ? "in sync"
        : "drifted";

  return (
    <div className="pb-8">
      <PageHeader sample={false} title="Devices" showMenu />

      <div className="space-y-3 px-5">
        <DeviceCard
          name="Band"
          connected={attached}
          onDisconnect={() => void release("band")}
          serial={attached ? "RePulse Band" : "Not connected"}
          fields={[
            {
              label: "Battery",
              // §3.6's 255 arrives as null: no divider is fitted, so there
              // is nothing measuring it. A dash, never a number — a band
              // that claims full all night and then dies is the silent
              // failure this whole product argues against.
              value: bandStatus?.percent != null ? `${bandStatus.percent}%` : dash,
              ...(bandStatus?.charging ? { note: "charging" } : {}),
            },
            { label: "Signal", value: attached ? "connected" : links.band },
            // §3.1: to a MAX30102 an unworn band and a stopped heart read
            // the same, so this is the flag that decides whether a missing
            // pulse is an emergency or a bedside table.
            { label: "Worn", value: vitals ? (vitals.worn ? "yes" : "no") : dash },
            { label: "Clock", value: clock },
          ]}
        />

        <DeviceCard
          name="Bedside unit"
          connected={links.bedside === "connected"}
          onDisconnect={() => void release("bedside")}
          serial={links.bedside === "connected" ? "RePulse Bedside" : "Not connected"}
          fields={[
            { label: "Signal", value: links.bedside },
            // Users are entitled to know the hardware can act on its own.
            {
              label: "Standalone siren",
              value: links.bedside === "connected" ? "armed" : dash,
            },
          ]}
        />

        <section className="rounded-[var(--radius-card)] bg-[var(--color-surface)] p-5">
          <h2 className="label text-[var(--color-ash)]">Offline buffer</h2>
          {/* "Empty · last rebuilt 11 Aug, 06:12" was invented, and nothing
              in the app tracks either figure. §3.9 is what can honestly be
              said: the rule, not a reading. */}
          <p className="mt-2 text-[var(--color-ash)]">
            The band records on its own while the phone is away, and sends it all on the
            next connection. It erases nothing until this app confirms it arrived.
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
