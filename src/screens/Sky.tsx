import { useCallback, useEffect, useRef, useState } from 'react';
import { StarCanvas, MAX_STARS, GL_THRESHOLD } from '../stars/StarCanvas';
import { effectiveMode, type LayoutMode } from '../stars/layout';
import { formatNumber, numberToWords, placeValue, starsWord } from '../lib/czech';
import { randomSeed } from '../lib/rng';
import { store, useStore } from '../state/store';
import { speak, useTts } from '../state/tts';
import { sfx } from '../kit';
import { Icon } from '../ui/Icon';
import { Segmented } from '../ui/Segmented';
import { useHoldRepeat, useStarGestures } from '../ui/useStarGestures';
import { ScreenHeader } from './ScreenHeader';
import { countFeedback } from '../ui/countSound';

export const LAYOUTS: readonly { value: LayoutMode; label: string; title: string }[] = [
  { value: 'scatter', label: 'Rozházené', title: 'Hvězdy náhodně po obloze' },
  { value: 'five', label: 'Pětky', title: 'Po pěti jako na kostce' },
  { value: 'ten', label: 'Desítky', title: 'Desítkové rámečky' },
  { value: 'hundred', label: 'Stovky', title: 'Čtverce po stovce' },
];

const STEPS = [1, 10, 100, 1000, 10_000, 100_000, 1_000_000];

export function clampStars(n: number): number {
  return Math.max(0, Math.min(MAX_STARS, Math.round(n)));
}

