import { describe, expect, it } from 'vitest';
import { numberToWords, plural, placeValue, formatNumber } from '../czech';

describe('numberToWords', () => {
  const cases: [number, string][] = [
    [0, 'nula'],
    [1, 'jedna'],
    [2, 'dva'],
    [11, 'jedenáct'],
    [14, 'čtrnáct'],
    [19, 'devatenáct'],
    [20, 'dvacet'],
    [37, 'třicet sedm'],
    [99, 'devadesát devět'],
    [100, 'sto'],
    [101, 'sto jedna'],
    [200, 'dvě stě'],
    [345, 'tři sta čtyřicet pět'],
    [500, 'pět set'],
    [1000, 'tisíc'],
    [1001, 'tisíc jedna'],
    [2000, 'dva tisíce'],
    [4500, 'čtyři tisíce pět set'],
    [5000, 'pět tisíc'],
    [22000, 'dvacet dva tisíc'],
    [100000, 'sto tisíc'],
    [1_000_000, 'milion'],
    [2_000_000, 'dva miliony'],
    [5_000_000, 'pět milionů'],
    [10_000_000, 'deset milionů'],
    [1_234_567, 'milion dvě stě třicet čtyři tisíc pět set šedesát sedm'],
  ];
  for (const [n, w] of cases) it(`${n} → ${w}`, () => expect(numberToWords(n)).toBe(w));
});

describe('plural', () => {
  it('uses Czech plural rules', () => {
    expect(plural(1, 'hvězda', 'hvězdy', 'hvězd')).toBe('hvězda');
    expect(plural(3, 'hvězda', 'hvězdy', 'hvězd')).toBe('hvězdy');
    expect(plural(5, 'hvězda', 'hvězdy', 'hvězd')).toBe('hvězd');
    expect(plural(0, 'hvězda', 'hvězdy', 'hvězd')).toBe('hvězd');
  });
});

describe('placeValue', () => {
  it('breaks 47 into 4 desítky and 7 jednotek', () => {
    expect(placeValue(47)).toEqual([
      { count: 4, label: 'desítky', unit: 'desítky' },
      { count: 7, label: 'jednotek', unit: 'jednotky' },
    ]);
  });
  it('handles hundreds', () => {
    expect(placeValue(305).map((p) => p.count)).toEqual([3, 0, 5]);
  });
});

it('formats numbers with Czech grouping', () => {
  expect(formatNumber(1234567).replace(/\s/g, ' ')).toBe('1 234 567');
});

import { vocative, solvedText, questionText, formatDuration } from '../format';

describe('vocative', () => {
  const cases: [string, string][] = [
    ['Adámek', 'Adámku'],
    ['Ema', 'Emo'],
    ['Anička', 'Aničko'],
    ['Petr', 'Petře'],
    ['Filip', 'Filipe'],
    ['Tomáš', 'Tomáši'],
    ['Matěj', 'Matěji'],
    ['Sofie', 'Sofie'],
    ['Honza', 'Honzo'],
    ['Adam', 'Adame'],
  ];
  for (const [a, b] of cases) it(`${a} → ${b}`, () => expect(vocative(a)).toBe(b));
});

describe('task texts', () => {
  it('solved and question texts', () => {
    const t = { kind: 'expr', op: 'mul', a: 4, b: 7, c: 28, missing: 'b' } as const;
    expect(solvedText(t)).toBe('4 · 7 = 28');
    expect(solvedText(t, 'intl')).toBe('4 × 7 = 28');
    expect(questionText(t)).toBe('4 · ? = 28');
    expect(solvedText({ kind: 'compare', left: { kind: 'num', value: 3 }, right: { kind: 'expr', op: 'add', a: 2, b: 2 } })).toBe('3 < 2 + 2');
  });
  it('durations', () => {
    expect(formatDuration(42_000)).toBe('42 s');
    expect(formatDuration(125_000)).toBe('2 min 05 s');
  });
});
