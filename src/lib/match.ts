// Fuzzy Japanese answer comparison for the speaking block.
// Pure functions only. A failed match never blocks progress.

export const PASS_THRESHOLD = 0.75;

const PUNCT = /[\s、。，．,.!?！？・「」『』（）()～~ー―\-:：;；'"…]/g;

/** Convert katakana code points to hiragana. */
export function kataToHira(s: string): string {
  return s.replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60));
}

/** Strip whitespace/punctuation, lowercase latin, katakana → hiragana. */
export function normalizeJa(s: string): string {
  return kataToHira(s.toLowerCase().replace(PUNCT, ''));
}

const PARTICLES = ['は', 'が', 'を', 'に', 'で', 'へ', 'と', 'も', 'の', 'ね', 'よ', 'か'];

/** Remove single-particle characters — used for a particle-tolerant second pass. */
export function stripParticles(s: string): string {
  let out = s;
  for (const p of PARTICLES) out = out.split(p).join('');
  return out;
}

/** Reduce polite endings to a common stem so politeness-only diffs are ignored. */
export function stripPoliteness(s: string): string {
  return s
    .replace(/ください$/u, '')
    .replace(/(です|ます|でした|ました|ませんでした|ません)(か)?$/u, '')
    .replace(/だ$/u, '');
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min((cur[j - 1] ?? 0) + 1, (prev[j] ?? 0) + 1, (prev[j - 1] ?? 0) + cost);
    }
    prev = cur;
  }
  return prev[b.length] ?? 0;
}

export function levRatio(a: string, b: string): number {
  const max = Math.max(a.length, b.length);
  if (max === 0) return 1;
  return 1 - levenshtein(a, b) / max;
}

export interface MatchResult {
  pass: boolean;
  score: number; // best ratio across variants, 0..1
}

/**
 * Compare a transcript against the expected answer.
 * `expected` carries both the written form (may contain kanji) and its kana
 * reading — the transcript matches if it is close to either, so kanji and
 * kana readings are treated as equivalent.
 */
export function matchAnswer(
  transcript: string,
  expected: { ja: string; kana: string },
): MatchResult {
  const t = normalizeJa(transcript);
  const targets = [normalizeJa(expected.ja), normalizeJa(expected.kana)];

  let score = 0;
  for (const target of targets) {
    score = Math.max(score, levRatio(t, target));
    // Particle-only differences are ignored.
    score = Math.max(score, levRatio(stripParticles(t), stripParticles(target)));
    // Politeness-level-only differences are ignored.
    score = Math.max(
      score,
      levRatio(stripPoliteness(stripParticles(t)), stripPoliteness(stripParticles(target))),
    );
  }
  return { pass: score >= PASS_THRESHOLD, score: Math.round(score * 100) / 100 };
}
