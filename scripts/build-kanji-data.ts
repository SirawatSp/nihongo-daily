/**
 * One-off generator for src/data/kanji.json. Requires network; NOT part of
 * CI or the build. Re-run manually only when the vocab set changes:
 *
 *   npx tsx scripts/build-kanji-data.ts
 *
 * Sources (both CC BY-SA, see README "Content credits"):
 *   - KanjiVG        stroke paths in stroke order    http://kanjivg.tagaini.net
 *   - KANJIDIC2      meanings + on/kun readings      http://www.edrdg.org/kanjidic
 *
 * Only kanji that actually appear in vocab.json are bundled, keeping the
 * offline payload small.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const CACHE = process.env.KANJI_CACHE_DIR ?? '/tmp/kanji-build';
const KANJIVG_URL =
  'https://github.com/KanjiVG/kanjivg/releases/download/r20230110/kanjivg-20230110.xml.gz';
const KANJIDIC_URL =
  'https://raw.githubusercontent.com/davidluzgouveia/kanji-data/master/kanji.json';

function fetchCached(url: string, name: string): Buffer {
  const path = join(CACHE, name);
  if (!existsSync(path)) {
    execFileSync('mkdir', ['-p', CACHE]);
    execFileSync('curl', ['-sSL', '-o', path, url]);
  }
  return readFileSync(path);
}

const isKanji = (ch: string) => /[一-鿿]/.test(ch);

interface VocabRow {
  kanji: string;
  exampleJa: string;
}
interface DicRow {
  strokes?: number;
  jlpt_new?: number | null;
  meanings?: string[];
  readings_on?: string[];
  readings_kun?: string[];
}

const vocab = JSON.parse(readFileSync('src/data/vocab.json', 'utf8')) as VocabRow[];
const needed = new Set<string>();
for (const v of vocab) {
  for (const ch of v.kanji + v.exampleJa) if (isKanji(ch)) needed.add(ch);
}

const kvg = gunzipSync(fetchCached(KANJIVG_URL, 'kanjivg.xml.gz')).toString('utf8');
// Deliberately ignores the source's WaniKani-derived `wk_*` fields, which are
// not openly licensed. Only KANJIDIC-derived fields are read below.
const dic = JSON.parse(fetchCached(KANJIDIC_URL, 'kanji.json').toString('utf8')) as Record<
  string,
  DicRow
>;

function strokesFor(ch: string): string[] {
  const code = ch.codePointAt(0)!.toString(16).padStart(5, '0');
  const block = kvg.match(new RegExp(`<kanji id="kvg:kanji_${code}">[\\s\\S]*?</kanji>`));
  if (!block) return [];
  // KanjiVG emits <path> elements in stroke order (ids ...-s1, -s2, ...).
  // Path data is copied verbatim: rewriting coordinates risks merging two
  // numbers when a negative sign is the only separator (`1.5-0.04`), which
  // silently truncates the curve.
  return [...block[0].matchAll(/<path [^>]*?\bd="([^"]+)"/g)].map((m) => m[1]!);
}

function jlptOf(n: number | null | undefined): 'N5' | 'N4' | 'N3' | null {
  if (n === 5) return 'N5';
  if (n === 4) return 'N4';
  if (n === 3 || n === 2 || n === 1) return 'N3'; // app tops out at N3
  return null;
}

const out: unknown[] = [];
const missing: string[] = [];
const mismatched: string[] = [];

for (const ch of [...needed].sort()) {
  const strokes = strokesFor(ch);
  const meta = dic[ch];
  if (strokes.length === 0 || !meta?.meanings?.length) {
    missing.push(ch);
    continue;
  }
  // Cross-check the two sources agree on stroke count; skip if they disagree
  // rather than shipping a kanji whose guide might mislead.
  if (typeof meta.strokes === 'number' && meta.strokes !== strokes.length) {
    mismatched.push(`${ch}(kvg:${strokes.length} vs dic:${meta.strokes})`);
    continue;
  }
  out.push({
    char: ch,
    strokes,
    meanings: meta.meanings.slice(0, 4).map((m) => m.toLowerCase()),
    on: (meta.readings_on ?? []).slice(0, 3),
    kun: (meta.readings_kun ?? []).slice(0, 3),
    jlpt: jlptOf(meta.jlpt_new),
  });
}

writeFileSync('src/data/kanji.json', JSON.stringify(out, null, 0) + '\n');
console.log(`wrote src/data/kanji.json: ${out.length} kanji`);
if (missing.length) console.log(`skipped (no data): ${missing.join('')}`);
if (mismatched.length) console.log(`skipped (stroke-count mismatch): ${mismatched.join(' ')}`);
