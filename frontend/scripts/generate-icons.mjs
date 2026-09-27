#!/usr/bin/env node
// Issue #144: the app icon set, generated rather than hand-drawn.
//
// The mark is a "Q" for Quorum: a blue ring with a diagonal tail on the dark
// surface the app already uses. It has to survive being drawn at 16px in a
// browser tab, so the geometry is stroke-based and the palette is the app's own
// (background #0d1520, accent #60a5fa).
//
// Everything is rasterised here with a signed-distance coverage test and 4x4
// supersampling, and encoded as PNG by hand, so the build needs no image
// dependency. Run it after changing the geometry:
//
//   node scripts/generate-icons.mjs
//
// The SVG under app/ is the source of truth for the vector render; this script
// writes the rasters Next.js and the manifest need.

import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const APP_DIR = join(dirname(fileURLToPath(import.meta.url)), "..");

/** The app's palette. Matches the surfaces in app/globals.css. */
const BACKGROUND = [0x0d, 0x15, 0x20];
const ACCENT = [0x60, 0xa5, 0xfa];

/**
 * The mark, in fractions of the icon's edge length. The ring sits slightly
 * above centre so the tail has room inside the rounded square.
 */
const MARK = {
  backgroundRadius: 0.22,
  ring: { cx: 0.46, cy: 0.44, radius: 0.26, width: 0.115 },
  tail: { from: [0.55, 0.62], to: [0.79, 0.86], width: 0.115 },
};

/** Samples per axis per pixel. 4 is enough to keep the ring's edge smooth. */
const SUPERSAMPLE = 4;

/** Distance from point p to segment ab, in normalised icon units. */
function distanceToSegment(px, py, [ax, ay], [bx, by]) {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;
  // Degenerate segment: fall back to the endpoint distance.
  const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Signed distance to a rounded square, negative inside. */
function distanceToRoundedSquare(px, py, half, radius) {
  const dx = Math.abs(px - 0.5) - (half - radius);
  const dy = Math.abs(py - 0.5) - (half - radius);
  return Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) + Math.min(Math.max(dx, dy), 0) - radius;
}

/** Coverage of the mark at a point in [0, 1]², as [r, g, b, a]. */
function sample(x, y) {
  const background = distanceToRoundedSquare(x, y, 0.5, MARK.backgroundRadius);
  const { cx, cy, radius, width } = MARK.ring;
  const ring = Math.abs(Math.hypot(x - cx, y - cy) - radius) - width / 2;
  const tail = distanceToSegment(x, y, MARK.tail.from, MARK.tail.to) - MARK.tail.width / 2;
  const mark = Math.min(ring, tail);

  if (mark <= 0) return [...ACCENT, 255];
  if (background <= 0) return [...BACKGROUND, 255];
  return [0, 0, 0, 0];
}

/**
 * Rasterises the mark to a straight (non-premultiplied) RGBA buffer.
 *
 * `opaque` also drops the rounded corners: iOS masks an apple-touch-icon itself,
 * so anything left outside the square would be shown as black.
 */
function rasterise(size, { opaque = false } = {}) {
  const pixels = Buffer.alloc(size * size * 4);
  const step = 1 / (size * SUPERSAMPLE);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      // Average the supersampled colours, premultiplied so a partly covered
      // transparent edge does not bleed the background into the mark.
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < SUPERSAMPLE; sy += 1) {
        for (let sx = 0; sx < SUPERSAMPLE; sx += 1) {
          const [sr, sg, sb, sa] = sample((x * SUPERSAMPLE + sx + 0.5) * step, (y * SUPERSAMPLE + sy + 0.5) * step);
          r += sr * sa;
          g += sg * sa;
          b += sb * sa;
          a += sa;
        }
      }
      const total = SUPERSAMPLE * SUPERSAMPLE;
      const offset = (y * size + x) * 4;
      if (opaque && a === 0) {
        pixels[offset] = BACKGROUND[0];
        pixels[offset + 1] = BACKGROUND[1];
        pixels[offset + 2] = BACKGROUND[2];
        pixels[offset + 3] = 255;
        continue;
      }
      const alpha = a / total;
      // A fully transparent pixel has no defined colour; keep it black.
      pixels[offset] = alpha ? Math.round(r / a) : 0;
      pixels[offset + 1] = alpha ? Math.round(g / a) : 0;
      pixels[offset + 2] = alpha ? Math.round(b / a) : 0;
      pixels[offset + 3] = Math.round(alpha);
    }
  }
  return pixels;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

