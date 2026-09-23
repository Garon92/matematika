import { describe, expect, it } from 'vitest';
import { challengeLevels, challengeTasks, emptyChallenge, recordChallenge } from '../challenge';
import { emptyProgress, recordLevel } from '../progress';
import { taskKey } from '../math';

describe('daily challenge', () => {
  it('uses the recommended level for a new child', () => {
    const levels = challengeLevels(emptyProgress());
    expect(levels.map((l) => l.id)).toEqual(['count-5']);
  });
  it('mixes passed levels and is stable for a day', () => {
    let p = recordLevel(emptyProgress(), 'add-5', 3, 10);
    p = recordLevel(p, 'mul-2', 2, 8);
    const ids = challengeLevels(p).map((l) => l.id);
    expect(ids).toContain('add-5');
    expect(ids).toContain('mul-2');
    const a = challengeTasks(p, 20000).map(taskKey);
    const b = challengeTasks(p, 20000).map(taskKey);
    const c = challengeTasks(p, 20001).map(taskKey);
    expect(a).toHaveLength(10);
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });
  it('counts a day only once and keeps the best stars', () => {
    let c = recordChallenge(emptyChallenge(), 5, 1);
    c = recordChallenge(c, 5, 3);
    c = recordChallenge(c, 5, 0);
    expect(c).toMatchObject({ day: 5, stars: 3, plays: 3, done: 1 });
    c = recordChallenge(c, 6, 2);
    expect(c).toMatchObject({ day: 6, stars: 2, done: 2 });
  });
});
