import { useEffect } from 'react';
import { useRoute } from './router';
import { Home } from './screens/Home';
import { Ladder } from './screens/Ladder';
import { Session } from './screens/Session';
import { Mistakes } from './screens/Mistakes';
import { Timed } from './screens/Timed';
import { Free } from './screens/Free';
import { Sky } from './screens/Sky';
import { Calculator } from './screens/Calculator';
import { Parents } from './screens/Parents';
import { NotFound } from './screens/NotFound';
import { HelpContent } from './screens/Help';
import { AppSettings } from './screens/AppSettings';
import { openReactDialog, openSettingsWithExtra } from './ui/reactDialog';
import { reportActivity } from './state/store';
import { UI_ICONS } from './kit';

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

export function App() {
  const route = useRoute();
  const key = route.join('/');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [key]);

  useEffect(() => {
    reportActivity();
  }, []);

  return (
    <>
      <g92-appbar
        app="matematika"
        help
        ong92-help={() => openReactDialog({ title: 'Jak to funguje', icon: UI_ICONS.help, wide: true, actions: [{ label: 'Rozumím', variant: 'primary' }] }, <HelpContent />)}
        ong92-settings={(e: CustomEvent) => {
          e.preventDefault();
          openSettingsWithExtra(<AppSettings />);
        }}
      />
      <main id="main" className="app-main">
        <Screen route={route} />
      </main>
    </>
  );
}
