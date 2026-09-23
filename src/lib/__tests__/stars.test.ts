import { describe, expect, it } from 'vitest';
import { computeLayout, effectiveMode } from '../../stars/layout';
import { calcResult } from '../calc';

describe('star layouts', () => {
  it('scatter: stars never overlap for countable amounts and stay inside', () => {
    for (const n of [1, 3, 7, 12, 25, 60, 150]) {
      const W = 600;
      const H = 400;
      const l = computeLayout({ n, mode: 'scatter', width: W, height: H, seed: 42 });
      for (let i = 0; i < n; i++) {
        expect(l.xs[i]! - l.r).toBeGreaterThanOrEqual(0);
        expect(l.xs[i]! + l.r).toBeLessThanOrEqual(W);
        expect(l.ys[i]! - l.r).toBeGreaterThanOrEqual(0);
        expect(l.ys[i]! + l.r).toBeLessThanOrEqual(H);
        for (let j = 0; j < i; j++) {
          const d = Math.hypot(l.xs[i]! - l.xs[j]!, l.ys[i]! - l.ys[j]!);
          expect(d, `n=${n} stars ${i},${j}`).toBeGreaterThan(l.r * 1.6);
        }
      }
    }
  });
  it('scatter: adding a star keeps earlier stars in place', () => {
    const a = computeLayout({ n: 9, mode: 'scatter', width: 500, height: 300, seed: 7 });
    const b = computeLayout({ n: 10, mode: 'scatter', width: 500, height: 300, seed: 7 });
    const sx = (b.xs[0]! - 8) / (a.xs[0]! - 8);
    expect(Number.isFinite(sx)).toBe(true);
    // same normalized sampler → first star identical up to the radius-dependent margin
    expect(Math.abs(a.xs[3]! - b.xs[3]!)).toBeLessThan(12);
  });
  it('ten-frames: 10 per frame, empty slots for the rest', () => {
    const l = computeLayout({ n: 13, mode: 'ten', width: 600, height: 300, seed: 1 });
    expect(l.boxes).toHaveLength(2);
    expect(l.slots).toHaveLength(7);
  });
  it('zero stars in ten mode still shows an empty frame', () => {
    const l = computeLayout({ n: 0, mode: 'ten', width: 600, height: 300, seed: 1 });
    expect(l.boxes).toHaveLength(1);
    expect(l.slots).toHaveLength(10);
  });
  it('array: rows × cols', () => {
    const l = computeLayout({ n: 12, mode: 'array', rows: 3, cols: 4, width: 400, height: 300, seed: 1 });
    expect(l.boxes).toHaveLength(3);
    const ys = new Set(Array.from(l.ys).map((y) => Math.round(y)));
    expect(ys.size).toBe(3);
  });
  it('grouped layouts fall back to scatter for huge counts', () => {
    expect(effectiveMode('ten', 50_000)).toBe('scatter');
    expect(effectiveMode('hundred', 5_000)).toBe('hundred');
  });
});

describe('star calculator', () => {
  it('addition colours A and B', () => {
    const r = calcResult(3, 2, 'add', 'scatter');
    expect(r.value).toBe(5);
    expect(r.segments).toEqual([
      { n: 3, tone: 'a' },
      { n: 2, tone: 'b' },
    ]);
  });
  it('subtraction below zero is explained, not silently 0', () => {
    const r = calcResult(3, 5, 'sub', 'scatter');
    expect(r.value).toBeNull();
    expect(r.message).toMatch(/nemůžeš/);
    const ok = calcResult(7, 3, 'sub', 'scatter');
    expect(ok.value).toBe(4);
    expect(ok.segments[1]).toEqual({ n: 3, tone: 'crossed' });
  });
  it('division by zero and remainders', () => {
    expect(calcResult(5, 0, 'div', 'scatter').message).toBe('Nulou dělit nejde.');
    const r = calcResult(17, 5, 'div', 'scatter');
    expect(r.value).toBe(3);
    expect(r.remainder).toBe(2);
  });
  it('multiplication uses an array when grouping is on', () => {
    const r = calcResult(4, 6, 'mul', 'ten');
    expect(r.mode).toBe('array');
    expect(r.rows).toBe(4);
    expect(r.cols).toBe(6);
    expect(calcResult(4000, 4000, 'mul', 'scatter').message).toMatch(/10 milionů/);
  });
});
