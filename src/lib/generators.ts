import { chance, pick, randInt, type Rng } from './rng';
import type { CompareTask, CountTask, ExprTask, Op, Operand, PlaceTask, RemainderTask, SequenceTask, Task } from './types';
import { apply } from './math';

export type Gen = (rng: Rng) => Task;

type Pair = readonly [number, number];

function expr(op: Op, a: number, b: number, missing: ExprTask['missing'] = 'c'): ExprTask {
  return { kind: 'expr', op, a, b, c: apply(op, a, b), missing };
}

/** Enumerates pairs (a, b) in the given ranges satisfying the predicate. */
function pairs(aMin: number, aMax: number, bMin: number, bMax: number, ok: (a: number, b: number) => boolean): Pair[] {
  const out: Pair[] = [];
  for (let a = aMin; a <= aMax; a++) for (let b = bMin; b <= bMax; b++) if (ok(a, b)) out.push([a, b]);
  return out;
}

/** Picks from `main`, occasionally (probability p) from `rare` — used to keep 0 / trivial cases rare. */
function pickWeighted(rng: Rng, main: Pair[], rare: Pair[], p: number): Pair {
  if (rare.length > 0 && (main.length === 0 || chance(rng, p))) return pick(rng, rare);
  return pick(rng, main);
}

function sometimesSwap(rng: Rng, [a, b]: Pair, p = 0.5): Pair {
  return chance(rng, p) ? [b, a] : [a, b];
}

// ---------------------------------------------------------------- addition

/** a + b ≤ max. Zeros are rare. */
export function addWithin(max: number, minSum = 2): Gen {
  const main = pairs(1, max, 1, max, (a, b) => a + b <= max && a + b >= minSum);
  const rare = pairs(0, max, 0, max, (a, b) => (a === 0) !== (b === 0) && a + b <= max && a + b >= 1);
  return (rng) => {
    const [a, b] = pickWeighted(rng, main, rare, 0.06);
    return expr('add', a, b);
  };
}

/** a + ? = 10 ("kamarádi desítky"). */
export function makeTen(total = 10): Gen {
  return (rng) => {
    const a = randInt(rng, 1, total - 1);
    const missing = chance(rng, 0.3) ? 'a' : 'b';
    return missing === 'a' ? expr('add', total - a, a, 'a') : expr('add', a, total - a, 'b');
  };
}

/** Within 20 without crossing ten: 13 + 4, 2 + 15, 10 + 6. */
export function addNoCarry20(): Gen {
  const pool = pairs(10, 18, 1, 9, (a, b) => (a % 10) + b <= 9);
  return (rng) => {
    const [a, b] = sometimesSwap(rng, pick(rng, pool), 0.3);
    return expr('add', a, b);
  };
}

/** Within 20 with crossing ten: 8 + 5, 7 + 6. */
export function addCarry20(): Gen {
  const pool = pairs(2, 9, 2, 9, (a, b) => a + b >= 11);
  return (rng) => {
    const [a, b] = pick(rng, pool);
    return expr('add', a, b);
  };
}

/** Missing addend: a + ? = c or ? + b = c, c ≤ max. */
export function addMissing(max: number, minC = 4): Gen {
  return (rng) => {
    const c = randInt(rng, minC, max);
    const a = randInt(rng, 1, c - 1);
    return expr('add', a, c - a, chance(rng, 0.65) ? 'b' : 'a');
  };
}

/** Whole tens: 30 + 40. */
export function addTens(): Gen {
  const pool = pairs(1, 9, 1, 9, (a, b) => a + b <= 10).map(([a, b]) => [a * 10, b * 10] as const);
  return (rng) => {
    const [a, b] = pick(rng, pool);
    return expr('add', a, b);
  };
}

