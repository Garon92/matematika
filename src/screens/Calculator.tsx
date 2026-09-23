import { useCallback, useEffect, useRef, useState } from 'react';
import { StarCanvas } from '../stars/StarCanvas';
import type { LayoutMode } from '../stars/layout';
import { formatNumber, numberToWords, starsWord } from '../lib/czech';
import { opSymbol, opWord } from '../lib/notation';
import { randInt } from '../lib/rng';
import type { Op } from '../lib/types';
import { store, usePrefs, useStore, type CalcState } from '../state/store';
import { speak, useTts } from '../state/tts';
import { flash, sfx } from '../kit';
import { Icon } from '../ui/Icon';
import { Segmented } from '../ui/Segmented';
import { useHoldRepeat, useStarGestures } from '../ui/useStarGestures';
import { confetti } from '../ui/confetti';
import { Numpad, type PadKey } from '../task/Numpad';
import { ScreenHeader } from './ScreenHeader';
import { calcResult } from '../lib/calc';
import { LAYOUTS, clampStars } from './Sky';

function StarBox({
  label,
  value,
  onChange,
  active,
  onActivate,
  tone,
  mode,
  seed,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  active: boolean;
  onActivate: () => void;
  tone: 'a' | 'b';
  mode: LayoutMode;
  seed: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<string | null>(null);
  const step = value >= 1000 ? 100 : value >= 100 ? 10 : 1;
  useStarGestures(ref, (steps, mult) => {
    onActivate();
    onChange(clampStars(value + steps * mult));
  });
  const plus = useHoldRepeat(() => onChange(clampStars(value + step)));
  const minus = useHoldRepeat(() => onChange(clampStars(value - step)));
  return (
    <div className={`calc-box ${active ? 'is-active' : ''}`} onPointerDown={onActivate}>
      <div className="calc-box__head">
        <button type="button" className="calc-pm" aria-label={`${label}: ubrat`} {...minus} disabled={value === 0}>
          <Icon name="minus" size={22} />
        </button>
        <input
          className={`calc-num tone-${tone} tabular-nums`}
          inputMode="numeric"
          aria-label={`Číslo ${label}`}
          value={draft ?? formatNumber(value)}
          onFocus={(e) => {
            onActivate();
            setDraft(String(value));
            requestAnimationFrame(() => e.target.select());
          }}
          onBlur={() => setDraft(null)}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, '').slice(0, 8);
            setDraft(v);
            if (v !== '') onChange(clampStars(Number(v)));
          }}
        />
        <button type="button" className="calc-pm" aria-label={`${label}: přidat`} {...plus}>
          <Icon name="plus" size={22} />
        </button>
      </div>
      <div className="calc-box__sky night-sky" ref={ref}>
        <StarCanvas n={value} segments={[{ n: value, tone }]} mode={mode} seed={seed} className="h-full w-full" label={`${label}: ${value} ${starsWord(value)}`} />
      </div>
    </div>
  );
}

function randomTask(op: Op): { a: number; b: number } {
  const r = Math.random;
  switch (op) {
    case 'add': {
      const a = randInt(r, 1, 9);
      return { a, b: randInt(r, 1, 10 - Math.min(9, a) + 5) };
    }
    case 'sub': {
      const a = randInt(r, 3, 15);
      return { a, b: randInt(r, 1, a - 1) };
    }
    case 'mul':
      return { a: randInt(r, 2, 6), b: randInt(r, 2, 6) };
    case 'div': {
      const b = randInt(r, 2, 5);
      return { a: b * randInt(r, 1, 6), b };
    }
  }
}

