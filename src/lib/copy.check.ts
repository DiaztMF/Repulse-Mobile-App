/** Run: npm run check:copy
 *
 *  Acceptance criterion A4. Four sentences in this product are bound by
 *  compliance, and three words are banned outright — but the ban only
 *  holds if something checks it, because the failure is a word nobody
 *  notices in review until a judge reads it off the screen.
 *
 *  The list is English because the interface is English. The original
 *  list was Indonesian, left over from before the 12 August decision,
 *  which meant a build claiming "sent automatically" passed it clean.
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const SRC = join(import.meta.dirname, "..");

/** Lowercase. "disorder" and "diagnosis" are banned by DESIGN.md §12;
 *  the last three are the false claim PRD.md §12.3 forbids, in both
 *  languages because a stray Indonesian string is still a violation. */
const BANNED = [
  "apnea",
  "diagnosis",
  "disorder",
  "sent automatically",
  "automatically sent",
  "terkirim otomatis",
];

/**
 * Comments stripped, line numbers kept. Without this the checker fails
 * on copy.ts, whose comment spells out the very words it is banning —
 * and a checker that cries wolf on its own source gets deleted.
 *
 * `//` after a colon is left alone so a URL is not mistaken for a comment.
 */
function visible(source: string): string[] {
  let inBlock = false;

  return source.split("\n").map((line) => {
    let out = "";

    for (let i = 0; i < line.length; i++) {
      if (inBlock) {
        if (line.startsWith("*/", i)) {
          inBlock = false;
          i++;
        }
        continue;
      }
      if (line.startsWith("/*", i)) {
        inBlock = true;
        i++;
        continue;
      }
      if (line.startsWith("//", i) && line[i - 1] !== ":") break;
      out += line[i];
    }

    return out;
  });
}

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sources(path);
    // The checkers themselves hold the banned words on purpose.
    if (entry.name.endsWith(".check.ts")) return [];
    return /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

const hits = sources(SRC).flatMap((file) =>
  visible(readFileSync(file, "utf8")).flatMap((line, i) => {
    const lower = line.toLowerCase();
    return BANNED.filter((word) => lower.includes(word)).map(
      (word) => `${relative(SRC, file).replaceAll("\\", "/")}:${i + 1} — "${word}"`,
    );
  }),
);

assert.deepEqual(
  hits,
  [],
  `banned wording reached the interface:\n  ${hits.join("\n  ")}\n`,
);

console.log(`ok — ${BANNED.length} banned terms absent from every screen`);
