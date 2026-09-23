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

describe('hints follow the notation preference', () => {
  it('uses × and ÷ when asked', () => {
    const cmp = hintFor({ kind: 'compare', left: { kind: 'num', value: 9 }, right: { kind: 'expr', op: 'div', a: 40, b: 4 } }, 'intl');
    expect(cmp && cmp.type === 'text' && cmp.lines.join(' ')).toContain('40 ÷ 4 = 10');
    const word = hintFor({ kind: 'word', op: 'mul', a: 8, b: 3, answer: 24, text: 'x', icon: '🍎', unit: 'jablek', unitForms: ['jablko', 'jablka', 'jablek'] }, 'intl');
    expect(word && (word.type === 'text' || word.type === 'combo') && word.lines[0]).toBe('8 × 3 = ?');
    const school = hintFor({ kind: 'word', op: 'div', a: 12, b: 3, answer: 4, text: 'x', icon: '🍎', unit: 'jablek', unitForms: ['jablko', 'jablka', 'jablek'] });
    expect(school && (school.type === 'text' || school.type === 'combo') && school.lines[0]).toBe('12 : 3 = ?');
  });
});