export function Calculator() {
  const saved = useStore('calc');
  const prefs = usePrefs();
  const [s, setS] = useState<CalcState>(saved);
  const [active, setActive] = useState<'a' | 'b'>('a');
  const [answer, setAnswer] = useState('');
  const [solved, setSolved] = useState(false);
  const [wrong, setWrong] = useState(false);
  const answerRef = useRef<HTMLDivElement>(null);
  const ttsOk = useTts();

  useEffect(() => {
    const t = window.setTimeout(() => store.set('calc', s), 300);
    return () => window.clearTimeout(t);
  }, [s]);

  const update = useCallback((patch: Partial<CalcState>) => {
    setS((cur) => ({ ...cur, ...patch }));
    setSolved(false);
    setAnswer('');
  }, []);

  const res = calcResult(s.a, s.b, s.op, s.mode);
  const hideC = s.guess && !solved && res.value !== null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      if (document.querySelector('dialog[open]')) return;
      const key = active;
      const cur = s[key];
      if (s.guess && res.value !== null && !solved) {
        if (/^[0-9]$/.test(e.key)) {
          e.preventDefault();
          pressAnswer(e.key as PadKey);
          return;
        }
        if (e.key === 'Backspace') {
          e.preventDefault();
          pressAnswer('back');
          return;
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          pressAnswer('ok');
          return;
        }
      }
      if (e.key === 'ArrowUp') update({ [key]: clampStars(cur + 1) });
      else if (e.key === 'ArrowDown') update({ [key]: clampStars(cur - 1) });
      else if (e.key === 'ArrowLeft') setActive('a');
      else if (e.key === 'ArrowRight') setActive('b');
      else if (e.key === '+') update({ op: 'add' });
      else if (e.key === '-') update({ op: 'sub' });
      else if (e.key === '*' || e.key === 'x') update({ op: 'mul' });
      else if (e.key === '/' || e.key === ':') update({ op: 'div' });
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  function pressAnswer(k: PadKey) {
    if (solved || res.value === null) return;
    if (k === 'back') {
      setAnswer((a) => a.slice(0, -1));
      return;
    }
    if (k === 'ok') {
      if (answer === '') return;
      const ok = Number(answer) === res.value;
      if (ok) {
        setSolved(true);
        sfx.success();
        confetti({ count: 60 });
        if (ttsOk && prefs.tts !== 'off') speak('Výborně!');
      } else {
        sfx.error();
        setWrong(true);
        if (answerRef.current) flash(answerRef.current, 'g92-anim-shake');
        window.setTimeout(() => {
          setWrong(false);
          setAnswer('');
        }, 700);
      }
      return;
    }
    sfx.tap();
    setAnswer((a) => (a.length >= 8 ? a : (a === '0' ? '' : a) + k));
  }

  const ops: Op[] = ['add', 'sub', 'mul', 'div'];
  const sentence =
    res.value === null
      ? null
      : `${numberToWords(s.a)} ${opWord(s.op)} ${numberToWords(s.b)} je ${numberToWords(res.value)}${res.remainder ? `, zbytek ${numberToWords(res.remainder)}` : ''}.`;

  return (
    <div className="g92-main screen calc-screen">
      <ScreenHeader title="Hvězdná kalkulačka" subtitle="Nastav hvězdy v A a B, vyber počítání a podívej se na výsledek.">
        <Segmented className="hidden lg:inline-flex" label="Rozložení hvězd" value={s.mode} onChange={(v) => update({ mode: v })} options={LAYOUTS} />
      </ScreenHeader>

      <div className="calc-toolbar">
        <Segmented className="lg:hidden" label="Rozložení hvězd" value={s.mode} onChange={(v) => update({ mode: v })} options={LAYOUTS} />
        <button
          type="button"
          className="g92-chip"
          aria-pressed={s.guess}
          onClick={() => {
            if (document.activeElement instanceof HTMLInputElement) document.activeElement.blur();
            update({ guess: !s.guess });
          }}
        >
          <Icon name={s.guess ? 'eyeOff' : 'eye'} size={18} /> Hádej výsledek
        </button>
        {s.guess && (
          <button
            type="button"
            className="g92-chip"
            onClick={() => {
              update(randomTask(s.op));
              sfx.pop();
            }}
          >
            <Icon name="shuffle" size={18} /> Nový příklad
          </button>
        )}
      </div>

      <div className="calc-grid">
        <StarBox label="A" value={s.a} onChange={(v) => update({ a: v })} active={active === 'a'} onActivate={() => setActive('a')} tone="a" mode={s.mode} seed={101} />
        <div className="calc-ops" role="group" aria-label="Počítání">
          {ops.map((o) => (
            <button key={o} type="button" className={`calc-op ${o === s.op ? 'is-active' : ''} ${o === 'mul' && prefs.notation === 'school' ? 'sym-dot' : ''}`} aria-pressed={o === s.op} onClick={() => update({ op: o })} aria-label={opWord(o)}>
              {opSymbol(o, prefs.notation)}
            </button>
          ))}
        </div>
        <StarBox label="B" value={s.b} onChange={(v) => update({ b: v })} active={active === 'b'} onActivate={() => setActive('b')} tone="b" mode={s.mode} seed={202} />
        <div className="calc-eq" aria-hidden="true">
          =
        </div>
        <div className={`calc-box calc-box--result ${solved ? 'is-solved' : ''}`}>
          <div className="calc-box__head calc-box__head--result">
            <span className="calc-result tabular-nums" aria-live="polite">
              {res.value === null ? '–' : hideC ? '?' : formatNumber(res.value)}
              {!hideC && res.remainder > 0 && <small> zb. {formatNumber(res.remainder)}</small>}
            </span>
            {ttsOk && sentence && !hideC && (
              <button type="button" className="calc-pm" onClick={() => speak(sentence)} aria-label="Přečíst výsledek">
                <Icon name="speaker" size={22} />
              </button>
            )}
          </div>
          <div className="calc-box__sky night-sky">
            {hideC ? (
              <div className="calc-hidden" aria-hidden="true">
                ?
              </div>
            ) : res.value === null || res.segments.length === 0 ? (
              <p className="calc-msg">{res.message}</p>
            ) : (
              <StarCanvas
                n={res.total}
                segments={res.segments}
                mode={res.mode === 'array' ? 'array' : res.mode}
                rows={res.rows}
                cols={res.cols}
                seed={303}
                className="h-full w-full"
                label={`Výsledek: ${res.value}`}
              />
            )}
          </div>
        </div>
      </div>

      {res.message && res.value !== null && !hideC && <p className="calc-note">{res.message}</p>}
      {sentence && !hideC && <p className="calc-sentence">{sentence}</p>}

      {s.guess && res.value !== null && (
        <div className="calc-guess g92-card">
          {solved ? (
            <div className="flex flex-wrap items-center justify-center gap-3">
              <p className="text-2xl font-black text-success">Správně! {formatNumber(res.value)}</p>
              <button
                type="button"
                className="g92-btn g92-btn--lg"
                onClick={() => {
                  update(randomTask(s.op));
                  sfx.pop();
                }}
              >
                Další příklad <Icon name="arrowRight" size={22} />
              </button>
            </div>
          ) : (
            <div className="calc-guess__body">
              <div ref={answerRef} className={`calc-guess__answer ${wrong ? 'is-wrong' : ''}`}>
                <span className="text-muted">
                  {formatNumber(s.a)} {opSymbol(s.op, prefs.notation)} {formatNumber(s.b)} =
                </span>{' '}
                <b className="tabular-nums">{answer || '?'}</b>
              </div>
              <Numpad onKey={pressAnswer} layout={prefs.numpad} okReady={answer !== ''} />
              <button type="button" className="g92-btn g92-btn--ghost" onClick={() => setSolved(true)}>
                Ukázat výsledek
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
