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
import { readNoiseLevel, readNoiseTrack } from "@/lib/noise";
import { readSunset } from "@/lib/sunset";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { RepulseMonitor } from "repulse-monitor";
import { MockTransport, type Scenario } from "@/ble/mock";
import { LiveTransport } from "@/ble/live";
import { useAuth } from "@/firebase/auth";
import { armSos, defaultOwner } from "@/lib/sos";
import { fetchInterventions, saveNight, saveVerification } from "@/firebase/nights";
import { useStore } from "@/data/store";
import type { Night } from "@/data/mock";
import { NightRecorder, nightDate } from "@/data/night";
import { DEFAULT_BASELINE_BPM, readBaseline, writeBaseline } from "@/lib/baseline";
import { readTuning } from "@/lib/tuning";
import { fetchBaseline } from "@/firebase/onboarding";
import type {
  Actuator,
  BandCommand,
  BandConfig,
  BandStatus,
  BleEvent,
  BleTransport,
  Device,
  Link,
  Oxygen,
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
  /** §3.5. Apa yang dilihat band, supaya layar ALERT tidak menebak apakah
   *  temuannya irama tidak teratur atau denyut di luar rentang biasa. */
  stageReason: Machine["reason"];
  rows: Machine["rows"];
  links: Record<Device, Link>;
  vitals: Vitals | null;
  room: Room | null;
  /** §3.2, live. Null until the band reports a valid reading. */
  oxygen: Oxygen | null;
  motionMg: number;
  /** §3.6. Null until the band has reported once — which is not the same
   *  as a band with a flat battery, and D2 has to be able to say which. */
  bandStatus: BandStatus | null;
  /** True while a sleep session is running, which is what dims the whole
   *  interface. Owned here so the rule cannot drift into screens. */
  isNight: boolean;
  /** Epoch ms the running session started, or null. */
  sessionAt: number | null;
  /** The phone's Bluetooth switch, live. Null until the radio has started
   *  and answered — a browser never answers. */
  bluetooth: boolean | null;
  /** Running on synthetic events rather than a band. Every screen that
   *  shows a number has to be able to say so — DESIGN §12. */
  synthetic: boolean;
  startSleep: () => void;
  /** §5.1 sunset: the lamp starts at the chosen colour and dims to dark. */
  windDown: () => void;
  /** Watches and records, runs no comfort intervention. Emergencies are
   *  untouched — a test mode that silences the siren is not a test mode. */
  monitorOnly: boolean;
  setMonitorOnly: (on: boolean) => void;
  endSession: () => void;
  /** "I am okay", tapped. The band is still the authority — if it reports
   *  the stage again this comes straight back — but the phone in someone's
   *  reach is a second path, and it has to actually work. */
  standDown: () => void;
  /** Straight through to the devices. The conformance screen needs to
   *  drive each characteristic on its own, outside the state machine. */
  send: (a: Actuator, opts?: { unclamped?: boolean }) => Promise<void>;
  /** Drops one device and lets the scan find it again. */
  release: (device: Device) => Promise<void>;
  /** "Look again, now." The only control a person has when automatic
   *  recovery is not recovering. */
  retry: (device?: Device) => Promise<void>;
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

/** Device-local, and it has to survive a reload: a night begun in monitor
 *  only must not start dosing the room because somebody refreshed. */
const MONITOR_ONLY_KEY = "repulse.monitorOnly";

/** A night the last launch could not finish writing. See the rescue
 *  handler below for why it exists and why it is localStorage. */
const PENDING_NIGHT_KEY = "repulse.pendingNight";

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
  const { user } = useAuth();
  const uid = user?.uid;
  const [scores, setScores] = useState<Scores>(NO_SCORES);
  const [transport, setTransport] = useState<BleTransport | null>(null);
  const [vitals, setVitals] = useState<Vitals | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [oxygen, setOxygen] = useState<Oxygen | null>(null);
  /** When the running session began. Null between sessions — the Tonight
   *  screen printed "Monitoring · 3h 44m" from a constant without it. */
  const [sessionAt, setSessionAt] = useState<number | null>(null);
  const [motionMg, setMotionMg] = useState(0);
  /** Set when the bedside answers a command with a non-zero status, and
   *  read when the spell that command belonged to is written down. */
  const refused = useRef(false);
  const [bandStatus, setBandStatus] = useState<BandStatus | null>(null);
  const [bluetooth, setBluetooth] = useState<boolean | null>(null);
  const [monitorOnly, setMonitorOnlyState] = useState(() => {
    try {
      return localStorage.getItem(MONITOR_ONLY_KEY) === "1";
    } catch {
      return false;
    }
  });
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

  /* The store fetches once per sign-in, so a night written after that
   * was invisible until the app was relaunched. This is what tells it to
   * look again. */
  const refreshNights = useStore().refresh;

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
        case "ack":
          /* §4.4. Nothing read this before, and the silence cost the
           * learning loop its honesty: the bedside refuses aroma once the
           * night's four events are spent (status 2), the app went on
           * counting the attempt, and five minutes later scored it failed.
           * Enough of those and §7.2 concludes the diffuser never works
           * and stops choosing it — from a limit, not from the sleeper.
           *
           * A refusal means no intervention happened, which is exactly
           * what `bedside_offline` already means to the recorder. */
          if (e.status !== "done") {
            refused.current = true;
            console.warn(`[bedside] command ${e.commandId} came back ${e.status}`);
          }
          break;
        case "radio":
          setBluetooth(e.on);
          break;
        case "link":
          setLinks((l) => ({ ...l, [e.device]: e.state }));
          /* A reading has to die with its device. Nothing here was ever
           * cleared, so a band that dropped at 02:00 left its last pulse
           * and SpO2 on the screen until morning, drawn exactly like a
           * live one — and `messageBody` would have put that hours-old
           * bpm inside an SOS. The screens already draw a dash for null;
           * they were simply never given one. */
          if (e.state !== "connected") {
            if (e.device === "band") {
              setVitals(null);
              setOxygen(null);
              setBandStatus(null);
              setMotionMg(0);
            } else {
              setRoom(null);
            }
          }
          dispatch({ t: "link", device: e.device, up: e.state === "connected" });
          break;
        case "escalation":
          // Mirrored, never decided here. PRD §4.1.
          dispatch({ t: "stage", at: e.data.at, stage: e.data.stage, reason: e.data.reason });
          break;
        case "sos":
          // The button is a person saying "now". §3.5 reason 3 covers it,
          // and the band reports the stage itself — this is the path for
          // when we heard the press before the stage.
          dispatch({ t: "stage", at: e.data.at, stage: 4, reason: "manual" });
          break;
        // §3.6. Battery, charge state, and the band's own clock — the last
        // of which is a silent failure mode: a drifted clock corrupts
        // settle times without ever looking wrong on a screen.
        case "oxygen":
          /* Held so a screen can show it live. The night recorder keeps its
           * own copy for scoring; this one is only ever what is on the air
           * right now. Zero on the wire means "not valid", never zero
           * percent, so a zero must not replace a good reading. */
          if (e.data.spo2Pct > 0) setOxygen(e.data);
          break;
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
    /* `held` is the last real pulse being shown again because the sensor
     * is between beats, and §3.1 is explicit that it may be displayed and
     * may not be decided on. Without this line a substituted number could
     * open a COMFORT window, and the diffuser would fire on a reading the
     * band never took. The night record already excludes held samples; the
     * trigger did not. */
    if (!vitals?.worn || vitals.held) return;
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
    // §D1 monitor only: the spell is still recorded and still scored, and
    // nothing is sent to settle it. The reducer keeps running so the night
    // reads the same afterwards.
    if (monitorOnly) return;
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
        ? ({ kind: "noise", level: readNoiseLevel() } as const)
        : pick === "aroma"
          ? ({ kind: "aroma", seconds: 25 } as const)
          : ({ kind: "light", mode: "off" } as const);
    refused.current = false;
    void transport.send(command);
    dispatch({
      t: "chose",
      intervention: pick,
      ...(pick === "white_noise" ? { volume: readNoiseLevel(), track: readNoiseTrack() } : {}),
    });
  }, [transport, phase, machine.comfort, scores, monitorOnly]);

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
      // A refused command is an intervention that never ran. Scored as a
      // failure it teaches the opposite of what happened.
      const unrun = row.bedside_offline || refused.current;
      recorder.current?.comfort(
        Date.parse(row.timestamp),
        row.intervention && !unrun
          ? row.intervention.type === "light"
            ? "dim_light"
            : row.intervention.type
          : undefined,
        row.settle_time_s,
        unrun,
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

    /**
     * The night, in case nothing ever ends it politely.
     *
     * Until now the only write was the cleanup below, and a React cleanup
     * does not run when a process dies. Force-quit the app, let Android
     * reclaim it, close the browser tab: eight hours of a night existed
     * only in memory and went with it. There was no partial record and no
     * trace that anything had been recorded at all.
     *
     * `pagehide` and not `visibilitychange`, deliberately. Hidden fires
     * every single night when the screen goes off, and `finish` closes
     * the open staging window as a side effect, so snapshotting on hidden
     * would chop the night into five-minute fragments. `pagehide` fires
     * when the page is actually being torn down or frozen.
     *
     * Written to localStorage rather than Firestore because this has
     * milliseconds and no network. The flush that follows it is at the
     * top of the next launch, and `saveNight` keeps the longest session
     * of an evening — so if the night does end properly later, the fuller
     * record wins and this snapshot is simply discarded.
     */
    const rescue = () => {
      const r = recorder.current;
      if (!r) return;
      try {
        const night = r.finish(Date.now(), nightDate(r.startedAt));
        localStorage.setItem(PENDING_NIGHT_KEY, JSON.stringify(night));
        console.log("[night] snapshot kept for the next launch");
      } catch (e) {
        console.error("[night] snapshot failed", e);
      }
    };
    window.addEventListener("pagehide", rescue);

    return () => {
      window.removeEventListener("pagehide", rescue);
      const r = recorder.current;
      recorder.current = null;
      if (!r) return;
      /* Written however short it was. §5.2 says a brief session is
       * recorded and never scored, and `finish` has already withheld the
       * score — throwing it away instead was my own invention, and it is
       * the opposite of what the rule asks for. `saveNight` protects the
       * date from being overwritten by something shorter. */
      const night = r.finish(Date.now(), nightDate(r.startedAt));
      /* The snapshot has served its purpose the moment a real end exists,
       * and leaving it would replay a shorter night at the next launch. */
      try {
        localStorage.removeItem(PENDING_NIGHT_KEY);
      } catch {
        // Then the flush below writes it and saveNight keeps the longer.
      }
      void saveNight(uid, night)
        .then(refreshNights)
        .catch((e) => console.error("[night] not saved", e));
    };
  }, [startedAt, uid, refreshNights]);

  /**
   * Whatever the last launch could not finish writing.
   *
   * Runs once a session is signed in, before anything else touches the
   * account, so a rescued night is in Firestore before the store reads
   * it. A snapshot that cannot be parsed is dropped rather than retried
   * forever.
   */
  useEffect(() => {
    if (!uid) return;
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(PENDING_NIGHT_KEY);
    } catch {
      return;
    }
    if (!raw) return;
    let night: Night;
    try {
      night = JSON.parse(raw) as Night;
      if (typeof night?.date !== "string") throw new Error("no date");
    } catch (e) {
      console.error("[night] snapshot unreadable, dropped", e);
      try {
        localStorage.removeItem(PENDING_NIGHT_KEY);
      } catch {
        // Nothing left to do about it.
      }
      return;
    }
    void saveNight(uid, night)
      .then(() => {
        console.log("[night] rescued", night.date);
        try {
          localStorage.removeItem(PENDING_NIGHT_KEY);
        } catch {
          // It will be written again next launch, harmlessly.
        }
        refreshNights();
      })
      .catch((e) => console.error("[night] rescue failed, kept for next time", e));
  }, [uid, refreshNights]);

  /* Denyut istirahat akun ini, dipulihkan ke perangkat baru.
   *
   * Kalibrasi menyimpan dua salinan: satu lokal untuk keputusan di sisi
   * aplikasi, satu di akun supaya ponsel berikutnya tidak perlu mengukur
   * ulang. Ini setengah yang membaca salinan akun itu — hanya kalau lokal
   * memang kosong, karena yang lokal selalu lebih baru.
   *
   * Yang lain tidak ikut dipulihkan, dan itu disengaja: izin Android dan
   * nomor kontak benar-benar hilang saat aplikasi dipasang ulang, jadi
   * memulihkannya akan melewatkan seseorang dari layar yang memberi izin
   * yang dibutuhkan malamnya. Denyut istirahat tidak hilang ke mana-mana. */
  useEffect(() => {
    if (!uid || readBaseline() !== null) return;
    let live = true;
    void fetchBaseline(uid).then((bpm) => {
      if (!live || bpm === null) return;
      writeBaseline(bpm);
      console.log("[baseline] dipulihkan dari akun:", bpm);
    });
    return () => {
      live = false;
    };
  }, [uid]);

  /* Dan diteruskan ke gelang setiap kali ia tersambung.
   *
   * §3.7 menaruh tangga eskalasi di firmware supaya ia tetap jalan tanpa
   * ponsel — tetapi itu berarti gelang memakai SALINANNYA SENDIRI, dan
   * satu-satunya yang pernah menuliskannya adalah layar kalibrasi. Gelang
   * yang baru diflash, atau ponsel baru yang tidak mengulang kalibrasi,
   * menjalankan seluruh malam dengan 62 bpm pabrik. Dikirim di sini, bukan
   * di sana, karena "setiap kali tersambung" adalah kapan ia dibutuhkan. */
  useEffect(() => {
    if (!transport || links.band !== "connected") return;
    const bpm = readBaseline();
    /* Seluruh set, bukan cuma denyut istirahat. Layar Settings mengirim
     * setiap perubahan saat itu juga, tetapi gelang yang mati semalaman
     * — atau baru diflash — kembali ke default pabriknya, dan satu-satunya
     * saat yang tahu nilai sebenarnya adalah ponsel. */
    void transport
      .configure({ ...readTuning(), ...(bpm === null ? {} : { baseline_bpm: bpm }) })
      .catch(() => {
        // Gelang tetap punya salinan lamanya. Tidak ada yang rusak.
      });
  }, [transport, links.band]);

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

  /* The end of the sunset, which is the start of the night proper.
   *
   * `asleep` is the only event that moves WIND_DOWN to MONITORING, and
   * nothing in the app had ever sent it — so the phase sat in WIND_DOWN
   * until somebody tapped again, with the comfort ladder switched off for
   * as long as it did. The timer matches the ramp the bedside was given,
   * so the phase changes at the moment the lamp reaches dark.
   *
   * ponytail: a timer, not a clock. A phone whose JavaScript is frozen by
   * the screen going off wakes late rather than never — and the band's own
   * escalation never depended on this in the first place. */
  useEffect(() => {
    if (phase !== "WIND_DOWN") return;
    const id = setTimeout(
      () => dispatch({ t: "asleep", at: Date.now() }),
      readSunset().rampS * 1000,
    );
    return () => clearTimeout(id);
  }, [phase]);

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

  /**
   * The browser's answer to the foreground service, such as it is.
   *
   * A night recorded in a tab ends the moment the screen sleeps: the
   * timers stop, the notifications stop arriving, and the recorder
   * counts the silence as offline minutes. A screen wake lock is the only
   * thing a page is given here, and it holds only while the tab is
   * visible — which is exactly the deal the site is offered under. It is
   * not a substitute for the service, and the phone still keeps the one
   * that works with the screen off.
   *
   * Re-requested on visibility, because the browser drops the lock every
   * time the tab is hidden and never hands it back on its own.
   */
  useEffect(() => {
    if (Capacitor.isNativePlatform() || !isNight) return;
    const wake = (navigator as Navigator & {
      wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> };
    }).wakeLock;
    if (!wake) return;

    let held: { release: () => Promise<void> } | null = null;
    let live = true;

    const take = () => {
      if (!live || document.visibilityState !== "visible" || held) return;
      void wake
        .request("screen")
        .then((s) => {
          if (!live) return void s.release().catch(() => {});
          held = s;
          console.log("[web] screen wake lock held for the night");
        })
        .catch((e) => console.warn("[web] no wake lock; the night ends when the screen sleeps", e));
    };

    const onVisible = () => {
      held = null;
      take();
    };
    take();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      live = false;
      document.removeEventListener("visibilitychange", onVisible);
      void held?.release().catch(() => {});
    };
  }, [isNight]);

  /**
   * The web's share of "ask the phone to light up".
   *
   * Stage 3's contract text is a hard buzz and a screen that lights
   * itself. The buzz is the band's and happens either way; the screen is
   * Android's full-screen intent, and no browser has an equivalent or is
   * going to get one. A notification is what is actually on offer: it
   * reaches somebody whose tab is behind another window, and it does
   * nothing at all for somebody whose phone is locked.
   *
   * Only while the tab is hidden. A notification for a screen the person
   * is already looking at is noise on top of an alert.
   */
  useEffect(() => {
    if (Capacitor.isNativePlatform()) return;
    if (machine.stage < 3) return;
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    if (document.visibilityState === "visible") return;
    try {
      const n = new Notification("RePulse: something looks wrong", {
        body: "Open RePulse. Nobody has been contacted yet.",
        tag: "repulse-alert",
        requireInteraction: true,
      } as NotificationOptions);
      n.onclick = () => {
        window.focus();
        n.close();
      };
      return () => n.close();
    } catch (e) {
      console.warn("[web] alert notification refused", e);
    }
  }, [machine.stage]);

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
    /* Monitor only holds back the two phases that exist to act on the
     * room — the comfort set and the sunset. ALERT and SOS_SENT still go
     * out, and so does every all-off set, because "no interventions" was
     * never meant to mean "no siren". */
    const acting = phase === "COMFORT" || phase === "WIND_DOWN";
    if (monitorOnly && acting) return;
    for (const a of actuatorsFor(phase, readNoiseLevel())) void transport.send(a);
  }, [transport, phase, monitorOnly]);

  // --- controls ----------------------------------------------------------

  const value = useMemo<Monitor>(() => {
    const send = (i: Input) => dispatch(i);
    return {
      phase,
      stage: machine.stage,
      stageReason: machine.reason,
      rows: machine.rows,
      links,
      vitals,
      room,
      oxygen,
      motionMg,
      bandStatus,
      isNight,
      sessionAt,
      bluetooth,
      monitorOnly,
      setMonitorOnly: (on: boolean) => {
        setMonitorOnlyState(on);
        try {
          localStorage.setItem(MONITOR_ONLY_KEY, on ? "1" : "0");
        } catch {
          // Storage refused. The switch still holds for this run.
        }
      },
      synthetic: transport instanceof MockTransport,
      // `sunset-due` existed in the machine and nothing ever sent it, so the
      // sunset could not run at all.
      windDown: () => send({ t: "sunset-due", at: Date.now() }),
      startSleep: () => {
        /* Only from before the night, which is also the only place the
         * reducer accepts it (PRIORITY ≥ WIND_DOWN). The elapsed clock here
         * did not know that, so the session screen opening a second time
         * would have restarted "Monitoring · 3h" from zero. */
        if (phase !== "STANDBY" && phase !== "WIND_DOWN") return;
        setSessionAt(Date.now());
        /* The native sender is loaded here, before the screen goes dark.
         * From this point the emergency message can leave the phone with
         * no JavaScript running at all, which is the only state the phone
         * is reliably in when the band reports stage 4 at 3am. */
        defaultOwner(user?.email?.split("@")[0] ?? "Someone");
        void armSos(vitals?.bpm);
        /* Asked here because here there is a tap.
         *
         * A browser cannot wake a sleeping screen the way the native
         * full-screen intent does, and nothing will give it that. What it
         * can do is put an alert in front of somebody whose tab is behind
         * another window, and a permission prompt needs a gesture to be
         * anything other than an annoyance somebody blocks forever. This
         * is the one gesture that means "I am going to sleep now". */
        if (!Capacitor.isNativePlatform() && typeof Notification !== "undefined") {
          if (Notification.permission === "default") {
            void Notification.requestPermission().catch(() => {});
          }
        }
        /* One button, two ways in. The sunset is the first 25 minutes of
         * the night rather than a separate thing somebody has to know to
         * press first — and either way the recorder starts now, because
         * both events set `sessionStartedAt`. Tapping it again from inside
         * the sunset skips the rest of the ramp, which is what somebody
         * already in bed means by it. */
        if (phase === "STANDBY" && readSunset().startWithSunset) {
          send({ t: "sunset-due", at: Date.now() });
          return;
        }
        send({ t: "start-sleep", at: Date.now() });
      },
      endSession: () => {
        setSessionAt(null);
        send({ t: "session-end", at: Date.now(), reason: "wake" });
      },
      standDown: () => {
        /* The band hears it too. §3.8's stand_down is the only way off
         * stage 4: without it the band went on broadcasting an emergency
         * nobody was having, the bedside sounded it the moment the phone
         * left the room, and every rescan put the SOS screen back up. */
        void transport?.command({ cmd: "stand_down" }).catch(() => {});
        send({ t: "stage", at: Date.now(), stage: 0 });
      },
      retry: async (device) => {
        /* Paired once but the transport never came up — Bluetooth off at
         * launch is the usual way into this — so there is nothing to ask
         * politely. Build one and start it. */
        if (!transport) {
          const live = new LiveTransport();
          setTransport(live);
          /* `retry`, not `start`. The transport's own retry starts a radio
           * that is not running and then goes on to look — which on the
           * web means opening the chooser. Calling `start` here stopped
           * short of that, so the first tap did nothing visible and only
           * the second one asked. */
          await live.retry(device).catch((e) => console.error("[ble] retry failed", e));
          return;
        }
        await transport?.retry(device);
      },
      release: async (device) => {
        await transport?.release(device);
      },
      send: async (a, opts) => transport?.send(a, opts),
      command: async (c) => transport?.command(c),
      configure: async (c) => transport?.configure(c),
      listen: (fn) => transport?.on(fn) ?? (() => {}),
      connect: async () => {
        /* The web reaches here too now.
         *
         * It used to return false on anything but a phone, which is what
         * made repulse.web.app a picture of the app rather than the app:
         * every screen asked for a radio, was told there was none, and
         * fell back to sample data. `start()` on the web sets up and stops
         * short of finding anything, because Web Bluetooth has no scan a
         * page may begin unasked. `retry()` is the gesture that asks.
         *
         * A radio that is already up is left alone.
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
    // `oxygen` and `sessionAt` were missing here. Nothing else changes at
    // the moment an SpO2 notification lands, so the memo returned the old
    // object, React saw an unchanged context value, and no consumer ever
    // re-rendered: the band reported saturation all night and the screens
    // showed the first reading forever.
  }, [
    phase,
    machine.stage,
    user?.email,
    machine.reason,
    machine.rows,
    links,
    vitals,
    room,
    oxygen,
    motionMg,
    bandStatus,
    isNight,
    sessionAt,
    bluetooth,
    monitorOnly,
    transport,
  ]);

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
