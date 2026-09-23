import { Icon, type IconName } from '../ui/Icon';
import { Mascot } from '../ui/Mascot';

const ITEMS: { icon: IconName | 'star-emoji'; title: string; text: string }[] = [
  { icon: 'play', title: 'Hrát', text: 'Velké tlačítko na začátku tě vždycky pustí tam, kde má smysl pokračovat.' },
  { icon: 'check', title: 'Odpověď', text: 'Napiš číslo na klávesnici a zmáčkni zelenou fajfku (nebo Enter).' },
  { icon: 'bulb', title: 'Nápověda', text: 'Žárovka ukáže hvězdičky v rámečcích, číselnou osu nebo řady. Po dvou chybách se ukáže sama.' },
  { icon: 'speaker', title: 'Předčítání', text: 'Reproduktor přečte příklad nahlas (když má zařízení český hlas).' },
  { icon: 'star', title: 'Hvězdy', text: '3 hvězdy = skoro všechno správně napoprvé, 2 hvězdy = většina, 1 hvězda = polovina. Hvězda odemkne další úroveň.' },
  { icon: 'flame', title: 'Série dní', text: 'Každý den, kdy dokončíš aspoň jedno cvičení, prodlouží plamínek.' },
  { icon: 'repeat', title: 'Chyby k procvičení', text: 'Co se nepovedlo, vrátí se znovu – dnes, zítra, za 3 a za 7 dní, dokud to neumíš.' },
  { icon: 'sky', title: 'Hvězdné nebe', text: 'Přidávej hvězdy tlačítky + a −, kolečkem myši nebo tažením prstem nahoru a dolů. Rámečky pomáhají počítat po pěti a po deseti.' },
];

export function HelpContent() {
  return (
    <div className="help">
      <div className="help__intro">
        <Mascot mood="happy" size={64} />
        <p>Ahoj! S Hvězdičkou se naučíš počítat krok za krokem. Tady je, co všechno umí:</p>
      </div>
      <ul className="help__list">
        {ITEMS.map((it) => (
          <li key={it.title}>
            <span className="help__icon">{<Icon name={it.icon as IconName} size={24} />}</span>
            <span>
              <b>{it.title}</b>
              <br />
              {it.text}
            </span>
          </li>
        ))}
      </ul>
      <p className="help__keys">
        Klávesnice: <kbd className="g92-kbd">0</kbd>–<kbd className="g92-kbd">9</kbd> číslo, <kbd className="g92-kbd">Enter</kbd> zkontrolovat,{' '}
        <kbd className="g92-kbd">⌫</kbd> smazat, <kbd className="g92-kbd">N</kbd> nápověda, <kbd className="g92-kbd">P</kbd> přečíst, <kbd className="g92-kbd">&lt;</kbd>{' '}
        <kbd className="g92-kbd">=</kbd> <kbd className="g92-kbd">&gt;</kbd> porovnání, <kbd className="g92-kbd">Esc</kbd> konec.
      </p>
    </div>
  );
}
