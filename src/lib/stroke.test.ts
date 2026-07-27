import { describe, it, expect } from 'vitest';
import {
  characterAccuracy,
  DEFAULT_TOLERANCE,
  meanDeviation,
  pathLength,
  resample,
  scoreStroke,
  STRICT_TOLERANCE,
  type Point,
} from './stroke';

/** A straight reference stroke, left to right across the middle. */
const horizontal: Point[] = [
  { x: 20, y: 55 },
  { x: 90, y: 55 },
];
const vertical: Point[] = [
  { x: 55, y: 15 },
  { x: 55, y: 95 },
];

/** Densely sample a straight line, as a real drawn stroke would be. */
function line(from: Point, to: Point, n = 40): Point[] {
  return Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1);
    return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
  });
}

/** Add a small sinusoidal wobble, imitating a shaky finger. */
function wobble(points: Point[], amount: number): Point[] {
  return points.map((p, i) => ({ x: p.x, y: p.y + Math.sin(i / 3) * amount }));
}

describe('pathLength', () => {
  it('measures a straight line', () => {
    expect(pathLength(line({ x: 0, y: 0 }, { x: 10, y: 0 }))).toBeCloseTo(10, 5);
  });
  it('is 0 for a single point', () => {
    expect(pathLength([{ x: 5, y: 5 }])).toBe(0);
  });
});

describe('resample', () => {
  it('returns exactly the requested number of points', () => {
    expect(resample(line({ x: 0, y: 0 }, { x: 100, y: 0 }), 32)).toHaveLength(32);
    expect(resample(line({ x: 0, y: 0 }, { x: 100, y: 0 }), 8)).toHaveLength(8);
  });

  it('keeps the original endpoints', () => {
    const out = resample(line({ x: 3, y: 4 }, { x: 77, y: 21 }), 16);
    expect(out[0]).toEqual({ x: 3, y: 4 });
    expect(out[out.length - 1]).toEqual({ x: 77, y: 21 });
  });

  it('spaces points evenly along a straight line', () => {
    const out = resample(line({ x: 0, y: 0 }, { x: 100, y: 0 }), 11);
    // Every step should be ~10 units.
    for (let i = 1; i < out.length; i++) {
      expect(out[i]!.x - out[i - 1]!.x).toBeCloseTo(10, 1);
    }
  });

  it('handles a degenerate zero-length stroke without dividing by zero', () => {
    const out = resample([{ x: 5, y: 5 }, { x: 5, y: 5 }], 8);
    expect(out).toHaveLength(8);
    expect(out.every((p) => p.x === 5 && p.y === 5)).toBe(true);
  });

  it('returns nothing for an empty input', () => {
    expect(resample([], 10)).toEqual([]);
  });
});

describe('meanDeviation', () => {
  it('is 0 for identical polylines', () => {
    const a = resample(line({ x: 0, y: 0 }, { x: 50, y: 50 }));
    expect(meanDeviation(a, a)).toBeCloseTo(0, 6);
  });
  it('equals the offset for a uniformly shifted polyline', () => {
    const a = resample(line({ x: 0, y: 0 }, { x: 50, y: 0 }));
    const b = a.map((p) => ({ x: p.x, y: p.y + 5 }));
    expect(meanDeviation(a, b)).toBeCloseTo(5, 6);
  });
});

describe('scoreStroke', () => {
  it('accepts a stroke drawn right on the reference', () => {
    const r = scoreStroke(line(horizontal[0]!, horizontal[1]!), horizontal);
    expect(r.pass).toBe(true);
    expect(r.reason).toBe('ok');
    expect(r.score).toBeGreaterThan(0.9);
  });

  it('accepts a slightly shaky stroke — this is practice, not calligraphy', () => {
    const drawn = wobble(line(horizontal[0]!, horizontal[1]!), 4);
    expect(scoreStroke(drawn, horizontal).pass).toBe(true);
  });

  it('rejects a stroke that starts in the wrong place', () => {
    const r = scoreStroke(line({ x: 20, y: 15 }, { x: 90, y: 15 }), horizontal);
    expect(r.pass).toBe(false);
    expect(r.reason).toBe('start');
  });

  it('rejects a stroke that stops short of the end', () => {
    const r = scoreStroke(line({ x: 20, y: 55 }, { x: 48, y: 55 }), horizontal);
    expect(r.pass).toBe(false);
    expect(['end', 'too-short']).toContain(r.reason);
  });

  it('rejects a backwards stroke, since wrong direction is the habit to avoid', () => {
    const r = scoreStroke(line(horizontal[1]!, horizontal[0]!), horizontal);
    expect(r.pass).toBe(false);
    expect(r.reason).toBe('direction');
  });

  it('rejects a tap instead of a stroke', () => {
    const r = scoreStroke(
      [
        { x: 20, y: 55 },
        { x: 21, y: 55 },
      ],
      horizontal,
    );
    expect(r.pass).toBe(false);
    expect(r.reason).toBe('too-short');
  });

  it('rejects the wrong axis entirely', () => {
    expect(scoreStroke(line(vertical[0]!, vertical[1]!), horizontal).pass).toBe(false);
  });

  it('never throws on empty input', () => {
    expect(scoreStroke([], horizontal).pass).toBe(false);
    expect(scoreStroke(line(horizontal[0]!, horizontal[1]!), []).pass).toBe(false);
  });

  it('strict mode rejects wobble that default mode allows', () => {
    // ~11 units of mean deviation: inside the default shape tolerance (20),
    // outside strict (9).
    const drawn = wobble(line(horizontal[0]!, horizontal[1]!), 22);
    expect(scoreStroke(drawn, horizontal, DEFAULT_TOLERANCE).pass).toBe(true);
    expect(scoreStroke(drawn, horizontal, STRICT_TOLERANCE).pass).toBe(false);
  });

  it('scores a close stroke higher than a sloppy one', () => {
    const close = scoreStroke(line(horizontal[0]!, horizontal[1]!), horizontal).score;
    const sloppy = scoreStroke(wobble(line(horizontal[0]!, horizontal[1]!), 10), horizontal).score;
    expect(close).toBeGreaterThan(sloppy);
  });

  it('allows a short dot stroke against a short reference', () => {
    const dot: Point[] = [
      { x: 50, y: 50 },
      { x: 54, y: 55 },
    ];
    expect(scoreStroke(dot, dot).pass).toBe(true);
  });
});

describe('characterAccuracy', () => {
  it('averages the per-stroke scores', () => {
    const acc = characterAccuracy([
      { pass: true, score: 1, reason: 'ok' },
      { pass: true, score: 0.5, reason: 'ok' },
    ]);
    expect(acc).toBe(0.75);
  });
  it('is 0 with no strokes', () => {
    expect(characterAccuracy([])).toBe(0);
  });
});
