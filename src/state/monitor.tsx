import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { MockTransport, type Scenario } from "@/ble/mock";
import { useAuth } from "@/firebase/auth";
import { fetchInterventions, saveVerification } from "@/firebase/nights";
import type { BleEvent, BleTransport, Device, Link, Room, Vitals } from "@/ble/transport";
import {
  actuatorsFor,
  chooseIntervention,
  initial,
  reduce,
  type Input,
  type Intervention,
  type Machine,
} from "./machine";

/**
 * Where the machine, the transport, and the screens finally meet.
 *
 * Until now each of those existed and none of them touched. The reducer
 * was proven by its own check file and imported by nothing; the screens
 * navigated to `/alert` with a button. This is the piece that makes an
 * ALERT arrive because something happened rather than because someone
 * tapped.
 *
 * The transport behind it is swappable by design — PRD §11.5. Today it is
 * the mock. When the native plugin lands it is one line here, and every
 * screen above stays untouched.
 */

/**
 * Thresholds, in one place and deliberately not buried.
 *
 * These decide when the app thinks someone is restless, and no reading
 * taken from a real wrist will match a number picked at a desk. They stay
 * named and exported so calibration can move them once real baselines
 * exist — PRD §7.2 already expects the personal baseline to come from the
 * three-minute calibration, not from here.
 */
export const TUNING = {
  /** §7.1's own worked example is 0.42 g, so the line sits just under it. */
  restlessMg: 400,
  /** Above the sleeping baseline. §5.3 wants both signals, not either. */
  hrOverBaseline: 8,
  /** Below this, and holding, counts as settled again. */
  calmMg: 120,
  /** How long it has to hold. One quiet second is not a settled body. */
  calmForMs: 30_000,
  baselineBpm: 62,
};

export type Monitor = {
  phase: Machine["phase"];
  stage: Machine["stage"];
  rows: Machine["rows"];
  links: Record<Device, Link>;
  vitals: Vitals | null;
  room: Room | null;
  motionMg: number;
  /** True while a sleep session is running, which is what dims the whole
   *  interface. Owned here so the rule cannot drift into screens. */
  isNight: boolean;
  /** Running on synthetic events rather than a band. Every screen that
   *  shows a number has to be able to say so — DESIGN §12. */
  synthetic: boolean;
  startSleep: () => void;
  endSession: () => void;
  play: (s: Scenario) => Promise<void>;
  stop: () => Promise<void>;
};

const Ctx = createContext<Monitor | null>(null);

export function useMonitor(): Monitor {
  const m = useContext(Ctx);
  if (!m) throw new Error("useMonitor outside MonitorProvider");
  return m;
}

/** §7.2's counters, as the chooser wants them. */
type Scores = Record<Intervention, { tried: number; worked: number }>;
const NO_SCORES: Scores = {
  white_noise: { tried: 0, worked: 0 },
  aroma: { tried: 0, worked: 0 },
  light: { tried: 0, worked: 0 },
};

