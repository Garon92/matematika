import { useEffect, useState } from 'react';

/** Minimal hash router: "#/oblast/add" → ["oblast", "add"]. Works on GitHub Pages without 404 tricks. */
export function parseHash(hash: string = location.hash): string[] {
  return hash.replace(/^#\/?/, '').split('?')[0]!.split('/').filter(Boolean).map(decodeURIComponent);
}

export function useRoute(): string[] {
  const [route, setRoute] = useState(() => parseHash());
  useEffect(() => {
    const on = () => setRoute(parseHash());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

export function navigate(path: string, replace = false): void {
  const hash = `#/${path.replace(/^\/+/, '')}`;
  if (replace) history.replaceState(null, '', hash);
  else if (location.hash !== hash) location.hash = hash;
  if (replace) window.dispatchEvent(new HashChangeEvent('hashchange'));
}

export function href(path: string): string {
  return `#/${path.replace(/^\/+/, '')}`;
}
