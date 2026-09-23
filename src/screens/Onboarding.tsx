import { useState } from 'react';
import { LABELS, setSettings, sfx } from '../kit';
import { START_POINTS, unlockUpTo } from '../lib/progress';
import { sampleIn } from '../lib/levels';
import { store, usePrefs, useSettings } from '../state/store';
import { speak, useTts } from '../state/tts';
import { Mascot } from '../ui/Mascot';
import { Icon } from '../ui/Icon';
import { SwitchRow } from '../ui/Segmented';

export function Onboarding() {
  const prefs = usePrefs();
  const tts = useTts();
  const settings = useSettings();
  const [step, setStep] = useState(0);

  const finish = (startId: string | null) => {
    if (startId) store.update('progress', (p) => unlockUpTo(p, startId));
    store.set('onboarded', true);
    sfx.levelUp();
    window.scrollTo(0, 0);
  };

  return (
    <div className="g92-main g92-main--narrow screen onboarding">
      {step === 0 ? (
        <div className="onboarding__card g92-card">
          <Mascot mood="cheer" size={140} />
          <h1 className="onboarding__title">Ahoj! Já jsem Hvězdička.</h1>
          <p className="g92-muted text-lg">Budeme spolu počítat, sbírat hvězdy a hrát si s čísly.</p>
          <form
            className="flex w-full flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              sfx.pop();
              setStep(1);
              window.scrollTo(0, 0);
            }}
          >
            {tts && (
              <SwitchRow
                id="onb-tts"
                label="🔊 Číst příklady nahlas"
                hint="Pro děti, které ještě nečtou. Dá se změnit v nastavení."
                checked={settings.voice}
                onChange={(v) => {
                  setSettings({ voice: v });
                  if (v) speak('Ahoj! Budu ti číst příklady.');
                }}
              />
            )}
            <button type="submit" className="g92-btn g92-btn--xl g92-btn--block">
              {LABELS.intro} <Icon name="arrowRight" size={26} />
            </button>
          </form>
        </div>
      ) : (
        <div className="onboarding__card g92-card">
          <Mascot mood="happy" size={96} />
          <h1 className="onboarding__title">Co už umíš?</h1>
          <p className="g92-muted">Vyber, kde chceš začít. Později můžeš zkusit cokoli.</p>
          <div className="start-grid">
            {START_POINTS.map((sp) => (
              <button key={sp.id} type="button" className="start-option" onClick={() => finish(sp.id)}>
                <span className="start-option__sample tabular-nums">{sampleIn(sp.sample, prefs.notation)}</span>
                <span className="start-option__title">{sp.title}</span>
              </button>
            ))}
          </div>
          <button type="button" className="g92-btn g92-btn--ghost" onClick={() => finish(null)}>
            Přeskočit
          </button>
        </div>
      )}
    </div>
  );
}
