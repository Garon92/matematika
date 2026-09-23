/** Czech text-to-speech via the Web Speech API — only offered when a Czech voice exists. */
import { useEffect, useState } from 'react';

function synth(): SpeechSynthesis | null {
  return typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
}

function czechVoice(): SpeechSynthesisVoice | null {
  const s = synth();
  if (!s) return null;
  const voices = s.getVoices();
  return voices.find((v) => v.lang === 'cs-CZ' && v.localService) ?? voices.find((v) => v.lang.toLowerCase().startsWith('cs')) ?? null;
}

export function ttsAvailable(): boolean {
  return czechVoice() !== null;
}

export function speak(text: string): void {
  const s = synth();
  const voice = czechVoice();
  if (!s || !voice) return;
  try {
    s.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/·/g, ' krát ').replace(/ : /g, ' děleno ').replace(/−/g, ' mínus '));
    u.voice = voice;
    u.lang = voice.lang;
    u.rate = 0.9;
    u.pitch = 1.05;
    s.speak(u);
  } catch {
    /* ignore */
  }
}

export function stopSpeaking(): void {
  try {
    synth()?.cancel();
  } catch {
    /* ignore */
  }
}

/** True once a Czech voice is available (voices load asynchronously). */
export function useTts(): boolean {
  const [ok, setOk] = useState(ttsAvailable);
  useEffect(() => {
    const s = synth();
    if (!s) return;
    const update = () => setOk(ttsAvailable());
    update();
    s.addEventListener?.('voiceschanged', update);
    const t = window.setTimeout(update, 1200);
    return () => {
      s.removeEventListener?.('voiceschanged', update);
      window.clearTimeout(t);
    };
  }, []);
  return ok;
}
