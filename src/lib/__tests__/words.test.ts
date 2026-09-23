import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../rng';
import { wordProblem, qty, be, ITEMS, nbsp } from '../words';

describe('typography', () => {
  it('keeps one-letter prepositions and numbers with the next word', () => {
    expect(nbsp('V každém sáčku je 9 autíček a k tomu 2 míčky')).toBe('V\u00A0každém sáčku je 9\u00A0autíček a\u00A0k\u00A0tomu 2\u00A0míčky');
    expect(nbsp('a k v lese i u nás')).toBe('a\u00A0k\u00A0v\u00A0lese i\u00A0u\u00A0nás');
  });
});

describe('declension helpers', () => {
  const hruska = ITEMS.find((i) => i.nom1 === 'hruška')!;
  it('qty picks the right form', () => {
    expect(qty(1, hruska)).toBe('1 hrušku');
    expect(qty(1, hruska, 'nom')).toBe('1 hruška');
    expect(qty(3, hruska)).toBe('3 hrušky');
    expect(qty(7, hruska)).toBe('7 hrušek');
  });
  it('be agrees with the numeral', () => {
    expect(be(1)).toBe('je');
    expect(be(3)).toBe('jsou');
    expect(be(8)).toBe('je');
  });
});

describe('word problems', () => {
  it('answers match the operation and texts are well formed', () => {
    const rng = mulberry32(3);
    for (const ops of [['add'], ['sub'], ['mul'], ['div']] as const) {
      const gen = wordProblem(ops, ops[0] === 'mul' || ops[0] === 'div' ? 10 : 20);
      for (let i = 0; i < 300; i++) {
        const t = gen(rng);
        if (t.kind !== 'word') throw new Error();
        const exp = t.op === 'add' ? t.a + t.b : t.op === 'sub' ? t.a - t.b : t.op === 'mul' ? t.a * t.b : t.a / t.b;
        expect(t.answer).toBe(exp);
        expect(Number.isInteger(t.answer)).toBe(true);
        expect(t.answer).toBeGreaterThanOrEqual(0);
        expect(t.text).toMatch(/\?$/);
        expect(t.text).not.toMatch(/undefined|NaN|\s{2}/);
        expect(t.text).toContain(String(t.a));
        expect(t.text).toContain(String(t.b));
      }
    }
  });
  it('never says "1 jablek" or "5 jablka"', () => {
    const rng = mulberry32(9);
    const gen = wordProblem(['add', 'sub', 'mul', 'div'], 20);
    for (let i = 0; i < 500; i++) {
      const t = gen(rng);
      if (t.kind !== 'word') throw new Error();
      for (const it of ITEMS) {
        expect(t.text).not.toMatch(new RegExp(`\\b1\\s${it.many}\\b`));
        expect(t.text).not.toMatch(new RegExp(`\\b([5-9]|1\\d|20)\\s${it.few}\\b`));
      }
    }
  });
});
