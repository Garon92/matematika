import { useSyncExternalStore } from 'react';
import { confetti, createDaily, createStore, haptic, readJSON, recordActivity, safeStorage, sfx, toast, writeJSON } from '../kit';
export { useSettings } from '../kit/react/hooks';
import { emptyProgress, recordLevel, totalStars, type Progress } from '../lib/progress';
import { emptyDeck, recordRight, recordWrong, type MistakeDeck } from '../lib/srs';
import { emptyStats, pruneDays, recordAnswer, recordSession, type Stats } from '../lib/stats';
import { LEVELS, levelById, type AreaId } from '../lib/levels';
import { dayIndex } from '../lib/dates';
import { taskKey, taskOp } from '../lib/math';
import type { Task } from '../lib/types';
import type { LayoutMode } from '../stars/layout';
import type { FreeMode } from '../lib/free';
import { emptyChallenge, recordChallenge, type ChallengeState } from '../lib/challenge';
import { activeAppId } from './profiles';

export interface Prefs {
  /** "·" and ":" (school) or "×" and "÷" */
  notation: 'school' | 'intl';
  /** auto = button + shown automatically after the 2nd mistake */
  hints: 'auto' | 'button' | 'off';
  /** auto = read every task aloud */
  tts: 'auto' | 'button' | 'off';
  sessionLength: number;
  dailyGoal: number;
  numpad: 'phone' | 'calc';
  unlockAll: boolean;
}

export const DEFAULT_PREFS: Prefs = {
  notation: 'school',
  hints: 'auto',
  tts: 'button',
  sessionLength: 10,
  dailyGoal: 20,
  numpad: 'phone',
  unlockAll: false,
};

export interface SkyState {
  count: number;
  step: number;
  mode: LayoutMode;
}

export interface CalcState {
  a: number;
  b: number;
  op: 'add' | 'sub' | 'mul' | 'div';
  mode: LayoutMode;
  guess: boolean;
}

export interface FreeState {
  mode: FreeMode;
  max: number;
  ok: number;
  attempts: number;
  bestStreak: number;
}

export interface TimedRecord {
  best: number;
  stars: number;
  plays: number;
}

const defaults = {
  progress: emptyProgress() as Progress,
  deck: emptyDeck() as MistakeDeck,
  stats: emptyStats() as Stats,
  prefs: DEFAULT_PREFS as Prefs,
  timed: {} as Record<string, TimedRecord>,
  free: { mode: 'add', max: 20, ok: 0, attempts: 0, bestStreak: 0 } as FreeState,
  sky: { count: 7, step: 1, mode: 'scatter' } as SkyState,
  calc: { a: 3, b: 2, op: 'add', mode: 'scatter', guess: false } as CalcState,
  onboarded: false as boolean,
  challenge: emptyChallenge() as ChallengeState,
};

export type AppData = typeof defaults;

/** Store namespace of the active child profile ("matematika" for the first one). */
export const APP_NS = activeAppId();

export const store = createStore<AppData>(APP_NS, {
  version: 1,
  defaults,
  // The original app (static HTML) stored nothing in localStorage — nothing to migrate.
});

/** Subscribes a component to one store key. */
export function useStore<K extends keyof AppData>(key: K): AppData[K] {
  return useSyncExternalStore(
    (cb) => store.subscribe((k) => {
      if (k === key) cb();
    }),
    () => store.get(key),
    () => store.get(key),
  );
}

export function usePrefs(): Prefs {
  const p = useStore('prefs');
  return { ...DEFAULT_PREFS, ...p };
}

export function setPrefs(patch: Partial<Prefs>): void {
  store.update('prefs', (p) => ({ ...DEFAULT_PREFS, ...p, ...patch }));
  if (patch.dailyGoal) daily.setGoal(patch.dailyGoal);
}

/** Daily goal + day streak (kit; the menu reads g92:matematika:daily for its chips). */
export const daily = createDaily(APP_NS, { goal: DEFAULT_PREFS.dailyGoal });
{
  const goal = { ...DEFAULT_PREFS, ...store.get('prefs') }.dailyGoal;
  if (daily.goal() !== goal) daily.setGoal(goal);
}

export const today = () => dayIndex();

// ------------------------------------------------------------------ actions

