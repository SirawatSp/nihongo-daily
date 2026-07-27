import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DEFAULT_TOLERANCE,
  HINT_FOR_REASON,
  KVG_SIZE,
  STRICT_TOLERANCE,
  scoreStroke,
  type Point,
  type StrokeScore,
} from '../lib/stroke';

/** Samples an SVG path into points using the browser's own path geometry. */
function samplePath(d: string, samples = 32): Point[] {
  const el = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  el.setAttribute('d', d);
  // getTotalLength needs the element in a document in some engines.
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.style.position = 'absolute';
  svg.style.width = '0';
  svg.style.height = '0';
  svg.appendChild(el);
  document.body.appendChild(svg);
  try {
    const len = el.getTotalLength();
    if (!len || !Number.isFinite(len)) return [];
    return Array.from({ length: samples }, (_, i) => {
      const p = el.getPointAtLength((len * i) / (samples - 1));
      return { x: p.x, y: p.y };
    });
  } catch {
    return [];
  } finally {
    svg.remove();
  }
}

export interface KanjiCanvasProps {
  /** Ordered SVG path data, one entry per stroke. */
  strokes: string[];
  /** Show the outline of the stroke you're on. */
  showHints: boolean;
  strict?: boolean;
  /** Fired once every stroke has been accepted. */
  onComplete: (scores: StrokeScore[]) => void;
  size?: number;
}

export default function KanjiCanvas({
  strokes,
  showHints,
  strict = false,
  onComplete,
  size = 300,
}: KanjiCanvasProps) {
  const [index, setIndex] = useState(0);
  const [drawing, setDrawing] = useState<Point[]>([]);
  const [scores, setScores] = useState<StrokeScore[]>([]);
  const [hint, setHint] = useState<string | null>(null);
  const [misses, setMisses] = useState(0);
  const [demoStroke, setDemoStroke] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const drawingRef = useRef<Point[]>([]);
  const done = index >= strokes.length;

  // Reset when the character changes.
  useEffect(() => {
    setIndex(0);
    setDrawing([]);
    setScores([]);
    setHint(null);
    setMisses(0);
    drawingRef.current = [];
  }, [strokes]);

  const reference = strokes[index];

  /** Screen coordinates → KanjiVG's 109-unit space. */
  const toLocal = useCallback((e: React.PointerEvent): Point => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: ((e.clientX - rect.left) / rect.width) * KVG_SIZE,
      y: ((e.clientY - rect.top) / rect.height) * KVG_SIZE,
    };
  }, []);

  const start = (e: React.PointerEvent) => {
    if (done) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = toLocal(e);
    drawingRef.current = [p];
    setDrawing([p]);
    setHint(null);
  };

  const move = (e: React.PointerEvent) => {
    if (done || drawingRef.current.length === 0) return;
    const p = toLocal(e);
    const last = drawingRef.current[drawingRef.current.length - 1]!;
    // Skip micro-movements so the polyline stays clean.
    if (Math.hypot(p.x - last.x, p.y - last.y) < 0.6) return;
    drawingRef.current = [...drawingRef.current, p];
    setDrawing(drawingRef.current);
  };

  const end = () => {
    if (done || !reference) return;
    const drawn = drawingRef.current;
    drawingRef.current = [];
    if (drawn.length < 2) {
      setDrawing([]);
      return;
    }
    const refPoints = samplePath(reference);
    const result = scoreStroke(drawn, refPoints, strict ? STRICT_TOLERANCE : DEFAULT_TOLERANCE);
    setDrawing([]);

    if (!result.pass) {
      setMisses((m) => m + 1);
      setHint(HINT_FOR_REASON[result.reason]);
      return;
    }
    setMisses(0);
    setHint(null);
    const nextScores = [...scores, result];
    setScores(nextScores);
    const nextIndex = index + 1;
    setIndex(nextIndex);
    if (nextIndex >= strokes.length) onComplete(nextScores);
  };

  /** Animate the current stroke as a demonstration. */
  const showMe = () => {
    setDemoStroke(index);
    window.setTimeout(() => setDemoStroke(null), 1400);
  };

  const startDot = reference ? samplePath(reference, 4)[0] : undefined;

  return (
    <div className="flex flex-col items-center">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${KVG_SIZE} ${KVG_SIZE}`}
        width={size}
        height={size}
        role="application"
        aria-label={`Kanji writing area, stroke ${Math.min(index + 1, strokes.length)} of ${strokes.length}`}
        className="touch-none select-none rounded-2xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
      >
        {/* Guide grid — the standard quadrant lines used on practice paper. */}
        <g stroke="currentColor" className="text-zinc-200 dark:text-zinc-700" strokeWidth="0.5">
          <line x1="54.5" y1="0" x2="54.5" y2={KVG_SIZE} strokeDasharray="4 4" />
          <line x1="0" y1="54.5" x2={KVG_SIZE} y2="54.5" strokeDasharray="4 4" />
        </g>

        {/* Strokes already accepted. */}
        {strokes.slice(0, index).map((d, i) => (
          <path
            key={`done-${i}`}
            d={d}
            fill="none"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-zinc-900 dark:text-zinc-100"
          />
        ))}

        {/* Faint outline of the stroke you're on. */}
        {!done && showHints && reference && (
          <path
            d={reference}
            fill="none"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-zinc-300 dark:text-zinc-600"
          />
        )}

        {/* Animated demonstration of the current stroke. */}
        {demoStroke !== null && strokes[demoStroke] && (
          <path
            d={strokes[demoStroke]}
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-accent dark:text-accent-dark"
            style={{
              strokeDasharray: 200,
              strokeDashoffset: 200,
              animation: 'kanji-trace 1.3s ease-out forwards',
            }}
          />
        )}

        {/* Where this stroke begins. */}
        {!done && startDot && (
          <circle
            cx={startDot.x}
            cy={startDot.y}
            r="3"
            className="fill-accent dark:fill-accent-dark"
            opacity="0.85"
          />
        )}

        {/* What the user is drawing right now. */}
        {drawing.length > 1 && (
          <polyline
            points={drawing.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-accent dark:text-accent-dark"
          />
        )}
      </svg>

      <div className="mt-3 flex min-h-11 items-center gap-3">
        <p aria-live="polite" className="text-sm text-zinc-500">
          {done
            ? 'Complete.'
            : (hint ?? `Stroke ${index + 1} of ${strokes.length}`)}
        </p>
        {!done && misses >= 2 && (
          <button
            onClick={showMe}
            className="min-h-11 rounded-lg px-3 text-sm text-accent dark:text-accent-dark"
          >
            Show me
          </button>
        )}
      </div>
    </div>
  );
}
