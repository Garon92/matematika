import { describe, expect, it } from 'vitest';
import { FreeGenerator } from '../free';
import { mulberry32 } from '../rng';

describe('free training generator (original pocitadlo)', () => {
  for (const mode of ['add', 'sub', 'mul', 'div', 'mix'] as const) {
    for (const max of [5, 20, 100]) {
      it(`${mode} ≤ ${max}: results and operands within range`, () => {
        const gen = new FreeGenerator(mulberry32(1), mode, max);
        let prev = '';
        for (let i = 0; i < 400; i++) {
          const t = gen.next();
          expect(t.c).toBeGreaterThanOrEqual(0);
          expect(Number.isInteger(t.c)).toBe(true);
          if (t.op === 'add' || t.op === 'mul') expect(t.c).toBeLessThanOrEqual(max);
          if (t.op === 'sub' || t.op === 'div') expect(t.a).toBeLessThanOrEqual(max);
          if (t.op === 'div') expect(t.a % t.b).toBe(0);
          const key = `${t.op}${t.a},${t.b}`;
          if (max >= 20) expect(key).not.toBe(prev);
          prev = key;
        }
      });
    }
  }
  it('addition avoids most +0 cases', () => {
    const gen = new FreeGenerator(mulberry32(2), 'add', 20);
    let zeros = 0;
    for (let i = 0; i < 1000; i++) {
      const t = gen.next();
      if (t.a === 0 || t.b === 0) zeros++;
    }
    expect(zeros).toBeLessThan(120);
  });
});
