import { useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { useNavigate } from "react-router-dom";
import { Check, X } from "lucide-react";
import { SampleBadge } from "@/components/shell/SampleBadge";
import { COPY } from "@/lib/copy";
import { useAuth } from "@/firebase/auth";
import { useMonitor } from "@/state/monitor";
import {
  armSos,
  lastFix,
  ownerName,
  messageBody,
  openWhatsapp,
  savedContacts,
  sendToAll,
  smsUrl,
  watchPosition,
  type Delivery,
  type Position,
} from "@/lib/sos";

/**
 * X2 — SOS.
 *
 * This screen used to hand the message to WhatsApp and wait for a human to
 * press Send. It no longer waits. During the emergency it exists for, the
 * person who would press Send is the person on the floor, so the message
 * goes out by SMS on its own and the tap that remains is the one that stops
 * it.
 *
 * The delay before sending is short and deliberate: five seconds is long
 * enough for somebody who is fine to say so, and short enough that somebody
 * who is not loses nothing. Nothing else on this screen is required to
 * reach a contact.
 *
 * The message is built from what the account actually has: the contacts
 * saved at O9, the location the phone is tracking right now, and the pulse
 * the band last reported. Where any of those is missing the screen says so
 * rather than filling the gap in.
 */

/** Seconds between this screen appearing and the message leaving. */
const ARM_S = 5;

export function Sos() {
  const navigate = useNavigate();
  /* A browser has no radio and never will: there is no web API that sends
   * an SMS, and `wa.me` stops at a compose screen by design. So off the
   * phone this screen does not run a countdown it cannot honour — it puts
   * the one tap that does work under the reader's thumb and says plainly
   * that it needs them. */
  const native = Capacitor.isNativePlatform();
  const { user } = useAuth();
  const { vitals, synthetic, standDown, phase } = useMonitor();
  const [position, setPosition] = useState<Position>(() => lastFix());
  const [locating, setLocating] = useState(true);
  const [at] = useState(() => Date.now());
  const [attempt, setAttempt] = useState(0);
  const [left, setLeft] = useState(ARM_S);
  const [stage, setStage] = useState<"arming" | "sending" | "done">("arming");
  const [results, setResults] = useState<Delivery[]>([]);

  const contacts = savedContacts();
  const contact = contacts[0];
  // A primitive for the timer's dependency list. `contact` itself is parsed
  // fresh from storage each render, so it is never the same object twice.
  const hasContact = contact !== undefined;
  // Whatever Settings was told, falling back to the account only while
  // nothing has been typed there.
  const owner = ownerName() !== "Someone" ? ownerName() : (user?.email?.split("@")[0] ?? "Someone");

  /**
   * Berdiri turun DAN pergi, karena yang pertama saja tidak cukup begitu
   * layar ini bisa dibuka dengan tangan.
   *
   * `standDown` mengirim stage 0, dan reducer hanya memindahkan fase kalau
   * fasenya ALERT atau SOS_SENT. Dibuka dari laci menu, fasenya STANDBY —
   * jadi tidak ada yang berubah, dan EscalationRoute yang memantau
   * PERUBAHAN fase tidak punya apa pun untuk ditanggapi. Tombolnya bekerja
   * sempurna dan tidak melakukan apa-apa.
   *
   * Perintah stand_down tetap dikirim: kalau gelang memang sedang di stage
   * 4, itulah satu-satunya jalan keluarnya (§3.8). Kalau tidak, gelang
   * mengabaikannya dan yang tersisa hanya navigasi ini.
   */
  const leave = () => {
    /* Hanya kalau memang ada keadaan darurat untuk diakhiri. Ladder::reset()
     * di firmware membisukan deteksi anomali selama 180 detik setiap kali
     * dipanggil — itu benar setelah seseorang berkata "saya baik-baik
     * saja", tetapi menutup layar yang dibuka sendiri dari laci menu tidak
     * boleh diam-diam membuat gelang buta selama tiga menit. */
    if (phase === "ALERT" || phase === "SOS_SENT") standDown();
    navigate("/tonight", { replace: true });
  };

  const body = messageBody({ owner, at, position, bpm: vitals?.bpm });

  /* Held in a ref, not in the dependency list. `savedContacts()` returns a
   * new array and `messageBody` a new string on every render, so listing
   * them as dependencies restarts the countdown each time a fix arrives —
   * a phone with good GPS would tick 5, 5, 5 and never send. The ref keeps
   * the message current without touching the timer. */
  const latest = useRef({ contacts, body, bpm: vitals?.bpm });
  latest.current = { contacts, body, bpm: vitals?.bpm };

  // Watched, not read once. The fix keeps improving while the countdown
  // runs, so the coordinates that leave the phone are the ones true at the
  // moment the message is sent rather than at the moment the alarm fired.
  useEffect(() => {
    let alive = true;
    let stop: (() => void) | null = null;
    void watchPosition((f) => {
      if (!alive) return;
      setPosition(f);
      setLocating(false);
      // Keeps the native payload current while the countdown runs, so a
      // send from the service uses this fix too.
      void armSos(latest.current.bpm);
    }).then((off) => {
      if (alive) stop = off;
      else off();
    });
    // Nothing arrived in 15 s: stop promising a fix and offer the retry.
    const give = window.setTimeout(() => alive && setLocating(false), 15_000);
    return () => {
      alive = false;
      window.clearTimeout(give);
      stop?.();
    };
  }, [attempt]);



  /**
   * The countdown, one second at a time.
   *
   * Re-running each tick is what keeps the message current: the body is
   * rebuilt from this render, so the location that goes out is the last one
   * the watcher reported rather than the one that existed when the screen
   * opened.
   */
  useEffect(() => {
    if (!native || stage !== "arming" || !hasContact) return;
    if (left <= 0) {
      setStage("sending");
      void sendToAll(latest.current.contacts).then((r) => {
        setResults(r);
        setStage("done");
      });
      return;
    }
    const t = window.setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => window.clearTimeout(t);
  }, [left, stage, hasContact, native]);

  if (stage === "done") {
    const reached = results.filter((r) => r.sent);
    const missed = results.filter((r) => !r.sent);
    return (
      <div className="flex min-h-screen flex-col bg-alert px-6 pb-8 pt-16">
        <div className="flex flex-col items-center text-center">
          <span
            className={`flex size-20 items-center justify-center rounded-full ${
              reached.length > 0 ? "bg-[var(--color-danger)]" : "bg-[var(--color-surface)]"
            }`}
          >
            {reached.length > 0 ? (
              <Check className="size-10 text-white" strokeWidth={2.5} />
            ) : (
              <X className="size-10 text-[var(--color-danger)]" strokeWidth={2.5} />
            )}
          </span>
          <p className="label mt-8 text-[var(--color-ivory)]">
            {reached.length > 0
              ? `Message sent to ${reached.length} contact${reached.length > 1 ? "s" : ""}`
              : "Nothing left the phone"}
          </p>
        </div>

        {/* Per contact, because "sent" for one is not "sent" for another,
            and the difference decides whether somebody still has to be
            called by hand. */}
        <div className="mt-8 space-y-2">
          {results.map((r) => (
            <div
              key={r.contact.phone}
              className="flex items-center justify-between rounded-[var(--radius-card)] bg-[var(--color-surface)] px-4 py-3"
            >
              <span>{r.contact.name}</span>
              <span className="text-[length:var(--text-meta)] text-[var(--color-ash)]">
                {r.sent ? "Sent by SMS" : (r.reason ?? "Did not send")}
              </span>
            </div>
          ))}
        </div>

        <div className="flex-1" />

        {/* The loudest thing in the room is still running, and this is what
            stops it: stand down travels to the band, the band drops to
            stage 0, its broadcast follows, and the bedside silences the
            siren it was sounding on that broadcast.

            It used to be the last button on the screen, grey, and called
            "Close" - the quietest control in the app was the only way to
            end the loudest state the product has. Nothing about the
            mechanism changed here; what changed is that it can be found by
            somebody who is not reading carefully, which after an alarm has
            gone off is everybody. */}
        <button
          onClick={leave}
          className="label h-16 w-full rounded-[var(--radius-pill)] bg-[var(--color-danger)] text-[length:var(--text-card)] text-white"
        >
          I am okay, stop the alarm
        </button>
        <p className="mt-3 text-center text-[length:var(--text-meta)] text-[var(--color-ash)]">
          The siren and the flashing keep going until you do. Your contacts
          have already been told, and nothing below sends anything again.
        </p>

        {/* WhatsApp stays, as the thing a person does next rather than the
            thing the emergency depends on. */}
        {contact && (
          <button
            onClick={() => void openWhatsapp(contact, body)}
            className="label mt-6 h-14 w-full rounded-[var(--radius-pill)] border border-[var(--color-ivory)] text-[var(--color-ivory)]"
          >
            {missed.length > 0 ? "Try WhatsApp as well" : "Send on WhatsApp too"}
          </button>
        )}
        {contact && missed.length > 0 && (
          <a
            href={smsUrl(contact, body)}
            className="label mt-3 flex h-14 w-full items-center justify-center rounded-[var(--radius-pill)] border border-[var(--color-ash-dim)] text-[var(--color-ash)]"
          >
            Open the SMS app
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-alert px-6 pb-8 pt-16">
      <p className="label text-center text-[var(--color-danger)]">
        {!native
          ? "Nobody has been contacted yet"
          : stage === "sending"
            ? "Sending now"
            : `Sending in ${left}`}
      </p>
      <h1 className="mt-6 text-center text-[length:var(--text-title)] font-medium leading-snug">
        {!contact
          ? "No emergency contact saved"
          : native
            ? `${contact.name} is being told you need help`
            : `Send this to ${contact.name}?`}
      </h1>

      {contact ? (
        <>
          <div className="mt-10 whitespace-pre-line rounded-[var(--radius-card)] bg-[var(--color-surface)] p-5">
            {body}
          </div>

          {locating ? (
            <p className="mt-3 text-center text-[length:var(--text-meta)] text-[var(--color-ash)]">
              Still getting your location. The message goes either way.
            </p>
          ) : (
            position === null && (
              /* A refusal, airplane mode, or no fix indoors. Offer the ask
                 again rather than making somebody close the emergency screen
                 to fix a permission. */
              <button
                onClick={() => {
                  // Re-runs the effect, whose cleanup stops the old watch.
                  setLocating(true);
                  setAttempt((n) => n + 1);
                }}
                className="mt-3 w-full text-center text-[length:var(--text-meta)] underline text-[var(--color-ash)]"
              >
                No location yet. Tap to try again.
              </button>
            )
          )}

          {/* Regulated wording, held as a constant so it cannot drift. On
              the web the automatic half of it is not true, and a screen
              that claims a send it cannot perform is the one lie §12 exists
              to prevent. */}
          <p className="mt-6 text-center text-[var(--color-ash)]">
            {native ? COPY.sosPending : COPY.sosManual}
          </p>

          <div className="flex-1" />

          {/* On the phone this only skips the rest of the countdown: the
              message leaves without it being found at all. In a browser it
              is the whole mechanism, so it opens WhatsApp directly. */}
          <button
            onClick={() => (native ? setLeft(0) : void openWhatsapp(contact, body))}
            disabled={stage === "sending"}
            className="label h-16 w-full rounded-[var(--radius-pill)] bg-[var(--color-danger)] text-[length:var(--text-card)] text-white disabled:opacity-60"
          >
            {!native ? "Open WhatsApp" : stage === "sending" ? "Sending" : "Send now"}
          </button>

          {/* The second route, for a contact without WhatsApp. Native keeps
              it on the result screen instead, where it is the fallback for
              a send that failed. */}
          {!native && (
            <a
              href={smsUrl(contact, body)}
              className="label mt-3 flex h-14 w-full items-center justify-center rounded-[var(--radius-pill)] border border-[var(--color-ash-dim)] text-[var(--color-ash)]"
            >
              Open the SMS app
            </a>
          )}
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

      {/* The only way out that also stops the message, which is why it stays
          the tallest secondary control on the screen. */}
      <button
        onClick={leave}
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