export function MonitorProvider({ children }: { children: ReactNode }) {
  const [machine, dispatch] = useReducer(reduce, initial);
  const uid = useAuth().user?.uid;
  const [scores, setScores] = useState<Scores>(NO_SCORES);
  const [transport, setTransport] = useState<BleTransport | null>(null);
  const [vitals, setVitals] = useState<Vitals | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [motionMg, setMotionMg] = useState(0);
  const [links, setLinks] = useState<Record<Device, Link>>({
    band: "idle",
    bedside: "idle",
  });

  /** When the body last looked calm. Held in a ref because it changes on
   *  every sample and nothing renders from it. */
  const calmSince = useRef<number | null>(null);
  const phase = machine.phase;

  // Rows already written. The reducer keeps the whole list because it is
  // pure and cannot know what has been persisted; this is what stops the
  // same event being written twice on a re-render.
  const written = useRef(new Set<string>());

  // --- events in ---------------------------------------------------------

  useEffect(() => {
    if (!transport) return;
    const off = transport.on((e) => onEvent(e));
    return off;

    function onEvent(e: BleEvent) {
      switch (e.kind) {
        case "vitals":
          setVitals(e.data);
          break;
        case "room":
          setRoom(e.data);
          break;
        case "link":
          setLinks((l) => ({ ...l, [e.device]: e.state }));
          dispatch({ t: "link", device: e.device, up: e.state === "connected" });
          break;
        case "escalation":
          // Mirrored, never decided here. PRD §4.1.
          dispatch({ t: "stage", at: e.data.at, stage: e.data.stage });
          break;
        case "sos":
          // The button is a person saying "now". §3.5 reason 3 covers it,
          // and the band reports the stage itself — this is the path for
          // when we heard the press before the stage.
          dispatch({ t: "stage", at: e.data.at, stage: 4 });
          break;
        case "motion":
          setMotionMg(e.data.levelMg);
          break;
        case "buffered":
          // §5.5: these carry the event's real time, not the time they
          // arrived, and the timeline has to keep them distinguishable
          // from monitored events. Replayed rather than dispatched live.
          break;
      }
    }
  }, [transport]);

  // --- restlessness, and settling again ----------------------------------
  //
  // Kept out of the reducer on purpose: the reducer decides what a
  // restless event means, this decides what counts as one. The first is a
  // product rule, the second is a threshold that will be wrong until a
  // real wrist moves it.

  useEffect(() => {
    if (!vitals?.worn) return;
    const now = vitals.at;
    const hot = vitals.bpm > TUNING.baselineBpm + TUNING.hrOverBaseline;

    if (phase === "MONITORING" && motionMg > TUNING.restlessMg && hot) {
      calmSince.current = null;
      dispatch({
        t: "restless",
        at: now,
        movementG: motionMg / 1000,
        hr: vitals.bpm,
        baselineHr: TUNING.baselineBpm,
        room: room
          ? { temp_c: room.tempC, rh: room.humidityPct, lux: room.lux, db: room.db }
          : { temp_c: 0, rh: 0, lux: 0, db: 0 },
      });
      return;
    }

    if (phase === "COMFORT") {
      if (motionMg > TUNING.calmMg) {
        calmSince.current = null;
        return;
      }
      calmSince.current ??= now;
      if (now - calmSince.current >= TUNING.calmForMs) {
        calmSince.current = null;
        dispatch({ t: "settled", at: now });
      }
    }
  }, [vitals, motionMg, phase, room]);

  // --- the five-minute check window --------------------------------------

  useEffect(() => {
    if (phase !== "COMFORT") return;
    const id = window.setInterval(() => dispatch({ t: "tick", at: Date.now() }), 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  // Counters come from the account, so an intervention that has already
  // been shown to work on this person is preferred from the first night of
  // the demo rather than after three more.
  useEffect(() => {
    if (!uid) return;
    void fetchInterventions(uid).then((rows) => {
      const next = { ...NO_SCORES };
      for (const r of rows) {
        const k =
          r.key === "dim_light" ? "light" : (r.key as Intervention);
        if (k in next) next[k] = { tried: r.tries, worked: r.success };
      }
      setScores(next);
    });
  }, [uid]);

  // --- choosing what to try ----------------------------------------------
  //
  // §7.2: highest score with at least three attempts, default order until
  // then, and one try in five goes to the runner-up so the first thing
  // that ever worked does not stay the only thing ever tried.

  useEffect(() => {
    if (!transport || phase !== "COMFORT" || !machine.comfort) return;
    if (machine.comfort.intervention) return;
    // §5.3 allows one other intervention after a failure, and the reducer
    // has already cleared the choice — so a retry lands here again and
    // must not pick the same thing twice.
    const avoid = machine.comfort.retried ? machine.comfort.row.intervention?.type : undefined;
    const pick = chooseIntervention(
      scores,
      () => Math.random() < 0.2,
      (["white_noise", "aroma", "light"] as const).filter((k) => k !== avoid),
    );
    const command =
      pick === "white_noise"
        ? ({ kind: "noise", level: 2 } as const)
        : pick === "aroma"
          ? ({ kind: "aroma", seconds: 25 } as const)
          : ({ kind: "light", mode: "off" } as const);
    void transport.send(command);
    dispatch({
      t: "chose",
      intervention: pick,
      ...(pick === "white_noise" ? { volume: 2, track: 2 } : {}),
    });
  }, [transport, phase, machine.comfort, scores]);

  // --- the learning loop, written down -----------------------------------
  //
  // §7.1. Without this the loop is open and the Insights screen is
  // decoration: an action fired, and nobody ever found out whether it
  // helped.

  useEffect(() => {
    if (!uid) return;
    for (const row of machine.rows) {
      if (written.current.has(row.timestamp)) continue;
      written.current.add(row.timestamp);
      void saveVerification(uid, row).catch(() => {
        // Losing a row costs one data point. Throwing here would take the
        // night down with it, and the night is worth more.
        written.current.delete(row.timestamp);
      });
    }
  }, [machine.rows, uid]);

  // --- commands out ------------------------------------------------------

  useEffect(() => {
    if (!transport) return;
    // Rule 3 lives entirely in `actuatorsFor`. Sending the whole set on
    // every phase change rather than diffing means the bedside can never
    // be left holding a command from the state before an emergency.
    for (const a of actuatorsFor(phase)) void transport.send(a);
  }, [transport, phase]);

  // --- controls ----------------------------------------------------------

  const value = useMemo<Monitor>(() => {
    const send = (i: Input) => dispatch(i);
    return {
      phase,
      stage: machine.stage,
      rows: machine.rows,
      links,
      vitals,
      room,
      motionMg,
      isNight: phase === "MONITORING" || phase === "COMFORT" || phase === "WIND_DOWN",
      synthetic: transport instanceof MockTransport,
      startSleep: () => send({ t: "start-sleep", at: Date.now() }),
      endSession: () => send({ t: "session-end", at: Date.now(), reason: "wake" }),
      play: async (s: Scenario) => {
        await transport?.stop();
        const next = new MockTransport(s);
        setTransport(next);
        send({ t: "start-sleep", at: Date.now() });
        await next.start();
      },
      stop: async () => {
        await transport?.stop();
        setTransport(null);
        send({ t: "session-end", at: Date.now(), reason: "wake" });
      },
    };
  }, [phase, machine.stage, machine.rows, links, vitals, room, motionMg, transport]);

  // The night flag rides on <html> so every colour token steps down
  // together instead of being patched screen by screen.
  useEffect(() => {
    document.documentElement.dataset.night = String(value.isNight);
  }, [value.isNight]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/**
 * Sits at the root of the route tree and takes the user to the emergency
 * screens when the ladder says so.
 *
 * This is the whole difference between a demo and a product. Until now
 * `/alert` was somewhere you navigated to with a button; now it is
 * somewhere the app takes you because the band reported stage 3, and it
 * will do that from any screen — or from no screen, once the native layer
 * can raise it over a lock screen.
 *
 * It also takes them off again. §4.3: a body that responds stands the
 * ladder down and the event is recorded as an ordinary warning — so
 * leaving someone on a red countdown after they have already rolled over
 * is the screen contradicting the machine. Standing down is not the same
 * as tapping "I am okay", but it ends the same way.
 */
const EMERGENCY = ["/alert", "/sos"];

export function EscalationRoute() {
  const { phase } = useMonitor();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    const to = phase === "ALERT" ? "/alert" : phase === "SOS_SENT" ? "/sos" : null;
    if (to) {
      if (pathname !== to) navigate(to, { replace: true });
      return;
    }
    // Stood down. Only move someone who is actually looking at one of
    // these — never yank a user off a screen they navigated to themselves.
    if (EMERGENCY.includes(pathname)) navigate("/tonight", { replace: true });
  }, [phase, pathname, navigate]);

  return <Outlet />;
}