/**
 * Encodes RGBA pixels as a PNG.
 *
 * `opaque` drops the alpha channel: the iOS home screen composites an
 * apple-touch-icon itself, and a fully transparent icon renders as a black
 * square there.
 */
function encodePng(size, pixels, { opaque = false } = {}) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = opaque ? 2 : 6; // colour type: truecolour, or truecolour + alpha
  // 10..12 are compression, filter and interlace, all zero.

  const channels = opaque ? 3 : 4;
  const stride = size * channels;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y += 1) {
    const row = y * (stride + 1);
    raw[row] = 0; // filter type: none
    for (let x = 0; x < size; x += 1) {
      const source = (y * size + x) * 4;
      const target = row + 1 + x * channels;
      raw[target] = pixels[source];
      raw[target + 1] = pixels[source + 1];
      raw[target + 2] = pixels[source + 2];
      if (!opaque) raw[target + 3] = pixels[source + 3];
    }
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", header),
    pngChunk("IDAT", deflateSync(raw, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

/**
 * Wraps PNGs in an ICO container.
 *
 * The PNG-in-ICO form is what every browser that matters has read for years;
 * embedding the raster rather than a BMP keeps this script to one encoder.
 */
function encodeIco(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(entries.length, 4);

  const directory = Buffer.alloc(16 * entries.length);
  let offset = header.length + directory.length;
  entries.forEach((entry, index) => {
    const at = index * 16;
    directory[at] = entry.size >= 256 ? 0 : entry.size; // 0 means 256
    directory[at + 1] = entry.size >= 256 ? 0 : entry.size;
    directory[at + 2] = 0; // palette size, for BMP payloads only
    directory[at + 3] = 0; // reserved
    directory.writeUInt16LE(1, at + 4); // colour planes
    directory.writeUInt16LE(32, at + 6); // bits per pixel
    directory.writeUInt32BE(0, at + 8);
    directory.writeUInt32LE(entry.png.length, at + 8);
    directory.writeUInt32LE(offset, at + 12);
    offset += entry.png.length;
  });

  return Buffer.concat([header, directory, ...entries.map((entry) => entry.png)]);
}

/** The vector form, matching MARK exactly. */
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="Quorum">
  <rect width="512" height="512" rx="113" fill="#0d1520" />
  <circle cx="${MARK.ring.cx * 512}" cy="${MARK.ring.cy * 512}" r="${MARK.ring.radius * 512}" fill="none" stroke="#60a5fa" stroke-width="${MARK.ring.width * 512}" />
  <line x1="${MARK.tail.from[0] * 512}" y1="${MARK.tail.from[1] * 512}" x2="${MARK.tail.to[0] * 512}" y2="${MARK.tail.to[1] * 512}" stroke="#60a5fa" stroke-width="${MARK.tail.width * 512}" stroke-linecap="butt" />
</svg>
`;

const written = [];
function write(path, data) {
  writeFileSync(join(APP_DIR, path), data);
  written.push(`${path} (${data.length} bytes)`);
}

// The head links: a 32px tab icon with a 16px entry for high-DPI scaling.
const favicon = encodeIco(
  [32, 16].map((size) => ({ size, png: encodePng(size, rasterise(size)) })),
);
write("app/favicon.ico", favicon);
// iOS reads apple-touch-icon straight off the home screen shortcut.
write("app/apple-icon.png", encodePng(180, rasterise(180, { opaque: true })));
// The manifest's own icons. Public, so the manifest can name a stable URL
// rather than the hashed path Next.js gives the files in app/.
write("public/icon-192.png", encodePng(192, rasterise(192, { opaque: true })));
write("public/icon-512.png", encodePng(512, rasterise(512, { opaque: true })));
write("app/icon.svg", Buffer.from(svg, "utf8"));

console.log(written.join("\n"));
