import type { Task } from './types';
import { opSymbol, type Notation } from './notation';
import { operandValue, relation } from './math';
import { plural } from './czech';

/** One-line text of a task with the correct answer filled in (for result lists). */
export function solvedText(task: Task, n: Notation = 'school'): string {
  switch (task.kind) {
    case 'expr':
      return `${task.a} ${opSymbol(task.op, n)} ${task.b} = ${task.c}`;
    case 'rem':
      return `${task.a} ${opSymbol('div', n)} ${task.b} = ${task.q} (zb. ${task.r})`;
    case 'compare': {
      const t = (o: typeof task.left) => (o.kind === 'num' ? String(o.value) : `${o.a} ${opSymbol(o.op, n)} ${o.b}`);
      return `${t(task.left)} ${relation(operandValue(task.left), operandValue(task.right))} ${t(task.right)}`;
    }
    case 'count':
      return `${task.n} ${plural(task.n, 'hvězdička', 'hvězdičky', 'hvězdiček')}`;
    case 'seq':
      return Array.from({ length: task.length }, (_, i) => task.start + task.step * i).join(', ');
    case 'place':
      return `${task.tens} ${plural(task.tens, 'desítka', 'desítky', 'desítek')} a ${task.units} ${plural(task.units, 'jednotka', 'jednotky', 'jednotek')} = ${task.tens * 10 + task.units}`;
    case 'word':
      return `${task.a} ${opSymbol(task.op, n)} ${task.b} = ${task.answer} ${plural(task.answer, ...task.unitForms)}`;
  }
}

/** The task as a question (answer hidden) — for the mistakes list. */
export function questionText(task: Task, n: Notation = 'school'): string {
  switch (task.kind) {
    case 'expr': {
      const v = (k: 'a' | 'b' | 'c') => (task.missing === k ? '?' : String(task[k]));
      return `${v('a')} ${opSymbol(task.op, n)} ${v('b')} = ${v('c')}`;
    }
    case 'rem':
      return `${task.a} ${opSymbol('div', n)} ${task.b} = ? (zb. ?)`;
    case 'compare': {
      const t = (o: typeof task.left) => (o.kind === 'num' ? String(o.value) : `${o.a} ${opSymbol(o.op, n)} ${o.b}`);
      return `${t(task.left)} ? ${t(task.right)}`;
    }
    case 'count':
      return 'Kolik je hvězdiček?';
    case 'seq':
      return Array.from({ length: task.length }, (_, i) => (i === task.gap ? '?' : String(task.start + task.step * i))).join(', ');
    case 'place':
      return `${task.tens} D a ${task.units} J = ?`;
    case 'word':
      return `${task.a} ${opSymbol(task.op, n)} ${task.b} = ? (slovní úloha)`;
  }
}

export function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ${String(s % 60).padStart(2, '0')} s`;
  return `${Math.floor(m / 60)} h ${m % 60} min`;
}
