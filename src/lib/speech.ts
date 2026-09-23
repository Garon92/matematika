import type { Operand, Task } from './types';
import { opWord } from './notation';
import { plural } from './czech';

function operandWords(o: Operand): string {
  return o.kind === 'num' ? String(o.value) : `${o.a} ${opWord(o.op)} ${o.b}`;
}

/** Czech sentence read aloud for the task (digits are read by the Czech voice). */
export function speechFor(task: Task): string {
  switch (task.kind) {
    case 'expr': {
      const w = opWord(task.op);
      if (task.missing === 'c') return `Kolik je ${task.a} ${w} ${task.b}?`;
      if (task.missing === 'b') return `${task.a} ${w} kolik se rovná ${task.c}?`;
      return `Kolik ${w} ${task.b} se rovná ${task.c}?`;
    }
    case 'rem':
      return `Kolik je ${task.a} děleno ${task.b}? A kolik zbyde?`;
    case 'compare':
      return `Porovnej. ${operandWords(task.left)}, a ${operandWords(task.right)}. Je to větší, menší, nebo stejné?`;
    case 'count':
      return 'Kolik je tu hvězdiček?';
    case 'seq': {
      const parts: string[] = [];
      for (let i = 0; i < task.length; i++) parts.push(i === task.gap ? 'kolik' : String(task.start + task.step * i));
      return `Které číslo chybí? ${parts.join(', ')}.`;
    }
    case 'place':
      return `${task.tens} ${plural(task.tens, 'desítka', 'desítky', 'desítek')} a ${task.units} ${plural(task.units, 'jednotka', 'jednotky', 'jednotek')}. Jaké je to číslo?`;
    case 'word':
      return task.text;
  }
}
