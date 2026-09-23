import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { useRoute } from './router';
import { Home } from './screens/Home';
import { Ladder } from './screens/Ladder';
import { Session } from './screens/Session';
import { NotFound } from './screens/NotFound';
import { AppSettings } from './screens/AppSettings';
import { ErrorBoundary } from './ui/ErrorBoundary';
import { iconSvg } from './ui/Icon';
import { reportActivity } from './state/store';
import { appTitle, clearConfetti, setHelp, setSettingsSection } from './kit';
import { activeProfileId, MAIN } from './state/profiles';
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

/** Family title format (kit appTitle): "Matematika – Počítání hrou", pages "Sčítání · Matematika – Počítání hrou". */
function titleFor([a, b]: string[]): string {
  if (!a) return appTitle('matematika');
  const part = a === 'oblast' ? areaById(b ?? '')?.title : a === 'uroven' ? levelById(b ?? '')?.title : TITLES[a];
  return appTitle('matematika', part);
}

/** React content for the kit settings dialog; unmounted when that dialog closes. */
function reactSection(node: ReactNode): HTMLElement {
  const host = document.createElement('div');
  host.className = 'g92-react-host';
  const root = createRoot(host);
  root.render(node);
  const onClose = (e: Event) => {
    const dialog = (e as CustomEvent<{ dialog?: HTMLDialogElement }>).detail?.dialog;
    if (dialog && !dialog.contains(host)) return;
    document.removeEventListener('g92-dialog-close', onClose);
    window.setTimeout(() => root.unmount(), 400);
  };
  document.addEventListener('g92-dialog-close', onClose);
  return host;
}

/** ⚙ always opens the kit dialog with Matematika's section (kit v0.7 C-11); profiles manage names themselves. */
function registerSettings() {
  return setSettingsSection({
    extra: () => reactSection(<AppSettings />),
    // the family name belongs to the first child; other children edit their own name in the section
    nameMode: activeProfileId() === MAIN ? 'auto' : 'hidden',
    showVoice: true,
    more: { href: '#/rodice' },
  });
}

/** Pictogram help for the appbar "?" (kit help dialog). */
function registerHelp() {
  return setHelp({
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
      { keys: ['N'], text: 'nápověda k příkladu' },
      { keys: ['R'], text: 'přečíst příklad' },
      { keys: ['<', '=', '>'], text: 'porovnání' },
      { keys: ['Esc'], text: 'ukončit hru' },
      { keys: ['P', 'Esc'], text: 'pauza v závodě' },
      { keys: ['M'], text: 'zvuk zapnout / vypnout' },
      { keys: ['?'], text: 'tato nápověda' },
    ],
  });
}

export function App() {
  const route = useRoute();
  const key = route.join('/');

  useEffect(() => {
    window.scrollTo(0, 0);
    clearConfetti(); // celebration of the previous screen must not rain over the next task
    document.title = titleFor(route);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    reportActivity();
    const offHelp = registerHelp();
    const offSettings = registerSettings();
    return () => {
      offHelp();
      offSettings();
    };
  }, []);

  return (
    <>
      <g92-appbar app="matematika" help keys />
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
