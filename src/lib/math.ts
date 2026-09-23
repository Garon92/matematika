import type { Answer, Op, Operand, Rel, Task } from './types';

export function apply(op: Op, a: number, b: number): number {
  switch (op) {
    case 'add':
      return a + b;
    case 'sub':
      return a - b;
    case 'mul':
      return a * b;
    case 'div':
      return b === 0 ? NaN : a / b;
  }
}

export function operandValue(o: Operand): number {
  return o.kind === 'num' ? o.value : apply(o.op, o.a, o.b);
}

export function relation(x: number, y: number): Rel {
  return x < y ? '<' : x > y ? '>' : '=';
}

/** The expected answer of a task. */
export function expected(task: Task): Answer {
  switch (task.kind) {
    case 'expr':
      return { kind: 'num', value: task[task.missing] };
    case 'rem':
      return { kind: 'rem', q: task.q, r: task.r };
    case 'compare':
      return { kind: 'rel', value: relation(operandValue(task.left), operandValue(task.right)) };
    case 'count':
      return { kind: 'num', value: task.n };
    case 'seq':
      return { kind: 'num', value: task.start + task.step * task.gap };
    case 'place':
      return { kind: 'num', value: task.tens * 10 + task.units };
    case 'word':
      return { kind: 'num', value: task.answer };
  }
}

export function isCorrect(task: Task, answer: Answer): boolean {
  const e = expected(task);
  if (e.kind === 'num' && answer.kind === 'num') return e.value === answer.value;
  if (e.kind === 'rel' && answer.kind === 'rel') return e.value === answer.value;
  if (e.kind === 'rem' && answer.kind === 'rem') return e.q === answer.q && e.r === answer.r;
  return false;
}

export function inputMode(task: Task): 'numpad' | 'choice' | 'compare' | 'rem' {
  if (task.kind === 'compare') return 'compare';
  if (task.kind === 'rem') return 'rem';
  if (task.kind === 'count' && task.choices && task.choices.length > 0) return 'choice';
  return 'numpad';
}

/** Max digits the answer can have (limits the numpad). */
export function answerDigits(task: Task): number {
  const e = expected(task);
  if (e.kind === 'num') return Math.max(2, String(e.value).length + 1);
  return 3;
}

/** Stable identity of a task — used to avoid repeats and to track mistakes. */
export function taskKey(task: Task): string {
  switch (task.kind) {
    case 'expr':
      return `e:${task.op}:${task.a}:${task.b}:${task.missing}`;
    case 'rem':
      return `r:${task.a}:${task.b}`;
    case 'compare':
      return `c:${operandKey(task.left)}:${operandKey(task.right)}`;
    case 'count':
      return `n:${task.n}`;
    case 'seq':
      return `s:${task.start}:${task.step}:${task.length}:${task.gap}`;
    case 'place':
      return `p:${task.tens}:${task.units}`;
    case 'word':
      return `w:${task.op}:${task.a}:${task.b}`;
  }
}

function operandKey(o: Operand): string {
  return o.kind === 'num' ? String(o.value) : `${o.a}${o.op}${o.b}`;
}

/** Operation family of a task (for statistics). */
export function taskOp(task: Task): Op | 'count' | 'compare' {
  switch (task.kind) {
    case 'expr':
    case 'word':
      return task.op;
    case 'rem':
      return 'div';
    case 'compare':
      return 'compare';
    default:
      return 'count';
  }
}
