import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { autoPause, confetti, countdown, sfx, showPause } from '../kit';
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
  const leftRef = useRef(TIMED_SECONDS * 1000);
  const pauseOverlay = useRef<ReturnType<typeof showPause> | null>(null);

  useEffect(() => {
    setTask(stream());
  }, [stream]);

  // 3-2-1 (kit countdown) at the start of every round
  useEffect(() => {
    let cancelled = false;
    setPhase('countdown');
    void countdown({ from: 3 }).then(() => {
      if (!cancelled) setPhase('play');
    });
    return () => {
      cancelled = true;
      document.querySelectorAll('.g92-countdown').forEach((el) => el.remove());
    };
  }, [round]);

  const finish = useCallback(() => {
    setPhase('done');
    const s = scoreRef.current;
    const stars = timedStars(s, def.thresholds);
    const { best, isNewBest } = submitTimed(def.id, s, stars);
    setResult({ stars, best, isNewBest });
    if (isNewBest || stars === 3) {
      sfx.win();
      confetti({ particleCount: 160, cannons: true });
    } else sfx.levelUp();
  }, [def]);

  // clock
  useEffect(() => {
    if (phase !== 'play') return;
    last.current = performance.now();
    let raf = 0;
    const tick = () => {
      const now = performance.now();
      const prevSec = Math.ceil(leftRef.current / 1000);
      leftRef.current = Math.max(0, leftRef.current - (now - last.current));
      last.current = now;
      setLeft(leftRef.current);
      const sec = Math.ceil(leftRef.current / 1000);
      if (sec !== prevSec && sec <= 5 && sec > 0) sfx.countdown(); // last five seconds tick
      if (leftRef.current <= 0) {
        finish();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, finish]);

  const restart = useCallback(() => {
    scoreRef.current = 0;
    leftRef.current = TIMED_SECONDS * 1000;
    setScore(0);
    setAnswered(0);
    setLeft(TIMED_SECONDS * 1000);
    setResult(null);
    setRound((r) => r + 1);
  }, []);

  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const pause = useCallback(() => {
    if (phaseRef.current !== 'play' || pauseOverlay.current) return;
    phaseRef.current = 'paused';
    setPhase('paused');
    const o = showPause({
      subtitle: def.title,
      stats: [
        { label: 'Správně', value: scoreRef.current },
        { label: 'Zbývá', value: `${Math.ceil(leftRef.current / 1000)} s` },
      ],
      menuHref: null,
      menuLabel: 'Jiný závod',
    });
    pauseOverlay.current = o;
    void o.then((choice) => {
      pauseOverlay.current = null;
      if (choice === 'resume') setPhase('play');
      else if (choice === 'restart') restart();
      else navigate('zavod');
    });
  }, [def.title, restart]);

  // auto-pause when the tab is hidden / window loses focus
  useEffect(() => (phase === 'play' ? autoPause(pause) : undefined), [phase, pause]);
  useEffect(() => () => pauseOverlay.current?.close('menu'), []);

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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (document.querySelector('dialog[open], .g92-overlay')) return;
      if ((e.key === 'Escape' || e.key === 'p' || e.key === 'P') && phase === 'play') {
        e.preventDefault();
        pause();
      } else if (e.key === 'Escape' && phase === 'done') navigate('zavod');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, pause]);

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
            <button type="button" className="g92-btn g92-btn--ghost g92-btn--icon" onClick={pause} aria-label="Pauza (P)" disabled={phase !== 'play'}>
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
