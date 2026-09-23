import { useState } from 'react';
import { setSettings, SETTINGS_LABELS } from '../kit';
import { setPrefs, usePrefs, useSettings } from '../state/store';
import { activeProfile, activeProfileId, MAIN, updateProfile } from '../state/profiles';
import { useTts } from '../state/tts';
import { Segmented, SwitchRow } from '../ui/Segmented';

/** App-specific settings (used in the kit settings dialog and on the parents screen). */
export function PrefsForm({ full = false }: { full?: boolean }) {
  const p = usePrefs();
  const settings = useSettings();
  const tts = useTts();
  return (
    <div className="prefs">
      <div className="g92-field">
        <span className="g92-label">Znaménka násobení a dělení</span>
        <Segmented
          block
          label="Znaménka"
          value={p.notation}
          onChange={(v) => setPrefs({ notation: v })}
          options={[
            { value: 'school', label: '· a : (jako ve škole)', title: '3 · 4 a 12 : 3' },
            { value: 'intl', label: '× a ÷', title: '3 × 4 a 12 ÷ 3' },
          ]}
        />
      </div>
      <div className="g92-field">
        <span className="g92-label">Nápověda (hvězdy, číselná osa)</span>
        <Segmented
          block
          label="Nápověda"
          value={p.hints}
          onChange={(v) => setPrefs({ hints: v })}
          options={[
            { value: 'auto', label: 'Sama po 2 chybách' },
            { value: 'button', label: 'Jen tlačítkem' },
            { value: 'off', label: 'Vypnutá' },
          ]}
        />
      </div>
      {full && (
        <>
          {/* the kit settings dialog has this switch itself (showVoice); the parents page repeats it */}
          <SwitchRow
            id="prefs-voice"
            label={SETTINGS_LABELS.voice}
            hint={tts ? 'Příklady se samy čtou nahlas. Tlačítko 🔊 přečte příklad vždy.' : 'Tento prohlížeč nemá český hlas, předčítání proto není k dispozici.'}
            checked={settings.voice}
            onChange={(v) => setSettings({ voice: v })}
          />
          <div className="g92-field">
            <span className="g92-label">Příkladů v jednom cvičení</span>
            <Segmented block label="Délka cvičení" value={p.sessionLength} onChange={(v) => setPrefs({ sessionLength: v })} options={[5, 10, 15, 20].map((n) => ({ value: n, label: String(n) }))} />
          </div>
          <div className="g92-field">
            <span className="g92-label">Denní cíl (příkladů za den)</span>
            <Segmented block label="Denní cíl" value={p.dailyGoal} onChange={(v) => setPrefs({ dailyGoal: v })} options={[10, 20, 30, 50].map((n) => ({ value: n, label: String(n) }))} />
          </div>
          <div className="g92-field">
            <span className="g92-label">Číselná klávesnice</span>
            <Segmented
              block
              label="Rozložení klávesnice"
              value={p.numpad}
              onChange={(v) => setPrefs({ numpad: v })}
              options={[
                { value: 'phone', label: '1 2 3 nahoře (telefon)' },
                { value: 'calc', label: '7 8 9 nahoře (kalkulačka)' },
              ]}
            />
          </div>
          <SwitchRow id="unlock-all" label="Odemknout všechny úrovně" hint="Dítě může hrát cokoli bez postupného odemykání." checked={p.unlockAll} onChange={(v) => setPrefs({ unlockAll: v })} />
        </>
      )}
    </div>
  );
}

/** Name of the active child when it isn't the main profile (the kit dialog then hides its family-name row). */
function ProfileNameField() {
  const id = activeProfileId();
  const [name, setName] = useState(() => activeProfile().name);
  if (id === MAIN) return null;
  return (
    <label className="g92-field">
      <span className="g92-label">{SETTINGS_LABELS.name}</span>
      <input
        className="g92-input"
        value={name}
        maxLength={24}
        autoComplete="off"
        onChange={(e) => {
          setName(e.target.value);
          updateProfile(id, { name: e.target.value });
        }}
      />
      <span className="g92-hint">Platí pro dítě, které právě hraje. Ostatní děti upravíte v části Pro rodiče.</span>
    </label>
  );
}

/** Matematika's part of the kit settings dialog (registered once with setSettingsSection in App). */
export function AppSettings() {
  return (
    <div className="flex flex-col gap-3 pt-2">
      <p className="g92-eyebrow">Matematika</p>
      <ProfileNameField />
      <PrefsForm />
    </div>
  );
}
