import { useCallback, useEffect, useMemo, useState } from 'react';
import { confetti, confirmDialog, sfx } from '../kit';
import { levelById, sampleIn } from '../lib/levels';
import { buildTasks } from '../lib/session';
import { mulberry32, randomSeed } from '../lib/rng';
import { dueCards } from '../lib/srs';
import { starsFor, praise } from '../lib/scoring';
import { isUnlocked, nextLevel } from '../lib/progress';
import { solvedText, formatDuration } from '../lib/format';
import type { Task } from '../lib/types';
import { finishLevel, finishSession, recordTask, store, today, usePrefs, type AnswerRecord } from '../state/store';
import { TaskPlayer } from '../task/TaskPlayer';
import { navigate } from '../router';
import { Icon } from '../ui/Icon';
import { Mascot } from '../ui/Mascot';
import { StarRating } from '../ui/StarRating';
import { NotFound } from './NotFound';

export type SessionSource = { kind: 'level'; levelId: string } | { kind: 'mistakes' };

function Progress({ total, records, index }: { total: number; records: AnswerRecord[]; index: number }) {
  return (
    <div className="session-progress" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={records.length} aria-label={`Příklad ${index + 1} z ${total}`}>
      {Array.from({ length: total }, (_, i) => {
        const r = records[i];
        const cls = r ? (r.firstTry ? 'is-ok' : 'is-bad') : i === index ? 'is-current' : '';
        return <span key={i} className={`session-progress__dot ${cls}`} />;
      })}
    </div>
  );
}

