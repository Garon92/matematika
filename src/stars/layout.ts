/**
 * Star layouts — pure geometry, no DOM. All coordinates in CSS pixels.
 *
 * scatter  – random but never overlapping (best-candidate sampling, stable when stars are added)
 * five     – dice "fives" (subitizing aid)
 * ten      – ten-frames 5×2 with empty slots
 * hundred  – 10×10 squares (a gap after 5 in both directions)
 * array    – rows × cols (multiplication / division) + optional extra stars
 */
import { mulberry32 } from '../lib/rng';

export type LayoutMode = 'scatter' | 'five' | 'ten' | 'hundred' | 'array';

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Layout {
  n: number;
  xs: Float32Array;
  ys: Float32Array;
  /** star outer radius */
  r: number;
  /** group outlines (ten-frames, hundred squares, array rows) */
  boxes: Box[];
  /** empty slots inside ten-frames (centers) */
  slots: { x: number; y: number }[];
  /** radius of a slot marker */
  slotR: number;
}

export interface LayoutInput {
  n: number;
  mode: LayoutMode;
  width: number;
  height: number;
  seed: number;
  /** for 'array' */
  rows?: number;
  cols?: number;
  padding?: number;
  /** max star radius */
  maxR?: number;
}

/** Above this count grouped layouts fall back to scatter (too small to see). */
export const GROUP_LIMIT: Record<Exclude<LayoutMode, 'scatter'>, number> = {
  five: 2000,
  ten: 2000,
  hundred: 10_000,
  array: 10_000,
};

export function effectiveMode(mode: LayoutMode, n: number): LayoutMode {
  if (mode === 'scatter') return mode;
  return n > GROUP_LIMIT[mode] ? 'scatter' : mode;
}

// ------------------------------------------------------------------ scatter

interface Sampler {
  rng: () => number;
  us: number[];
  vs: number[];
}

const samplers = new Map<string, Sampler>();

/** Best-candidate sampling in [0,aspect]×[0,1]; results cached & extended incrementally. */
function bestCandidate(n: number, aspect: number, seed: number): Sampler {
  const key = `${seed}:${aspect.toFixed(2)}`;
  let s = samplers.get(key);
  if (!s) {
    s = { rng: mulberry32(seed ^ 0x5bd1e995), us: [], vs: [] };
    samplers.set(key, s);
    if (samplers.size > 40) samplers.delete(samplers.keys().next().value!);
  }
  const { us, vs, rng } = s;
  while (us.length < n) {
    const m = us.length;
    const k = m < 20 ? 30 : 14;
    let bestU = 0;
    let bestV = 0;
    let bestD = -1;
    for (let c = 0; c < k; c++) {
      const u = rng() * aspect;
      const v = rng();
      // distance to walls counts too (half weight) so stars don't hug the edge
      let d = Math.min(u, aspect - u, v, 1 - v) * 2;
      d = d * d;
      for (let i = 0; i < m; i++) {
        const du = us[i]! - u;
        const dv = vs[i]! - v;
        const dd = du * du + dv * dv;
        if (dd < d) {
          d = dd;
          if (d < bestD) break;
        }
      }
      if (d > bestD) {
        bestD = d;
        bestU = u;
        bestV = v;
      }
    }
    us.push(bestU);
    vs.push(bestV);
  }
  return s;
}

const BEST_CANDIDATE_MAX = 400;

function hash(i: number, seed: number): number {
  let x = (Math.imul(i + 1, 0x9e3779b1) ^ seed) >>> 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x85ebca6b) >>> 0;
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35) >>> 0;
  x ^= x >>> 16;
  return x / 4294967296;
}

