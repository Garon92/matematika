import { lazy, Suspense, useEffect } from 'react';
import { useRoute } from './router';
import { Home } from './screens/Home';
import { Ladder } from './screens/Ladder';
import { Session } from './screens/Session';
import { NotFound } from './screens/NotFound';
import { AppSettings } from './screens/AppSettings';
import { openReactSettingsDialog } from './kit/react/dialog';
import { ErrorBoundary } from './ui/ErrorBoundary';
import { iconSvg } from './ui/Icon';
import { reportActivity } from './state/store';
import { setHelp } from './kit';
import { areaById, levelById } from './lib/levels';

// less frequent screens are loaded on demand
const Mistakes = lazy(() => import('./screens/Mistakes').then((m) => ({ default: m.Mistakes })));
const Timed = lazy(() => import('./screens/Timed').then((m) => ({ default: m.Timed })));
const Free = lazy(() => import('./screens/Free').then((m) => ({ default: m.Free })));
const Sky = lazy(() => import('./screens/Sky').then((m) => ({ default: m.Sky })));
const Calculator = lazy(() => import('./screens/Calculator').then((m) => ({ default: m.Calculator })));
const Parents = lazy(() => import('./screens/Parents').then((m) => ({ default: m.Parents })));

function Screen({ route }: { route: string[] }) {
  const [a, b] = route;
  switch (a) {
    case undefined:
      return <Home />;
    case 'oblast':
      return <Ladder areaId={b ?? ''} />;
    case 'uroven':
      return <Session key={b} source={{ kind: 'level', levelId: b ?? '' }} />;
    case 'chyby':
      return b === 'hrat' ? <Session key="mistakes" source={{ kind: 'mistakes' }} /> : <Mistakes />;
    case 'vyzva':
      return <Session key="daily" source={{ kind: 'daily' }} />;
    case 'zavod':
      return <Timed key={b ?? 'menu'} id={b ?? null} />;
    case 'trenink':
      return <Free />;
    case 'nebe':
      return <Sky />;
    case 'kalkulacka':
      return <Calculator />;
    case 'rodice':
      return <Parents />;
    default:
      return <NotFound />;
  }
}

const TITLES: Record<string, string> = {
  chyby: 'Chyby k procvičení',
  vyzva: 'Výzva dne',
  zavod: 'Závod s časem',
  trenink: 'Volný trénink',
  nebe: 'Hvězdné nebe',
  kalkulacka: 'Hvězdná kalkulačka',
  rodice: 'Pro rodiče',
};

function titleFor([a, b]: string[]): string {
  if (!a) return 'Matematika – počítání s Hvězdičkou';
  const part = a === 'oblast' ? areaById(b ?? '')?.title : a === 'uroven' ? levelById(b ?? '')?.title : TITLES[a];
  return part ? `${part} – Matematika` : 'Matematika';
}

/** Pictogram help for the appbar "?" (kit help dialog). */
function registerHelp() {
  return setHelp({
    title: 'Jak na to',
    intro: 'S Hvězdičkou se naučíš počítat krok za krokem. Vyber si oblast, sbírej hvězdy a odemykej další úrovně.',
    howTo: [
      { icon: iconSvg('play'), text: 'Velké tlačítko Hrát tě pustí tam, kde má smysl pokračovat.' },
      { icon: iconSvg('check'), text: 'Napiš číslo na klávesnici a zmáčkni zelenou fajfku.' },
      { icon: iconSvg('bulb'), text: 'Žárovka ukáže hvězdičky v rámečcích nebo číselnou osu. Po dvou chybách se ukáže sama.' },
      { icon: iconSvg('speaker'), text: 'Reproduktor přečte příklad nahlas (když má zařízení český hlas).' },
      { icon: iconSvg('star'), text: '3 hvězdy = skoro vše správně napoprvé. Hvězda odemkne další úroveň.' },
      { icon: iconSvg('flame'), text: 'Počítej každý den – roste série dní a plní se denní cíl.' },
      { icon: iconSvg('repeat'), text: 'Co se nepovedlo, vrátí se v Chybách k procvičení – dnes, zítra, za 3 a za 7 dní.' },
      { icon: iconSvg('sky'), text: 'Na Hvězdném nebi přidávej hvězdy tlačítky, kolečkem nebo tažením prstem.' },
    ],
    keys: [
      { keys: ['0', '…', '9'], text: 'napsat číslo' },
      { keys: ['Enter'], text: 'zkontrolovat' },
      { keys: ['⌫'], text: 'smazat' },
      { keys: ['N'], text: 'nápověda' },
      { keys: ['P'], text: 'přečíst příklad' },
      { keys: ['<', '=', '>'], text: 'porovnání' },
      { keys: ['Esc'], text: 'ukončit / pauza' },
    ],
  });
}

export function App() {
  const route = useRoute();
  const key = route.join('/');

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = titleFor(route);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    reportActivity();
    return registerHelp();
  }, []);

  return (
    <>
      <g92-appbar
        app="matematika"
        help
        ong92-settings={(e: CustomEvent) => {
          e.preventDefault();
          openReactSettingsDialog(<AppSettings />);
        }}
      />
      <main id="main" className="app-main">
        <ErrorBoundary resetKey={key}>
          <Suspense fallback={<div className="screen-loading" aria-busy="true" />}>
            <Screen route={route} />
          </Suspense>
        </ErrorBoundary>
      </main>
    </>
  );
}