export interface AnswerRecord {
  task: Task;
  /** wrong attempts before the correct answer (or before revealing) */
  wrongs: number;
  firstTry: boolean;
  revealed: boolean;
  hintUsed: boolean;
  ms: number;
}

/** Called after every finished task (session, timed, free, mistakes). */
export function recordTask(rec: AnswerRecord, level: string | null, opts: { mistakes: boolean } = { mistakes: true }): void {
  const day = today();
  const d = daily.record(1);
  if (d.reachedNow) {
    window.setTimeout(() => {
      sfx.levelUp();
      haptic('success');
      confetti({ particleCount: 120, origin: { x: 0.5, y: 0.3 } });
      toast(`Denní cíl splněn! ${d.goal} příkladů – jsi hvězda!`, { variant: 'success', icon: '🎯' });
    }, 400);
  }
  store.update('stats', (s) => recordAnswer(s, day, taskOp(rec.task), rec.firstTry, rec.ms));
  if (!opts.mistakes) return;
  if (!rec.firstTry) store.update('deck', (d) => recordWrong(d, rec.task, level, day));
  else store.update('deck', (d) => recordRight(d, taskKey(rec.task), day));
}

export function finishLevel(levelId: string, stars: 0 | 1 | 2 | 3, firstTry: number): { before: number; after: number } {
  const before = store.get('progress').levels[levelId]?.stars ?? 0;
  store.update('progress', (p) => recordLevel(p, levelId, stars, firstTry));
  finishSession();
  const after = store.get('progress').levels[levelId]?.stars ?? 0;
  const level = levelById(levelId);
  reportActivity(level ? level.title : null);
  return { before, after };
}

export function finishSession(): void {
  const day = today();
  store.update('stats', (s) => pruneDays(recordSession(s, day), day));
}

export function markArea(area: AreaId): void {
  store.update('progress', (p) => ({ ...p, lastArea: area }));
}

export function reportActivity(note: string | null = null): void {
  const p = store.get('progress');
  const stars = totalStars(p);
  recordActivity('matematika', {
    progress: stars / (LEVELS.length * 3),
    metric: { label: 'Hvězd', value: stars },
    ...(note ? { note } : {}),
  });
}

export function finishChallenge(stars: number): { before: number; after: number } {
  const day = today();
  const prev = store.get('challenge');
  const before = prev.day === day ? prev.stars : 0;
  store.update('challenge', (c) => recordChallenge({ ...emptyChallenge(), ...c }, day, stars));
  finishSession();
  reportActivity('Výzva dne');
  return { before, after: store.get('challenge').stars };
}

export function submitTimed(id: string, score: number, stars: number): { isNewBest: boolean; best: number } {
  const prev = store.get('timed')[id];
  const isNewBest = score > (prev?.best ?? -1) && score > 0;
  const rec: TimedRecord = {
    best: Math.max(prev?.best ?? 0, score),
    stars: Math.max(prev?.stars ?? 0, stars),
    plays: (prev?.plays ?? 0) + 1,
  };
  store.update('timed', (t) => ({ ...t, [id]: rec }));
  finishSession();
  return { isNewBest, best: rec.best };
}

const DAILY_KEY = `g92:${APP_NS}:daily`;

export function resetAll(): void {
  store.reset();
  safeStorage.removeItem(DAILY_KEY);
}

/** Everything as JSON (export for parents). */
export function exportData(): string {
  return JSON.stringify({ app: 'matematika', version: 1, exported: new Date().toISOString(), data: store.all(), daily: readJSON(DAILY_KEY, null) }, null, 2);
}

export function importData(json: string): boolean {
  try {
    const parsed = JSON.parse(json) as { app?: string; data?: Partial<AppData>; daily?: unknown };
    if (parsed.app !== 'matematika' || !parsed.data) return false;
    const d = parsed.data;
    const patch: Partial<AppData> = {};
    for (const k of Object.keys(defaults) as (keyof AppData)[]) if (d[k] !== undefined) (patch as Record<string, unknown>)[k] = d[k];
    store.patch(patch);
    if (parsed.daily && typeof parsed.daily === 'object') writeJSON(DAILY_KEY, parsed.daily);
    return true;
  } catch {
    return false;
  }
}
