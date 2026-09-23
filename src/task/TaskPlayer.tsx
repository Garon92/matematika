import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Rel, Task } from '../lib/types';
import type { Notation } from '../lib/notation';
import { answerDigits, expected, inputMode, isCorrect } from '../lib/math';
import { hintFor } from '../lib/hints';
import { speechFor } from '../lib/speech';
import { flash, haptic, LABELS, sfx } from '../kit';
import { speak, stopSpeaking, useTts } from '../state/tts';
import type { AnswerRecord, Prefs } from '../state/store';
import { Icon } from '../ui/Icon';
import { Mascot, type Mood } from '../ui/Mascot';
import { Numpad, type PadKey } from './Numpad';
import { HintView } from './HintView';
import { TaskView, currentAnswer, type InputState, type Phase } from './TaskView';

const PRAISE = ['Výborně!', 'Správně!', 'Super!', 'Paráda!', 'Jupí!', 'Skvělé!', 'Přesně tak!', 'Bravo!'];
const RETRY = ['Ještě jednou, zvládneš to!', 'To nevadí, zkus to znovu.', 'Zkus to ještě jednou.'];

export interface TaskPlayerProps {
  task: Task;
  notation: Notation;
  prefs: Pick<Prefs, 'hints' | 'numpad'>;
  /** Wrong attempts before the answer is revealed (3 in lessons, 1 in the race). */
  maxWrong: number;
  /** Shorter feedback (timed race). */
  fast?: boolean;
  toolbar?: React.ReactNode;
  onComplete: (rec: AnswerRecord) => void;
  /** Called on the first wrong attempt (e.g. free training counts attempts). */
  onAttempt?: (correct: boolean) => void;
  paused?: boolean;
}

const EMPTY: InputState = { value: '', remQ: '', remR: '', field: 0, picked: null };

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

