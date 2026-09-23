import { useState } from 'react';
import { setSettings, sfx } from '../kit';
import { START_POINTS, unlockUpTo } from '../lib/progress';
import { sampleIn } from '../lib/levels';
import { store, usePrefs, useSettings } from '../state/store';
import { Mascot } from '../ui/Mascot';
import { Icon } from '../ui/Icon';

export function Onboarding() {
  const settings = useSettings();
  const prefs = usePrefs();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(settings.playerName ?? '');

  const finish = (startId: string | null) => {
    if (startId) store.update('progress', (p) => unlockUpTo(p, startId));
    store.set('onboarded', true);
    sfx.levelUp();
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
              const n = name.trim();
              if (n !== (settings.playerName ?? '')) setSettings({ playerName: n });
              sfx.pop();
              setStep(1);
            }}
          >
            <label className="g92-field">
              <span className="g92-label">Jak se jmenuješ? (nemusíš vyplňovat)</span>
              <input className="g92-input g92-input--xl text-center" value={name} onChange={(e) => setName(e.target.value)} maxLength={24} autoComplete="off" placeholder="Jméno" />
            </label>
            <button type="submit" className="g92-btn g92-btn--xl g92-btn--block">
              Dál <Icon name="arrowRight" size={26} />
            </button>
          </form>
        </div>
      ) : (
        <div className="onboarding__card g92-card">
          <Mascot mood="think" size={96} />
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
