import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../rng';
import * as g from '../generators';
import { LEVELS } from '../levels';
import { expected, taskKey, apply, operandValue } from '../math';
import type { ExprTask, Task } from '../types';

const N = 600;
function sample(gen: g.Gen, seed = 1, n = N): Task[] {
  const rng = mulberry32(seed);
  return Array.from({ length: n }, () => gen(rng));
}
const exprs = (ts: Task[]) => ts.filter((t): t is ExprTask => t.kind === 'expr');

describe('generators — invariants for every level', () => {
  for (const level of LEVELS) {
    it(`${level.id}: valid, non-negative, integer answers`, () => {
      for (const t of sample(level.gen, 7, 300)) {
        const e = expected(t);
        if (e.kind === 'num') {
          expect(Number.isInteger(e.value), `${taskKey(t)}`).toBe(true);
          expect(e.value).toBeGreaterThanOrEqual(0);
        }
        if (t.kind === 'expr') {
          expect(t.a).toBeGreaterThanOrEqual(0);
          expect(t.b).toBeGreaterThanOrEqual(0);
          expect(t.c).toBe(apply(t.op, t.a, t.b));
          expect(Number.isInteger(t.c)).toBe(true);
          if (t.op === 'div') expect(t.b).toBeGreaterThan(0);
        }
        if (t.kind === 'compare') {
          expect(operandValue(t.left)).toBeGreaterThanOrEqual(0);
          expect(operandValue(t.right)).toBeGreaterThanOrEqual(0);
          expect(Number.isInteger(operandValue(t.left))).toBe(true);
          expect(Number.isInteger(operandValue(t.right))).toBe(true);
        }
      }
    });
  }
});

describe('addition', () => {
  it('within 5 / 10 respects the limit and keeps zeros rare', () => {
    for (const max of [5, 10]) {
      const ts = exprs(sample(g.addWithin(max)));
      expect(ts.every((t) => t.c <= max)).toBe(true);
      const zeros = ts.filter((t) => t.a === 0 || t.b === 0).length;
      expect(zeros / ts.length).toBeLessThan(0.15);
    }
  });
  it('no carry within 20 never crosses ten', () => {
    for (const t of exprs(sample(g.addNoCarry20()))) {
      expect(t.c).toBeLessThanOrEqual(19);
      expect((t.a % 10) + (t.b % 10)).toBeLessThanOrEqual(9);
    }
  });
  it('carry within 20 always crosses ten', () => {
    for (const t of exprs(sample(g.addCarry20()))) {
      expect(t.a).toBeLessThan(10);
      expect(t.b).toBeLessThan(10);
      expect(t.c).toBeGreaterThan(10);
      expect(t.c).toBeLessThanOrEqual(20);
    }
  });
  it('make ten always sums to 10 with a hidden addend', () => {
    for (const t of exprs(sample(g.makeTen()))) {
      expect(t.c).toBe(10);
      expect(t.missing).not.toBe('c');
    }
  });
  it('two-digit with / without carry', () => {
    for (const t of exprs(sample(g.add100(true)))) {
      expect((t.a % 10) + (t.b % 10)).toBeGreaterThanOrEqual(10);
      expect(t.c).toBeLessThanOrEqual(100);
    }
    for (const t of exprs(sample(g.add100(false)))) {
      expect((t.a % 10) + (t.b % 10)).toBeLessThanOrEqual(9);
      expect(t.c).toBeLessThanOrEqual(99);
    }
  });
  it('tens are whole tens up to 100', () => {
    for (const t of exprs(sample(g.addTens()))) {
      expect(t.a % 10).toBe(0);
      expect(t.b % 10).toBe(0);
      expect(t.c).toBeLessThanOrEqual(100);
    }
  });
});

