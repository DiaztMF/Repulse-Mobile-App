import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";
import { RepulseMonitor } from "repulse-monitor";

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

export type Fix = { lat: number; lon: number; accuracyM: number; at: number };
export type Position = Fix | null;

const FIX_KEY = "repulse.lastFix";

/** The last fix this phone ever got, so a message sent indoors still carries
 *  coordinates instead of an apology. */
export function lastFix(): Fix | null {
  try {
    const raw = localStorage.getItem(FIX_KEY);
    if (!raw) return null;
    const f = JSON.parse(raw) as Fix;
    return typeof f?.lat === "number" && typeof f?.lon === "number" ? f : null;
  } catch {
    return null;
  }
}

function remember(f: Fix): Fix {
  try {
    localStorage.setItem(FIX_KEY, JSON.stringify(f));
  } catch {
    /* Private mode. The fix still travels in this message. */
  }
  return f;
}

/**
 * Keeps the fix current for as long as the caller cares, and returns the
 * function that stops it.
 *
 * A one-shot read is wrong for this screen. GPS converges over seconds, and
 * the seconds somebody spends deciding whether to send are exactly those
 * seconds. Whatever the screen holds when Send is tapped has to be where the
 * person is now, not where they were when the alarm fired.
 */
export async function watchPosition(onFix: (f: Fix) => void): Promise<() => void> {
  let id: string | null = null;
  let stopped = false;
  try {
    if (Capacitor.isNativePlatform()) {
      const state = await Geolocation.checkPermissions();
      if (state.location !== "granted") await Geolocation.requestPermissions();
    }
    id = await Geolocation.watchPosition({ enableHighAccuracy: true, timeout: 15_000 }, (pos) => {
      if (stopped || !pos) return;
      onFix(
        remember({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracyM: Math.round(pos.coords.accuracy ?? 0),
          at: pos.timestamp || Date.now(),
        }),
      );
    });
  } catch {
    /* Refused or no radio. The caller already has the last known fix. */
  }
  return () => {
    stopped = true;
    if (id) void Geolocation.clearWatch({ id });
  };
}

/** Older than this and the message says so, because a stale pin presented as
 *  current sends someone to the wrong house. */
export const FIX_STALE_MS = 120_000;

export function mapsUrl(p: NonNullable<Position>): string {
  return `https://maps.google.com/?q=${p.lat.toFixed(6)},${p.lon.toFixed(6)}`;
}

/**
 * The time the message carries, to the second.
 *
 * Seconds matter here in a way they do not anywhere else in the app: this
 * line is read next to a call log and an ambulance record, and "02.16" and
 * "02.16.43" answer different questions about how long somebody has been
 * down. Dots rather than colons because that is how Indonesian writes a
 * clock time.
 */
const clock = (at: number) => {
  const d = new Date(at);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}.${pad(d.getMinutes())}.${pad(d.getSeconds())}`;
};

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
  if (opts.position) {
    const age = opts.at - opts.position.at;
    const label =
      age > FIX_STALE_MS
        ? `Last seen at ${clock(opts.position.at)}`
        : "Location";
    lines.push(`${label} (${opts.position.accuracyM} m): ${mapsUrl(opts.position)}`);
  } else {
    lines.push("Location unavailable, please call.");
  }
  lines.push("Sent from RePulse. Not a medical device.");
  return lines.join("\n");
}

export type Delivery = { contact: Contact; sent: boolean; reason?: string };

/** Tells native the emergency is over, so the next one is not treated as a
 *  repeat of this one. Called from stand down, which is the only place a
 *  person says an emergency has ended. */
export async function endSos(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await RepulseMonitor.endSos();
  } catch (e) {
    console.error("[sos] could not close the emergency", e);
  }
}

/**
 * Tells the native side who to reach and where we are, so it can send the
 * message without a WebView.
 *
 * Cheap and idempotent, so it is called generously: at the start of a
 * night, whenever contacts change, and on every fix the SOS screen sees.
 * The cost of arming too often is a SharedPreferences write. The cost of
 * arming too rarely is an emergency message with yesterday's location.
 */
export async function armSos(bpm?: number): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  const contacts = savedContacts();
  if (contacts.length === 0) return;
  const fix = lastFix();
  try {
    await RepulseMonitor.armSos({
      owner: ownerName(),
      numbers: contacts.map((c) => `+${waNumber(c.phone)}`),
      ...(bpm ? { bpm } : {}),
      ...(fix ? { lat: fix.lat, lon: fix.lon, accuracyM: fix.accuracyM, fixAt: fix.at } : {}),
    });
  } catch (e) {
    console.error("[sos] could not arm the native sender", e);
  }
}

const OWNER_KEY = "repulse.owner";

/**
 * The name the emergency message opens with.
 *
 * Stored rather than derived, for two reasons. Native has no idea who is
 * signed in and still has to compose the message with no JavaScript
 * running. And the derived version was the local part of an email address,
 * so a contact woken at 3am read "demo may need help" and had to work out
 * who that was.
 */
export function rememberOwner(name: string) {
  try {
    const clean = name.trim().slice(0, 40);
    if (clean) localStorage.setItem(OWNER_KEY, clean);
  } catch {
    /* Private mode. The message says "Someone" instead. */
  }
}

/** Fills the name in from the account only while nobody has chosen one.
 *  A night starting must never overwrite what Settings was told. */
export function defaultOwner(name: string) {
  try {
    if (!localStorage.getItem(OWNER_KEY)) rememberOwner(name);
  } catch {
    /* Nothing to default into. */
  }
}

export function ownerName(): string {
  try {
    return localStorage.getItem(OWNER_KEY) || "Someone";
  } catch {
    return "Someone";
  }
}

/**
 * Sends the message to every saved contact, with nobody touching the phone.
 *
 * SMS, because it is the only channel Android lets an app deliver on
 * unattended. WhatsApp and the SMS app both stop at a compose screen no
 * matter how the link is built, and during the emergency this screen exists
 * for, the person who would tap Send is the person who cannot.
 *
 * Failures are returned, never swallowed: the screen shows which contacts
 * were reached and offers WhatsApp for the ones that were not.
 */
export async function sendToAll(contacts: Contact[]): Promise<Delivery[]> {
  if (!Capacitor.isNativePlatform()) {
    // A browser has no radio. The web build keeps the manual buttons.
    return contacts.map((contact) => ({
      contact,
      sent: false,
      reason: "a browser cannot send a message by itself",
    }));
  }
  // Armed first so the send uses the fix that arrived a second ago rather
  // than the one from when the night started.
  await armSos();
  try {
    const { results } = await RepulseMonitor.sendSos();
    return contacts.map((contact) => {
      const r = results.find((x) => x.to === `+${waNumber(contact.phone)}`);
      return { contact, sent: r?.sent ?? false, reason: r?.reason ?? "no answer from the sender" };
    });
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    return contacts.map((contact) => ({ contact, sent: false, reason }));
  }
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
