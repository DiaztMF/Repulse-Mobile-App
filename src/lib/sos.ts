import { Capacitor } from "@capacitor/core";

/**
 * The emergency message: who it goes to, what it says, and how it leaves
 * the phone. PRD §6, and §12 for the wording.
 *
 * Nothing here sends anything. Every function below prepares — the send is
 * a person tapping a button on X2, and that is not an implementation
 * detail to be optimised away later. §12 forbids any wording that implies
 * automatic delivery, and code that could deliver automatically would make
 * that sentence a lie no matter how it is phrased.
 */

export type Contact = { name: string; phone: string; relation: string };

const CONTACTS_KEY = "repulse_emergency_contacts";

export function savedContacts(): Contact[] {
  try {
    const raw = localStorage.getItem(CONTACTS_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as Contact[];
    return Array.isArray(list) ? list.filter((c) => c?.name && c?.phone) : [];
  } catch {
    return [];
  }
}

/**
 * Indonesian numbers as people actually type them, into the form
 * `wa.me` needs: country code, no plus, no spaces.
 *
 * `08…` is the same number as `+628…`; getting this wrong sends the
 * message nowhere and says it succeeded.
 */
export function waNumber(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  return digits;
}

export type Position = { lat: number; lon: number; accuracyM: number } | null;

/**
 * Best-effort location. A refusal is not an error — the message goes
 * without coordinates rather than not going at all, because a contact who
 * knows something is wrong and has no map is still better off than a
 * contact who was never told.
 */
export async function currentPosition(timeoutMs = 8000): Promise<Position> {
  if (!("geolocation" in navigator)) return null;
  return new Promise((resolve) => {
    const done = (p: Position) => resolve(p);
    const id = window.setTimeout(() => done(null), timeoutMs);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        window.clearTimeout(id);
        done({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracyM: Math.round(pos.coords.accuracy),
        });
      },
      () => {
        window.clearTimeout(id);
        done(null);
      },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 60_000 },
    );
  });
}

export function mapsUrl(p: NonNullable<Position>): string {
  return `https://maps.google.com/?q=${p.lat.toFixed(6)},${p.lon.toFixed(6)}`;
}

const clock = (at: number) =>
  new Date(at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

/**
 * The message body.
 *
 * Written to be read in three seconds by someone woken by a notification:
 * who, what, when, where. No diagnosis — §12 bans those words everywhere,
 * and this is the message most likely to be forwarded to a doctor.
 */
export function messageBody(opts: {
  owner: string;
  at: number;
  position: Position;
  bpm?: number;
}): string {
  const lines = [
    `${opts.owner} may need help.`,
    `Detected at ${clock(opts.at)}.`,
  ];
  if (opts.bpm) lines.push(`Heart rate ${opts.bpm} bpm.`);
  lines.push(
    opts.position
      ? `Location: ${mapsUrl(opts.position)}`
      : "Location unavailable, please call.",
  );
  lines.push("Sent from RePulse. Not a medical device.");
  return lines.join("\n");
}

/**
 * Hands the message to WhatsApp with the recipient and text filled in.
 *
 * It stops at WhatsApp's compose screen on purpose. There is no API that
 * would let this app send on someone's behalf, and if there were, §12
 * would forbid using it — the last tap has to belong to a person.
 */
export function whatsappUrl(contact: Contact, body: string): string {
  return `https://wa.me/${waNumber(contact.phone)}?text=${encodeURIComponent(body)}`;
}

export async function openWhatsapp(contact: Contact, body: string): Promise<void> {
  const url = whatsappUrl(contact, body);
  if (Capacitor.isNativePlatform()) {
    // A new window inside a WebView goes nowhere. On the device this has
    // to leave the app entirely.
    window.location.href = url;
    return;
  }
  window.open(url, "_blank", "noopener");
}

/** SMS, for a contact without WhatsApp or a phone with no data. §6 wants
 *  the message to survive a bad connection, and SMS is what does. */
export function smsUrl(contact: Contact, body: string): string {
  return `sms:${waNumber(contact.phone)}?body=${encodeURIComponent(body)}`;
}
