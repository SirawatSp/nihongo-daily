// Kana tables, confusable-pair weighting, drill deck construction.
// Pure functions only; randomness is injected for testability.

export interface KanaEntry {
  char: string;
  romaji: string;
  script: 'hiragana' | 'katakana';
}

export interface KanaStat {
  char: string;
  seen: number;
  correct: number;
  lastSeen: number;
}

const H: [string, string][] = [
  ['あ', 'a'], ['い', 'i'], ['う', 'u'], ['え', 'e'], ['お', 'o'],
  ['か', 'ka'], ['き', 'ki'], ['く', 'ku'], ['け', 'ke'], ['こ', 'ko'],
  ['さ', 'sa'], ['し', 'shi'], ['す', 'su'], ['せ', 'se'], ['そ', 'so'],
  ['た', 'ta'], ['ち', 'chi'], ['つ', 'tsu'], ['て', 'te'], ['と', 'to'],
  ['な', 'na'], ['に', 'ni'], ['ぬ', 'nu'], ['ね', 'ne'], ['の', 'no'],
  ['は', 'ha'], ['ひ', 'hi'], ['ふ', 'fu'], ['へ', 'he'], ['ほ', 'ho'],
  ['ま', 'ma'], ['み', 'mi'], ['む', 'mu'], ['め', 'me'], ['も', 'mo'],
  ['や', 'ya'], ['ゆ', 'yu'], ['よ', 'yo'],
  ['ら', 'ra'], ['り', 'ri'], ['る', 'ru'], ['れ', 're'], ['ろ', 'ro'],
  ['わ', 'wa'], ['を', 'wo'], ['ん', 'n'],
];

const K: [string, string][] = [
  ['ア', 'a'], ['イ', 'i'], ['ウ', 'u'], ['エ', 'e'], ['オ', 'o'],
  ['カ', 'ka'], ['キ', 'ki'], ['ク', 'ku'], ['ケ', 'ke'], ['コ', 'ko'],
  ['サ', 'sa'], ['シ', 'shi'], ['ス', 'su'], ['セ', 'se'], ['ソ', 'so'],
  ['タ', 'ta'], ['チ', 'chi'], ['ツ', 'tsu'], ['テ', 'te'], ['ト', 'to'],
  ['ナ', 'na'], ['ニ', 'ni'], ['ヌ', 'nu'], ['ネ', 'ne'], ['ノ', 'no'],
  ['ハ', 'ha'], ['ヒ', 'hi'], ['フ', 'fu'], ['ヘ', 'he'], ['ホ', 'ho'],
  ['マ', 'ma'], ['ミ', 'mi'], ['ム', 'mu'], ['メ', 'me'], ['モ', 'mo'],
  ['ヤ', 'ya'], ['ユ', 'yu'], ['ヨ', 'yo'],
  ['ラ', 'ra'], ['リ', 'ri'], ['ル', 'ru'], ['レ', 're'], ['ロ', 'ro'],
  ['ワ', 'wa'], ['ヲ', 'wo'], ['ン', 'n'],
];

export const KANA_TABLE: KanaEntry[] = [
  ...H.map(([char, romaji]): KanaEntry => ({ char, romaji, script: 'hiragana' })),
  ...K.map(([char, romaji]): KanaEntry => ({ char, romaji, script: 'katakana' })),
];

const byChar = new Map(KANA_TABLE.map((k) => [k.char, k]));

/** Visually similar pairs the drill is weighted toward. */
export const CONFUSABLE_PAIRS: [string, string][] = [
  ['さ', 'ち'], ['ぬ', 'め'], ['わ', 'な'], ['る', 'ろ'], ['れ', 'ね'],
  ['シ', 'ツ'], ['ン', 'ソ'], ['ク', 'ワ'],
];

const CONFUSABLE_SET = new Set(CONFUSABLE_PAIRS.flat());

export const GRADUATION_REPS = 20;
export const GRADUATION_ACCURACY = 0.9;

/** >90% accuracy over 20+ reps takes a character out of rotation. */
export function isGraduated(stat: KanaStat | undefined): boolean {
  if (!stat || stat.seen < GRADUATION_REPS) return false;
  return stat.correct / stat.seen > GRADUATION_ACCURACY;
}

/** Confusables get 4x the weight of ordinary characters. */
export function weightFor(char: string, stat: KanaStat | undefined): number {
  if (isGraduated(stat)) return 0;
  return CONFUSABLE_SET.has(char) ? 4 : 1;
}

export interface DrillItem {
  entry: KanaEntry;
  options: string[]; // 4 romaji options, correct one included
  answerIndex: number;
}

type Rng = () => number; // [0, 1)

function pickWeighted(entries: KanaEntry[], weights: number[], rng: Rng): KanaEntry {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < entries.length; i++) {
    r -= weights[i] ?? 0;
    if (r <= 0) return entries[i] as KanaEntry;
  }
  return entries[entries.length - 1] as KanaEntry;
}

function optionsFor(entry: KanaEntry, rng: Rng): { options: string[]; answerIndex: number } {
  const pool = [...new Set(KANA_TABLE.map((k) => k.romaji))].filter((r) => r !== entry.romaji);
  const distractors: string[] = [];
  // Prefer the reading of the confusable partner as a distractor.
  const partner = CONFUSABLE_PAIRS.find((p) => p.includes(entry.char));
  if (partner) {
    const other = partner[0] === entry.char ? partner[1] : partner[0];
    const otherRomaji = byChar.get(other)?.romaji;
    if (otherRomaji && otherRomaji !== entry.romaji) distractors.push(otherRomaji);
  }
  while (distractors.length < 3) {
    const cand = pool[Math.floor(rng() * pool.length)];
    if (cand && !distractors.includes(cand)) distractors.push(cand);
  }
  const answerIndex = Math.floor(rng() * 4);
  const options = [...distractors.slice(0, 3)];
  options.splice(answerIndex, 0, entry.romaji);
  return { options, answerIndex };
}

/** Build a drill deck of `count` items, weighted toward confusables. */
export function buildDrill(
  stats: ReadonlyMap<string, KanaStat>,
  count: number,
  rng: Rng = Math.random,
): DrillItem[] {
  let entries = KANA_TABLE.filter((k) => !isGraduated(stats.get(k.char)));
  if (entries.length === 0) entries = [...KANA_TABLE]; // everyone graduated — free review
  const weights = entries.map((k) => Math.max(weightFor(k.char, stats.get(k.char)), 1));
  const items: DrillItem[] = [];
  let lastChar = '';
  for (let i = 0; i < count; i++) {
    let entry = pickWeighted(entries, weights, rng);
    if (entry.char === lastChar && entries.length > 1) entry = pickWeighted(entries, weights, rng);
    lastChar = entry.char;
    items.push({ entry, ...optionsFor(entry, rng) });
  }
  return items;
}

export function recordAnswer(stat: KanaStat | undefined, char: string, correct: boolean, now: number): KanaStat {
  const base = stat ?? { char, seen: 0, correct: 0, lastSeen: now };
  return { char, seen: base.seen + 1, correct: base.correct + (correct ? 1 : 0), lastSeen: now };
}
