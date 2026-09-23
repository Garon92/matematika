import { tone } from '../kit';
import { numberToWords } from '../lib/czech';
import { store } from '../state/store';
import { speak, ttsAvailable } from '../state/tts';

// C major pentatonic, climbing with every counted star
const STEPS = [0, 2, 4, 7, 9];

/** Feedback for tap-to-count: a rising note, and the number read aloud when the child wants reading. */
export function countFeedback(k: number): void {
  if (k <= 0) return;
  const octave = Math.floor((k - 1) / STEPS.length);
  const semi = STEPS[(k - 1) % STEPS.length]! + 12 * Math.min(octave, 3);
  tone({ freq: 523.25 * 2 ** (semi / 12), dur: 0.14, type: 'triangle', gain: 0.5 });
  if (store.get('prefs').tts === 'auto' && ttsAvailable()) speak(numberToWords(k));
}
