import { useEffect, useRef, useState } from 'react';
import { confirmDialog, sfx, toast } from '../kit';
import { AREAS, levelsOf } from '../lib/levels';
import { areaStars, starsOf } from '../lib/progress';
import { allCards } from '../lib/srs';
import { dayStat, totals, visibleStreak } from '../lib/stats';
import { dayKeyOf, weekdayShort } from '../lib/dates';
import { formatDuration, solvedText } from '../lib/format';
import { plural } from '../lib/czech';
import { exportData, importData, resetAll, today, usePrefs, useStore } from '../state/store';
import { navigate } from '../router';
import { Icon } from '../ui/Icon';
import { StarRating } from '../ui/StarRating';
import { PrefsForm } from './AppSettings';
import { ScreenHeader } from './ScreenHeader';
import { AREA_COLORS } from './areaStyle';

const GATE_KEY = 'matematika:parents-open';
const OP_LABELS: Record<string, string> = { add: 'Sčítání', sub: 'Odčítání', mul: 'Násobení', div: 'Dělení', count: 'Počítání a řady', compare: 'Porovnávání' };

/** Hold-to-open gate: easy for adults, unlikely to be triggered by a small child by accident. */
function ParentGate({ onOpen }: { onOpen: () => void }) {
  const [p, setP] = useState(0);
  const raf = useRef(0);
  const start = useRef(0);
  const HOLD = 1600;
  const stop = () => {
    cancelAnimationFrame(raf.current);
    setP(0);
  };
  const begin = (e: React.PointerEvent) => {
    e.preventDefault();
    start.current = performance.now();
    const tick = () => {
      const v = (performance.now() - start.current) / HOLD;
      if (v >= 1) {
        setP(1);
        sfx.pop();
        onOpen();
        return;
      }
      setP(v);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  };
  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  return (
    <div className="g92-empty parent-gate">
      <Icon name="users" size={56} className="text-accent-text" />
      <h2 className="text-2xl font-black">Pro rodiče</h2>
      <p className="g92-muted">Přehled pokroku a nastavení. Pro otevření podržte tlačítko.</p>
      <button
        type="button"
        className="g92-btn g92-btn--lg hold-btn"
        style={{ ['--p' as string]: p }}
        onPointerDown={begin}
        onPointerUp={stop}
        onPointerLeave={stop}
        onPointerCancel={stop}
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && e.shiftKey) onOpen();
        }}
        aria-label="Podržte pro otevření (nebo Shift+Enter)"
      >
        <span className="hold-btn__fill" aria-hidden="true" />
        <span className="relative">Podržte pro otevření</span>
      </button>
    </div>
  );
}

