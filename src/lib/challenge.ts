/** "Výzva dne" — a daily mixed set built from what the child already knows. */
import { LEVELS, type LevelDef } from './levels';
import { recommend, starsOf, type Progress } from './progress';
import { mix } from './generators';
import { buildTasks } from './session';
import { mulberry32 } from './rng';
import type { Task } from './types';

/** Levels used for today's challenge: the most advanced passed levels + the recommended one. */
export function challengeLevels(p: Progress, unlockAll = false): LevelDef[] {
  const passed = LEVELS.filter((l) => starsOf(p, l.id) >= 1);
  const rec = recommend(p, unlockAll);
  const picked = passed.slice(-8);
  if (!picked.some((l) => l.id === rec.id)) picked.push(rec);
  return picked;
}

/** Deterministic for a given day and progress → retrying the challenge gives the same tasks. */
export function challengeTasks(p: Progress, day: number, n = 10, unlockAll = false): Task[] {
  const levels = challengeLevels(p, unlockAll);
  const rng = mulberry32((day * 7919 + 104729) >>> 0);
  return buildTasks(mix(levels.map((l) => l.gen)), n, rng);
}

export interface ChallengeState {
  day: number;
  stars: number;
  plays: number;
  /** days on which the challenge got at least one star */
  done: number;
}

export const emptyChallenge = (): ChallengeState => ({ day: -1, stars: 0, plays: 0, done: 0 });

export function recordChallenge(c: ChallengeState, day: number, stars: number): ChallengeState {
  const sameDay = c.day === day;
  const wasDone = sameDay && c.stars >= 1;
  return {
    day,
    stars: sameDay ? Math.max(c.stars, stars) : stars,
    plays: c.plays + 1,
    done: c.done + (!wasDone && stars >= 1 ? 1 : 0),
  };
}
