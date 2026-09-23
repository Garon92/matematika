import type { Hint } from '../lib/hints';
import { StarCanvas } from '../stars/StarCanvas';
import type { Segment } from '../stars/render';

function framesSegments(h: Extract<Hint, { type: 'frames' }>): Segment[] {
  return h.parts.filter((p) => p.n > 0).map((p) => ({ n: p.n, tone: p.tone === 'a' ? 'a' : p.tone === 'b' ? 'b' : p.tone === 'crossed' ? 'crossed' : 'empty' }));
}

function NumberLine({ h }: { h: Extract<Hint, { type: 'line' }> }) {
  const W = 640;
  const H = 150;
  const padX = 28;
  const span = Math.max(1, h.max - h.min);
  const x = (v: number) => padX + ((v - h.min) / span) * (W - 2 * padX);
  const baseY = 108;
  const tickEvery = span <= 20 ? 1 : span <= 60 ? 5 : 10;
  const labelEvery = span <= 20 ? (span <= 12 ? 1 : 2) : 10;
  const ticks: number[] = [];
  for (let v = Math.ceil(h.min / tickEvery) * tickEvery; v <= h.max; v += tickEvery) ticks.push(v);
  const hops: { from: number; to: number; label: string }[] = [];
  let pos = h.start;
  for (const j of h.jumps) {
    hops.push({ from: pos, to: pos + j, label: `${j > 0 ? '+' : '−'}${Math.abs(j)}` });
    pos += j;
  }
  const end = pos;
  const labelled = h.labels ? h.labels.map((l, i) => ({ v: h.start + (h.jumps[0] ?? 0) * i, l })) : null;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" role="img" aria-label="Číselná osa">
      <line x1={padX - 10} x2={W - padX + 10} y1={baseY} y2={baseY} stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
      {ticks.map((v) => (
        <g key={v}>
          <line x1={x(v)} x2={x(v)} y1={baseY - (v % labelEvery === 0 ? 9 : 5)} y2={baseY + (v % labelEvery === 0 ? 9 : 5)} stroke="currentColor" strokeWidth="2" opacity="0.5" />
          {!labelled && v % labelEvery === 0 && !(h.hideEnd && v === end) && (
            <text x={x(v)} y={baseY + 30} textAnchor="middle" fontSize="18" fontWeight="700" fill="currentColor" opacity="0.75">
              {v}
            </text>
          )}
        </g>
      ))}
      {labelled?.map(({ v, l }, i) => (
        <text key={i} x={x(v)} y={baseY + 32} textAnchor="middle" fontSize="22" fontWeight="800" fill={l === null ? 'var(--accent)' : 'currentColor'}>
          {l === null ? '?' : l}
        </text>
      ))}
      {hops.map((hp, i) => {
        const x1 = x(hp.from);
        const x2 = x(hp.to);
        const mid = (x1 + x2) / 2;
        const lift = Math.min(70, 26 + Math.abs(x2 - x1) * 0.35);
        const color = hp.label.startsWith('+') ? 'var(--hint-a)' : 'var(--hint-c)';
        return (
          <g key={i} className="hop" style={{ animationDelay: `${i * 380}ms` }}>
            <path d={`M${x1},${baseY - 6} Q${mid},${baseY - lift * 2} ${x2},${baseY - 6}`} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" />
            <circle cx={x2} cy={baseY - 6} r="5" fill={color} />
            <text x={mid} y={baseY - lift - 8} textAnchor="middle" fontSize="20" fontWeight="800" fill={color}>
              {hp.label}
            </text>
          </g>
        );
      })}
      <circle cx={x(h.start)} cy={baseY} r="8" fill="var(--accent)" />
      {!labelled && (
        <text x={x(h.start)} y={baseY + 30} textAnchor="middle" fontSize="19" fontWeight="900" fill="var(--accent)">
          {h.start}
        </text>
      )}
      {!labelled && h.hideEnd && (
        <text x={x(end)} y={baseY + 30} textAnchor="middle" fontSize="20" fontWeight="900" fill="var(--hint-a)">
          ?
        </text>
      )}
    </svg>
  );
}

/** Base-ten blocks: tens as bars of 10, units as squares. */
export function Blocks({ values, compact = false }: { values: number[]; compact?: boolean }) {
  return (
    <div className={`flex items-end justify-center ${compact ? 'gap-4' : 'gap-8'}`}>
      {values.map((v, i) => {
        const tens = Math.floor(v / 10);
        const units = v % 10;
        return (
          <div key={i} className="flex flex-col items-center gap-1">
            <div className="flex items-end gap-[3px]" aria-hidden="true">
              {Array.from({ length: tens }, (_, t) => (
                <span key={`t${t}`} className="block-ten" />
              ))}
              <span className="ml-1 grid grid-cols-2 gap-[3px]">
                {Array.from({ length: units }, (_, u) => (
                  <span key={`u${u}`} className="block-unit" />
                ))}
              </span>
            </div>
            <span className="text-lg font-extrabold tabular-nums">{v}</span>
          </div>
        );
      })}
    </div>
  );
}

export function HintView({ hint }: { hint: Hint }) {
  switch (hint.type) {
    case 'frames': {
      const segs = framesSegments(hint);
      const total = segs.reduce((s, x) => s + x.n, 0);
      return <StarCanvas n={total} segments={segs} mode="ten" className="hint-sky h-full w-full" maxR={18} seed={3} label={`Nápověda: ${total} hvězd v rámečcích`} />;
    }
    case 'array': {
      const total = hint.rows * hint.cols + hint.extra;
      if (total > 150) return <div className="hint-text">{hint.rows} řad po {hint.cols}</div>;
      const segs: Segment[] = [{ n: hint.rows * hint.cols, tone: 'a' }];
      if (hint.extra > 0) segs.push({ n: hint.extra, tone: 'c' });
      return (
        <div className="flex h-full w-full items-stretch gap-2">
          <StarCanvas n={total} segments={segs} mode="array" rows={hint.rows} cols={hint.cols} className="hint-sky h-full min-w-0 flex-1" maxR={14} label={`Nápověda: ${hint.rows} řad po ${hint.cols}`} />
        </div>
      );
    }
    case 'line':
      return (
        <div className="h-full w-full text-fg">
          <NumberLine h={hint} />
        </div>
      );
    case 'blocks':
      return <Blocks values={hint.values} />;
    case 'text':
      return (
        <div className="hint-text">
          {hint.lines.map((l, i) => (
            <p key={i}>{l}</p>
          ))}
        </div>
      );
  }
}
