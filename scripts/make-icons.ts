// Generates the PWA icons (192, 512, maskable 512) without any image
// library: draws 日 as rectangles into an RGBA buffer and encodes PNG
// by hand (zlib deflate + CRC32).
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const BG = [24, 24, 27]; // zinc-900
const FG = [96, 165, 250]; // blue-400

function crc32(buf: Uint8Array): number {
  let c = ~0;
  for (const byte of buf) {
    c ^= byte;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  out.set([...type].map((ch) => ch.charCodeAt(0)), 4);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

function encodePng(size: number, rgba: Uint8Array): Uint8Array {
  const ihdr = new Uint8Array(13);
  const v = new DataView(ihdr.buffer);
  v.setUint32(0, size);
  v.setUint32(4, size);
  ihdr.set([8, 6, 0, 0, 0], 8); // 8-bit RGBA
  const raw = new Uint8Array(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter: none
    raw.set(rgba.subarray(y * size * 4, (y + 1) * size * 4), y * (size * 4 + 1) + 1);
  }
  const sig = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const parts = [
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', new Uint8Array(deflateSync(raw))),
    chunk('IEND', new Uint8Array(0)),
  ];
  const total = parts.reduce((n, p) => n + p.length, 0);
  const png = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    png.set(p, off);
    off += p.length;
  }
  return png;
}

function fillRect(px: Uint8Array, size: number, x0: number, y0: number, x1: number, y1: number, rgb: number[]) {
  for (let y = Math.max(0, y0); y < Math.min(size, y1); y++) {
    for (let x = Math.max(0, x0); x < Math.min(size, x1); x++) {
      const i = (y * size + x) * 4;
      px[i] = rgb[0] ?? 0;
      px[i + 1] = rgb[1] ?? 0;
      px[i + 2] = rgb[2] ?? 0;
      px[i + 3] = 255;
    }
  }
}

/** 日: outer rectangle ring + middle horizontal bar. `pad` scales the glyph. */
function drawIcon(size: number, pad: number): Uint8Array {
  const px = new Uint8Array(size * size * 4);
  fillRect(px, size, 0, 0, size, size, BG);
  const g0 = Math.round(size * pad);
  const g1 = size - g0;
  const stroke = Math.max(4, Math.round(size * 0.075));
  // Slightly narrower than tall, like the real glyph.
  const inset = Math.round((g1 - g0) * 0.08);
  const left = g0 + inset;
  const right = g1 - inset;
  fillRect(px, size, left, g0, right, g0 + stroke, FG); // top
  fillRect(px, size, left, g1 - stroke, right, g1, FG); // bottom
  fillRect(px, size, left, g0, left + stroke, g1, FG); // left
  fillRect(px, size, right - stroke, g0, right, g1, FG); // right
  const midY = Math.round((g0 + g1) / 2 - stroke / 2);
  fillRect(px, size, left, midY, right, midY + stroke, FG); // middle bar
  return px;
}

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'icon-192.png'), encodePng(192, drawIcon(192, 0.22)));
writeFileSync(join(outDir, 'icon-512.png'), encodePng(512, drawIcon(512, 0.22)));
// Maskable: bigger safe zone so the glyph survives circular masks.
writeFileSync(join(outDir, 'maskable-512.png'), encodePng(512, drawIcon(512, 0.3)));
console.log('Icons written to public/icons/');
