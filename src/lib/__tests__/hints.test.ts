import { describe, expect, it } from 'vitest';
import { addJumps, subJumps, hintFor } from '../hints';
import { speechFor } from '../speech';
import { LEVELS } from '../levels';
import { mulberry32 } from '../rng';

describe('number line jumps', () => {
  it('bridges through ten', () => {
    expect(addJumps(8, 5)).toEqual([2, 3]);
    expect(addJumps(13, 4)).toEqual([4]);
    expect(addJumps(38, 47)).toEqual([40, 2, 5]);
    expect(subJumps(13, 5)).toEqual([-3, -2]);
    expect(subJumps(52, 17)).toEqual([-10, -2, -5]);
  });
  it('jumps add up to b', () => {
    for (let a = 0; a <= 90; a += 7) for (let b = 1; b <= 60; b += 3) {
      expect(addJumps(a, b).reduce((s, x) => s + x, 0)).toBe(b);
      if (b <= a) expect(subJumps(a, b).reduce((s, x) => s + x, 0)).toBe(-b);
    }
  });
});

describe('hints & speech exist for every level', () => {
  for (const level of LEVELS) {
    it(level.id, () => {
      const rng = mulberry32(11);
      for (let i = 0; i < 40; i++) {
        const t = level.gen(rng);
        const s = speechFor(t);
        expect(s.length).toBeGreaterThan(5);
        expect(s).not.toMatch(/undefined|NaN/);
        const h = hintFor(t);
        if (h && h.type === 'frames') for (const p of h.parts) expect(p.n).toBeGreaterThanOrEqual(0);
      }
    });
  }
});
