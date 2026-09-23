import type { Op } from './types';

export type Notation = 'school' | 'intl';

/** Czech schools write "·" and ":"; the original app used "×" and "÷". */
export function opSymbol(op: Op, notation: Notation = 'school'): string {
  switch (op) {
    case 'add':
      return '+';
    case 'sub':
      return '−';
    case 'mul':
      return notation === 'school' ? '·' : '×';
    case 'div':
      return notation === 'school' ? ':' : '÷';
  }
}

export function opWord(op: Op): string {
  switch (op) {
    case 'add':
      return 'plus';
    case 'sub':
      return 'mínus';
    case 'mul':
      return 'krát';
    case 'div':
      return 'děleno';
  }
}

export function opName(op: Op): string {
  switch (op) {
    case 'add':
      return 'Sčítání';
    case 'sub':
      return 'Odčítání';
    case 'mul':
      return 'Násobení';
    case 'div':
      return 'Dělení';
  }
}
