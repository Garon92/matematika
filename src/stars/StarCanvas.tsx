import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { computeLayout, effectiveMode, type LayoutMode } from './layout';
import { draw2D, glRadius, GLStars, hitStar, TONES, type Segment } from './render';
import { prefersReducedMotion } from '../kit';

/** Above this count (in scatter mode) stars are drawn by WebGL2. */
export const GL_THRESHOLD = 8000;
/** Hard limit (same as the original app). */
import { MAX_STARS } from '../lib/calc';
export { MAX_STARS };

export interface StarCanvasProps {
  n: number;
  segments?: readonly Segment[];
  mode?: LayoutMode;
  rows?: number;
  cols?: number;
  seed?: number;
  twinkle?: boolean;
  guides?: boolean;
  maxR?: number;
  padding?: number;
  className?: string;
  label?: string;
  /** Tap-to-count: tapping a star marks it with the next number. */
  countable?: boolean;
  /** Called with the running count after each tap (0 after un-marking all). */
  onCount?: (count: number) => void;
}

function useSize(ref: React.RefObject<HTMLElement | null>) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setSize((s) => (Math.abs(s.w - r.width) < 0.5 && Math.abs(s.h - r.height) < 0.5 ? s : { w: r.width, h: r.height }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

/** Fallback when WebGL2 is missing: hashed positions, tiny squares (capped for speed). */
function drawHashScatter(ctx: CanvasRenderingContext2D, n: number, w: number, h: number, dpr: number, seed: number, segments: readonly Segment[]) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  const limit = Math.min(n, 2_000_000);
  const s = Math.max(1, dpr * 1.4);
  let i = 0;
  for (const seg of segments) {
    ctx.fillStyle = TONES[seg.tone].fill;
    ctx.globalAlpha = TONES[seg.tone].alpha ?? 1;
    const end = Math.min(limit, i + seg.n);
    for (; i < end; i++) {
      let x = (Math.imul(i, 1664525) + 1013904223 + seed) >>> 0;
      x ^= x << 13;
      x ^= x >>> 17;
      x ^= x << 5;
      let y = (Math.imul(i, 22695477) + 1 + Math.imul(seed, 3)) >>> 0;
      y ^= y << 13;
      y ^= y >>> 17;
      y ^= y << 5;
      ctx.fillRect(((x >>> 0) / 4294967296) * w * dpr, ((y >>> 0) / 4294967296) * h * dpr, s, s);
    }
  }
  ctx.globalAlpha = 1;
}

export function StarCanvas({
  n,
  segments,
  mode = 'scatter',
  rows,
  cols,
  seed = 1,
  twinkle = false,
  guides = true,
  maxR,
  padding,
  className,
  label,
  countable = false,
  onCount,
}: StarCanvasProps) {
  const [marks, setMarks] = useState<number[]>([]);
  const wrap = useRef<HTMLDivElement>(null);
  const c2d = useRef<HTMLCanvasElement>(null);
  const cgl = useRef<HTMLCanvasElement>(null);
  const gl = useRef<GLStars | null | undefined>(undefined);
  const births = useRef(new Map<number, number>());
  const prev = useRef({ n: 0, mode: mode as LayoutMode });
  const raf = useRef(0);
  const { w, h } = useSize(wrap);

  const count = Math.max(0, Math.min(MAX_STARS, Math.floor(n)));
  const segs = useMemo<readonly Segment[]>(() => segments ?? [{ n: count, tone: 'a' }], [segments, count]);
  const eff = effectiveMode(mode, count);
  const useGL = eff === 'scatter' && count > GL_THRESHOLD;

  const layout = useMemo(() => {
    if (useGL || w < 2 || h < 2) return null;
    return computeLayout({ n: count, mode: eff, width: w, height: h, seed, rows, cols, maxR, padding });
  }, [useGL, count, eff, w, h, seed, rows, cols, maxR, padding]);

  // a new layout invalidates the tapped stars
  useEffect(() => setMarks([]), [count, eff, seed, w, h, rows, cols]);

  const onTap = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!countable || !layout) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const i = hitStar(layout, e.clientX - rect.left, e.clientY - rect.top);
    if (i < 0) return;
    const next = marks.includes(i) ? marks.filter((x) => x !== i) : [...marks, i];
    setMarks(next);
    onCount?.(next.length);
  };

  // pop-in births for newly added stars
  if (prev.current.n !== count || prev.current.mode !== mode) {
    const p = prev.current;
    if (p.mode === mode && count > p.n && count - p.n <= 60 && !prefersReducedMotion()) {
      const now = performance.now();
      for (let i = p.n; i < count; i++) births.current.set(i, now);
    } else if (count < p.n) {
      for (const k of births.current.keys()) if (k >= count) births.current.delete(k);
    }
    prev.current = { n: count, mode };
  }

  useEffect(() => {
    cancelAnimationFrame(raf.current);
    if (w < 2 || h < 2) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const canvas2d = c2d.current!;
    const canvasGL = cgl.current!;

    if (useGL) {
      if (gl.current === undefined) gl.current = GLStars.create(canvasGL);
      if (gl.current) {
        canvasGL.style.display = 'block';
        canvas2d.style.display = 'none';
        gl.current.draw({ n: count, seed, radius: glRadius(count, w, h), width: w, height: h, dpr, segments: segs });
        return;
      }
      // no WebGL2 → 2D fallback
      canvasGL.style.display = 'none';
      canvas2d.style.display = 'block';
      const W = Math.floor(w * dpr);
      const H = Math.floor(h * dpr);
      if (canvas2d.width !== W || canvas2d.height !== H) {
        canvas2d.width = W;
        canvas2d.height = H;
      }
      const ctx = canvas2d.getContext('2d');
      if (ctx) drawHashScatter(ctx, count, w, h, dpr, seed, segs);
      return;
    }

    canvasGL.style.display = 'none';
    canvas2d.style.display = 'block';
    const W = Math.floor(w * dpr);
    const H = Math.floor(h * dpr);
    if (canvas2d.width !== W || canvas2d.height !== H) {
      canvas2d.width = W;
      canvas2d.height = H;
    }
    const ctx = canvas2d.getContext('2d');
    if (!ctx || !layout) return;
    const allowMotion = !prefersReducedMotion();
    const frame = () => {
      const animating = draw2D(ctx, {
        layout,
        segments: segs,
        width: w,
        height: h,
        dpr,
        now: performance.now(),
        births: births.current,
        twinkle: twinkle && allowMotion,
        seed,
        guides,
        marks,
      });
      if (animating && !document.hidden) raf.current = requestAnimationFrame(frame);
    };
    frame();
    const onVis = () => {
      if (!document.hidden) {
        cancelAnimationFrame(raf.current);
        frame();
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelAnimationFrame(raf.current);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [layout, useGL, count, segs, w, h, seed, twinkle, guides, marks]);

  useEffect(
    () => () => {
      gl.current?.lose();
      gl.current = undefined;
    },
    [],
  );

  return (
    <div ref={wrap} className={`relative ${countable ? 'cursor-pointer' : ''} ${className ?? ''}`} role="img" aria-label={label ?? `${count} hvězd`} onClick={onTap}>
      <canvas ref={c2d} className="absolute inset-0 h-full w-full" aria-hidden="true" />
      <canvas ref={cgl} className="absolute inset-0 h-full w-full" style={{ display: 'none' }} aria-hidden="true" />
    </div>
  );
}
