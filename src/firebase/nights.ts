import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  writeBatch,
} from "firebase/firestore";
import { db } from "./app";
import type { Intervention, Night } from "@/data/mock";

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

export async function fetchInterventions(uid: string): Promise<Intervention[]> {
  if (!db) return [];
  const snap = await getDocs(interventionsRef(uid));
  return snap.docs.map((d) => d.data() as Intervention);
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
  for (const ref of [nightsRef(uid), interventionsRef(uid)]) {
    const snap = await getDocs(ref);
    snap.docs.forEach((d) => batch.delete(d.ref));
  }
  await batch.commit();
}
