import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
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
};

const StoreContext = createContext<Store>({
  nights: MOCK_NIGHTS,
  interventions: MOCK_INTERVENTIONS,
  sample: true,
  loading: false,
});

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
  const [state, setState] = useState<Store>({
    nights: MOCK_NIGHTS,
    interventions: MOCK_INTERVENTIONS,
    sample: true,
    loading: false,
  });

  useEffect(() => {
    if (!configured || !ready || !user) return;
    let live = true;

    setState((s) => ({ ...s, loading: true }));
    Promise.all([fetchNights(user.uid), fetchInterventions(user.uid)])
      .then(([nights, interventions]) => {
        if (!live) return;
        // An empty account falls back rather than showing a bare app —
        // the first night has not happened yet.
        const empty = nights.length === 0;
        setState({
          nights: empty ? MOCK_NIGHTS : nights,
          interventions: empty ? MOCK_INTERVENTIONS : interventions,
          sample: empty,
          loading: false,
        });
      })
      .catch(() => {
        if (live) setState((s) => ({ ...s, sample: true, loading: false }));
      });

    return () => {
      live = false;
    };
  }, [user, ready]);

  return <StoreContext.Provider value={state}>{children}</StoreContext.Provider>;
}

export function useStore() {
  return useContext(StoreContext);
}

/** Convenience for the many screens that only need last night. */
export function useLastNight() {
  return useStore().nights[0]!;
}

export function useNight(date: string | undefined) {
  return useStore().nights.find((n) => n.date === date);
}
