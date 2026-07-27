// Handwriting stroke comparison for the kanji writing trainer.
// Pure geometry only — no DOM, no React. The caller samples SVG paths into
// point arrays; everything here works on plain points so it stays testable.

export interface Point {
  x: number;
  y: number;
}

/** KanjiVG artwork is authored on a 109x109 canvas. */
export const KVG_SIZE = 109;

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Total length along a polyline. */
export function pathLength(points: readonly Point[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += distance(points[i - 1]!, points[i]!);
  }
  return total;
}

/**
 * Resample a polyline to exactly `count` evenly spaced points, so two
 * strokes drawn at different speeds/densities compare fairly.
 */
export function resample(points: readonly Point[], count = 32): Point[] {
  if (points.length === 0) return [];
  if (points.length === 1 || count < 2) {
    return Array.from({ length: count }, () => ({ ...points[0]! }));
  }
  const total = pathLength(points);
  if (total === 0) return Array.from({ length: count }, () => ({ ...points[0]! }));

  const step = total / (count - 1);
  const out: Point[] = [{ ...points[0]! }];
  let segIndex = 1;
  let segStart = points[0]!;
  let remaining = distance(segStart, points[1]!);
  let walked = 0;

  for (let i = 1; i < count - 1; i++) {
    let target = step;
    while (target > remaining && segIndex < points.length - 1) {
      target -= remaining;
      segStart = points[segIndex]!;
      segIndex += 1;
      remaining = distance(segStart, points[segIndex]!);
      walked = 0;
    }
    if (segIndex >= points.length) break;
    const segEnd = points[segIndex]!;
    const segLen = distance(segStart, segEnd) || 1;
    walked += target;
    const t = Math.min(1, walked / segLen);
    out.push({
      x: segStart.x + (segEnd.x - segStart.x) * t,
      y: segStart.y + (segEnd.y - segStart.y) * t,
    });
    remaining -= target;
  }
  out.push({ ...points[points.length - 1]! });
  // Guard against rounding leaving us a point short or long.
  while (out.length < count) out.push({ ...points[points.length - 1]! });
  return out.slice(0, count);
}

/** Mean point-to-point distance between two equally-sampled polylines. */
export function meanDeviation(a: readonly Point[], b: readonly Point[]): number {
  const n = Math.min(a.length, b.length);
  if (n === 0) return Infinity;
  let sum = 0;
  for (let i = 0; i < n; i++) sum += distance(a[i]!, b[i]!);
  return sum / n;
}

export interface StrokeScore {
  pass: boolean;
  /** 0..1, higher is closer to the reference. */
  score: number;
  /** Why it failed, for a useful on-screen hint. */
  reason: 'ok' | 'start' | 'end' | 'shape' | 'direction' | 'too-short';
}

export interface StrokeTolerance {
  /** Max distance between start points, in KanjiVG units. */
  start: number;
  /** Max distance between end points. */
  end: number;
  /** Max mean deviation along the stroke. */
  shape: number;
}

/** Forgiving by default: this is practice, not an exam. */
export const DEFAULT_TOLERANCE: StrokeTolerance = { start: 26, end: 26, shape: 20 };

/** Strict mode for users who want the shape held to a tighter standard. */
export const STRICT_TOLERANCE: StrokeTolerance = { start: 14, end: 14, shape: 9 };

/**
 * Compare a drawn stroke against the reference stroke.
 *
 * Checks, in order of what most usefully explains a miss: the stroke has real
 * length, starts in the right place, ends in the right place, was not drawn
 * backwards, and follows the reference shape. Direction matters because
 * writing a stroke the wrong way round is exactly the habit this drill is
 * meant to prevent.
 */
export function scoreStroke(
  drawn: readonly Point[],
  reference: readonly Point[],
  tolerance: StrokeTolerance = DEFAULT_TOLERANCE,
): StrokeScore {
  if (drawn.length < 2 || reference.length < 2) {
    return { pass: false, score: 0, reason: 'too-short' };
  }

  const refLen = pathLength(reference);
  const drawnLen = pathLength(drawn);
  // A dot/tap against a long stroke is a miss, not a sloppy hit. Very short
  // reference strokes (dots) are exempt.
  if (refLen > 12 && drawnLen < refLen * 0.35) {
    return { pass: false, score: 0, reason: 'too-short' };
  }

  const a = resample(drawn);
  const b = resample(reference);

  const startGap = distance(a[0]!, b[0]!);
  const endGap = distance(a[a.length - 1]!, b[b.length - 1]!);
  const deviation = meanDeviation(a, b);

  // Reversed: closer to the reference when compared end-to-start.
  const reversed = [...b].reverse();
  const reversedDeviation = meanDeviation(a, reversed);
  const drawnBackwards =
    reversedDeviation + 4 < deviation && distance(a[0]!, b[b.length - 1]!) < startGap;

  // Normalize each measure against its tolerance, then average.
  const norm = (value: number, limit: number) => Math.max(0, 1 - value / (limit * 2));
  const score =
    Math.round(
      ((norm(startGap, tolerance.start) +
        norm(endGap, tolerance.end) +
        norm(deviation, tolerance.shape) * 2) /
        4) *
        100,
    ) / 100;

  if (drawnBackwards) return { pass: false, score, reason: 'direction' };
  if (startGap > tolerance.start) return { pass: false, score, reason: 'start' };
  if (endGap > tolerance.end) return { pass: false, score, reason: 'end' };
  if (deviation > tolerance.shape) return { pass: false, score, reason: 'shape' };
  return { pass: true, score, reason: 'ok' };
}

export const HINT_FOR_REASON: Record<StrokeScore['reason'], string> = {
  ok: 'Nice.',
  start: 'Start the stroke closer to the marked dot.',
  end: 'Carry the stroke all the way to the end.',
  shape: 'Follow the guide line more closely.',
  direction: 'That stroke goes the other way — start at the dot.',
  'too-short': 'Draw the whole stroke, not just a tap.',
};

/** Overall accuracy for a completed character, 0..1. */
export function characterAccuracy(strokeScores: readonly StrokeScore[]): number {
  if (strokeScores.length === 0) return 0;
  const sum = strokeScores.reduce((n, s) => n + s.score, 0);
  return Math.round((sum / strokeScores.length) * 100) / 100;
}
