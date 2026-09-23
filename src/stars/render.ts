/** Star rendering: Canvas 2D (pretty, animated, grouped) and WebGL2 (up to 10 million). */
import type { Layout } from './layout';

export type Tone = 'a' | 'b' | 'c' | 'crossed' | 'empty' | 'dim';

export interface Segment {
  n: number;
  tone: Tone;
}

interface ToneStyle {
  fill: string;
  light: string;
  glow: string | null;
  outline?: boolean;
  alpha?: number;
}

export const TONES: Record<Tone, ToneStyle> = {
  a: { fill: '#ffc526', light: '#fff1a8', glow: 'rgba(255, 196, 38, 0.65)' },
  b: { fill: '#46cdfb', light: '#d4f5ff', glow: 'rgba(70, 205, 251, 0.6)' },
  c: { fill: '#ff6fae', light: '#ffd3e7', glow: 'rgba(255, 111, 174, 0.55)' },
  crossed: { fill: '#b9b2e6', light: '#e6e2ff', glow: null, alpha: 0.38 },
  empty: { fill: 'rgba(255,255,255,0.0)', light: '#ffffff', glow: null, outline: true },
  dim: { fill: '#c9c3f0', light: '#ffffff', glow: null, alpha: 0.5 },
};

/** RGB 0..1 for WebGL. */
const GL_COLORS: Record<Tone, [number, number, number, number]> = {
  a: [1, 0.77, 0.15, 1],
  b: [0.27, 0.8, 0.98, 1],
  c: [1, 0.44, 0.68, 1],
  crossed: [0.72, 0.7, 0.9, 0.38],
  empty: [1, 1, 1, 0.25],
  dim: [0.79, 0.76, 0.94, 0.5],
};