/** Two-digit addition up to 100, with or without carrying. */
export function add100(carry: boolean): Gen {
  return (rng) => {
    for (let i = 0; i < 400; i++) {
      const a = randInt(rng, 11, 89);
      const twoDigit = chance(rng, carry ? 0.65 : 0.75);
      const b = twoDigit ? randInt(rng, 11, 88) : randInt(rng, 2, 9);
      if (a + b > (carry ? 100 : 99)) continue;
      const unitsCarry = (a % 10) + (b % 10) >= 10;
      if (unitsCarry !== carry) continue;
      if (!carry && (a % 10 === 0 || b % 10 === 0) && chance(rng, 0.7)) continue;
      const [x, y] = sometimesSwap(rng, [a, b], 0.25);
      return expr('add', x, y);
    }
    return carry ? expr('add', 38, 47) : expr('add', 34, 25);
  };
}

// ---------------------------------------------------------------- subtraction

/** a − b with a ≤ max. b = 0 and a − b = 0 are rare. */
export function subWithin(max: number): Gen {
  const main = pairs(2, max, 1, max, (a, b) => b < a);
  const rare = pairs(1, max, 0, max, (a, b) => b === 0 || b === a);
  return (rng) => {
    const [a, b] = pickWeighted(rng, main, rare, 0.06);
    return expr('sub', a, b);
  };
}

/** Within 20 without borrowing: 17 − 4, 18 − 12, 16 − 10. */
export function subNoBorrow20(): Gen {
  const pool = [
    ...pairs(11, 19, 1, 9, (a, b) => b <= a % 10),
    ...pairs(12, 19, 10, 18, (a, b) => b < a && b % 10 <= a % 10),
  ];
  return (rng) => {
    const [a, b] = pick(rng, pool);
    return expr('sub', a, b);
  };
}

/** Within 20 with borrowing (přes desítku): 13 − 5. */
export function subBorrow20(): Gen {
  const pool = pairs(11, 18, 2, 9, (a, b) => b > a % 10);
  return (rng) => {
    const [a, b] = pick(rng, pool);
    return expr('sub', a, b);
  };
}

/** a − ? = c or ? − b = c with a ≤ max. */
export function subMissing(max: number): Gen {
  return (rng) => {
    const a = randInt(rng, 4, max);
    const b = randInt(rng, 1, a - 1);
    return expr('sub', a, b, chance(rng, 0.6) ? 'b' : 'a');
  };
}

/** Whole tens: 70 − 30. */
export function subTens(): Gen {
  const pool = pairs(2, 10, 1, 9, (a, b) => b < a).map(([a, b]) => [a * 10, b * 10] as const);
  return (rng) => {
    const [a, b] = pick(rng, pool);
    return expr('sub', a, b);
  };
}

/** Two-digit subtraction up to 100, with or without borrowing. */
export function sub100(borrow: boolean): Gen {
  return (rng) => {
    for (let i = 0; i < 400; i++) {
      const a = randInt(rng, borrow ? 21 : 20, borrow ? 100 : 99);
      const twoDigit = chance(rng, 0.7);
      const b = twoDigit ? randInt(rng, 11, a - 2) : randInt(rng, 2, 9);
      if (b >= a) continue;
      const needsBorrow = b % 10 > a % 10;
      if (needsBorrow !== borrow) continue;
      if (!borrow && b % 10 === 0 && chance(rng, 0.7)) continue;
      return expr('sub', a, b);
    }
    return borrow ? expr('sub', 52, 17) : expr('sub', 58, 23);
  };
}

// ---------------------------------------------------------------- multiplication

/** Multiplication table row: r · k or k · r, k = 1…10 (0 rarely). */
export function mulRow(rows: readonly number[]): Gen {
  return (rng) => {
    const r = pick(rng, rows);
    const k = chance(rng, 0.04) ? 0 : randInt(rng, 1, 10);
    const [a, b] = sometimesSwap(rng, [r, k]);
    return expr('mul', a, b);
  };
}

