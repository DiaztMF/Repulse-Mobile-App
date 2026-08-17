/**
 * Generates the Android launch images from the wordmark itself.
 *
 *   npm run splash
 *
 * Capacitor's template ships a blue X on white, which is Capacitor's brand
 * and not ours — and it is the very first thing anyone sees, before a single
 * line of the app has run. These replace it: `Ember Base` with the wordmark
 * in `Warm Ivory`, which is exactly what O1 draws a moment later, so the
 * handover is a redraw rather than a change of scene.
 *
 * The paths come from `glyphs.ts`, the same file the app renders, so a
 * change to the mark reaches the splash by running this again — there is no
 * second copy to forget about.
 *
 * Output goes to `public/splash/`, laid out as the res/ folders it belongs
 * in, ready to be copied over `android/app/src/main/res/`.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { VIEW_BOX, layout } from "../src/components/brand/glyphs.ts";

/** tokens.css `--color-base` and `--color-ivory`. Not near-black: the app
 *  is used in a dark room and pure #000 crushes everything above it. */
const BASE = "#100d0a";
const IVORY = "#ede3d6";

/** The sizes Capacitor's template creates, and the ones the launch theme
 *  looks for. Portrait and landscape are separate images rather than one
 *  square being cropped, so the free zone survives both. */
const TARGETS: [folder: string, w: number, h: number][] = [
  ["drawable", 480, 320],
  ["drawable-land-mdpi", 480, 320],
  ["drawable-land-hdpi", 800, 480],
  ["drawable-land-xhdpi", 1280, 720],
  ["drawable-land-xxhdpi", 1600, 960],
  ["drawable-land-xxxhdpi", 1920, 1280],
  ["drawable-port-mdpi", 320, 480],
  ["drawable-port-hdpi", 480, 800],
  ["drawable-port-xhdpi", 720, 1280],
  ["drawable-port-xxhdpi", 960, 1600],
  ["drawable-port-xxxhdpi", 1280, 1920],
];

const { glyphs, width } = layout();
const BOX_W = width + 4;

function markup(w: number, h: number): string {
  // Portrait matches O1's own proportion — 260 of a 360dp screen. Landscape
  // takes a smaller share of a much wider frame so the mark stays the same
  // physical size rather than growing into a banner.
  const markW = Math.round(w * (h > w ? 0.7 : 0.44));
  const scale = markW / BOX_W;
  const markH = VIEW_BOX.height * scale;

  // DESIGN §2: stroke scales with the SVG, and below roughly a pixel the
  // mark stops looking drawn and starts looking damaged.
  const strokeWidth = markW < 400 ? 5 : 4;

  // The viewBox starts at -2,-2, so that corner is what lands at the top
  // left of the centred box.
  const x = (w - markW) / 2 - VIEW_BOX.x * scale;
  const y = (h - markH) / 2 - VIEW_BOX.y * scale;

  const paths = glyphs
    .map(
      (g) =>
        `<g transform="translate(${g.x} 0)">` +
        g.d.map((d) => `<path d="${d}"/>`).join("") +
        `</g>`,
    )
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <rect width="${w}" height="${h}" fill="${BASE}"/>
  <g transform="translate(${x} ${y}) scale(${scale})"
     fill="none" stroke="${IVORY}" stroke-width="${strokeWidth}" stroke-linecap="butt">
    ${paths}
  </g>
</svg>`;
}

const out = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "splash");

for (const [folder, w, h] of TARGETS) {
  const dir = join(out, folder);
  await mkdir(dir, { recursive: true });
  const png = await sharp(Buffer.from(markup(w, h))).png({ compressionLevel: 9 }).toBuffer();
  await writeFile(join(dir, "splash.png"), png);
  console.log(`${folder}/splash.png — ${w}x${h}, ${(png.length / 1024).toFixed(1)} KB`);
}

console.log(`\nok — ${TARGETS.length} images in public/splash/`);
