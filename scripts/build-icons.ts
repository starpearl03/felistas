// Builds the site's icons from one design: Dusk's glyph orb lit like a moon at dusk, on a dusk tile.
// Run `npm run icons` after changing the design; the outputs are committed.
//
//   src/app/icon.svg        vector icon for browsers that take SVG
//   src/app/icon.png        192x192, a multiple of 48: what Google shows in search results
//   src/app/apple-icon.png  180x180 for iOS home screens
//   src/app/favicon.ico     16, 32 and 48 px for Bing, older browsers and bookmarks
//   public/icon-512.png     512x512 (and a maskable variant) for the web app manifest
//
// Small sizes get a simpler orb (a shaded sphere instead of dots), so the mark stays crisp at 16px.
// The lit crescent reads the same at every size.
import { writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { PALETTE, sphereStill } from "../src/lib/palette";

const ROOT = process.cwd();
const out = (...p: string[]) => path.join(ROOT, ...p);

// Geometry on a 512 canvas
const C = 256;
const R = 168;
/** The lit side carries the weight, so the orb sits a little right and down to look centred */
const OX = C + 16;
const OY = C + 12;

/** Light from the upper left, a little toward the viewer: a crescent at dusk */
const LIGHT = (() => {
  const v = [-0.62, -0.58, 0.53];
  const n = Math.hypot(...v);
  return v.map((x) => x / n);
})();

const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a: string, b: string, t: number) => {
  const [x, y] = [hex(a), hex(b)];
  return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(",")})`;
};

type Variant = "detailed" | "simple";

/**
 * The icon as SVG: Dusk's orb lit like a moon at dusk. "detailed" draws it in glyph dots (the lit
 * side large and bright, the far side fading to faint specks); "simple" is the same light on a
 * shaded sphere, for 16 to 48 px. `maskable` fills the square and keeps the mark in the safe zone.
 */
export function iconSvg(variant: Variant, { maskable = false } = {}): string {
  const scale = maskable ? 0.8 : 1;
  const tileRadius = maskable ? 0 : 116;

  let orb: string;
  if (variant === "detailed") {
    orb = sphereStill(340, 0.35, 0.4)
      .filter((d) => d.z > -0.15)
      .sort((a, b) => a.z - b.z)
      .map((d) => {
        const lit = Math.max(0, d.x * LIGHT[0] + d.y * LIGHT[1] + d.z * LIGHT[2]);
        const shade = Math.pow(lit, 0.75);
        const r = 1.6 + shade * 8.6;
        const colour =
          shade < 0.12 ? "#5a3247" : mix(PALETTE.acc, "#fff3f7", Math.min(1, shade * 1.15));
        const opacity = (0.22 + shade * 0.78).toFixed(2);
        return `<circle cx="${(OX + d.x * R).toFixed(1)}" cy="${(OY + d.y * R).toFixed(1)}" r="${r.toFixed(1)}" fill="${colour}" opacity="${opacity}"/>`;
      })
      .join("");
  } else {
    orb = `<circle cx="${OX}" cy="${OY}" r="${R}" fill="url(#ball)"/>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
<defs>
  <radialGradient id="tile" cx="34%" cy="28%" r="90%">
    <stop offset="0" stop-color="#2e1827"/>
    <stop offset=".5" stop-color="#170d15"/>
    <stop offset="1" stop-color="${PALETTE.bg}"/>
  </radialGradient>
  <radialGradient id="glow" cx="38%" cy="36%" r="50%">
    <stop offset="0" stop-color="${PALETTE.acc}" stop-opacity=".38"/>
    <stop offset=".6" stop-color="${PALETTE.acc}" stop-opacity=".1"/>
    <stop offset="1" stop-color="${PALETTE.acc}" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="ball" cx="34%" cy="31%" fx="24%" fy="21%" r="82%">
    <stop offset="0" stop-color="#fff6f9"/>
    <stop offset=".16" stop-color="${PALETTE.acc2}"/>
    <stop offset=".36" stop-color="${PALETTE.acc}"/>
    <stop offset=".56" stop-color="#7a3e5a"/>
    <stop offset=".76" stop-color="#2f1724"/>
    <stop offset="1" stop-color="#1c0f17"/>
  </radialGradient>
  <linearGradient id="rim" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${PALETTE.acc2}" stop-opacity=".55"/>
    <stop offset=".55" stop-color="${PALETTE.acc}" stop-opacity=".12"/>
    <stop offset="1" stop-color="${PALETTE.acc}" stop-opacity=".3"/>
  </linearGradient>
  <clipPath id="tileClip"><rect width="512" height="512" rx="${tileRadius}"/></clipPath>
</defs>
<g clip-path="url(#tileClip)">
  <rect width="512" height="512" fill="url(#tile)"/>
  <g transform="translate(${C} ${C}) scale(${scale}) translate(${-C} ${-C})">
    <circle cx="${OX}" cy="${OY}" r="${R * 1.5}" fill="url(#glow)"/>
    ${orb}
    <circle cx="${OX}" cy="${OY}" r="${R + (variant === "simple" ? 4 : 10)}" fill="none" stroke="url(#rim)" stroke-width="${variant === "simple" ? 9 : 3}"/>
  </g>
</g>
</svg>`;
}

const png = (svg: string, size: number) =>
  sharp(Buffer.from(svg), { density: 72 * Math.max(1, size / 512) * 2 })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toBuffer();

/** An .ico holding PNG images, which every current browser and Bing read. */
function ico(images: { size: number; data: Buffer }[]): Buffer {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  const entries: Buffer[] = [];
  let offset = 6 + 16 * images.length;
  for (const { size, data } of images) {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0);
    e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt8(0, 2);
    e.writeUInt8(0, 3);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += data.length;
    entries.push(e);
  }
  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
}

async function main() {
  const detailed = iconSvg("detailed");
  const simple = iconSvg("simple");
  // Above 64px the dotted orb reads; below it, the shaded one does
  // Search results, tabs and bookmarks show the icon at 16 to 32 px: the shaded orb. Home screens and
  // the installed app show it large: the glyph orb.
  await writeFile(out("src/app/icon.svg"), simple);
  await writeFile(out("src/app/icon.png"), await png(simple, 192));
  await writeFile(out("src/app/apple-icon.png"), await png(detailed, 180));
  await writeFile(
    out("src/app/favicon.ico"),
    ico(
      await Promise.all(
        [16, 32, 48].map(async (size) => ({ size, data: await png(simple, size) })),
      ),
    ),
  );
  await writeFile(out("public/icon-512.png"), await png(detailed, 512));
  await writeFile(
    out("public/icon-maskable-512.png"),
    await png(iconSvg("detailed", { maskable: true }), 512),
  );
  console.log(
    "icons: wrote icon.svg, icon.png, apple-icon.png, favicon.ico, icon-512.png, icon-maskable-512.png",
  );
}

if (process.argv[1]?.includes("build-icons")) void main();