/** Multiplying by 0 and 1. */
export function mulZeroOne(): Gen {
  return (rng) => {
    const special = chance(rng, 0.5) ? 0 : 1;
    const other = randInt(rng, 0, 10);
    const [a, b] = sometimesSwap(rng, [special, other]);
    return expr('mul', a, b);
  };
}

/** Whole small multiplication table 2–10 (1 rarely). */
export function mulAll(min = 2, max = 10): Gen {
  return (rng) => {
    const a = chance(rng, 0.05) ? 1 : randInt(rng, min, max);
    const b = randInt(rng, min, max);
    return expr('mul', a, b);
  };
}

/** Missing factor: 4 · ? = 28. */
export function mulMissing(): Gen {
  return (rng) => {
    const a = randInt(rng, 2, 10);
    const b = randInt(rng, 2, 10);
    return expr('mul', a, b, chance(rng, 0.6) ? 'b' : 'a');
  };
}

// ---------------------------------------------------------------- division

/** Division by d from `divisors`: (d·q) : d = q, q = 1…10. */
export function divRow(divisors: readonly number[]): Gen {
  return (rng) => {
    const d = pick(rng, divisors);
    const q = chance(rng, 0.03) ? 0 : randInt(rng, 1, 10);
    return expr('div', d * q, d);
  };
}

/** Whole division table: dividend ≤ 100, divisor and quotient 2–10. */
export function divAll(): Gen {
  return (rng) => {
    const d = randInt(rng, 2, 10);
    const q = randInt(rng, 2, 10);
    return expr('div', d * q, d);
  };
}

/** Missing dividend or divisor: ? : 4 = 6, 24 : ? = 6. */
export function divMissing(): Gen {
  return (rng) => {
    const d = randInt(rng, 2, 10);
    const q = randInt(rng, 2, 10);
    return expr('div', d * q, d, chance(rng, 0.5) ? 'a' : 'b');
  };
}

/** Division with remainder: 17 : 5 = 3 (zb. 2). */
export function divRemainder(): Gen {
  return (rng) => {
    const b = randInt(rng, 2, 9);
    const q = randInt(rng, 1, 9);
    const r = chance(rng, 0.12) ? 0 : randInt(rng, 1, b - 1);
    const t: RemainderTask = { kind: 'rem', a: b * q + r, b, q, r };
    return t;
  };
}

// ---------------------------------------------------------------- counting & comparing

/** Count stars: n in [min, max]. `choices` → three options; `frames` → ten-frames layout. */
export function countStars(min: number, max: number, opts: { choices: boolean; frames: boolean }): Gen {
  return (rng) => {
    const n = randInt(rng, min, max);
    const t: CountTask = { kind: 'count', n, seed: randInt(rng, 1, 1_000_000), frames: opts.frames };
    if (opts.choices) {
      const set = new Set<number>([n]);
      let guard = 0;
      while (set.size < 3 && guard++ < 100) {
        const d = randInt(rng, -2, 2);
        const v = n + d;
        if (v >= Math.max(1, min - 1) && v <= max + 1) set.add(v);
      }
      t.choices = [...set].sort((x, y) => x - y);
    }
    return t;
  };
}

/** Compare two numbers ≤ max. */
export function compareNumbers(max: number, min = 0): Gen {
  return (rng) => {
    let x = randInt(rng, min, max);
    let y = randInt(rng, min, max);
    const r = rng();
    if (r < 0.14) y = x;
    else if (max >= 30 && r < 0.4) {
      // same tens — the tricky case (47 vs 42)
      const tens = Math.floor(x / 10) * 10;
      y = Math.min(max, tens + randInt(rng, 0, 9));
    } else if (max >= 30 && r < 0.55 && x >= 10 && x % 10 !== 0 && x < 100) {
      // swapped digits (46 vs 64)
      const swapped = (x % 10) * 10 + Math.floor(x / 10);
      if (swapped <= max) y = swapped;
    } else if (x === y) {
      y = x === max ? x - 1 : x + 1;
    }
    if (x === y && r >= 0.14) x = Math.max(min, x - 1) === x ? x + 1 : x - 1;
    const t: CompareTask = { kind: 'compare', left: { kind: 'num', value: x }, right: { kind: 'num', value: y } };
    return t;
  };
}

