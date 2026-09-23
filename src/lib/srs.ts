/** "Chyby k procvičení" — a small Leitner system for mistakes. */
import type { Task } from './types';
import { taskKey } from './math';

export interface MistakeCard {
  key: string;
  task: Task;
  /** Level where the mistake happened (null = free training / timed). */
  level: string | null;
  /** 1–4; after a correct answer in box 4 the card is mastered and removed. */
  box: number;
  /** Day index when the card is due again. */
  due: number;
  wrongs: number;
  added: number;
}

export interface MistakeDeck {
  cards: Record<string, MistakeCard>;
  mastered: number;
}

/** Days until the next review, by box. */
export const INTERVALS: Record<number, number> = { 1: 0, 2: 1, 3: 3, 4: 7 };
export const MAX_BOX = 4;

export const emptyDeck = (): MistakeDeck => ({ cards: {}, mastered: 0 });

export function recordWrong(deck: MistakeDeck, task: Task, level: string | null, today: number): MistakeDeck {
  const key = taskKey(task);
  const prev = deck.cards[key];
  const card: MistakeCard = {
    key,
    task,
    level: level ?? prev?.level ?? null,
    box: 1,
    due: today,
    wrongs: (prev?.wrongs ?? 0) + 1,
    added: prev?.added ?? today,
  };
  return { ...deck, cards: { ...deck.cards, [key]: card } };
}

/** A correct answer promotes the card (only when it is due — early answers don't count twice). */
export function recordRight(deck: MistakeDeck, key: string, today: number): MistakeDeck {
  const card = deck.cards[key];
  if (!card || card.due > today) return deck;
  if (card.box >= MAX_BOX) {
    const { [key]: _removed, ...rest } = deck.cards;
    void _removed;
    return { cards: rest, mastered: deck.mastered + 1 };
  }
  const box = card.box + 1;
  return { ...deck, cards: { ...deck.cards, [key]: { ...card, box, due: today + (INTERVALS[box] ?? 1) } } };
}

export function dueCards(deck: MistakeDeck, today: number): MistakeCard[] {
  return Object.values(deck.cards)
    .filter((c) => c.due <= today)
    .sort((a, b) => a.due - b.due || a.box - b.box || b.wrongs - a.wrongs);
}

export function allCards(deck: MistakeDeck): MistakeCard[] {
  return Object.values(deck.cards).sort((a, b) => b.wrongs - a.wrongs || a.box - b.box);
}

/** Days until the next card becomes due (0 = something is due now, null = deck empty). */
export function nextDueIn(deck: MistakeDeck, today: number): number | null {
  const cards = Object.values(deck.cards);
  if (cards.length === 0) return null;
  return Math.max(0, Math.min(...cards.map((c) => c.due)) - today);
}
