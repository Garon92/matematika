import { AREAS, LEVELS, areaById, levelById, levelsOf, type AreaId, type LevelDef } from './levels';

export interface LevelProgress {
  stars: 0 | 1 | 2 | 3;
  /** Best number of first-try correct answers. */
  best: number;
  plays: number;
  /** Timestamp of the last play. */
  last: number;
}

export interface Progress {
  levels: Record<string, LevelProgress>;
  /** Levels unlocked manually (onboarding "Co už umíš?"). */
  unlocked: string[];
  lastArea: AreaId | null;
  lastLevel: string | null;
}

export const emptyProgress = (): Progress => ({ levels: {}, unlocked: [], lastArea: null, lastLevel: null });

export function starsOf(p: Progress, levelId: string): number {
  return p.levels[levelId]?.stars ?? 0;
}

export function isUnlocked(p: Progress, level: LevelDef, unlockAll = false): boolean {
  if (unlockAll) return true;
  const area = areaById(level.area);
  if (!area || !area.sequential) return true;
  if (p.unlocked.includes(level.id)) return true;
  const list = levelsOf(level.area);
  const idx = list.findIndex((l) => l.id === level.id);
  if (idx <= 0) return true;
  const prev = list[idx - 1]!;
  return starsOf(p, prev.id) >= 1 || (p.levels[level.id]?.plays ?? 0) > 0;
}

/** Records a finished session; stars / best only ever go up. */
export function recordLevel(p: Progress, levelId: string, stars: 0 | 1 | 2 | 3, firstTry: number, now = Date.now()): Progress {
  const prev = p.levels[levelId];
  const level = levelById(levelId);
  const next: LevelProgress = {
    stars: Math.max(prev?.stars ?? 0, stars) as 0 | 1 | 2 | 3,
    best: Math.max(prev?.best ?? 0, firstTry),
    plays: (prev?.plays ?? 0) + 1,
    last: now,
  };
  return {
    ...p,
    levels: { ...p.levels, [levelId]: next },
    lastArea: level?.area ?? p.lastArea,
    lastLevel: levelId,
  };
}

export function areaStars(p: Progress, area: AreaId): { got: number; max: number } {
  const list = levelsOf(area);
  return { got: list.reduce((s, l) => s + starsOf(p, l.id), 0), max: list.length * 3 };
}

export function totalStars(p: Progress): number {
  return LEVELS.reduce((s, l) => s + starsOf(p, l.id), 0);
}

/** The level a "Hrát" button should start: first unlocked unfinished level in the last area. */
export function recommend(p: Progress, unlockAll = false, preferArea?: AreaId): LevelDef {
  const areaId = preferArea ?? p.lastArea ?? 'count';
  const list = levelsOf(areaId);
  const open = list.filter((l) => isUnlocked(p, l, unlockAll));
  const firstNew = open.find((l) => starsOf(p, l.id) === 0);
  if (firstNew) return firstNew;
  const firstImperfect = open.find((l) => starsOf(p, l.id) < 3);
  if (firstImperfect) return firstImperfect;
  // area finished → move on to the next area
  const ai = AREAS.findIndex((a) => a.id === areaId);
  for (let i = 1; i < AREAS.length; i++) {
    const other = AREAS[(ai + i) % AREAS.length]!;
    const cand = levelsOf(other.id).find((l) => isUnlocked(p, l, unlockAll) && starsOf(p, l.id) < 3);
    if (cand) return cand;
  }
  return list[list.length - 1] ?? LEVELS[0]!;
}

/** The level after `levelId` in the same area (or null at the end). */
export function nextLevel(levelId: string): LevelDef | null {
  const lvl = levelById(levelId);
  if (!lvl) return null;
  const list = levelsOf(lvl.area);
  const i = list.findIndex((l) => l.id === levelId);
  return list[i + 1] ?? null;
}

/** Onboarding start points: unlocks everything before the chosen level. */
export const START_POINTS = [
  { id: 'start', title: 'Teprve začínám', sample: '⭐ ⭐ ⭐', level: 'count-5' },
  { id: 'to10', title: 'Počítám do 10', sample: '4 + 3', level: 'add-10' },
  { id: 'to20', title: 'Počítám do 20', sample: '8 + 5', level: 'add-20c' },
  { id: 'to100', title: 'Počítám do 100', sample: '38 + 47', level: 'add-100' },
  { id: 'mul', title: 'Učím se násobilku', sample: '7 · 8', level: 'mul-2' },
] as const;

export function unlockUpTo(p: Progress, startId: string): Progress {
  const sp = START_POINTS.find((s) => s.id === startId);
  if (!sp) return p;
  const target = levelById(sp.level);
  if (!target) return p;
  const unlocked = new Set(p.unlocked);
  const upTo = (area: AreaId, lastId: string | null) => {
    for (const l of levelsOf(area)) {
      unlocked.add(l.id);
      if (l.id === lastId) break;
    }
  };
  switch (startId) {
    case 'to10':
      upTo('count', 'cmp-10');
      upTo('add', 'add-10');
      upTo('sub', 'sub-10');
      break;
    case 'to20':
      upTo('count', 'cmp-20');
      upTo('add', 'add-20c');
      upTo('sub', 'sub-20b');
      break;
    case 'to100':
    case 'mul':
      upTo('count', null);
      upTo('add', startId === 'mul' ? null : 'add-100');
      upTo('sub', startId === 'mul' ? null : 'sub-100');
      break;
  }
  return { ...p, unlocked: [...unlocked], lastArea: target.area, lastLevel: null };
}