describe('subtraction', () => {
  it('never negative, within the limit', () => {
    for (const max of [5, 10]) for (const t of exprs(sample(g.subWithin(max)))) {
      expect(t.a).toBeLessThanOrEqual(max);
      expect(t.c).toBeGreaterThanOrEqual(0);
    }
  });
  it('borrow within 20 always borrows', () => {
    for (const t of exprs(sample(g.subBorrow20()))) {
      expect(t.a).toBeGreaterThan(10);
      expect(t.b % 10).toBeGreaterThan(t.a % 10);
      expect(t.c).toBeGreaterThan(0);
    }
  });
  it('no borrow within 20 never borrows', () => {
    for (const t of exprs(sample(g.subNoBorrow20()))) {
      expect(t.b % 10).toBeLessThanOrEqual(t.a % 10);
      expect(t.a).toBeLessThanOrEqual(19);
    }
  });
  it('two-digit with / without borrow', () => {
    for (const t of exprs(sample(g.sub100(true)))) {
      expect(t.b % 10).toBeGreaterThan(t.a % 10);
      expect(t.c).toBeGreaterThan(0);
    }
    for (const t of exprs(sample(g.sub100(false)))) {
      expect(t.b % 10).toBeLessThanOrEqual(t.a % 10);
      expect(t.c).toBeGreaterThan(0);
    }
  });
});

describe('multiplication & division', () => {
  it('row generators use the row', () => {
    for (const t of exprs(sample(g.mulRow([7])))) {
      expect(t.a === 7 || t.b === 7).toBe(true);
      expect(Math.max(t.a, t.b)).toBeLessThanOrEqual(10);
    }
  });
  it('division has no remainder and stays in the table', () => {
    for (const t of exprs(sample(g.divAll()))) {
      expect(t.a % t.b).toBe(0);
      expect(t.a).toBeLessThanOrEqual(100);
      expect(t.c).toBeGreaterThanOrEqual(2);
    }
    for (const t of exprs(sample(g.divRow([6])))) {
      expect(t.b).toBe(6);
      expect(t.a % 6).toBe(0);
    }
  });
  it('remainder is smaller than the divisor', () => {
    for (const t of sample(g.divRemainder())) {
      if (t.kind !== 'rem') throw new Error('expected rem');
      expect(t.r).toBeLessThan(t.b);
      expect(t.b * t.q + t.r).toBe(t.a);
    }
  });
});

describe('counting & comparing', () => {
  it('count choices contain the answer, are distinct and sorted', () => {
    for (const t of sample(g.countStars(1, 5, { choices: true, frames: false }))) {
      if (t.kind !== 'count') throw new Error();
      expect(t.choices).toContain(t.n);
      expect(new Set(t.choices).size).toBe(t.choices!.length);
      expect([...t.choices!].sort((a, b) => a - b)).toEqual(t.choices);
      expect(t.choices!.every((c) => c >= 0)).toBe(true);
    }
  });
  it('compare numbers stays in range and produces all three relations', () => {
    const rels = new Set<string>();
    for (const t of sample(g.compareNumbers(20))) {
      if (t.kind !== 'compare') throw new Error();
      const l = operandValue(t.left);
      const r = operandValue(t.right);
      expect(l).toBeLessThanOrEqual(21);
      expect(r).toBeLessThanOrEqual(21);
      rels.add(l < r ? '<' : l > r ? '>' : '=');
    }
    expect(rels.size).toBe(3);
  });
  it('sequences stay within 0..max', () => {
    for (const t of sample(g.sequence(20, [1]))) {
      if (t.kind !== 'seq') throw new Error();
      for (let i = 0; i < t.length; i++) {
        const v = t.start + t.step * i;
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(20);
      }
      expect(t.gap).toBeGreaterThanOrEqual(1);
      expect(t.gap).toBeLessThan(t.length);
    }
    for (const t of sample(g.sequence(100, [2, 5, 10]))) {
      if (t.kind !== 'seq') throw new Error();
      for (let i = 0; i < t.length; i++) {
        const v = t.start + t.step * i;
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(100);
      }
    }
  });
});

describe('determinism', () => {
  it('same seed → same tasks', () => {
    const a = sample(g.mix([g.addCarry20(), g.mulAll()]), 42, 50).map(taskKey);
    const b = sample(g.mix([g.addCarry20(), g.mulAll()]), 42, 50).map(taskKey);
    expect(a).toEqual(b);
  });
});
