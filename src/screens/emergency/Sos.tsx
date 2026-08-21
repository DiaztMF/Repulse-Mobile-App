import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check } from "lucide-react";
import { SampleBadge } from "@/components/shell/SampleBadge";
import { COPY } from "@/lib/copy";
import { useAuth } from "@/firebase/auth";
import { useMonitor } from "@/state/monitor";
import {
  currentPosition,
  messageBody,
  openWhatsapp,
  savedContacts,
  smsUrl,
  type Position,
} from "@/lib/sos";

/**
 * X2 — SOS. Nothing here sends on its own, and the screen says so in the
 * one sentence that is not allowed to change. Wording that implies
 * automatic delivery would be a false claim about a safety feature.
 *
 * The message is built from what the account actually has: the contacts
 * saved at O9, the location the phone can get right now, and the pulse the
 * band last reported. Where any of those is missing the screen says so
 * rather than filling the gap in.
 */
export function Sos() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { vitals, synthetic, standDown } = useMonitor();
  const [sent, setSent] = useState(false);
  const [position, setPosition] = useState<Position>(null);
  const [locating, setLocating] = useState(true);
  const [at] = useState(() => Date.now());

  const contacts = savedContacts();
  const contact = contacts[0];
  const owner = user?.email?.split("@")[0] ?? "Someone";

  // Asked for the moment the screen opens rather than when Send is
  // tapped. A fix can take seconds, and those are seconds spent while
  // somebody is deciding — not after they have decided.
  useEffect(() => {
    let alive = true;
    void currentPosition().then((p) => {
      if (!alive) return;
      setPosition(p);
      setLocating(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  const body = messageBody({ owner, at, position, bpm: vitals?.bpm });

  if (sent) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-alert px-6 text-center">
        <span className="flex size-20 items-center justify-center rounded-full bg-[var(--color-danger)]">
          <Check className="size-10 text-white" strokeWidth={2.5} />
        </span>
        <p className="label mt-8 text-[var(--color-ivory)]">Handed to WhatsApp</p>
        {/* Not "message sent". This app cannot know that — it opened
            WhatsApp with the message filled in, and what happened next
            belongs to WhatsApp and to the person holding the phone. */}
        <p className="mt-4 max-w-[30ch] text-[var(--color-ash)]">
          Check WhatsApp to confirm it went to {contact?.name ?? "your contact"}.
        </p>
        {contact && (
          <a
            href={smsUrl(contact, body)}
            className="label mt-8 flex h-14 w-full max-w-[320px] items-center justify-center rounded-[var(--radius-pill)] border border-[var(--color-ivory)] text-[var(--color-ivory)]"
          >
            Send by SMS as well
          </a>
        )}
        {/* Same reason as Cancel below: the phase has to leave SOS_SENT or
            the router hands this screen straight back. */}
        <button
          onClick={standDown}
          className="label mt-4 h-14 w-full max-w-[320px] rounded-[var(--radius-pill)] border border-[var(--color-ash-dim)] text-[var(--color-ash)]"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-alert px-6 pb-8 pt-16">
      <p className="label text-center text-[var(--color-danger)]">
        Nobody has been contacted yet
      </p>
      <h1 className="mt-6 text-center text-[length:var(--text-title)] font-medium leading-snug">
        {contact ? `Send this to ${contact.name}?` : "No emergency contact saved"}
      </h1>

      {contact ? (
        <>
          <div className="mt-10 whitespace-pre-line rounded-[var(--radius-card)] bg-[var(--color-surface)] p-5">
            {body}
          </div>

          {locating && (
            <p className="mt-3 text-center text-[length:var(--text-meta)] text-[var(--color-ash)]">
              Still getting your location. You can send without it.
            </p>
          )}

          {/* Regulated wording, held as a constant so it cannot drift. */}
          <p className="mt-6 text-center text-[var(--color-ash)]">{COPY.sosPending}</p>

          <div className="flex-1" />

          {/* The tallest button in the app, and the only one filled with
              the danger colour. */}
          <button
            onClick={() => {
              void openWhatsapp(contact, body);
              setSent(true);
            }}
            className="label h-16 w-full rounded-[var(--radius-pill)] bg-[var(--color-danger)] text-[length:var(--text-card)] text-white"
          >
            Send now
          </button>
        </>
      ) : (
        <>
          <p className="mt-8 text-center text-[var(--color-ash)]">
            Nobody can be reached from here. Add a contact in the menu, then
            come back. This screen has nothing to send until you do.
          </p>
          <div className="flex-1" />
          <button
            onClick={() => navigate("/contacts")}
            className="label h-16 w-full rounded-[var(--radius-pill)] bg-[var(--color-danger)] text-[length:var(--text-card)] text-white"
          >
            Add a contact
          </button>
        </>
      )}

      {/* Stands the ladder down, which is what leaves this screen. Merely
          navigating left the machine in SOS_SENT, so the router put the
          person straight back on the emergency they had just dismissed. */}
      <button
        onClick={standDown}
        className="label mt-4 h-14 w-full rounded-[var(--radius-pill)] border border-[var(--color-ivory)] text-[var(--color-ivory)]"
      >
        Cancel, I am okay
      </button>

      {/* Only while the readings behind the message are synthetic. A judge
          reading a heart rate inside an emergency message is entitled to
          know whether it came from a sensor. */}
      {synthetic && (
        <div className="mt-6">
          <SampleBadge />
        </div>
      )}
    </div>
  );
}
