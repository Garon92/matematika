/** Daily statistics (the day streak and daily goal live in the kit's createDaily → g92:matematika:daily). */
export interface DayStat {
  /** tasks answered */
  solved: number;
  /** correct on first try */
  correct: number;
  /** tasks with at least one mistake */
  wrong: number;
  /** time spent (ms) */
  ms: number;
  sessions: number;
}

export interface OpStat {
  right: number;
  wrong: number;
}

export interface Stats {
  days: Record<number, DayStat>;
  ops: Record<string, OpStat>;
}

export const emptyStats = (): Stats => ({ days: {}, ops: {} });

const emptyDay = (): DayStat => ({ solved: 0, correct: 0, wrong: 0, ms: 0, sessions: 0 });

export function dayStat(s: Stats, day: number): DayStat {
  return s.days[day] ?? emptyDay();
}

/** Records one answered task. */
export function recordAnswer(s: Stats, day: number, op: string, firstTry: boolean, ms: number): Stats {
  const d = { ...dayStat(s, day) };
  d.solved += 1;
  if (firstTry) d.correct += 1;
  else d.wrong += 1;
  d.ms += Math.max(0, Math.min(ms, 120_000));
  const o = { ...(s.ops[op] ?? { right: 0, wrong: 0 }) };
  if (firstTry) o.right += 1;
  else o.wrong += 1;
  return { ...s, days: { ...s.days, [day]: d }, ops: { ...s.ops, [op]: o } };
}

/** Records a finished session. */
export function recordSession(s: Stats, day: number): Stats {
  const d = { ...dayStat(s, day) };
  d.sessions += 1;
  return { ...s, days: { ...s.days, [day]: d } };
}

export function totals(s: Stats): { solved: number; correct: number; ms: number; days: number } {
  let solved = 0;
  let correct = 0;
  let ms = 0;
  let days = 0;
  for (const d of Object.values(s.days)) {
    solved += d.solved;
    correct += d.correct;
    ms += d.ms;
    if (d.solved > 0) days += 1;
  }
  return { solved, correct, ms, days };
}

/** Removes day records older than `keepDays` (keeps storage small). */
export function pruneDays(s: Stats, today: number, keepDays = 400): Stats {
  const days: Record<number, DayStat> = {};
  for (const [k, v] of Object.entries(s.days)) if (Number(k) > today - keepDays) days[Number(k)] = v;
  return { ...s, days };
}