function DaysChart() {
  const stats = useStore('stats');
  const t = today();
  const days = Array.from({ length: 14 }, (_, i) => t - 13 + i);
  const data = days.map((d) => ({ d, ...dayStat(stats, d) }));
  const peak = Math.max(4, ...data.map((x) => x.solved));
  const nice = [4, 10, 20, 40, 60, 100, 200, 400, 1000];
  const max = nice.find((v) => v >= peak) ?? Math.ceil(peak / 100) * 100;
  const figRef = useRef<HTMLElement>(null);
  const [fw, setFw] = useState(760);
  useEffect(() => {
    const el = figRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setFw(Math.max(280, Math.min(920, el.clientWidth))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const W = fw;
  const H = 210;
  const padL = 30;
  const padB = 28;
  const padT = 10;
  const bw = (W - padL) / days.length;
  const barW = Math.min(30, bw * 0.62);
  const y = (v: number) => padT + (H - padT - padB) * (1 - v / max);
  const ticks = [0, max / 2, max];
  const [showTable, setShowTable] = useState(false);
  return (
    <figure className="chart" ref={figRef}>
      <figcaption className="chart__legend">
        <span>
          <i style={{ background: 'var(--g92-success)' }} /> Správně napoprvé
        </span>
        <span>
          <i style={{ background: 'var(--g92-warning)' }} /> S chybou
        </span>
        <button type="button" className="g92-btn g92-btn--ghost g92-btn--sm ml-auto" onClick={() => setShowTable((s) => !s)} aria-expanded={showTable}>
          {showTable ? 'Graf' : 'Tabulka'}
        </button>
      </figcaption>
      {showTable ? (
        <table className="chart__table">
          <thead>
            <tr>
              <th>Den</th>
              <th>Příkladů</th>
              <th>Správně napoprvé</th>
              <th>S chybou</th>
              <th>Čas</th>
            </tr>
          </thead>
          <tbody>
            {data
              .slice()
              .reverse()
              .map((x) => (
                <tr key={x.d}>
                  <td>
                    {weekdayShort(x.d)} {dayKeyOf(x.d).slice(8, 10)}.{dayKeyOf(x.d).slice(5, 7)}.
                  </td>
                  <td>{x.solved}</td>
                  <td>{x.correct}</td>
                  <td>{x.wrong}</td>
                  <td>{x.ms > 0 ? formatDuration(x.ms) : '–'}</td>
                </tr>
              ))}
          </tbody>
        </table>
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} className="chart__svg" role="img" aria-label="Počet příkladů za posledních 14 dní">
          {ticks.map((v) => (
            <g key={v}>
              <line x1={padL} x2={W} y1={y(v)} y2={y(v)} stroke="var(--g92-border)" strokeWidth="1" />
              <text x={padL - 6} y={y(v) + 4} textAnchor="end" fontSize="11" fill="var(--g92-text-muted)">
                {v}
              </text>
            </g>
          ))}
          {data.map((x, i) => {
            const cx = padL + bw * i + bw / 2;
            const hc = y(0) - y(x.correct);
            const hw = y(0) - y(x.wrong);
            const isToday = x.d === t;
            return (
              <g key={x.d} className="chart__bar">
                <title>
                  {`${weekdayShort(x.d)} ${dayKeyOf(x.d)}: ${x.solved} ${plural(x.solved, 'příklad', 'příklady', 'příkladů')} (${x.correct} správně napoprvé, ${x.wrong} s chybou)`}
                </title>
                <rect x={cx - bw / 2} y={padT} width={bw} height={H - padT - padB} fill="transparent" />
                {x.correct > 0 && <rect x={cx - barW / 2} y={y(x.correct)} width={barW} height={Math.max(1, hc)} rx="4" fill="var(--g92-success)" />}
                {x.wrong > 0 && (
                  <rect x={cx - barW / 2} y={y(x.correct + x.wrong)} width={barW} height={Math.max(1, hw - 2)} rx="4" fill="var(--g92-warning)" />
                )}
                <text x={cx} y={H - 10} textAnchor="middle" fontSize="11" fontWeight={isToday ? 800 : 500} fill={isToday ? 'var(--g92-text)' : 'var(--g92-text-muted)'}>
                  {isToday ? 'dnes' : weekdayShort(x.d)}
                </text>
              </g>
            );
          })}
        </svg>
      )}
    </figure>
  );
}

function Overview() {
  const stats = useStore('stats');
  const progress = useStore('progress');
  const deck = useStore('deck');
  const prefs = usePrefs();
  const t = today();
  const tot = totals(stats);
  const day = dayStat(stats, t);
  const streak = visibleStreak(stats.streak, t);
  const acc = tot.solved > 0 ? Math.round((tot.correct / tot.solved) * 100) : 0;
  const ops = Object.entries(stats.ops).filter(([, v]) => v.right + v.wrong > 0);
  const worst = allCards(deck).slice(0, 10);
  const fileRef = useRef<HTMLInputElement>(null);

  const tiles: { label: string; value: string; sub?: string }[] = [
    { label: 'Dnes', value: `${day.correct}/${prefs.dailyGoal}`, sub: `${day.solved} ${plural(day.solved, 'příklad', 'příklady', 'příkladů')}` },
    { label: 'Série dní', value: String(streak), sub: `nejdelší ${stats.streak.best}` },
    { label: 'Celkem příkladů', value: String(tot.solved), sub: `${tot.days} ${plural(tot.days, 'den', 'dny', 'dní')} s cvičením` },
    { label: 'Napoprvé správně', value: `${acc} %`, sub: 'ze všech příkladů' },
    { label: 'Čas procvičování', value: formatDuration(tot.ms), sub: 'celkem' },
    { label: 'Naučené chyby', value: String(deck.mastered), sub: `${Object.keys(deck.cards).length} ještě čeká` },
  ];

  return (
    <>
      <section aria-labelledby="h-over">
        <h2 id="h-over" className="section-title">
          Přehled
        </h2>
        <div className="kpi-grid">
          {tiles.map((k) => (
            <div key={k.label} className="kpi">
              <span className="kpi__label">{k.label}</span>
              <span className="kpi__value tabular-nums">{k.value}</span>
              {k.sub && <span className="kpi__sub">{k.sub}</span>}
            </div>
          ))}
        </div>
      </section>

      <section className="g92-card" aria-labelledby="h-days">
        <h2 id="h-days" className="mb-2 text-lg font-black">
          Posledních 14 dní
        </h2>
        <DaysChart />
      </section>

      <div className="parents-cols">
        <section className="g92-card" aria-labelledby="h-ops">
          <h2 id="h-ops" className="mb-3 text-lg font-black">
            Úspěšnost napoprvé
          </h2>
          {ops.length === 0 ? (
            <p className="g92-muted">Zatím žádná data.</p>
          ) : (
            <ul className="op-bars">
              {ops.map(([op, v]) => {
                const n = v.right + v.wrong;
                const pct = Math.round((v.right / n) * 100);
                return (
                  <li key={op}>
                    <span className="op-bars__label">{OP_LABELS[op] ?? op}</span>
                    <span className="g92-progress" style={{ ['--value' as string]: pct / 100 }} role="img" aria-label={`${pct} procent`} />
                    <span className="op-bars__val tabular-nums">
                      {pct} % <small>({n})</small>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="g92-card" aria-labelledby="h-worst">
          <h2 id="h-worst" className="mb-3 text-lg font-black">
            Nejčastější chyby
          </h2>
          {worst.length === 0 ? (
            <p className="g92-muted">Žádné chyby k procvičení.</p>
          ) : (
            <ul className="worst">
              {worst.map((c) => (
                <li key={c.key}>
                  <span className="tabular-nums font-bold">{solvedText(c.task, prefs.notation)}</span>
                  <span className="g92-badge g92-badge--warning">{c.wrongs}×</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="g92-card" aria-labelledby="h-levels">
        <h2 id="h-levels" className="mb-3 text-lg font-black">
          Postup v úrovních
        </h2>
        <div className="levels-overview">
          {AREAS.map((a) => {
            const { got, max } = areaStars(progress, a.id);
            return (
              <details key={a.id} className="levels-overview__area">
                <summary>
                  <span className="levels-overview__dot" style={{ background: AREA_COLORS[a.id] }} />
                  <b>{a.title}</b>
                  <span className="g92-muted ml-auto tabular-nums">
                    <Icon name="star" size={14} className="text-gold" /> {got}/{max}
                  </span>
                </summary>
                <ul>
                  {levelsOf(a.id).map((l) => (
                    <li key={l.id}>
                      <span className="min-w-0 flex-1">
                        {l.title}
                        <small className="g92-muted block">{l.desc}</small>
                      </span>
                      <StarRating value={starsOf(progress, l.id)} size={16} />
                    </li>
                  ))}
                </ul>
              </details>
            );
          })}
        </div>
      </section>

      <section className="g92-card" aria-labelledby="h-prefs">
        <h2 id="h-prefs" className="mb-3 text-lg font-black">
          Nastavení
        </h2>
        <PrefsForm full />
        <p className="g92-hint mt-3">Zvuk, motiv (světlý/tmavý) a jméno dítěte najdete v nastavení v horní liště (ikona posuvníků).</p>
      </section>

      <section className="g92-card" aria-labelledby="h-data">
        <h2 id="h-data" className="mb-3 text-lg font-black">
          Data
        </h2>
        <p className="g92-muted mb-3 text-sm">Postup je uložený jen v tomto prohlížeči. Můžete ho zálohovat do souboru a přenést jinam.</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="g92-btn g92-btn--secondary"
            onClick={() => {
              const blob = new Blob([exportData()], { type: 'application/json' });
              const a = document.createElement('a');
              a.href = URL.createObjectURL(blob);
              a.download = `matematika-postup-${new Date().toISOString().slice(0, 10)}.json`;
              a.click();
              setTimeout(() => URL.revokeObjectURL(a.href), 1000);
            }}
          >
            <Icon name="download" size={20} /> Zálohovat
          </button>
          <button type="button" className="g92-btn g92-btn--secondary" onClick={() => fileRef.current?.click()}>
            <Icon name="upload" size={20} /> Obnovit ze zálohy
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (!f) return;
              const ok = importData(await f.text());
              toast(ok ? 'Postup obnoven.' : 'Tohle není záloha Matematiky.', { variant: ok ? 'success' : 'danger' });
            }}
          />
          <button
            type="button"
            className="g92-btn g92-btn--danger"
            onClick={async () => {
              const ok = await confirmDialog({
                title: 'Smazat veškerý postup?',
                message: 'Hvězdy, statistiky, chyby k procvičení i nastavení Matematiky se smažou. Nejde to vrátit.',
                confirmLabel: 'Smazat vše',
                danger: true,
              });
              if (ok) {
                resetAll();
                toast('Postup smazán.', { variant: 'success' });
                navigate('');
              }
            }}
          >
            <Icon name="trash" size={20} /> Smazat postup
          </button>
        </div>
      </section>
    </>
  );
}

export function Parents() {
  const [open, setOpen] = useState(() => {
    try {
      return sessionStorage.getItem(GATE_KEY) === '1';
    } catch {
      return false;
    }
  });
  return (
    <div className="g92-main screen parents">
      <ScreenHeader title="Pro rodiče" subtitle="Přehled pokroku, nastavení a záloha" />
      {open ? (
        <Overview />
      ) : (
        <ParentGate
          onOpen={() => {
            try {
              sessionStorage.setItem(GATE_KEY, '1');
            } catch {
              /* ignore */
            }
            setOpen(true);
          }}
        />
      )}
    </div>
  );
}
