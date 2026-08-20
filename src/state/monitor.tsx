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
import { Capacitor } from "@capacitor/core";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { RepulseMonitor } from "repulse-monitor";
import { MockTransport, type Scenario } from "@/ble/mock";
import { LiveTransport } from "@/ble/live";
import { useAuth } from "@/firebase/auth";
import { fetchInterventions, saveNight, saveVerification } from "@/firebase/nights";
import { NightRecorder, nightDate } from "@/data/night";
import { DEFAULT_BASELINE_BPM, readBaseline } from "@/lib/baseline";
import type {
  Actuator,
  BandCommand,
  BandConfig,
  BandStatus,
  BleEvent,
  BleTransport,
  Device,
  Link,
  Room,
  Vitals,
} from "@/ble/transport";
import {
  actuatorsFor,
  chooseIntervention,
  initial,
  reduce,
  type Input,
  type Intervention,
  type Machine,
  type Phase,
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
  /** Only ever the stand-in. Calibration overwrites it per person, and
   *  `baselineBpm()` below prefers the recorded figure. */
  /** Above the sleeping baseline. §5.3 wants both signals, not either. */
  hrOverBaseline: 8,
  /** Below this, and holding, counts as settled again. */
  calmMg: 120,
  /** How long it has to hold. One quiet second is not a settled body. */
  calmForMs: 30_000,
  baselineBpm: DEFAULT_BASELINE_BPM,
};

export type Monitor = {
  phase: Machine["phase"];
  stage: Machine["stage"];
  rows: Machine["rows"];
  links: Record<Device, Link>;
  vitals: Vitals | null;
  room: Room | null;
  motionMg: number;
  /** §3.6. Null until the band has reported once — which is not the same
   *  as a band with a flat battery, and D2 has to be able to say which. */
  bandStatus: BandStatus | null;
  /** True while a sleep session is running, which is what dims the whole
   *  interface. Owned here so the rule cannot drift into screens. */
  isNight: boolean;
  /** Running on synthetic events rather than a band. Every screen that
   *  shows a number has to be able to say so — DESIGN §12. */
  synthetic: boolean;
  startSleep: () => void;
  endSession: () => void;
  /** "I am okay", tapped. The band is still the authority — if it reports
   *  the stage again this comes straight back — but the phone in someone's
   *  reach is a second path, and it has to actually work. */
  standDown: () => void;
  /** Straight through to the devices. The conformance screen needs to
   *  drive each characteristic on its own, outside the state machine. */
  send: (a: Actuator, opts?: { unclamped?: boolean }) => Promise<void>;
  command: (c: BandCommand) => Promise<void>;
  configure: (c: BandConfig) => Promise<void>;
  /** Raw event tap, for measuring how long something takes to arrive. */
  listen: (fn: (e: BleEvent) => void) => () => void;
  play: (s: Scenario) => Promise<void>;
  stop: () => Promise<void>;
  /**
   * Swaps the mock out for the radio and begins scanning. Resolves false
   * where there is no radio — a browser — so the pairing screens can say
   * so rather than searching for something that can never arrive.
   *
   * Once it has succeeded the phone remembers, and every later launch
   * connects on its own: a band that has to be re-paired each evening is
   * a band nobody wears by the third night.
   */
  connect: () => Promise<boolean>;
};

/** Set once the radio has found something. Device-local, like everything
 *  else pairing produces. */