/** Compare an expression with a number or another expression: 3 + 4 ? 8. */
export function compareExpressions(max: number, ops: readonly Op[] = ['add', 'sub']): Gen {
  const side = (rng: Rng, op: Op): Operand => {
    if (op === 'add') {
      const a = randInt(rng, 1, max - 1);
      return { kind: 'expr', op, a, b: randInt(rng, 1, max - a) };
    }
    if (op === 'sub') {
      const a = randInt(rng, 2, max);
      return { kind: 'expr', op, a, b: randInt(rng, 1, a - 1) };
    }
    if (op === 'mul') return { kind: 'expr', op, a: randInt(rng, 2, 10), b: randInt(rng, 2, 10) };
    const d = randInt(rng, 2, 10);
    return { kind: 'expr', op, a: d * randInt(rng, 2, 10), b: d };
  };
  const value = (o: Operand) => (o.kind === 'num' ? o.value : apply(o.op, o.a, o.b));
  return (rng) => {
    const left = side(rng, pick(rng, ops));
    const lv = value(left);
    let right: Operand;
    if (chance(rng, 0.35)) {
      // two expressions
      right = side(rng, pick(rng, ops));
      if (chance(rng, 0.3)) {
        // try to make them equal for interesting "=" cases
        for (let i = 0; i < 30; i++) {
          const cand = side(rng, pick(rng, ops));
          if (value(cand) === lv) {
            right = cand;
            break;
          }
        }
      }
    } else {
      const delta = chance(rng, 0.3) ? 0 : pick(rng, [-2, -1, 1, 2]);
      right = { kind: 'num', value: Math.max(0, lv + delta) };
    }
    const flip = chance(rng, 0.5);
    const t: CompareTask = { kind: 'compare', left: flip ? right : left, right: flip ? left : right };
    return t;
  };
}

/** Number sequence with one gap. */
export function sequence(max: number, steps: readonly number[], allowDown = true): Gen {
  return (rng) => {
    const step = pick(rng, steps);
    const length = 5;
    const down = allowDown && chance(rng, 0.25);
    const span = step * (length - 1);
    const startMin = step >= 10 ? 0 : step >= 2 ? 0 : 1;
    let start = randInt(rng, startMin, Math.max(startMin, max - span));
    if (step > 1) start = Math.floor(start / step) * step + (step === 2 && chance(rng, 0.3) ? 1 : 0);
    if (start + span > max) start = Math.max(0, max - span);
    const gap = randInt(rng, 1, length - 1);
    const t: SequenceTask = down
      ? { kind: 'seq', start: start + span, step: -step, length, gap }
      : { kind: 'seq', start, step, length, gap };
    return t;
  };
}

/** Tens and units: 4 desítky a 7 jednotek. */
export function placeValue(): Gen {
  return (rng) => {
    const t: PlaceTask = { kind: 'place', tens: randInt(rng, 1, 9), units: randInt(rng, 0, 9) };
    return t;
  };
}

// ---------------------------------------------------------------- mixing

/** Picks one of the generators uniformly (or by weights). */
export function mix(gens: readonly Gen[], weights?: readonly number[]): Gen {
  const w = weights ?? gens.map(() => 1);
  const total = w.reduce((s, x) => s + x, 0);
  return (rng) => {
    let r = rng() * total;
    for (let i = 0; i < gens.length; i++) {
      r -= w[i]!;
      if (r <= 0) return gens[i]!(rng);
    }
    return gens[gens.length - 1]!(rng);
  };
}