export function starPath(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, inner = 0.5): void {
  const ri = r * inner;
  let a = -Math.PI / 2;
  const step = Math.PI / 5;
  ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  for (let k = 0; k < 5; k++) {
    a += step;
    ctx.lineTo(x + Math.cos(a) * ri, y + Math.sin(a) * ri);
    a += step;
    ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  ctx.closePath();
}

// ------------------------------------------------------------------ sprites

const sprites = new Map<string, HTMLCanvasElement>();

function sprite(tone: Tone, rDev: number): HTMLCanvasElement {
  const q = Math.max(1, Math.round(rDev * 2) / 2);
  const key = `${tone}:${q}`;
  const hit = sprites.get(key);
  if (hit) return hit;
  const st = TONES[tone];
  const glow = st.glow && q > 3 ? q * 0.55 : 0;
  const size = Math.ceil((q + glow) * 2 + 4);
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const g = c.getContext('2d')!;
  const cx = size / 2;
  const cy = size / 2 + q * 0.04;
  if (st.outline) {
    g.beginPath();
    starPath(g, cx, cy, q * 0.92, 0.5);
    g.lineJoin = 'round';
    g.lineWidth = Math.max(1, q * 0.1);
    g.strokeStyle = 'rgba(255,255,255,0.32)';
    g.setLineDash([Math.max(1.5, q * 0.22), Math.max(1.5, q * 0.16)]);
    g.stroke();
  } else {
    g.globalAlpha = st.alpha ?? 1;
    if (glow > 0) {
      g.shadowColor = st.glow!;
      g.shadowBlur = glow;
    }
    const grad = g.createRadialGradient(cx - q * 0.25, cy - q * 0.3, q * 0.05, cx, cy, q);
    grad.addColorStop(0, st.light);
    grad.addColorStop(0.55, st.fill);
    grad.addColorStop(1, st.fill);
    g.fillStyle = q > 2.5 ? grad : st.fill;
    g.beginPath();
    starPath(g, cx, cy, q, 0.5);
    g.fill();
    if (q > 4) {
      // rounded tips
      g.shadowBlur = 0;
      g.lineJoin = 'round';
      g.lineWidth = q * 0.16;
      g.strokeStyle = st.fill;
      g.stroke();
    }
  }
  if (sprites.size > 200) sprites.clear();
  sprites.set(key, c);
  return c;
}

export function toneAt(segments: readonly Segment[], i: number): Tone {
  let acc = 0;
  for (const s of segments) {
    acc += s.n;
    if (i < acc) return s.tone;
  }
  return segments[segments.length - 1]?.tone ?? 'a';
}

export interface Draw2DOptions {
  layout: Layout;
  segments: readonly Segment[];
  width: number;
  height: number;
  dpr: number;
  now: number;
  /** birth time per star index (ms) for the pop-in animation */
  births: Map<number, number>;
  twinkle: boolean;
  seed: number;
  /** show outlines of groups / empty ten-frame slots */
  guides: boolean;
}

const POP_MS = 420;

function easeOutBack(t: number): number {
  const c1 = 1.9;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** Returns true while an animation is still running (caller keeps requesting frames). */
export function draw2D(ctx: CanvasRenderingContext2D, o: Draw2DOptions): boolean {
  const { layout, dpr } = o;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  let animating = false;

  if (o.guides) {
    // group outlines
    if (layout.boxes.length > 0) {
      ctx.beginPath();
      const r = Math.max(3, layout.r * 0.5);
      for (const b of layout.boxes) roundRect(ctx, b.x - 2, b.y - 2, b.w + 4, b.h + 4, r);
      ctx.fillStyle = 'rgba(255,255,255,0.045)';
      ctx.fill();
      ctx.lineWidth = 1.25;
      ctx.strokeStyle = 'rgba(255,255,255,0.16)';
      ctx.stroke();
    }
    // empty ten-frame slots
    if (layout.slots.length > 0) {
      ctx.beginPath();
      for (const s of layout.slots) {
        ctx.moveTo(s.x + layout.slotR, s.y);
        ctx.arc(s.x, s.y, layout.slotR, 0, Math.PI * 2);
      }
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fill();
    }
  }

  const n = layout.n;
  if (n === 0) return false;
  const rDev = layout.r * dpr;
  if (rDev < 2.2 || n > 20000) {
    // tiny stars → squares, fast path
    let i = 0;
    for (const seg of o.segments) {
      const st = TONES[seg.tone];
      ctx.fillStyle = st.fill;
      ctx.globalAlpha = st.alpha ?? 1;
      const s = Math.max(1 / dpr, layout.r * 1.3);
      const end = Math.min(n, i + seg.n);
      for (; i < end; i++) ctx.fillRect(layout.xs[i]! - s / 2, layout.ys[i]! - s / 2, s, s);
    }
    ctx.globalAlpha = 1;
    return false;
  }

  const twinkle = o.twinkle && n <= 400;
  let i = 0;
  for (const seg of o.segments) {
    const img = sprite(seg.tone, rDev);
    const half = img.width / 2 / dpr;
    const end = Math.min(n, i + seg.n);
    for (; i < end; i++) {
      let scale = 1;
      const born = o.births.get(i);
      if (born !== undefined) {
        const t = (o.now - born) / POP_MS;
        if (t < 1) {
          scale = Math.max(0, easeOutBack(Math.max(0, t)));
          animating = true;
        } else o.births.delete(i);
      }
      if (twinkle && (seg.tone === 'a' || seg.tone === 'b' || seg.tone === 'c')) {
        const ph = ((i * 2654435761) % 1000) / 159.15;
        scale *= 1 + 0.07 * Math.sin(o.now / 520 + ph);
        animating = true;
      }
      const x = layout.xs[i]!;
      const y = layout.ys[i]!;
      if (scale === 1) ctx.drawImage(img, x - half, y - half, half * 2, half * 2);
      else if (scale > 0.01) {
        const h = half * scale;
        ctx.drawImage(img, x - h, y - h, h * 2, h * 2);
      }
      if (seg.tone === 'crossed' && layout.r > 3) {
        ctx.beginPath();
        const d = layout.r * 0.8;
        ctx.moveTo(x - d, y + d);
        ctx.lineTo(x + d, y - d);
        ctx.lineWidth = Math.max(1.5, layout.r * 0.16);
        ctx.lineCap = 'round';
        ctx.strokeStyle = 'rgba(255, 120, 150, 0.85)';
        ctx.stroke();
      }
    }
  }
  return animating;
}

// ------------------------------------------------------------------ WebGL2

const VS = `#version 300 es
precision highp float;
precision highp int;
uniform vec2 uRes;
uniform float uSize;
uniform uint uSeed;
uniform float uS1;
uniform float uS2;
uniform vec4 uC0;
uniform vec4 uC1;
uniform vec4 uC2;
out vec4 vColor;
float rand(uint x){
  x ^= x << 13u;
  x ^= x >> 17u;
  x ^= x << 5u;
  return float(x) / 4294967295.0;
}
void main(){
  uint i = uint(gl_VertexID);
  float rx = rand(i * 1664525u + 1013904223u + uSeed);
  float ry = rand(i * 22695477u + 1u + uSeed * 3u);
  vec2 margin = vec2(uSize / (2.0 * uRes.x), uSize / (2.0 * uRes.y));
  vec2 uv = mix(margin, vec2(1.0) - margin, vec2(rx, ry));
  gl_Position = vec4(uv.x * 2.0 - 1.0, 1.0 - uv.y * 2.0, 0.0, 1.0);
  gl_PointSize = uSize;
  float fi = float(gl_VertexID);
  vColor = fi < uS1 ? uC0 : (fi < uS2 ? uC1 : uC2);
}`;

// 5-pointed star SDF (Inigo Quilez) — the old shader drew 10-spike "suns" by mistake.
const FS = `#version 300 es
precision highp float;
in vec4 vColor;
uniform float uSize;
out vec4 outColor;
float sdStar5(vec2 p, float r, float rf){
  const vec2 k1 = vec2(0.809016994375, -0.587785252292);
  const vec2 k2 = vec2(-k1.x, k1.y);
  p.x = abs(p.x);
  p -= 2.0 * max(dot(k1, p), 0.0) * k1;
  p -= 2.0 * max(dot(k2, p), 0.0) * k2;
  p.x = abs(p.x);
  p.y -= r;
  vec2 ba = rf * vec2(-k1.y, k1.x) - vec2(0.0, 1.0);
  float h = clamp(dot(p, ba) / dot(ba, ba), 0.0, r);
  return length(p - ba * h) * sign(p.y * ba.x - p.x * ba.y);
}
void main(){
  vec2 p = (gl_PointCoord - 0.5) * vec2(2.0, -2.0);
  if (uSize < 3.5) {
    float d = length(p);
    if (d > 1.0) discard;
    outColor = vColor;
    return;
  }
  float d = sdStar5(p, 0.95, 0.45);
  float aa = 2.0 / uSize;
  float a = 1.0 - smoothstep(-aa, aa, d);
  if (a <= 0.0) discard;
  outColor = vec4(vColor.rgb, vColor.a * a);
}`;

export class GLStars {
  private gl: WebGL2RenderingContext;
  private prog: WebGLProgram;
  private u: Record<string, WebGLUniformLocation | null> = {};

  static create(canvas: HTMLCanvasElement): GLStars | null {
    try {
      const gl = canvas.getContext('webgl2', { antialias: false, premultipliedAlpha: false, alpha: true, preserveDrawingBuffer: true });
      if (!gl) return null;
      return new GLStars(gl);
    } catch {
      return null;
    }
  }

  private constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader');
      return s;
    };
    const vs = sh(gl.VERTEX_SHADER, VS);
    const fs = sh(gl.FRAGMENT_SHADER, FS);
    const p = gl.createProgram()!;
    gl.attachShader(p, vs);
    gl.attachShader(p, fs);
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? 'link');
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    this.prog = p;
    for (const name of ['uRes', 'uSize', 'uSeed', 'uS1', 'uS2', 'uC0', 'uC1', 'uC2']) this.u[name] = gl.getUniformLocation(p, name);
    gl.bindVertexArray(gl.createVertexArray());
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);
  }

  draw(opts: { n: number; seed: number; radius: number; width: number; height: number; dpr: number; segments: readonly Segment[] }): void {
    const { gl } = this;
    const w = Math.floor(opts.width * opts.dpr);
    const h = Math.floor(opts.height * opts.dpr);
    const c = gl.canvas as HTMLCanvasElement;
    if (c.width !== w || c.height !== h) {
      c.width = w;
      c.height = h;
    }
    gl.viewport(0, 0, w, h);
    gl.useProgram(this.prog);
    gl.uniform2f(this.u.uRes!, w, h);
    gl.uniform1f(this.u.uSize!, Math.max(1, opts.radius * 2 * opts.dpr));
    gl.uniform1ui(this.u.uSeed!, opts.seed >>> 0);
    const segs = opts.segments;
    const s1 = segs[0]?.n ?? opts.n;
    const s2 = s1 + (segs[1]?.n ?? 0);
    gl.uniform1f(this.u.uS1!, s1);
    gl.uniform1f(this.u.uS2!, s2);
    gl.uniform4fv(this.u.uC0!, GL_COLORS[segs[0]?.tone ?? 'a']);
    gl.uniform4fv(this.u.uC1!, GL_COLORS[segs[1]?.tone ?? segs[0]?.tone ?? 'a']);
    gl.uniform4fv(this.u.uC2!, GL_COLORS[segs[2]?.tone ?? segs[1]?.tone ?? segs[0]?.tone ?? 'a']);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (opts.n > 0) gl.drawArrays(gl.POINTS, 0, opts.n);
  }

  lose(): void {
    this.gl.getExtension('WEBGL_lose_context')?.loseContext();
  }
}

/** Star radius for the WebGL path (old app: min 1.8 px, grows for small counts). */
export function glRadius(n: number, width: number, height: number): number {
  const minDim = Math.max(1, Math.min(width, height));
  const cap = Math.min(22, Math.floor(minDim * 0.04));
  const r = 1.8 * Math.sqrt(500 / Math.max(1, n));
  return Math.max(0.9, Math.min(cap, r));
}
