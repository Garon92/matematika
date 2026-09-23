/**
 * "Volný trénink" — port of the original pocitadlo.html generator.
 * × and ÷ keep the original tuned algorithm (core pairs without 0/1, rare 0 and 1),
 * + and − were fixed to avoid the skewed "+0 / x − x" distribution.
 */
import type { ExprTask } from './types';
import { chance, randInt, shuffle, type Rng } from './rng';

export type FreeMode = 'add' | 'sub' | 'mul' | 'div' | 'mix';

const WEIGHTS = {
  mul: { pZero: 0.02, pOne: 0.08 },
  div: { pQuotient1: 0.05, pDivideBy1: 0.02 },
};

export const FREE_MIN = 5;
export const FREE_MAX = 100;
export const FREE_STEP = 5;

export class FreeGenerator {
  private mulCore: [number, number][] = [];
  private mulIdx = 0;
  private divCore: [number, number][] = [];
  private divIdx = 0;
  private lastKey = '';

  constructor(
    private readonly rng: Rng,
    public mode: FreeMode = 'add',
    private maxVal = 20,
  ) {
    this.rebuild();
  }

  get max(): number {
    return this.maxVal;
  }

  setMax(n: number): void {
    this.maxVal = Math.max(1, Math.round(n));
    this.rebuild();
  }

  private rebuild(): void {
    const N = this.maxVal;
    const mul: [number, number][] = [];
    for (let a = 2; a <= N; a++) for (let b = a; b <= N; b++) if (a * b <= N) mul.push([a, b]);
    this.mulCore = shuffle(this.rng, mul);
    this.mulIdx = 0;
    const div: [number, number][] = [];
    for (let d = 2; d <= N; d++) {
      const qMax = Math.floor(N / d);
      for (let q = 2; q <= qMax; q++) div.push([d * q, d]);
    }
    this.divCore = shuffle(this.rng, div);
    this.divIdx = 0;
  }

  private pickOp(): Exclude<FreeMode, 'mix'> {
    if (this.mode !== 'mix') return this.mode;
    const ops = ['add', 'sub', 'mul', 'div'] as const;
    return ops[randInt(this.rng, 0, 3)]!;
  }

  private pickNonTrivial(min: number, max: number): number {
    return randInt(this.rng, min, max);
  }

  private make(): ExprTask {
    const rng = this.rng;
    const N = this.maxVal;
    const op = this.pickOp();
    const mk = (o: ExprTask['op'], a: number, b: number, c: number): ExprTask => ({ kind: 'expr', op: o, a, b, c, missing: 'c' });
    if (op === 'add') {
      const s = randInt(rng, Math.min(2, N), N);
      let a = randInt(rng, 0, s);
      if ((a === 0 || a === s) && !chance(rng, 0.1)) a = randInt(rng, Math.min(1, s), Math.max(Math.min(1, s), s - 1));
      return mk('add', a, s - a, s);
    }
    if (op === 'sub') {
      const a = randInt(rng, 1, N);
      let b = randInt(rng, 0, a);
      if ((b === 0 || b === a) && a > 1 && !chance(rng, 0.1)) b = randInt(rng, 1, a - 1);
      return mk('sub', a, b, a - b);
    }
    if (op === 'mul') {
      if (N <= 1) {
        const a = randInt(rng, 0, N);
        const b = randInt(rng, 0, N);
        return mk('mul', a, b, a * b);
      }
      const r = rng();
      if (r < WEIGHTS.mul.pZero) {
        const x = this.pickNonTrivial(2, N);
        return chance(rng, 0.5) ? mk('mul', 0, x, 0) : mk('mul', x, 0, 0);
      }
      if (r < WEIGHTS.mul.pZero + WEIGHTS.mul.pOne) {
        const x = this.pickNonTrivial(2, N);
        return chance(rng, 0.5) ? mk('mul', 1, x, x) : mk('mul', x, 1, x);
      }
      if (this.mulCore.length > 0) {
        const pair = this.mulCore[this.mulIdx++ % this.mulCore.length]!;
        let [a, b] = pair;
        if (chance(rng, 0.5)) [a, b] = [b, a];
        return mk('mul', a, b, a * b);
      }
      // fallback for tiny ranges: x · 1
      const x = randInt(rng, 1, N);
      return mk('mul', x, 1, x);
    }
    // div
    const r = rng();
    if (r < WEIGHTS.div.pQuotient1 && N >= 2) {
      const b = randInt(rng, 2, N);
      return mk('div', b, b, 1);
    }
    if (r < WEIGHTS.div.pQuotient1 + WEIGHTS.div.pDivideBy1 && N >= 2) {
      const a = randInt(rng, 2, N);
      return mk('div', a, 1, a);
    }
    if (this.divCore.length > 0) {
      const [a, b] = this.divCore[this.divIdx++ % this.divCore.length]!;
      return mk('div', a, b, a / b);
    }
    const a = randInt(rng, 1, N);
    return mk('div', a, 1, a);
  }

  next(): ExprTask {
    let p = this.make();
    for (let i = 0; i < 50 && keyOf(p) === this.lastKey; i++) p = this.make();
    this.lastKey = keyOf(p);
    return p;
  }
}

/** Commutative ops share a key (3+5 == 5+3), like the original. */
function keyOf(p: ExprTask): string {
  if (p.op === 'add' || p.op === 'mul') return `${p.op}:${Math.min(p.a, p.b)},${Math.max(p.a, p.b)}`;
  return `${p.op}:${p.a},${p.b}`;
}