function scatter(input: LayoutInput): Layout {
  const { n, width: W, height: H, seed } = input;
  const pad = input.padding ?? 8;
  const iw = Math.max(1, W - 2 * pad);
  const ih = Math.max(1, H - 2 * pad);
  const xs = new Float32Array(n);
  const ys = new Float32Array(n);
  const area = iw * ih;
  const maxR = input.maxR ?? 26;
  let r = Math.max(1.4, Math.min(maxR, 0.3 * Math.sqrt(area / Math.max(1, n))));
  if (n <= BEST_CANDIDATE_MAX) {
    const aspect = iw / ih;
    const s = bestCandidate(n, aspect, seed);
    const m = r * 1.05;
    for (let i = 0; i < n; i++) {
      xs[i] = pad + m + (s.us[i]! / aspect) * (iw - 2 * m);
      ys[i] = pad + m + s.vs[i]! * (ih - 2 * m);
    }
  } else {
    // jittered grid, cells picked in a deterministic shuffled order
    const aspect = iw / ih;
    const cols = Math.max(1, Math.ceil(Math.sqrt(n * aspect)));
    const rows = Math.max(1, Math.ceil(n / cols));
    const cw = iw / cols;
    const ch = ih / rows;
    r = Math.max(1.2, Math.min(r, 0.36 * Math.min(cw, ch)));
    const cells = cols * rows;
    const order = new Uint32Array(cells);
    for (let i = 0; i < cells; i++) order[i] = i;
    const keys = new Float32Array(cells);
    for (let i = 0; i < cells; i++) keys[i] = hash(i, seed);
    const sorted = Array.from(order).sort((a, b) => keys[a]! - keys[b]!);
    for (let i = 0; i < n; i++) {
      const cell = sorted[i]!;
      const cx = cell % cols;
      const cy = Math.floor(cell / cols);
      const jx = (hash(cell * 2, seed + 7) - 0.5) * 0.5;
      const jy = (hash(cell * 2 + 1, seed + 7) - 0.5) * 0.5;
      xs[i] = pad + (cx + 0.5 + jx) * cw;
      ys[i] = pad + (cy + 0.5 + jy) * ch;
    }
  }
  return { n, xs, ys, r, boxes: [], slots: [], slotR: 0 };
}

// ------------------------------------------------------------------ grouped

interface GroupSpec {
  /** group size in units */
  gw: number;
  gh: number;
  /** gap between groups in units */
  gap: number;
  /** positions (units) of the k-th star inside a group of `count` stars */
  place: (k: number, count: number) => [number, number];
  capacity: number;
  /** slot centers for empty places (ten-frames) */
  slots?: [number, number][];
  /** draw an outline around each group */
  outline: boolean;
}

const DICE: Record<number, [number, number][]> = {
  1: [[1.5, 1.5]],
  2: [
    [0.5, 0.5],
    [2.5, 2.5],
  ],
  3: [
    [0.5, 0.5],
    [1.5, 1.5],
    [2.5, 2.5],
  ],
  4: [
    [0.5, 0.5],
    [2.5, 0.5],
    [0.5, 2.5],
    [2.5, 2.5],
  ],
  5: [
    [0.5, 0.5],
    [2.5, 0.5],
    [1.5, 1.5],
    [0.5, 2.5],
    [2.5, 2.5],
  ],
};

const FIVE: GroupSpec = {
  gw: 3,
  gh: 3,
  gap: 0.9,
  capacity: 5,
  outline: false,
  place: (k, count) => DICE[count]![k]!,
};

const TEN_SLOTS: [number, number][] = Array.from({ length: 10 }, (_, i) => [(i % 5) + 0.5, Math.floor(i / 5) + 0.5]);

const TEN: GroupSpec = {
  gw: 5,
  gh: 2,
  gap: 0.6,
  capacity: 10,
  outline: true,
  slots: TEN_SLOTS,
  place: (k) => TEN_SLOTS[k]!,
};

const HUNDRED: GroupSpec = {
  gw: 10.4,
  gh: 10.4,
  gap: 1.2,
  capacity: 100,
  outline: true,
  place: (k) => {
    const col = k % 10;
    const row = Math.floor(k / 10);
    return [col + 0.5 + (col >= 5 ? 0.4 : 0), row + 0.5 + (row >= 5 ? 0.4 : 0)];
  },
};

/** Chooses the number of group columns that makes groups as big as possible. */
function fitGrid(groups: number, spec: GroupSpec, W: number, H: number, pad: number) {
  let best = { cols: 1, rows: groups, unit: 0 };
  for (let cols = 1; cols <= groups; cols++) {
    const rows = Math.ceil(groups / cols);
    const uw = (W - 2 * pad) / (cols * spec.gw + (cols - 1) * spec.gap);
    const uh = (H - 2 * pad) / (rows * spec.gh + (rows - 1) * spec.gap);
    const unit = Math.min(uw, uh);
    if (unit > best.unit) best = { cols, rows, unit };
  }
  return best;
}

