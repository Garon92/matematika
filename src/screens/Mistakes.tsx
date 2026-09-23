import { allCards, dueCards, INTERVALS, MAX_BOX } from '../lib/srs';
import { questionText, solvedText } from '../lib/format';
import { levelById } from '../lib/levels';
import { plural } from '../lib/czech';
import { store, today, usePrefs, useStore } from '../state/store';
import { confirmDialog } from '../kit';
import { navigate } from '../router';
import { Icon } from '../ui/Icon';
import { Mascot } from '../ui/Mascot';
import { ScreenHeader } from './ScreenHeader';

function dueLabel(due: number, t: number): string {
  const d = due - t;
  if (d <= 0) return 'dnes';
  if (d === 1) return 'zítra';
  return `za ${d} ${plural(d, 'den', 'dny', 'dní')}`;
}

export function Mistakes() {
  const deck = useStore('deck');
  const prefs = usePrefs();
  const t = today();
  const due = dueCards(deck, t);
  const cards = allCards(deck);

  return (
    <div className="g92-main g92-main--narrow screen">
      <ScreenHeader title="Chyby k procvičení" subtitle={`Naučeno celkem: ${deck.mastered}`} />

      {due.length > 0 ? (
        <div className="g92-card mistakes-hero">
          <Mascot mood="happy" size={88} />
          <div className="min-w-0 flex-1">
            <p className="text-2xl font-black">
              Čeká {due.length} {plural(due.length, 'příklad', 'příklady', 'příkladů')}
            </p>
            <p className="g92-muted">Příklady, které minule nevyšly. Když je dáš správně, vrátí se později – až je budeš umět nazpaměť.</p>
          </div>
          <button type="button" className="g92-btn g92-btn--xl" onClick={() => navigate('chyby/hrat')} autoFocus>
            <Icon name="play" size={26} /> Procvičit
          </button>
        </div>
      ) : (
        <div className="g92-empty">
          <Mascot mood="cheer" size={120} />
          <p className="text-2xl font-black">{cards.length > 0 ? 'Dnes nic nečeká' : 'Zatím žádné chyby'}</p>
          <p className="g92-muted">{cards.length > 0 ? 'Další opakování přijde v příštích dnech.' : 'Když se ti nějaký příklad nepovede, objeví se tady.'}</p>
        </div>
      )}

      {cards.length > 0 && (
        <section aria-labelledby="h-cards">
          <h2 id="h-cards" className="section-title">
            Všechny příklady ({cards.length})
          </h2>
          <ul className="mistake-list">
            {cards.map((c) => {
              const lvl = c.level ? levelById(c.level) : undefined;
              return (
                <li key={c.key} className={`mistake ${c.due <= t ? 'is-due' : ''}`}>
                  <div className="min-w-0 flex-1">
                    <p className="mistake__q tabular-nums">{c.due <= t ? questionText(c.task, prefs.notation) : solvedText(c.task, prefs.notation)}</p>
                    <p className="mistake__meta">
                      {lvl ? lvl.title : 'Závod / trénink'} · chyb: {c.wrongs} · {dueLabel(c.due, t)}
                    </p>
                  </div>
                  <span className="box-dots" role="img" aria-label={`Krabička ${c.box} z ${MAX_BOX}`}>
                    {Array.from({ length: MAX_BOX }, (_, i) => (
                      <span key={i} className={i < c.box ? 'is-on' : ''} />
                    ))}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="g92-card text-sm">
        <h2 className="mb-2 text-base font-black">Jak to funguje?</h2>
        <p className="g92-muted">
          Každý chybný příklad jde do první krabičky a přijde na řadu ještě dnes. Po správné odpovědi se posune do další krabičky a vrátí se za{' '}
          {INTERVALS[2]} den, pak za {INTERVALS[3]} dny a za {INTERVALS[4]} dní. Po čtvrté krabičce je naučený. Nová chyba ho vrátí na začátek.
        </p>
        {cards.length > 0 && (
          <button
            type="button"
            className="g92-btn g92-btn--ghost g92-btn--sm mt-3"
            onClick={async () => {
              if (await confirmDialog({ title: 'Smazat všechny chyby?', message: 'Seznam chyb k procvičení se vyprázdní.', confirmLabel: 'Smazat', danger: true }))
                store.set('deck', { cards: {}, mastered: deck.mastered });
            }}
          >
            <Icon name="trash" size={18} /> Vyprázdnit seznam
          </button>
        )}
      </section>
    </div>
  );
}
