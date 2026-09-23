import type { Gen } from './generators';
import type { Rng } from './rng';
import { randInt } from './rng';
import type { Task } from './types';
import { taskKey } from './math';

/**
 * Builds `n` tasks from a generator: no duplicates when the pool allows it,
 * never the same task twice in a row. `inject` tasks (due mistakes) are spread in.
 */
export function buildTasks(gen: Gen, n: number, rng: Rng, inject: readonly Task[] = []): Task[] {
  const extra = inject.slice(0, Math.max(0, Math.min(inject.length, Math.floor(n / 4))));
  const seen = new Set(extra.map(taskKey));
  const out: Task[] = [];
  const target = n - extra.length;
  while (out.length < target) {
    let t = gen(rng);
    let tries = 0;
    while (seen.has(taskKey(t)) && tries++ < 40) t = gen(rng);
    const last = out[out.length - 1];
    if (last && taskKey(last) === taskKey(t)) {
      for (let i = 0; i < 20 && taskKey(last) === taskKey(t); i++) t = gen(rng);
    }
    seen.add(taskKey(t));
    out.push(t);
  }
  for (const t of extra) {
    // never as the very first task, keep the start easy
    const pos = randInt(rng, Math.min(2, out.length), out.length);
    out.splice(pos, 0, t);
  }
  return out;
}

/** Endless stream for timed mode / free training: avoids the last few tasks. */
export function makeStream(gen: Gen, rng: Rng, memory = 6): () => Task {
  const recent: string[] = [];
  return () => {
    let t = gen(rng);
    for (let i = 0; i < 40 && recent.includes(taskKey(t)); i++) t = gen(rng);
    recent.push(taskKey(t));
    if (recent.length > memory) recent.shift();
    return t;
  };
}
