import './kit/kit.css';
import './index.css';
import './kit';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

// Old standalone pages (pocitadlo.html, hvezdy.html, hvezdy-pocitadlo.html) are tiny redirects in public/.

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
