import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { sfx } from '../kit';
import { TIMED, TIMED_SECONDS, timedById } from '../lib/timed';
import { makeStream } from '../lib/session';
import { mulberry32, randomSeed } from '../lib/rng';
import { timedStars } from '../lib/scoring';
import { sampleIn } from '../lib/levels';
import { plural } from '../lib/czech';
import type { Task } from '../lib/types';
import { recordTask, submitTimed, usePrefs, useStore, type AnswerRecord } from '../state/store';
import { TaskPlayer } from '../task/TaskPlayer';
import { href, navigate } from '../router';
import { Icon } from '../ui/Icon';
import { Mascot } from '../ui/Mascot';
import { StarRating } from '../ui/StarRating';
import { confetti } from '../ui/confetti';
import { ScreenHeader } from './ScreenHeader';
import { NotFound } from './NotFound';

function TimedMenu() {
  const prefs = usePrefs();
  const records = useStore('timed');
  return (
    <div className="g92-main screen">
      <ScreenHeader title="Závod s časem" subtitle={`${TIMED_SECONDS} sekund – kolik příkladů stihneš?`} />
      <div className="timed-grid">
        {TIMED.map((t) => {
          const r = records[t.id];
          return (
            <a key={t.id} href={href(`zavod/${t.id}`)} className="timed-card">
              <span className="timed-card__sample tabular-nums">{sampleIn(t.sample, prefs.notation)}</span>
              <span className="timed-card__title">{t.title}</span>
              <StarRating value={r?.stars ?? 0} size={20} />
              <span className="timed-card__best">{r ? `Rekord: ${r.best}` : 'Zatím nehráno'}</span>
            </a>
          );
        })}
      </div>
      <p className="g92-muted text-center text-sm">
        Hvězdy za počet správných odpovědí. Za chybu se nic neodečítá – jen ukážeme správný výsledek a jede se dál.
      </p>
    </div>
  );
}

type Phase = 'countdown' | 'play' | 'paused' | 'done';

