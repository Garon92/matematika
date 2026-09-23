import { describe, expect, it } from 'vitest';
import { emptyDeck, recordWrong, recordRight, dueCards, nextDueIn, INTERVALS } from '../srs';
import { taskKey } from '../math';
import type { Task } from '../types';
import { bumpStreak, emptyStats, recordAnswer, recordSession, visibleStreak, totals } from '../stats';
import { buildTasks } from '../session';
import { mulberry32 } from '../rng';
import * as g from '../generators';

const t: Task = { kind: 'expr', op: 'add', a: 8, b: 5, c: 13, missing: 'c' };

describe('mistakes (Leitner)', () => {
  it('a wrong answer puts the card in box 1, due today', () => {
    const d = recordWrong(emptyDeck(), t, 'add-20c', 100);
    expect(dueCards(d, 100)).toHaveLength(1);
    expect(d.cards[taskKey(t)]).toMatchObject({ box: 1, due: 100, wrongs: 1 });
  });
  it('correct answers move the card up and schedule it later', () => {
    let d = recordWrong(emptyDeck(), t, null, 100);
    d = recordRight(d, taskKey(t), 100);
    expect(d.cards[taskKey(t)]).toMatchObject({ box: 2, due: 100 + INTERVALS[2]! });
    expect(dueCards(d, 100)).toHaveLength(0);
    expect(nextDueIn(d, 100)).toBe(1);
    // answering early does not promote again
    d = recordRight(d, taskKey(t), 100);
    expect(d.cards[taskKey(t)]!.box).toBe(2);
    d = recordRight(d, taskKey(t), 101);
    expect(d.cards[taskKey(t)]!.box).toBe(3);
    d = recordRight(d, taskKey(t), 104);
    expect(d.cards[taskKey(t)]!.box).toBe(4);
    d = recordRight(d, taskKey(t), 111);
    expect(d.cards[taskKey(t)]).toBeUndefined();
    expect(d.mastered).toBe(1);
    expect(nextDueIn(d, 111)).toBeNull();
  });
  it('a new mistake resets the box', () => {
    let d = recordWrong(emptyDeck(), t, null, 100);
    d = recordRight(d, taskKey(t), 100);
    d = recordWrong(d, t, null, 101);
    expect(d.cards[taskKey(t)]).toMatchObject({ box: 1, wrongs: 2, due: 101 });
  });
});

describe('stats & streak', () => {
  it('streak grows on consecutive days and resets after a gap', () => {
    let s = emptyStats().streak;
    s = bumpStreak(s, 10);
    s = bumpStreak(s, 10);
    s = bumpStreak(s, 11);
    expect(s.current).toBe(2);
    expect(visibleStreak(s, 12)).toBe(2);
    expect(visibleStreak(s, 13)).toBe(0);
    s = bumpStreak(s, 14);
    expect(s).toMatchObject({ current: 1, best: 2 });
  });
  it('records answers per day and op', () => {
    let s = emptyStats();
    s = recordAnswer(s, 5, 'add', true, 3000);
    s = recordAnswer(s, 5, 'add', false, 9000);
    s = recordSession(s, 5);
    expect(s.days[5]).toMatchObject({ solved: 2, correct: 1, wrong: 1, sessions: 1, ms: 12000 });
    expect(s.ops['add']).toEqual({ right: 1, wrong: 1 });
    expect(totals(s)).toMatchObject({ solved: 2, correct: 1, days: 1 });
    expect(s.streak.current).toBe(1);
  });
});

describe('session builder', () => {
  it('builds n unique tasks and injects mistakes (not first)', () => {
    const rng = mulberry32(5);
    const tasks = buildTasks(g.addCarry20(), 10, rng, [t]);
    expect(tasks).toHaveLength(10);
    expect(new Set(tasks.map(taskKey)).size).toBe(10);
    expect(tasks.findIndex((x) => taskKey(x) === taskKey(t))).toBeGreaterThanOrEqual(2);
  });
  it('never repeats a task back to back even with a tiny pool', () => {
    const rng = mulberry32(8);
    const tasks = buildTasks(g.makeTen(), 20, rng);
    for (let i = 1; i < tasks.length; i++) expect(taskKey(tasks[i]!)).not.toBe(taskKey(tasks[i - 1]!));
  });
});
