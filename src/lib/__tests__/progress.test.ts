import { describe, expect, it } from 'vitest';
import { emptyProgress, isUnlocked, recommend, recordLevel, nextLevel, unlockUpTo, areaStars, totalStars } from '../progress';
import { levelById, levelsOf } from '../levels';
import { starsFor, timedStars } from '../scoring';

describe('scoring', () => {
  it('stars from first-try accuracy', () => {
    expect(starsFor(10, 10)).toBe(3);
    expect(starsFor(9, 10)).toBe(3);
    expect(starsFor(8, 10)).toBe(2);
    expect(starsFor(7, 10)).toBe(2);
    expect(starsFor(5, 10)).toBe(1);
    expect(starsFor(4, 10)).toBe(0);
    expect(starsFor(0, 0)).toBe(0);
  });
  it('timed thresholds', () => {
    expect(timedStars(5, [6, 11, 16])).toBe(0);
    expect(timedStars(6, [6, 11, 16])).toBe(1);
    expect(timedStars(12, [6, 11, 16])).toBe(2);
    expect(timedStars(30, [6, 11, 16])).toBe(3);
  });
});

describe('level progress', () => {
  it('sequential areas unlock one by one', () => {
    let p = emptyProgress();
    const [l1, l2, l3] = levelsOf('add');
    expect(isUnlocked(p, l1!)).toBe(true);
    expect(isUnlocked(p, l2!)).toBe(false);
    p = recordLevel(p, l1!.id, 0, 3);
    expect(isUnlocked(p, l2!)).toBe(false);
    p = recordLevel(p, l1!.id, 1, 5);
    expect(isUnlocked(p, l2!)).toBe(true);
    expect(isUnlocked(p, l3!)).toBe(false);
    expect(isUnlocked(p, l3!, true)).toBe(true);
  });
  it('multiplication rows are open', () => {
    const p = emptyProgress();
    for (const l of levelsOf('mul')) expect(isUnlocked(p, l)).toBe(true);
  });
  it('stars and best never decrease', () => {
    let p = recordLevel(emptyProgress(), 'add-5', 3, 10);
    p = recordLevel(p, 'add-5', 1, 5);
    expect(p.levels['add-5']).toMatchObject({ stars: 3, best: 10, plays: 2 });
    expect(areaStars(p, 'add').got).toBe(3);
    expect(totalStars(p)).toBe(3);
  });
  it('recommend picks the first unfinished level of the last area', () => {
    let p = emptyProgress();
    expect(recommend(p).id).toBe('count-5');
    p = recordLevel(p, 'add-5', 2, 8);
    expect(recommend(p).id).toBe('add-10');
    p = recordLevel(p, 'add-10', 3, 10);
    expect(recommend(p).id).toBe('add-make10');
  });
  it('nextLevel walks the ladder', () => {
    expect(nextLevel('add-5')?.id).toBe('add-10');
    expect(nextLevel('add-word')).toBeNull();
  });
  it('onboarding unlocks earlier levels', () => {
    const p = unlockUpTo(emptyProgress(), 'to20');
    expect(isUnlocked(p, levelById('add-20c')!)).toBe(true);
    expect(isUnlocked(p, levelById('add-miss20')!)).toBe(true);
    expect(isUnlocked(p, levelById('add-tens')!)).toBe(false);
    expect(p.lastArea).toBe('add');
    // the chosen start level is recommended, not the already-known easier ones
    expect(recommend(p).id).toBe('add-20c');
    const after = recordLevel(p, 'add-20c', 2, 8);
    expect(recommend(after).id).toBe('add-miss20');
    // in another area, onboarding-unlocked levels are skipped too
    expect(recommend(after, false, 'count').id).toBe('place');
  });
});
