import { setPrefs, usePrefs } from '../state/store';
import { useTts } from '../state/tts';
import { Segmented, SwitchRow } from '../ui/Segmented';

/** App-specific settings (used in the kit settings dialog and on the parents screen). */
export function PrefsForm({ full = false }: { full?: boolean }) {
  const p = usePrefs();
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
            { value: 'school', label: '3 · 4   12 : 3', title: 'Jako ve škole' },
            { value: 'intl', label: '3 × 4   12 ÷ 3' },
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
      <div className="g92-field">
        <span className="g92-label">Předčítání příkladů</span>
        {tts ? (
          <Segmented
            block
            label="Předčítání"
            value={p.tts}
            onChange={(v) => setPrefs({ tts: v })}
            options={[
              { value: 'auto', label: 'Vždy číst' },
              { value: 'button', label: 'Tlačítkem 🔊' },
              { value: 'off', label: 'Vypnuto' },
            ]}
          />
        ) : (
          <p className="g92-hint">Tento prohlížeč nemá český hlas, předčítání proto není k dispozici.</p>
        )}
      </div>
      {full && (
        <>
          <div className="g92-field">
            <span className="g92-label">Příkladů v jednom cvičení</span>
            <Segmented block label="Délka cvičení" value={p.sessionLength} onChange={(v) => setPrefs({ sessionLength: v })} options={[5, 10, 15, 20].map((n) => ({ value: n, label: String(n) }))} />
          </div>
          <div className="g92-field">
            <span className="g92-label">Denní cíl (správně vyřešených)</span>
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

export function AppSettings() {
  return (
    <div className="flex flex-col gap-3 pt-2">
      <p className="g92-eyebrow">Matematika</p>
      <PrefsForm />
      <a
        className="g92-btn g92-btn--soft g92-btn--block"
        href="#/rodice"
        onClick={() => {
          (document.querySelector('dialog[open]') as HTMLDialogElement | null)?.close();
        }}
      >
        Další nastavení a přehled pro rodiče
      </a>
    </div>
  );
}