function grouped(input: LayoutInput, spec: GroupSpec): Layout {
  const { n, width: W, height: H } = input;
  const pad = input.padding ?? 10;
  const groups = Math.max(1, Math.ceil(n / spec.capacity));
  const { cols, rows, unit: rawUnit } = fitGrid(groups, spec, W, H, pad);
  const unit = Math.min(rawUnit, (input.maxR ?? 26) / 0.42);
  const totalW = cols * spec.gw * unit + (cols - 1) * spec.gap * unit;
  const totalH = rows * spec.gh * unit + (rows - 1) * spec.gap * unit;
  const ox = (W - totalW) / 2;
  const oy = (H - totalH) / 2;
  const xs = new Float32Array(n);
  const ys = new Float32Array(n);
  const boxes: Box[] = [];
  const slots: { x: number; y: number }[] = [];
  for (let gi = 0; gi < groups; gi++) {
    const gx = ox + (gi % cols) * (spec.gw + spec.gap) * unit;
    const gy = oy + Math.floor(gi / cols) * (spec.gh + spec.gap) * unit;
    const start = gi * spec.capacity;
    const count = Math.min(spec.capacity, n - start);
    if (spec.outline) boxes.push({ x: gx, y: gy, w: spec.gw * unit, h: spec.gh * unit });
    for (let k = 0; k < count; k++) {
      const [ux, uy] = spec.place(k, count);
      xs[start + k] = gx + ux * unit;
      ys[start + k] = gy + uy * unit;
    }
    if (spec.slots) for (let k = count; k < spec.capacity; k++) slots.push({ x: gx + spec.slots[k]![0] * unit, y: gy + spec.slots[k]![1] * unit });
  }
  const r = Math.max(1.2, unit * 0.42);
  return { n, xs, ys, r, boxes, slots, slotR: r * 0.42 };
}

function arrayLayout(input: LayoutInput): Layout {
  const cols = Math.max(1, input.cols ?? 1);
  const fullRows = Math.max(0, input.rows ?? Math.floor(input.n / cols));
  const n = input.n;
  const rows = Math.ceil(n / cols) || 1;
  const W = input.width;
  const H = input.height;
  const pad = input.padding ?? 10;
  const gapU = 0.35;
  const unitW = (W - 2 * pad) / cols;
  const unitH = (H - 2 * pad) / (rows + (rows - 1) * gapU);
  const unit = Math.min(unitW, unitH, (input.maxR ?? 26) / 0.42);
  const totalW = cols * unit;
  const totalH = rows * unit + (rows - 1) * gapU * unit;
  const ox = (W - totalW) / 2;
  const oy = (H - totalH) / 2;
  const xs = new Float32Array(n);
  const ys = new Float32Array(n);
  const boxes: Box[] = [];
  for (let row = 0; row < rows; row++) {
    const y = oy + row * (1 + gapU) * unit;
    const inRow = Math.min(cols, n - row * cols);
    if (row < fullRows || inRow === cols) boxes.push({ x: ox - unit * 0.08, y: y - unit * 0.08, w: cols * unit + unit * 0.16, h: unit * 1.16 });
    for (let c = 0; c < inRow; c++) {
      const i = row * cols + c;
      xs[i] = ox + (c + 0.5) * unit;
      ys[i] = y + 0.5 * unit;
    }
  }
  return { n, xs, ys, r: Math.max(1.2, unit * 0.4), boxes, slots: [], slotR: 0 };
}

export function computeLayout(input: LayoutInput): Layout {
  const n = Math.max(0, Math.floor(input.n));
  const mode = effectiveMode(input.mode, n);
  const inp = { ...input, n };
  if (n === 0) {
    if (mode === 'ten') return grouped({ ...inp, n: 0 }, TEN);
    return { n: 0, xs: new Float32Array(0), ys: new Float32Array(0), r: 0, boxes: [], slots: [], slotR: 0 };
  }
  switch (mode) {
    case 'scatter':
      return scatter(inp);
    case 'five':
      return grouped(inp, FIVE);
    case 'ten':
      return grouped(inp, TEN);
    case 'hundred':
      return grouped(inp, HUNDRED);
    case 'array':
      return arrayLayout(inp);
  }
}
