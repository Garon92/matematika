import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { bindRange, confetti, sfx } from '../kit';
import { FREE_MAX, FREE_MIN, FREE_STEP, FreeGenerator, type FreeMode } from '../lib/free';
import { mulberry32, randomSeed } from '../lib/rng';
import { opSymbol } from '../lib/notation';
import type { ExprTask } from '../lib/types';
import { recordTask, store, usePrefs, useStore, type AnswerRecord } from '../state/store';
import { TaskPlayer } from '../task/TaskPlayer';
import { Segmented } from '../ui/Segmented';
import { Icon } from '../ui/Icon';
import { navigate } from '../router';

/** "Volný trénink" — the original pocitadlo.html: operation, range, score, Enter/Esc, confetti. */
export function Free() {
  const prefs = usePrefs();
  const saved = useStore('free');
  const gen = useMemo(() => new FreeGenerator(mulberry32(randomSeed()), saved.mode, saved.max), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [task, setTask] = useState<ExprTask>(() => gen.next());
  const [idx, setIdx] = useState(0);
  const [streak, setStreak] = useState(0);
  const [panel, setPanel] = useState(false);
  const rangeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (panel && rangeRef.current) return bindRange(rangeRef.current);
  }, [panel]);

  const next = useCallback(() => {
    setTask(gen.next());
    setIdx((i) => i + 1);
  }, [gen]);

  const setMode = (mode: FreeMode) => {
    gen.mode = mode;
    store.update('free', (f) => ({ ...f, mode }));
    next();
  };
  const setMax = (max: number) => {
    gen.setMax(max);
    store.update('free', (f) => ({ ...f, max }));
    next();
  };

  const streakRef = useRef(0);
  const onAttempt = useCallback((correct: boolean) => {
    const n = correct ? streakRef.current + 1 : 0;
    streakRef.current = n;
    setStreak(n);
    store.update('free', (f) => ({ ...f, attempts: f.attempts + 1, ok: f.ok + (correct ? 1 : 0), bestStreak: Math.max(f.bestStreak, n) }));
    if (n > 0 && n % 10 === 0) {
      sfx.levelUp();
      confetti({ particleCount: 100 });
    }
  }, []);
  const resetStreak = () => {
    streakRef.current = 0;
    setStreak(0);
  };

  const onComplete = useCallback(
    (rec: AnswerRecord) => {
      recordTask(rec, null);
      next();
    },
    [next],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('dialog[open]')) {
        e.preventDefault();
        if (panel) setPanel(false);
        else {
          resetStreak();
          next();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, panel]);

  const modes: { value: FreeMode; label: React.ReactNode }[] = [
    { value: 'add', label: '+' },
    { value: 'sub', label: '−' },
    { value: 'mul', label: <span className={prefs.notation === 'school' ? 'sym-dot' : ''}>{opSymbol('mul', prefs.notation)}</span> },
    { value: 'div', label: opSymbol('div', prefs.notation) },
    { value: 'mix', label: 'Mix' },
  ];

  const modeLabel = saved.mode === 'mix' ? 'Mix' : saved.mode === 'add' ? '+' : saved.mode === 'sub' ? '−' : opSymbol(saved.mode, prefs.notation);

  return (
    <div className="screen screen--play free-screen">
      <h1 className="g92-sr-only">Volný trénink</h1>
      <TaskPlayer
        key={idx}
        task={task}
        notation={prefs.notation}
        prefs={prefs}
        maxWrong={3}
        onAttempt={onAttempt}
        onComplete={onComplete}
        toolbar={
          <>
            <button type="button" className="g92-btn g92-btn--ghost g92-btn--icon" onClick={() => navigate('')} aria-label="Zpět domů">
              <Icon name="back" size={24} />
            </button>
            <div className="free-settings">
              <button
                type="button"
                className="g92-chip free-settings__toggle"
                aria-expanded={panel}
                aria-controls="free-panel"
                onClick={() => setPanel((o) => !o)}
                title="Počítání a rozsah"
              >
                <b className="free-settings__op">{modeLabel}</b> do {saved.max}
                <Icon name="settings" size={18} />
              </button>
              {panel && (
                <div id="free-panel" className="free-panel g92-card" role="group" aria-label="Nastavení tréninku">
                  <p className="free-panel__title">Volný trénink</p>
                  <Segmented label="Počítání" value={saved.mode} onChange={setMode} options={modes} className="free-ops" block />
                  <label className="free-range">
                    <span className="free-range__label">
                      Rozsah: <b>do {saved.max}</b>
                    </span>
                    <input
                      ref={rangeRef}
                      type="range"
                      className="g92-range"
                      min={FREE_MIN}
                      max={FREE_MAX}
                      step={FREE_STEP}
                      value={saved.max}
                      onChange={(e) => setMax(Number(e.target.value))}
                      aria-label="Rozsah čísel"
                    />
                  </label>
                  <button type="button" className="g92-btn g92-btn--block" onClick={() => setPanel(false)}>
                    Hotovo
                  </button>
                </div>
              )}
            </div>
            <div className="free-score" aria-live="polite">
              <span title="Správně">
                <Icon name="check" size={16} /> <b>{saved.ok}</b>
                <span className="free-score__label">/ {saved.attempts} pokusů</span>
              </span>
              <span title="Série správných odpovědí">
                <Icon name="flame" size={16} /> <b>{streak}</b>
              </span>
            </div>
            <button
              type="button"
              className="g92-btn g92-btn--ghost g92-btn--sm free-skip"
              onClick={() => {
                resetStreak();
                next();
              }}
              title="Přeskočit (Esc)"
              aria-label="Přeskočit příklad"
            >
              <span className="free-skip__text">Přeskočit</span>
              <Icon name="arrowRight" size={20} />
            </button>
          </>
        }
      />
    </div>
  );
}
