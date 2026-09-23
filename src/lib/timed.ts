import * as g from './generators';
import type { Gen } from './generators';

export interface TimedDef {
  id: string;
  title: string;
  sample: string;
  gen: Gen;
  /** Correct answers needed for 1★, 2★, 3★ in 60 s. */
  thresholds: readonly [number, number, number];
}

export const TIMED_SECONDS = 60;

export const TIMED: readonly TimedDef[] = [
  { id: 't-add10', title: 'Sčítání do 10', sample: '4 + 5', gen: g.addWithin(10, 3), thresholds: [8, 14, 20] },
  { id: 't-sub10', title: 'Odčítání do 10', sample: '9 − 4', gen: g.subWithin(10), thresholds: [8, 14, 20] },
  { id: 't-add20', title: 'Sčítání do 20', sample: '8 + 7', gen: g.mix([g.addNoCarry20(), g.addCarry20()], [1, 2]), thresholds: [6, 11, 16] },
  { id: 't-sub20', title: 'Odčítání do 20', sample: '15 − 7', gen: g.mix([g.subNoBorrow20(), g.subBorrow20()], [1, 2]), thresholds: [6, 11, 16] },
  { id: 't-pm20', title: '+ a − do 20', sample: '13 − 5', gen: g.mix([g.addNoCarry20(), g.addCarry20(), g.subNoBorrow20(), g.subBorrow20()]), thresholds: [6, 11, 16] },
  { id: 't-mul', title: 'Násobilka', sample: '7 · 8', gen: g.mulAll(1, 10), thresholds: [6, 11, 16] },
  { id: 't-div', title: 'Dělení', sample: '56 : 7', gen: g.divAll(), thresholds: [6, 10, 15] },
  { id: 't-md', title: 'Násobení a dělení', sample: '6 · 7', gen: g.mix([g.mulAll(), g.divAll()]), thresholds: [6, 10, 15] },
  { id: 't-100', title: '+ a − do 100', sample: '45 + 38', gen: g.mix([g.add100(true), g.sub100(true), g.add100(false), g.sub100(false)]), thresholds: [3, 6, 9] },
];

export function timedById(id: string): TimedDef | undefined {
  return TIMED.find((t) => t.id === id);
}
