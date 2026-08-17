/**
 * The wordmark's geometry, kept apart from the component that draws it.
 *
 * DESIGN §2 spends 1500 words on where these strokes are cut, which makes a
 * second copy of them the most expensive kind of duplication: the splash
 * images are generated from this file too, and a copy would drift silently
 * into two slightly different logos shipping in the same APK.
 *
 * Construction: uniform stroke, circular arcs only, flat terminals, wide
 * tracking. Cut only at joins the eye can complete, at most once per letter
 * — and not every letter gets one.
 *
 * Grid: cap height 100, baseline y=100.
 */

type Glyph = { advance: number; d: string[] };

const GLYPHS: Record<string, Glyph> = {
  // Leg detached from the bowl; small gap so it still connects visually.
  R: {
    advance: 64,
    d: [
      "M2 0V100",
      "M2 2H36A25 25 0 0 1 36 52H2",
      "M26 56L58 100",
    ],
  },
  // Floating middle bar — the signature cut.
  E: {
    advance: 58,
    d: ["M2 0V100", "M2 2H52", "M16 50H46", "M2 98H52"],
  },
  // Bowl detached from the stem at both ends.
  P: {
    advance: 64,
    d: ["M2 0V100", "M14 2H36A25 25 0 0 1 36 52H14"],
  },
  // Left stem stops short of the curve.
  U: {
    advance: 66,
    d: ["M2 0V60", "M2 70A29 30 0 0 0 60 70", "M60 0V70"],
  },
  // No cut, on purpose. A floating bar needs two stems bracketing it
  // for the eye to complete it; L has only one, so a cut here reads
  // as two separate marks.
  L: {
    advance: 52,
    d: ["M2 0V98H50"],
  },
  // Gap at the middle inflection, wide enough to read as intentional.
  S: {
    advance: 60,
    d: [
      "M56 20C56 8 44 2 30 2C16 2 4 14 4 26C4 38 14 46 26 46",
      "M34 54C46 54 56 62 56 74C56 86 44 98 30 98C16 98 4 92 4 80",
    ],
  },
};

const LETTERS = "REPULSE".split("");
const TRACKING = 26;

/** Padded by the stroke's half-width on every side, which is what the
 *  renderers use as their viewBox. */
export const VIEW_BOX = { x: -2, y: -2, height: 104 };

export function layout() {
  let x = 0;
  const out: { d: string[]; x: number }[] = [];
  for (const ch of LETTERS) {
    const g = GLYPHS[ch]!;
    out.push({ d: g.d, x });
    x += g.advance + TRACKING;
  }
  return { glyphs: out, width: x - TRACKING };
}
