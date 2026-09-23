/** Star confetti burst (full-screen canvas, removed when done). Respects reduced motion. */
import { prefersReducedMotion } from '../kit';

const COLORS = ['#ffc526', '#ffd84d', '#7c5cff', '#46cdfb', '#ff6fae', '#4ade80'];

export function confetti(opts: { count?: number; origin?: { x: number; y: number } } = {}): void {
  if (prefersReducedMotion() || typeof document === 'undefined') return;
  const canvas = document.createElement('canvas');
  canvas.className = 'confetti-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = window.innerWidth;
  const H = window.innerHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    canvas.remove();
    return;
  }
  ctx.scale(dpr, dpr);
  const ox = (opts.origin?.x ?? 0.5) * W;
  const oy = (opts.origin?.y ?? 0.45) * H;
  const N = opts.count ?? 90;
  const parts = Array.from({ length: N }, () => {
    const a = Math.random() * Math.PI * 2;
    const sp = 4 + Math.random() * 9;
    return {
      x: ox,
      y: oy,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - 6,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      r: 5 + Math.random() * 7,
      c: COLORS[Math.floor(Math.random() * COLORS.length)]!,
      star: Math.random() < 0.6,
    };
  });
  const start = performance.now();
  const DUR = 1800;
  const frame = (t: number) => {
    const el = t - start;
    ctx.clearRect(0, 0, W, H);
    for (const p of parts) {
      p.vy += 0.32;
      p.vx *= 0.985;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - el / DUR);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.c;
      ctx.beginPath();
      if (p.star) {
        for (let k = 0; k < 10; k++) {
          const r = k % 2 === 0 ? p.r : p.r * 0.45;
          const a = -Math.PI / 2 + (k * Math.PI) / 5;
          if (k === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
          else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath();
      } else ctx.rect(-p.r / 2, -p.r / 4, p.r, p.r / 2);
      ctx.fill();
      ctx.restore();
    }
    if (el < DUR) requestAnimationFrame(frame);
    else canvas.remove();
  };
  requestAnimationFrame(frame);
}