export function TaskPlayer({ task, notation, prefs, maxWrong, fast = false, toolbar, onComplete, onAttempt, paused = false }: TaskPlayerProps) {
  const [input, setInput] = useState<InputState>(EMPTY);
  const [phase, setPhase] = useState<Phase>('input');
  const [wrongs, setWrongs] = useState(0);
  const [hintOpen, setHintOpen] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  const [message, setMessage] = useState('');
  const started = useRef(performance.now());
  const done = useRef(false);
  const taskRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);
  const ttsOk = useTts();

  const mode = inputMode(task);
  const hint = useMemo(() => (prefs.hints === 'off' ? null : hintFor(task, notation)), [task, prefs.hints, notation]);
  const maxLen = answerDigits(task);

  useEffect(
    () => () => {
      timers.current.forEach((t) => window.clearTimeout(t));
      stopSpeaking();
    },
    [],
  );

  // read the task aloud automatically (kit "Předčítání"; never in the race – it would eat the time)
  useEffect(() => {
    if (ttsOk && !fast) speak(speechFor(task), { auto: true });
  }, [task, ttsOk, fast]);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  const complete = useCallback(
    (revealed: boolean, w: number) => {
      if (done.current) return;
      done.current = true;
      onComplete({ task, wrongs: w, firstTry: w === 0 && !revealed, revealed, hintUsed, ms: performance.now() - started.current });
    },
    [onComplete, task, hintUsed],
  );

  const submit = useCallback(
    (override?: InputState) => {
      if (phase !== 'input' || paused) return;
      const st = override ?? input;
      const ans = currentAnswer(task, st);
      if (!ans) {
        if (taskRef.current) flash(taskRef.current, 'g92-anim-shake');
        return;
      }
      if (isCorrect(task, ans)) {
        setPhase('correct');
        setMessage(pick(PRAISE));
        sfx.success();
        haptic('success');
        onAttempt?.(true);
        later(() => complete(false, wrongs), fast ? 380 : 950);
        return;
      }
      const w = wrongs + 1;
      setWrongs(w);
      sfx.error();
      haptic('error');
      onAttempt?.(false);
      if (w >= maxWrong) {
        setPhase('revealed');
        const e = expected(task);
        const txt = e.kind === 'num' ? String(e.value) : e.kind === 'rem' ? `${e.q}, zbytek ${e.r}` : e.value;
        setMessage(fast ? `Správně je ${txt}.` : `Správně je ${txt}. Nevadí, příště to dáš!`);
        // non-readers must hear the answer too (unless Předčítání is switched off)
        if (ttsOk && !fast) speak(`Správně je ${txt}.`, { auto: true });
        if (fast) later(() => complete(true, w), 1100);
        return;
      }
      setPhase('wrong');
      const e0 = expected(task);
      const near = e0.kind === 'num' && ans.kind === 'num' && Math.abs(ans.value - e0.value) <= 1;
      setMessage(near ? 'Skoro! Zkus to ještě jednou.' : pick(RETRY));
      if (taskRef.current) flash(taskRef.current, 'g92-anim-shake');
      later(() => {
        setPhase('input');
        setInput((s) => ({ ...EMPTY, field: s.field === 1 && task.kind === 'rem' ? 0 : 0 }));
        if (prefs.hints === 'auto' && hint && w >= 2) {
          setHintOpen(true);
          setHintUsed(true);
          setMessage('Pomůže ti nápověda.');
        }
      }, 750);
    },
    [phase, paused, input, task, wrongs, maxWrong, fast, complete, prefs.hints, hint, ttsOk, onAttempt],
  );

  const press = useCallback(
    (k: PadKey) => {
      if (phase === 'revealed' && k === 'ok') {
        complete(true, wrongs);
        return;
      }
      if (phase !== 'input' || paused) return;
      sfx.tap();
      if (k === 'ok') {
        if (task.kind === 'rem' && input.field === 0 && input.remQ !== '' && input.remR === '') {
          setInput((s) => ({ ...s, field: 1 }));
          return;
        }
        submit();
        return;
      }
      setInput((s) => {
        if (task.kind === 'rem') {
          const key = s.field === 0 ? 'remQ' : 'remR';
          const cur = s[key];
          const next = k === 'back' ? cur.slice(0, -1) : cur.length >= 3 ? cur : (cur === '0' ? '' : cur) + k;
          if (k === 'back' && cur === '' && s.field === 1) return { ...s, field: 0 };
          return { ...s, [key]: next };
        }
        if (k === 'back') return { ...s, value: s.value.slice(0, -1) };
        if (s.value.length >= maxLen) return s;
        return { ...s, value: (s.value === '0' ? '' : s.value) + k };
      });
    },
    [phase, paused, task, input, submit, complete, wrongs, maxLen],
  );

  const choose = useCallback(
    (v: Rel | number) => {
      if (phase !== 'input' || paused) return;
      const next = { ...input, picked: v };
      setInput(next);
      submit(next);
    },
    [phase, paused, input, submit],
  );

  // a freshly opened hint must be visible without the child scrolling
  useEffect(() => {
    if (hintOpen) hintRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [hintOpen]);

  const toggleHint = () => {
    if (!hint) return;
    setHintOpen((o) => !o);
    setHintUsed(true);
    sfx.pop();
  };

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
      if (document.querySelector('dialog[open]')) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return;
      const k = e.key;
      if (/^[0-9]$/.test(k) && mode !== 'compare' && mode !== 'choice') {
        e.preventDefault();
        press(k as PadKey);
      } else if (/^[0-9]$/.test(k) && mode === 'choice' && task.kind === 'count') {
        const n = Number(k);
        if (task.choices?.includes(n)) choose(n);
      } else if (k === 'Backspace' || k === 'Delete') {
        e.preventDefault();
        press('back');
      } else if (k === 'Enter') {
        if (t && t.tagName === 'BUTTON' && !t.closest('.numpad')) return; // let a focused button act
        e.preventDefault();
        press('ok');
      } else if (mode === 'compare' && (k === '<' || k === '>' || k === '=')) {
        choose(k as Rel);
      } else if (task.kind === 'rem' && (k === 'Tab' || k === 'ArrowRight' || k === 'ArrowLeft')) {
        e.preventDefault();
        setInput((s) => ({ ...s, field: s.field === 0 ? 1 : 0 }));
      } else if ((k === 'h' || k === 'H' || k === 'n' || k === 'N') && hint) {
        toggleHint();
      } else if ((k === 'r' || k === 'R') && ttsOk) {
        speak(speechFor(task));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const mood: Mood = phase === 'correct' ? 'wow' : phase === 'wrong' ? 'oops' : phase === 'revealed' ? 'think' : 'happy';
  const showTts = ttsOk; // a tapped 🔊 always speaks (family rule)
  const e = expected(task);
  if (import.meta.env.DEV) (window as unknown as { __mat?: unknown }).__mat = { task, expected: e, phase };
  const revealed = phase === 'revealed' && !fast;

  const continueBtn = (
    <button type="button" className="g92-btn g92-btn--xl g92-btn--block continue-btn" onClick={() => complete(true, wrongs)} autoFocus>
      <Icon name="play" size={24} />
      {LABELS.resume}
    </button>
  );

  const choiceClass = (value: Rel | number) => {
    if (phase === 'revealed') return (e.kind === 'num' && e.value === value) || (e.kind === 'rel' && e.value === value) ? 'is-correct' : 'is-dim';
    if (input.picked !== value) return '';
    return phase === 'correct' ? 'is-correct' : phase === 'wrong' ? 'is-wrong' : '';
  };

  return (
    <div className="player">
      <div className="player__top">
        <div className="player__toolbar">{toolbar}</div>
        {showTts && (
          <button type="button" className="g92-btn g92-btn--soft g92-btn--icon" onClick={() => speak(speechFor(task))} aria-label="Přečíst příklad" title="Přečíst (R)" aria-keyshortcuts="R">
            <Icon name="speaker" size={24} />
          </button>
        )}
        {hint && (
          <button
            type="button"
            className="g92-btn g92-btn--soft g92-btn--icon"
            onClick={toggleHint}
            aria-pressed={hintOpen}
            aria-label="Nápověda"
            title="Nápověda (N)"
          >
            <Icon name="bulb" size={24} />
          </button>
        )}
      </div>

      <div className={`player__main ${hint && hintOpen ? 'has-hint' : ''}`}>
        <p className="g92-sr-only" aria-live="polite">
          {speechFor(task)}
        </p>
        <div className={`player__task ${task.kind === 'word' ? 'is-word' : ''}`}>
          <div className="player__view" ref={taskRef}>
            <TaskView task={task} input={input} phase={phase} notation={notation} onField={(f) => setInput((s) => ({ ...s, field: f }))} />
          </div>
          <div className="feedback" aria-live="polite">
            <Mascot mood={mood} size={48} key={`${phase}-${wrongs}`} />
            <p className={`feedback__text ${phase === 'correct' ? 'text-success' : phase === 'wrong' ? 'text-danger' : phase === 'revealed' ? 'text-warning' : ''}`}>{message}</p>
          </div>
        </div>

        {hint && hintOpen && (
          <div className={`hint-panel hint-panel--${hint.type}`} aria-live="polite" ref={hintRef}>
            <HintView hint={hint} />
          </div>
        )}
      </div>

      <div className="player__input">
        {mode === 'compare' ? (
          <div className="player__choices">
            <div className="choices choices--rel" role="group" aria-label="Vyber znaménko">
              {(
                [
                  ['<', 'je menší'],
                  ['=', 'rovná se'],
                  ['>', 'je větší'],
                ] as const
              ).map(([rel, cap]) => (
                <button key={rel} type="button" className={`choice ${choiceClass(rel)}`} onClick={() => choose(rel)} disabled={phase !== 'input'} aria-label={cap}>
                  <span className="choice__big">{rel}</span>
                  <span className="choice__cap">{cap}</span>
                </button>
              ))}
            </div>
            {revealed && continueBtn}
          </div>
        ) : mode === 'choice' && task.kind === 'count' ? (
          <div className="player__choices">
            <div className="choices" role="group" aria-label="Vyber číslo">
              {task.choices!.map((c) => (
                <button key={c} type="button" className={`choice ${choiceClass(c)}`} onClick={() => choose(c)} disabled={phase !== 'input'}>
                  <span className="choice__big">{c}</span>
                </button>
              ))}
            </div>
            {revealed && continueBtn}
          </div>
        ) : revealed ? (
          continueBtn
        ) : (
          <Numpad onKey={press} layout={prefs.numpad} disabled={phase !== 'input' || paused} okReady={currentAnswer(task, input) !== null || (task.kind === 'rem' && input.remQ !== '')} />
        )}
      </div>
    </div>
  );
}
