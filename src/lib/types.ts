export type Op = 'add' | 'sub' | 'mul' | 'div';
export type Rel = '<' | '=' | '>';

/** Left or right side of a comparison: plain number or a small expression. */
export type Operand = { kind: 'num'; value: number } | { kind: 'expr'; op: Op; a: number; b: number };

/** a op b = c, one of the three is hidden. */
export interface ExprTask {
  kind: 'expr';
  op: Op;
  a: number;
  b: number;
  c: number;
  missing: 'a' | 'b' | 'c';
}

/** a : b = q (zbytek r) — two answer fields. */
export interface RemainderTask {
  kind: 'rem';
  a: number;
  b: number;
  q: number;
  r: number;
}

export interface CompareTask {
  kind: 'compare';
  left: Operand;
  right: Operand;
}

/** Count the stars shown. */
export interface CountTask {
  kind: 'count';
  n: number;
  seed: number;
  /** Show stars in ten-frames (for bigger counts) instead of scattered. */
  frames: boolean;
  /** Multiple choice options (sorted) — when absent, numpad input. */
  choices?: number[];
}

/** Number sequence with one gap: 3, 4, _, 6. */
export interface SequenceTask {
  kind: 'seq';
  start: number;
  step: number;
  length: number;
  gap: number;
}

/** Tens and units: 4 desítky a 7 jednotek = ? */
export interface PlaceTask {
  kind: 'place';
  tens: number;
  units: number;
}

export interface WordTask {
  kind: 'word';
  op: Op;
  a: number;
  b: number;
  answer: number;
  /** Czech text of the problem. */
  text: string;
  /** Emoji of the counted item (for the picture). */
  icon: string;
  /** Unit label next to the answer (genitive plural, e.g. "jablek"). */
  unit: string;
  /** Unit forms for the answer: [1, 2–4, 5+]. */
  unitForms: [string, string, string];
}

export type Task = ExprTask | RemainderTask | CompareTask | CountTask | SequenceTask | PlaceTask | WordTask;

/** What the player enters. */
export type Answer = { kind: 'num'; value: number } | { kind: 'rel'; value: Rel } | { kind: 'rem'; q: number; r: number };

export type InputMode = 'numpad' | 'choice' | 'compare' | 'rem';
