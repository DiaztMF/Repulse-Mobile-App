import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { configured } from "@/firebase/app";
import { fetchInterventions, fetchNights } from "@/firebase/nights";
import { useAuth } from "@/firebase/auth";
import {
  INTERVENTIONS as MOCK_INTERVENTIONS,
  NIGHTS as MOCK_NIGHTS,
  type Intervention,
  type Night,
} from "./mock";

type Store = {
  nights: Night[];
  interventions: Intervention[];
  /** True while showing synthetic data, so screens can label it. */
  sample: boolean;
  loading: boolean;
  /**
   * Read the account again.
   *
   * This was missing, and it is why a measured night did not show up in
   * the morning. The fetch below runs once per sign-in; `saveNight` writes
   * from the monitor, which has no way to reach in here. So the night
   * somebody had just slept sat in Firestore while every screen went on
   * drawing what had been fetched the previous evening, and only a
   * relaunch ever corrected it.
   */
  refresh: () => void;
};

/** No project configured: the app still has to be walkable and
 *  demonstrable, and the badge says every number here was invented. */
const DEMO: Store = {
  nights: MOCK_NIGHTS,
  interventions: MOCK_INTERVENTIONS,
  sample: true,
  loading: false,
  refresh: () => {},
};

/** Signed in with nothing recorded. Not the same as the demo, and it
 *  must never borrow the demo's nights — see `NoNights`. */
const NOTHING: Store = {
  nights: [],
  interventions: [],
  sample: false,
  loading: false,
  refresh: () => {},
};

const StoreContext = createContext<Store>(DEMO);

/**
 * One place decides where the data comes from. Screens ask for nights and
 * never learn whether the answer came from Firestore or the synthetic
 * set — which is what let the whole UI be built before the backend
 * existed, and what keeps it demonstrable if the backend is unreachable
 * on the day.
 *
 * Synthetic data is a fallback, never a blend: mixing real and invented
 * rows in one list would be impossible to tell apart later.
 */
export function StoreProvider({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  /* With a project, the first answer comes from Firestore — starting on
   * the synthetic set would flash fourteen invented nights at a new
   * account before its own empty answer arrived. */
  const [state, setState] = useState<Store>(
    configured ? { ...NOTHING, loading: true } : DEMO,
  );

  /* Bumped to ask for the account again. A counter rather than calling
   * the fetch directly, so the effect below stays the only place that
   * touches the network and keeps its own cancellation. */
  const [round, setRound] = useState(0);
  const refresh = useCallback(() => setRound((n) => n + 1), []);

  useEffect(() => {
    if (!configured || !ready || !user) return;
    let live = true;

    setState((s) => ({ ...s, loading: true }));
    Promise.all([fetchNights(user.uid), fetchInterventions(user.uid)])
      .then(([nights, interventions]) => {
        if (!live) return;
        /* An empty account gets an empty app, not the synthetic
         * fortnight. Handing a new user somebody else's fourteen nights
         * is not softened by a badge: every screen under it — scores,
         * trends, what settles them — was about a person who does not
         * exist. The demo net is the seeder in the test panel, which
         * writes real rows and stamps them `seeded`. */
        const empty = nights.length === 0;
        setState({
          nights,
          interventions,
          // Synthetic either way it got here: the local set, or the
          // seeded fortnight coming back out of Firestore. The seeder is
          // the demo safety net, and a safety net that quietly drops the
          // label is worse than no net at all.
          // Nothing recorded is not sample data; it is nothing.
          sample: !empty && nights.some((n) => n.seeded),
          loading: false,
          refresh,
        });
      })
      .catch((e) => {
        // Unreadable is not "here are fourteen nights". The screens say
        // nothing has been recorded, which is at least not an invention.
        console.error("[store] could not read nights", e);
        if (live) setState({ ...NOTHING, refresh });
      });

    return () => {
      live = false;
    };
  }, [user, ready, round, refresh]);

  /* `refresh` folded in here too, so the value carries it before the
   * first fetch has answered and while there is no project at all. */
  const value = useMemo<Store>(() => ({ ...state, refresh }), [state, refresh]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  return useContext(StoreContext);
}

/** Convenience for the many screens that only need last night. Undefined
 *  until one has been recorded — every caller has to say so. */
export function useLastNight() {
  return useStore().nights[0];
}

export function useNight(date: string | undefined) {
  return useStore().nights.find((n) => n.date === date);
}