export function Session({ source }: { source: SessionSource }) {
  const prefs = usePrefs();
  const level = source.kind === 'level' ? levelById(source.levelId) : undefined;
  const [round, setRound] = useState(0);
  const tasks = useMemo<Task[]>(() => {
    const rng = mulberry32(randomSeed());
    const deck = store.get('deck');
    const due = dueCards(deck, today());
    if (source.kind === 'mistakes') return due.slice(0, Math.max(5, prefs.sessionLength)).map((c) => c.task);
    if (!level) return [];
    const inject = due.filter((c) => c.level === level.id).map((c) => c.task);
    return buildTasks(level.gen, prefs.sessionLength, rng, inject);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source.kind, level?.id, round]);
  const [index, setIndex] = useState(0);
  const [records, setRecords] = useState<AnswerRecord[]>([]);
  const [started, setStarted] = useState(() => performance.now());
  const [result, setResult] = useState<null | { stars: 0 | 1 | 2 | 3; firstTry: number; ms: number; before: number; after: number }>(null);

  useEffect(() => {
    setIndex(0);
    setRecords([]);
    setResult(null);
    setStarted(performance.now());
  }, [round]);

  const backHref = source.kind === 'level' && level ? `oblast/${level.area}` : source.kind === 'mistakes' ? 'chyby' : '';

  const onComplete = useCallback(
    (rec: AnswerRecord) => {
      recordTask(rec, source.kind === 'level' ? source.levelId : null);
      const all = [...records, rec];
      setRecords(all);
      if (all.length < tasks.length) {
        setIndex(all.length);
        return;
      }
      const firstTry = all.filter((r) => r.firstTry).length;
      const stars = starsFor(firstTry, all.length);
      const ms = performance.now() - started;
      if (source.kind === 'level') {
        const { before, after } = finishLevel(source.levelId, stars, firstTry);
        setResult({ stars, firstTry, ms, before, after });
      } else {
        finishSession();
        setResult({ stars, firstTry, ms, before: 0, after: 0 });
      }
    },
    [records, tasks.length, source, started],
  );

  useEffect(() => {
    if (!result) return;
    if (result.stars >= 3) {
      sfx.win();
      confetti({ particleCount: 180, cannons: true });
    } else if (result.stars >= 1) {
      sfx.levelUp();
      if (result.after > result.before) confetti({ particleCount: 90 });
    } else sfx.coin();
  }, [result]);

  const leave = useCallback(async () => {
    if (records.length > 0 && !result) {
      const ok = await confirmDialog({ title: 'Ukončit cvičení?', message: 'Rozpracované příklady se nezapočítají do hvězd.', confirmLabel: 'Ukončit', cancelLabel: 'Pokračovat' });
      if (!ok) return;
    }
    navigate(backHref);
  }, [records.length, result, backHref]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('dialog[open]')) {
        // keep the key from immediately cancelling the confirm dialog we are about to open
        e.preventDefault();
        window.setTimeout(() => void leave(), 0);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [leave]);

  if (source.kind === 'level' && !level) return <NotFound />;

  if (tasks.length === 0) {
    return (
      <div className="g92-main g92-main--narrow screen">
        <div className="g92-empty">
          <Mascot mood="cheer" size={120} />
          <h1 className="text-2xl font-black">Žádné chyby k procvičení</h1>
          <p className="g92-muted">Všechno je naučené. Přijď zase zítra!</p>
          <button type="button" className="g92-btn g92-btn--lg" onClick={() => navigate('')}>
            Domů
          </button>
        </div>
      </div>
    );
  }

  if (result) {
    const mistakes = records.filter((r) => !r.firstTry);
    const next = level ? nextLevel(level.id) : null;
    const nextOpen = next && isUnlocked(store.get('progress'), next, prefs.unlockAll);
    return (
      <div className="g92-main g92-main--narrow screen results">
        <div className="results__hero">
          <Mascot mood={result.stars >= 2 ? 'cheer' : result.stars === 1 ? 'happy' : 'think'} size={112} />
          <h1 className="results__title">{source.kind === 'mistakes' ? (result.stars >= 2 ? 'Chyby jsou pryč!' : 'Dobrá práce!') : praise(result.stars)}</h1>
          {source.kind === 'level' && <StarRating value={result.stars} size={52} animate />}
          <p className="results__stats">
            <b>{result.firstTry}</b> z {records.length} napoprvé · {formatDuration(result.ms)}
          </p>
          {result.after > result.before && result.before > 0 && <p className="g92-badge g92-badge--success">Nový rekord úrovně!</p>}
          {level && next && result.after >= 1 && result.before === 0 && (
            <p className="g92-badge">
              <Icon name="sparkle" size={16} /> Odemčeno: {next.title}
            </p>
          )}
        </div>

        {mistakes.length > 0 && (
          <section className="g92-card results__mistakes" aria-label="Chyby">
            <h2 className="text-lg font-extrabold">Tohle si ještě procvičíme</h2>
            <ul>
              {mistakes.map((r, i) => (
                <li key={i}>
                  <span className="tabular-nums">{solvedText(r.task, prefs.notation)}</span>
                  {r.revealed && <span className="g92-badge g92-badge--warning">ukázáno</span>}
                </li>
              ))}
            </ul>
            <p className="g92-muted text-sm">Příklady se ti vrátí v „Chybách k procvičení“.</p>
          </section>
        )}

        <div className="results__actions">
          <button type="button" className="g92-btn g92-btn--secondary g92-btn--lg" onClick={() => setRound((r) => r + 1)}>
            <Icon name="restart" size={22} /> Znovu
          </button>
          {next && nextOpen && result.stars >= 1 ? (
            <button type="button" className="g92-btn g92-btn--lg" onClick={() => navigate(`uroven/${next.id}`)} autoFocus>
              {next.title} <span className="opacity-75">({sampleIn(next.sample, prefs.notation)})</span>
              <Icon name="arrowRight" size={22} />
            </button>
          ) : (
            <button type="button" className="g92-btn g92-btn--lg" onClick={() => navigate(backHref)} autoFocus>
              Hotovo <Icon name="check" size={22} />
            </button>
          )}
        </div>
      </div>
    );
  }

  const task = tasks[index]!;
  return (
    <div className="screen screen--play">
      <TaskPlayer
        key={`${round}-${index}`}
        task={task}
        notation={prefs.notation}
        prefs={prefs}
        maxWrong={3}
        onComplete={onComplete}
        toolbar={
          <>
            <button type="button" className="g92-btn g92-btn--ghost g92-btn--icon" onClick={() => void leave()} aria-label="Ukončit cvičení" title="Ukončit (Esc)">
              <Icon name="close" size={24} />
            </button>
            <div className="min-w-0 flex-1">
              <p className="session-title">{level ? level.title : 'Chyby k procvičení'}</p>
              <Progress total={tasks.length} records={records} index={index} />
            </div>
          </>
        }
      />
    </div>
  );
}