function TimedRun({ id }: { id: string }) {
  const def = timedById(id)!;
  const prefs = usePrefs();
  const [phase, setPhase] = useState<Phase>('countdown');
  const [count, setCount] = useState(3);
  const [left, setLeft] = useState(TIMED_SECONDS * 1000);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [taskIdx, setTaskIdx] = useState(0);
  const [result, setResult] = useState<{ stars: 0 | 1 | 2 | 3; best: number; isNewBest: boolean } | null>(null);
  const [round, setRound] = useState(0);
  const stream = useMemo(() => makeStream(def.gen, mulberry32(randomSeed())), [def, round]);
  const [task, setTask] = useState<Task>(() => stream());
  const last = useRef(0);
  const scoreRef = useRef(0);

  // countdown 3-2-1
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (count === 0) {
      sfx.countdown(true);
      setPhase('play');
      last.current = performance.now();
      return;
    }
    sfx.countdown();
    const t = window.setTimeout(() => setCount((c) => c - 1), 700);
    return () => window.clearTimeout(t);
  }, [phase, count]);

  // clock
  useEffect(() => {
    if (phase !== 'play') return;
    last.current = performance.now();
    let raf = 0;
    const tick = () => {
      const now = performance.now();
      const dt = now - last.current;
      last.current = now;
      setLeft((l) => {
        const n = l - dt;
        if (n <= 0) {
          finish();
          return 0;
        }
        return n;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // auto-pause when the tab is hidden
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) setPhase((p) => (p === 'play' ? 'paused' : p));
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const finish = useCallback(() => {
    setPhase('done');
    const s = scoreRef.current;
    const stars = timedStars(s, def.thresholds);
    const { best, isNewBest } = submitTimed(def.id, s, stars);
    setResult({ stars, best, isNewBest });
    if (isNewBest || stars === 3) {
      sfx.win();
      confetti({ count: 120 });
    } else sfx.levelUp();
  }, [def]);

  const onComplete = useCallback(
    (rec: AnswerRecord) => {
      recordTask(rec, null);
      if (rec.firstTry) {
        scoreRef.current += 1;
        setScore(scoreRef.current);
      }
      setAnswered((a) => a + 1);
      setTask(stream());
      setTaskIdx((i) => i + 1);
    },
    [stream],
  );

  const restart = () => {
    scoreRef.current = 0;
    setScore(0);
    setAnswered(0);
    setLeft(TIMED_SECONDS * 1000);
    setResult(null);
    setCount(3);
    setRound((r) => r + 1);
    setPhase('countdown');
  };

  useEffect(() => {
    setTask(stream());
  }, [stream]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (document.querySelector('dialog[open]')) return;
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        if (phase === 'play') setPhase('paused');
        else if (phase === 'paused' && e.key !== 'Escape') setPhase('play');
        else if (phase === 'paused' || phase === 'done' || phase === 'countdown') navigate('zavod');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase]);

  if (phase === 'done' && result) {
    return (
      <div className="g92-main g92-main--narrow screen results">
        <div className="results__hero">
          <Mascot mood={result.stars >= 2 ? 'cheer' : 'happy'} size={112} />
          <h1 className="results__title">
            {score} {plural(score, 'příklad', 'příklady', 'příkladů')}!
          </h1>
          <StarRating value={result.stars} size={52} animate />
          <p className="results__stats">
            {def.title} · správně {score} z {answered}
          </p>
          {result.isNewBest ? <p className="g92-badge g92-badge--success">Nový rekord!</p> : <p className="g92-badge g92-badge--neutral">Rekord: {result.best}</p>}
          <p className="g92-muted text-sm">
            Hvězdy: {def.thresholds[0]} / {def.thresholds[1]} / {def.thresholds[2]} správně
          </p>
        </div>
        <div className="results__actions">
          <button type="button" className="g92-btn g92-btn--secondary g92-btn--lg" onClick={() => navigate('zavod')}>
            Jiný závod
          </button>
          <button type="button" className="g92-btn g92-btn--lg" onClick={restart} autoFocus>
            <Icon name="restart" size={22} /> Znovu
          </button>
        </div>
      </div>
    );
  }

  const frac = left / (TIMED_SECONDS * 1000);
  return (
    <div className="screen screen--play timed-run">
      {(phase === 'countdown' || phase === 'paused') && (
        <div className="overlay" role="dialog" aria-modal="true" aria-label={phase === 'paused' ? 'Pauza' : 'Odpočet'}>
          {phase === 'countdown' ? (
            <div className="countdown" key={count}>
              {count > 0 ? count : 'Start!'}
            </div>
          ) : (
            <div className="overlay__card g92-card">
              <Mascot mood="sleep" size={96} />
              <h2 className="text-3xl font-black">Pauza</h2>
              <div className="flex flex-wrap justify-center gap-3">
                <button type="button" className="g92-btn g92-btn--secondary g92-btn--lg" onClick={() => navigate('zavod')}>
                  Ukončit
                </button>
                <button type="button" className="g92-btn g92-btn--lg" onClick={() => setPhase('play')} autoFocus>
                  <Icon name="play" size={22} /> Pokračovat
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      <TaskPlayer
        key={`${round}-${taskIdx}`}
        task={task}
        notation={prefs.notation}
        prefs={{ ...prefs, hints: 'off', tts: prefs.tts === 'auto' ? 'button' : prefs.tts }}
        maxWrong={1}
        fast
        paused={phase !== 'play'}
        onComplete={onComplete}
        toolbar={
          <>
            <button type="button" className="g92-btn g92-btn--ghost g92-btn--icon" onClick={() => setPhase('paused')} aria-label="Pauza" disabled={phase !== 'play'}>
              <Icon name="pause" size={22} />
            </button>
            <div className="min-w-0 flex-1">
              <div className="timer-bar" role="timer" aria-label={`Zbývá ${Math.ceil(left / 1000)} sekund`}>
                <span className={`timer-bar__fill ${frac < 0.2 ? 'is-low' : ''}`} style={{ transform: `scaleX(${frac})` }} />
              </div>
              <p className="timer-text tabular-nums">{Math.ceil(left / 1000)} s</p>
            </div>
            <div className="score-chip" aria-live="polite">
              <Icon name="check" size={20} /> <b className="tabular-nums">{score}</b>
            </div>
          </>
        }
      />
    </div>
  );
}

export function Timed({ id }: { id: string | null }) {
  if (!id) return <TimedMenu />;
  if (!timedById(id)) return <NotFound />;
  return <TimedRun id={id} />;
}
