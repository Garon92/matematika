import type { Task } from './types';
import { operandValue } from './math';
import { plural } from './czech';
import { opSymbol, type Notation } from './notation';

export type Tone = 'a' | 'b' | 'empty' | 'crossed';

export type Hint =
  /** Stars in ten-frames, consecutive runs of tones. */
  | { type: 'frames'; parts: { n: number; tone: Tone }[] }
  /** Number line with jumps from `start`. `hideEnd` keeps the answer tick as "?". */
  | { type: 'line'; start: number; jumps: number[]; min: number; max: number; hideEnd: boolean; labels?: (number | null)[] }
  /** rows × cols stars (multiplication / division), `extra` = remainder stars. */
  | { type: 'array'; rows: number; cols: number; extra: number; unknown: 'none' | 'cols' | 'rows' | 'total' }
  /** Base-ten blocks for each value (tens as bars, units as dots). */
  | { type: 'blocks'; values: number[] }
  /** Plain text steps. */
  | { type: 'text'; lines: string[] }
  /** Text above a visual hint (word problems). */
  | { type: 'combo'; lines: string[]; hint: Hint };

/** Splits an addition jump into "to the next ten" + rest when it crosses a ten (8 + 5 → +2, +3). */
export function addJumps(a: number, b: number): number[] {
  if (b === 0) return [0];
  const tens = Math.floor(b / 10) * 10;
  const units = b - tens;
  const out: number[] = [];
  let pos = a;
  if (tens > 0) {
    out.push(tens);
    pos += tens;
  }
  if (units > 0) {
    const toTen = 10 - (pos % 10);
    if (pos % 10 !== 0 && units > toTen) {
      out.push(toTen, units - toTen);
    } else out.push(units);
  }
  return out;
}

/** Subtraction jumps (13 − 5 → −3, −2). Returned as negative numbers. */
export function subJumps(a: number, b: number): number[] {
  if (b === 0) return [0];
  const tens = Math.floor(b / 10) * 10;
  const units = b - tens;
  const out: number[] = [];
  let pos = a;
  if (tens > 0) {
    out.push(-tens);
    pos -= tens;
  }
  if (units > 0) {
    const toTen = pos % 10;
    if (toTen !== 0 && units > toTen) out.push(-toTen, -(units - toTen));
    else out.push(-units);
  }
  return out;
}

function lineFor(start: number, jumps: number[], hideEnd: boolean): Hint {
  let pos = start;
  let lo = start;
  let hi = start;
  for (const j of jumps) {
    pos += j;
    lo = Math.min(lo, pos);
    hi = Math.max(hi, pos);
  }
  const span = hi - lo;
  const pad = span <= 20 ? 1 : 5;
  const min = Math.max(0, Math.floor((lo - pad) / (span > 20 ? 10 : 1)) * (span > 20 ? 10 : 1));
  const max = Math.ceil((hi + pad) / (span > 20 ? 10 : 1)) * (span > 20 ? 10 : 1);
  return { type: 'line', start, jumps, min, max, hideEnd };
}

