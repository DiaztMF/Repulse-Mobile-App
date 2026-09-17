/**
 * How loud the white noise gets, and where that choice lives.
 *
 * §4.4 has carried `volume` 0-3 from the beginning, but nothing outside
 * the test panel could ever set it: the ladder sent a hardcoded 2 and the
 * person trying to sleep had no say. Loudness is the one intervention
 * setting that is genuinely personal — the level that settles one person
 * keeps the next one awake.
 *
 * Device-local, like the baseline. It decides what this phone sends
 * tonight, and nothing else depends on it.
 */
const KEY = "repulse.noiseLevel";

/** 0 is not offered. §7.2 can pick white noise as the intervention for a
 *  restless spell, and a level of 0 would let it be chosen and then do
 *  nothing at all — an intervention that reports success having made no
 *  sound. Somebody who wants silence should turn the intervention off,
 *  which is a different setting from how loud it is. */
export type NoiseLevel = 1 | 2 | 3;

export const DEFAULT_NOISE_LEVEL: NoiseLevel = 2;

export function readNoiseLevel(): NoiseLevel {
  try {
    const n = Number(localStorage.getItem(KEY));
    return n === 1 || n === 2 || n === 3 ? n : DEFAULT_NOISE_LEVEL;
  } catch {
    return DEFAULT_NOISE_LEVEL;
  }
}

export function writeNoiseLevel(level: NoiseLevel) {
  try {
    localStorage.setItem(KEY, String(level));
  } catch {
    // Storage refused. The default still works, and a night that runs at
    // level 2 is better than a settings screen that throws.
  }
}

/** Which of the bedside's microSD files plays: 0001-0003. 0004 is the
 *  siren and is deliberately not a NoiseTrack — firmware clamps it too. */
const TRACK_KEY = "repulse.noiseTrack";

export type NoiseTrack = 1 | 2 | 3;

export const DEFAULT_NOISE_TRACK: NoiseTrack = 1;

export function readNoiseTrack(): NoiseTrack {
  try {
    const n = Number(localStorage.getItem(TRACK_KEY));
    return n === 1 || n === 2 || n === 3 ? n : DEFAULT_NOISE_TRACK;
  } catch {
    return DEFAULT_NOISE_TRACK;
  }
}

export function writeNoiseTrack(track: NoiseTrack) {
  try {
    localStorage.setItem(TRACK_KEY, String(track));
  } catch {
    // Same as the level: the default track still plays.
  }
}