export function Sky() {
  const saved = useStore('sky');
  const [count, setCount] = useState(() => clampStars(saved.count));
  const [step, setStep] = useState(saved.step);
  const [mode, setMode] = useState<LayoutMode>(saved.mode);
  const [seed, setSeed] = useState(() => randomSeed() % 100000);
  const [hidden, setHidden] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  const sky = useRef<HTMLDivElement>(null);
  const ttsOk = useTts();

  // persist (debounced)
  useEffect(() => {
    const t = window.setTimeout(() => store.set('sky', { count, step, mode }), 300);
    return () => window.clearTimeout(t);
  }, [count, step, mode]);

  const change = useCallback((delta: number) => {
    setCount((c) => {
      const n = clampStars(c + delta);
      if (n !== c && Math.abs(delta) <= 10) sfx.tap();
      return n;
    });
  }, []);

  useStarGestures(sky, (steps, mult) => change(steps * step * mult));
  const plus = useHoldRepeat(() => change(step));
  const minus = useHoldRepeat(() => change(-step));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      if (document.querySelector('dialog[open]')) return;
      if (e.key === 'ArrowUp' || e.key === '+' || e.key === 'ArrowRight') change(step);
      else if (e.key === 'ArrowDown' || e.key === '-' || e.key === 'ArrowLeft') change(-step);
      else if (e.key === 'PageUp') change(step * 10);
      else if (e.key === 'PageDown') change(-step * 10);
      else if (e.key === 'Home' || e.key === '0') setCount(0);
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [change, step]);

  const eff = effectiveMode(mode, count);
  const pv = count < 10_000 ? placeValue(count) : null;
  const words = numberToWords(count);
  const formatted = formatNumber(count);

  return (
    <div className="g92-main screen sky-screen">
      <ScreenHeader title="Hvězdné nebe" subtitle="Přidávej hvězdy tlačítky, kolečkem nebo tažením prstem nahoru a dolů.">
        <Segmented className="sky-layouts sky-layouts--header" label="Rozložení hvězd" value={mode} onChange={(v) => setMode(v)} options={LAYOUTS} />
      </ScreenHeader>

      <div className="sky-body">
        <div className="sky-card night-sky" ref={sky} tabIndex={0} aria-label={`Obloha: ${count} ${starsWord(count)}. Šipkami nahoru a dolů přidáš nebo ubereš.`}>
          <div className="sky-card__head">
            <button type="button" className="sky-count" onClick={() => setHidden((h) => !h)} title={hidden ? 'Ukázat číslo' : 'Schovat číslo (hádej, kolik jich je)'}>
              <span className="sky-count__num tabular-nums" data-len={hidden ? 1 : formatted.length}>
                {hidden ? '?' : formatted}
              </span>
              {!hidden && <span className="sky-count__words">{words}</span>}
            </button>
            <div className="sky-card__tools">
              {ttsOk && !hidden && (
                <button type="button" className="sky-btn" onClick={() => speak(`${words} ${starsWord(count)}`)} aria-label="Přečíst číslo">
                  <Icon name="speaker" size={22} />
                </button>
              )}
              <button type="button" className="sky-btn" onClick={() => setHidden((h) => !h)} aria-label={hidden ? 'Ukázat číslo' : 'Schovat číslo'} aria-pressed={hidden}>
                <Icon name={hidden ? 'eye' : 'eyeOff'} size={22} />
              </button>
              <button type="button" className="sky-btn" onClick={() => setSeed(randomSeed() % 100000)} aria-label="Rozházet znovu" title="Rozházet znovu">
                <Icon name="shuffle" size={22} />
              </button>
            </div>
          </div>
          <StarCanvas
            n={count}
            mode={mode}
            seed={seed}
            twinkle
            className={`sky-card__stars ${count > GL_THRESHOLD ? 'is-full' : ''}`}
            label={`${count} ${starsWord(count)}`}
            countable={count <= 200}
            onCount={countFeedback}
          />
          {eff !== mode && <p className="sky-card__note">Tolik hvězd už se do skupin nevejde – jsou rozházené.</p>}
          {count === 0 && (
            <p className="sky-card__empty">
              <Icon name="plus" size={20} /> Přidej první hvězdu
            </p>
          )}
        </div>

        <div className="sky-controls">
          {/* place value lives outside the sky, so it never covers stars */}
          <div className="sky-pv" aria-hidden={!(pv && !hidden && count >= 10)}>
            {pv && !hidden && count >= 10 ? (
              pv.map((p) => (
                <span key={p.unit}>
                  <b>{p.count}</b> {p.label}
                </span>
              ))
            ) : (
              <span className="sky-pv__empty">&nbsp;</span>
            )}
          </div>
          <Segmented className="sky-layouts sky-layouts--controls" block label="Rozložení hvězd" value={mode} onChange={(v) => setMode(v)} options={LAYOUTS} />
          <div className="sky-controls__row">
            <button type="button" className="g92-btn g92-btn--secondary g92-btn--xl pm-btn" aria-label={`Ubrat ${formatNumber(step)}`} {...minus} disabled={count === 0}>
              <Icon name="minus" size={30} />
            </button>
            <label className="sky-input">
              <span className="g92-sr-only">Počet hvězd</span>
              <input
                className={`g92-input g92-input--xl text-center tabular-nums ${(draft ?? formatted).length >= 7 ? 'is-long' : ''}`}
                inputMode="numeric"
                value={draft ?? formatted}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '').slice(0, 8);
                  setDraft(v);
                  if (v !== '') setCount(clampStars(Number(v)));
                }}
                onBlur={() => setDraft(null)}
                onFocus={(e) => {
                  const input = e.target;
                  setDraft(String(count));
                  requestAnimationFrame(() => {
                    if (document.activeElement === input) input.select();
                  });
                }}
                aria-label="Počet hvězd"
              />
            </label>
            <button type="button" className="g92-btn g92-btn--xl pm-btn" aria-label={`Přidat ${formatNumber(step)}`} {...plus} disabled={count >= MAX_STARS}>
              <Icon name="plus" size={30} />
            </button>
          </div>
          <div className="sky-steps" role="group" aria-label="Krok">
            <span className="sky-steps__label">Krok</span>
            {STEPS.map((s) => (
              <button key={s} type="button" className="g92-chip" aria-pressed={s === step} onClick={() => setStep(s)}>
                {s >= 1_000_000 ? '1 milion' : formatNumber(s)}
              </button>
            ))}
            <button type="button" className="g92-chip" onClick={() => setCount(0)}>
              Vynulovat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