export function hintFor(task: Task, notation: Notation = 'school'): Hint | null {
  switch (task.kind) {
    case 'expr': {
      const { op, a, b, c, missing } = task;
      if (op === 'add') {
        if (c <= 20) {
          if (missing === 'c') return { type: 'frames', parts: [{ n: a, tone: 'a' }, { n: b, tone: 'b' }] };
          if (missing === 'b') return { type: 'frames', parts: [{ n: a, tone: 'a' }, { n: b, tone: 'empty' }] };
          return { type: 'frames', parts: [{ n: a, tone: 'empty' }, { n: b, tone: 'b' }] };
        }
        if (missing === 'c') return lineFor(a, addJumps(a, b), true);
        return { type: 'text', lines: missing === 'b' ? [`Kolik chybí od ${a} do ${c}?`, `${c} − ${a} = ?`] : [`Které číslo a ${b} dá ${c}?`, `${c} − ${b} = ?`] };
      }
      if (op === 'sub') {
        if (a <= 20) {
          if (missing === 'c') return { type: 'frames', parts: [{ n: c, tone: 'a' }, { n: b, tone: 'crossed' }] };
          return { type: 'frames', parts: [{ n: c, tone: 'a' }, { n: b, tone: 'crossed' }] };
        }
        if (missing === 'c') return lineFor(a, subJumps(a, b), true);
        return { type: 'text', lines: missing === 'b' ? [`Kolik musíš odebrat z ${a}, aby zbylo ${c}?`, `${a} − ${c} = ?`] : [`Z kolika odebereš ${b} a zbyde ${c}?`, `${c} + ${b} = ?`] };
      }
      if (op === 'mul') {
        if (missing === 'c') return { type: 'array', rows: a, cols: b, extra: 0, unknown: 'total' };
        if (missing === 'b') return { type: 'array', rows: a, cols: b, extra: 0, unknown: 'cols' };
        return { type: 'array', rows: a, cols: b, extra: 0, unknown: 'rows' };
      }
      // division a : b = c → b rows of c
      if (b === 0) return null;
      if (missing === 'c') return { type: 'array', rows: b, cols: c, extra: 0, unknown: 'cols' };
      if (missing === 'a') return { type: 'array', rows: b, cols: c, extra: 0, unknown: 'total' };
      return { type: 'array', rows: b, cols: c, extra: 0, unknown: 'rows' };
    }
    case 'rem':
      return { type: 'array', rows: task.q, cols: task.b, extra: task.r, unknown: 'rows' };
    case 'compare': {
      const l = operandValue(task.left);
      const r = operandValue(task.right);
      if (task.left.kind === 'expr' || task.right.kind === 'expr') {
        const lines: string[] = [];
        const show = (o: typeof task.left, v: number) =>
          o.kind === 'expr' ? `${o.a} ${opSymbol(o.op, notation)} ${o.b} = ${v}` : null;
        const sl = show(task.left, l);
        const sr = show(task.right, r);
        if (sl) lines.push(sl);
        if (sr) lines.push(sr);
        lines.push(`Teď porovnej ${l} a ${r}.`);
        return { type: 'text', lines };
      }
      return { type: 'blocks', values: [l, r] };
    }
    case 'count':
      // scattered stars regrouped into ten-frames; stars that already sit in frames need no hint
      return task.frames ? null : { type: 'frames', parts: [{ n: task.n, tone: 'a' }] };
    case 'seq': {
      const labels: (number | null)[] = [];
      for (let i = 0; i < task.length; i++) labels.push(i === task.gap ? null : task.start + task.step * i);
      const jumps = Array.from({ length: task.length - 1 }, () => task.step);
      const h = lineFor(task.start, jumps, false);
      if (h.type === 'line') h.labels = labels;
      return h;
    }
    case 'place':
      return {
        type: 'text',
        lines: [
          'Desítky píšeme vlevo, jednotky vpravo.',
          `${task.tens} ${plural(task.tens, 'desítka', 'desítky', 'desítek')} → ${task.tens} _`,
          `${task.units} ${plural(task.units, 'jednotka', 'jednotky', 'jednotek')} → _ ${task.units}`,
        ],
      };
    case 'word': {
      // the key hint of a word problem is the calculation itself, plus the usual picture for small numbers
      const lines = [`${task.a} ${opSymbol(task.op, notation)} ${task.b} = ?`];
      const c = task.op === 'add' ? task.a + task.b : task.op === 'sub' ? task.a - task.b : task.op === 'mul' ? task.a * task.b : task.a / task.b;
      const visual = hintFor({ kind: 'expr', op: task.op, a: task.a, b: task.b, c, missing: 'c' }, notation);
      if (visual && (visual.type === 'frames' || (visual.type === 'array' && visual.rows * visual.cols <= 60))) return { type: 'combo', lines, hint: visual };
      return { type: 'text', lines };
    }
  }
}
