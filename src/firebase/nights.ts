import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "./app";
import type { Intervention, InterventionKey, Night } from "@/data/mock";
import type { VerificationRow } from "@/state/machine";

/**
 * Firestore layout, matching the spec:
 *
 *   users/{uid}/nights/{YYYY-MM-DD}          night summary
 *   users/{uid}/interventions/{type}         learning-loop totals
 *
 * Per-minute series stay out of the summary document. They are generated
 * on demand from the synthetic set today and will become a `series`
 * subcollection fetched only for the night being viewed — a night is
 * hundreds of samples wide and no screen needs fourteen of them at once.
 */

const nightsRef = (uid: string) => collection(db!, "users", uid, "nights");
const interventionsRef = (uid: string) =>
  collection(db!, "users", uid, "interventions");

export async function fetchNights(uid: string, count = 14): Promise<Night[]> {
  if (!db) return [];
  const snap = await getDocs(
    query(nightsRef(uid), orderBy("date", "desc"), limit(count)),
  );
  return snap.docs.map((d) => d.data() as Night);
}

/**
 * One measured night, keyed by its own date so a session that runs past
 * midnight still files under the evening it began.
 *
 * Written whole rather than merged. §11's rule is that synthetic data is a
 * fallback and never a blend, and a seeded document sitting at this date
 * would otherwise keep its `seeded: true` underneath the real figures —
 * which is precisely the stamp that makes the SAMPLE DATA badge honest.
 * Overwriting drops it, and the badge goes out because the night is real.
 */
export async function saveNight(uid: string, night: Night) {
  if (!db) return;
  const ref = doc(nightsRef(uid), night.date);

  /* One evening can hold more than one session — a nap, a false start, or
   * a night that was stopped and begun again — and they all file under the
   * same date. Whole-document writes mean the last one wins, so an eight
   * hour night would be replaced by the two minutes someone spent tapping
   * Start and Stop again at breakfast. The longest session of an evening
   * is the night; a seeded placeholder always yields to a measured one. */
  const existing = await getDoc(ref);
  const prev = existing.exists() ? (existing.data() as Night) : null;
  if (prev && !prev.seeded && prev.sleep.durationMin > night.sleep.durationMin) return;

  await setDoc(ref, night);
}

export async function fetchInterventions(uid: string): Promise<Intervention[]> {
  if (!db) return [];
  const snap = await getDocs(interventionsRef(uid));
  return snap.docs.map((d) => d.data() as Intervention);
}

const verificationsRef = (uid: string) =>
  collection(db!, "users", uid, "verifications");

/** Only three of the four keys can be commanded today; `cooling` has no
 *  actuator behind it yet and exists in the history data only. */
const KEY: Record<string, InterventionKey> = {
  white_noise: "white_noise",
  aroma: "aroma",
  light: "dim_light",
};

/**
 * One row per COMFORT event, and the counter that row moves. PRD §7.1 and
 * §7.2.
 *
 * This is the product's central claim made auditable: almost everything
 * that calls itself a closed loop fires an action and never learns whether
 * it helped. Without this write, the loop is open and the Insights screen
 * is decoration.
 *
 * Rows with no intervention still get written. §5.3: an event the bedside
 * could not answer is real and belongs in the history — it just must not
 * count as a failed intervention, so it never touches the counters.
 */
export async function saveVerification(uid: string, row: VerificationRow) {
  if (!db) return;
  const id = row.timestamp;
  await setDoc(doc(verificationsRef(uid), id), row);

  const key = row.intervention ? KEY[row.intervention.type] : undefined;
  // A null result means nothing was tried, not that something failed.
  if (!key || row.result === null || row.bedside_offline) return;

  await setDoc(
    doc(interventionsRef(uid), key),
    {
      key,
      tries: increment(1),
      success: increment(row.result === "berhasil" ? 1 : 0),
      // Kept as a running total so an average can be recomputed without
      // reading every row back. §7.3 needs the average, not the samples.
      totalSettleSec: increment(row.settle_time_s ?? 0),
    },
    { merge: true },
  );
}

export async function fetchVerifications(uid: string, count = 100) {
  if (!db) return [];
  const snap = await getDocs(
    query(verificationsRef(uid), orderBy("timestamp", "desc"), limit(count)),
  );
  return snap.docs.map((d) => d.data() as VerificationRow);
}

/**
 * Writes the synthetic fortnight for this account. Doubles as the demo
 * safety net: the insight screens need a fortnight of history to say
 * anything, and real collection cannot start early enough to produce one
 * before the deadline.
 */
export async function seed(uid: string, nights: Night[], interventions: Intervention[]) {
  if (!db) throw new Error("Firebase is not configured");
  const batch = writeBatch(db);
  // Stamped, so it keeps admitting what it is after a round trip through
  // Firestore. Seeded data that reads as measured data is the one thing
  // the badge exists to stop.
  for (const n of nights) batch.set(doc(nightsRef(uid), n.date), { ...n, seeded: true });
  for (const i of interventions) batch.set(doc(interventionsRef(uid), i.key), i);
  await batch.commit();
}

/** Clears seeded data. Synthetic rows left behind in a real account are
 *  worse than an empty screen, so emptying has to be one command. */
export async function reset(uid: string) {
  if (!db) throw new Error("Firebase is not configured");
  const batch = writeBatch(db);
  for (const ref of [nightsRef(uid), interventionsRef(uid), verificationsRef(uid)]) {
    const snap = await getDocs(ref);
    snap.docs.forEach((d) => batch.delete(d.ref));
  }
  await batch.commit();
}
