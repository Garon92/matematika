import './kit/kit.css';
import './index.css';
import './kit';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

// Old standalone pages → new screens (bookmarks keep working).
const legacy: Record<string, string> = {
  'pocitadlo.html': 'trenink',
  'hvezdy.html': 'nebe',
  'hvezdy-pocitadlo.html': 'kalkulacka',
};
const file = location.pathname.split('/').pop() ?? '';
if (legacy[file]) location.replace(`${import.meta.env.BASE_URL}#/${legacy[file]}`);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