const PAIRED_KEY = "repulse.paired";

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
  const [bandStatus, setBandStatus] = useState<BandStatus | null>(null);
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

  /** Accumulates the night while it happens. A ref rather than state: it
   *  changes on every notification and nothing renders from it. */
  const recorder = useRef<NightRecorder | null>(null);

  /** A session is running. Dims the interface, and is what the native
   *  service's lifetime follows. */
  const isNight = phase === "MONITORING" || phase === "COMFORT" || phase === "WIND_DOWN";

  /**
   * A phone that has paired once reconnects on its own from then on.
   * Deliberately not awaited and deliberately quiet: a band that is out of
   * range at breakfast is not an error, it is a band on a bedside table,
   * and the link state already says so on every screen that cares.
   */
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    try {
      if (localStorage.getItem(PAIRED_KEY) !== "1") return;
    } catch {
      return;
    }
    const live = new LiveTransport();
    setTransport(live);
    void live.start().catch((e) => console.error("[ble] reconnect failed", e));
    return () => {
      void live.stop();
    };
  }, []);

  // --- events in ---------------------------------------------------------

  useEffect(() => {
    if (!transport) return;
    const off = transport.on((e) => onEvent(e));
    return off;

    function onEvent(e: BleEvent) {
      // Before the switch, so a night keeps every reading regardless of
      // which of them any screen happens to care about.
      recorder.current?.feed(e, Date.now());

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
        // §3.6. Battery, charge state, and the band's own clock — the last
        // of which is a silent failure mode: a drifted clock corrupts
        // settle times without ever looking wrong on a screen.
        case "band-status":
          setBandStatus(e.data);
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
    // The recorded pulse if calibration ever measured one. A threshold
    // hung off a stranger's 62 fires on a person whose resting rate is 48
    // and stays silent for one whose rate is 76.
    const baseline = readBaseline() ?? TUNING.baselineBpm;
    const hot = vitals.bpm > baseline + TUNING.hrOverBaseline;

    if (phase === "MONITORING" && motionMg > TUNING.restlessMg && hot) {
      calmSince.current = null;
      dispatch({
        t: "restless",
        at: now,
        movementG: motionMg / 1000,
        hr: vitals.bpm,
        baselineHr: baseline,
        room: {
          temp_c: room?.tempC ?? null,
          rh: room?.humidityPct ?? null,
          lux: room?.lux ?? null,
          db: room?.db ?? null,
        },
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
      recorder.current?.comfort(
        Date.parse(row.timestamp),
        row.intervention
          ? row.intervention.type === "light"
            ? "dim_light"
            : row.intervention.type
          : undefined,
        row.settle_time_s,
        row.bedside_offline,
      );
      void saveVerification(uid, row).catch(() => {
        // Losing a row costs one data point. Throwing here would take the
        // night down with it, and the night is worth more.
        written.current.delete(row.timestamp);
      });
    }
  }, [machine.rows, uid]);

  // --- the night, written down -------------------------------------------
  //
  // The gap this closes: `fetchNights` could read, `seed` could write a
  // synthetic fortnight, and `saveVerification` could log one comfort
  // event — but nothing had ever written a measured night. Without this,
  // a flawless band would still be followed by a morning of SAMPLE DATA.

  const startedAt = machine.sessionStartedAt;

  useEffect(() => {
    if (startedAt == null || !uid) return;
    recorder.current = new NightRecorder(startedAt);

    return () => {
      const r = recorder.current;
      recorder.current = null;
      if (!r) return;
      /* Written however short it was. §5.2 says a brief session is
       * recorded and never scored, and `finish` has already withheld the
       * score — throwing it away instead was my own invention, and it is
       * the opposite of what the rule asks for. `saveNight` protects the
       * date from being overwritten by something shorter. */
      const night = r.finish(Date.now(), nightDate(r.startedAt));
      void saveNight(uid, night).catch((e) => console.error("[night] not saved", e));
    };
  }, [startedAt, uid]);

  /* The recorder's own clock. Its ledgers advance on elapsed time, and a
   * band that has dropped off the air sends nothing to advance them with —
   * which is precisely the silence that has to be counted as offline
   * minutes. Five seconds, comfortably inside the recorder's own 30-second
   * gap guard. */
  useEffect(() => {
    if (startedAt == null) return;
    const id = setInterval(() => recorder.current?.tick(Date.now()), 5_000);
    return () => clearInterval(id);
  }, [startedAt]);

  // --- the native half ---------------------------------------------------
  //
  // M0's answer, wired in. The service holds the process open with the
  // screen off; the full-screen intent is what puts this screen in front
  // of someone asleep. Neither can be JavaScript — that is the whole
  // finding, measured over three nights.

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    if (isNight) {
      void RepulseMonitor.start({
        title: "RePulse is watching",
        body: "Monitoring until morning.",
      })
        .then(({ started }) => {
          // ponytail: logged, not shown. A refusal means the night runs
          // without the service holding the process open — worth a screen
          // of its own once someone decides what it should say.
          if (!started) console.warn("[repulse] nearby devices refused; no service this night");
        })
        .catch(() => {});
    } else {
      void RepulseMonitor.stop().catch(() => {});
    }
  }, [isNight]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    // Stage 3 is the rung whose contract text is "hard buzz + ask the
    // phone to light up". This is the app doing as it is asked.
    if (machine.stage >= 3) {
      void RepulseMonitor.raiseAlert({ stage: machine.stage }).catch(() => {});
    } else {
      void RepulseMonitor.clearAlert().catch(() => {});
    }
  }, [machine.stage]);

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
      bandStatus,
      isNight,
      synthetic: transport instanceof MockTransport,
      startSleep: () => send({ t: "start-sleep", at: Date.now() }),
      endSession: () => send({ t: "session-end", at: Date.now(), reason: "wake" }),
      standDown: () => send({ t: "stage", at: Date.now(), stage: 0 }),
      send: async (a, opts) => transport?.send(a, opts),
      command: async (c) => transport?.command(c),
      configure: async (c) => transport?.configure(c),
      listen: (fn) => transport?.on(fn) ?? (() => {}),
      connect: async () => {
        if (!Capacitor.isNativePlatform()) return false;
        /* A radio that is already up is left alone.
         *
         * This used to tear the transport down and build a new one every
         * time, and three screens ask for it on mount — so every visit to
         * the conformance screen dropped the link and rebuilt it a second
         * later, re-bonding and re-subscribing to every characteristic.
         * From the bedside it read as a disconnect/connect pair per
         * navigation, which looked like a firmware fault and was not one.
         *
         * `start()` is idempotent, so a transport that exists but never
         * came up still gets its chance here. */
        const live = transport instanceof LiveTransport ? transport : new LiveTransport();
        if (live !== transport) {
          await transport?.stop();
          setTransport(live);
        }
        try {
          await live.start();
          try {
            localStorage.setItem(PAIRED_KEY, "1");
          } catch {
            // Then it scans again from the pairing screen next time.
          }
          return true;
        } catch (e) {
          // Bluetooth off, permission withdrawn, or a stack that will not
          // initialise. The screens have to be able to say which of those
          // it was, so it travels rather than being swallowed here.
          console.error("[ble] radio would not start", e);
          setTransport(null);
          return false;
        }
      },
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
  }, [phase, machine.stage, machine.rows, links, vitals, room, motionMg, bandStatus, transport]);

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

  // Read at the moment a phase changes, never as a trigger. Watching the
  // path meant every deliberate navigation was undone on the next render:
  // tapping "Add a contact" from the SOS screen bounced straight back, and
  // so did anything else the person tried. The alert is allowed to come to
  // you once — it is not allowed to hold you there.
  const at = useRef(pathname);
  at.current = pathname;
  const previous = useRef<Phase | null>(null);

  useEffect(() => {
    if (phase === previous.current) return;
    previous.current = phase;

    const to = phase === "ALERT" ? "/alert" : phase === "SOS_SENT" ? "/sos" : null;
    if (to) {
      if (at.current !== to) navigate(to, { replace: true });
      return;
    }
    // Stood down. Only move someone who is actually looking at one of
    // these — never yank a user off a screen they navigated to themselves.
    if (EMERGENCY.includes(at.current)) navigate("/tonight", { replace: true });
  }, [phase, navigate]);

  return <Outlet />;
}
