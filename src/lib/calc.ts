import type { LayoutMode } from '../stars/layout';
import type { Segment } from '../stars/render';
import type { Op } from './types';
import { formatNumber } from './czech';

export const MAX_STARS = 10_000_000;

export interface CalcResult {
  /** number shown in C (null = impossible) */
  value: number | null;
  remainder: number;
  segments: Segment[];
  total: number;
  message: string | null;
  mode: LayoutMode | 'array';
  rows?: number;
  cols?: number;
}

/** Result box contents for A op B (pure, tested). */
export function calcResult(a: number, b: number, op: Op, mode: LayoutMode): CalcResult {
  switch (op) {
    case 'add': {
      const v = a + b;
      if (v > MAX_STARS) return { value: v, remainder: 0, segments: [], total: 0, message: 'Víc než 10 milionů hvězd se nevejde.', mode };
      return { value: v, remainder: 0, segments: [{ n: a, tone: 'a' }, { n: b, tone: 'b' }], total: v, message: null, mode };
    }
    case 'sub': {
      if (b > a) return { value: null, remainder: 0, segments: [], total: 0, message: `Z ${formatNumber(a)} nemůžeš odebrat ${formatNumber(b)} – výsledek by byl menší než nula.`, mode };
      return { value: a - b, remainder: 0, segments: [{ n: a - b, tone: 'a' }, { n: b, tone: 'crossed' }], total: a, message: b > 0 ? 'Přeškrtnuté hvězdy jsme odebrali.' : null, mode };
    }
    case 'mul': {
      const v = a * b;
      if (v > MAX_STARS) return { value: v, remainder: 0, segments: [], total: 0, message: 'Víc než 10 milionů hvězd se nevejde.', mode };
      const grouped = mode !== 'scatter' && v <= 10_000 && a > 0 && b > 0;
      return grouped
        ? { value: v, remainder: 0, segments: [{ n: v, tone: 'a' }], total: v, message: `${formatNumber(a)} řad po ${formatNumber(b)}`, mode: 'array', rows: a, cols: b }
        : { value: v, remainder: 0, segments: [{ n: v, tone: 'a' }], total: v, message: null, mode };
    }
    case 'div': {
      if (b === 0) return { value: null, remainder: 0, segments: [], total: 0, message: 'Nulou dělit nejde.', mode };
      const q = Math.floor(a / b);
      const r = a % b;
      return {
        value: q,
        remainder: r,
        segments: [
          { n: q, tone: 'a' },
          { n: r, tone: 'dim' },
        ],
        total: q + r,
        message: r > 0 ? `Zbytek ${formatNumber(r)} – ${r === 1 ? 'světlá hvězda zbyla' : 'světlé hvězdy zbyly'}.` : null,
        mode,
      };
    }
  }
}

