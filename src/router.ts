import { useEffect, useState } from 'react';

/** Minimal hash router: "#/oblast/add" → ["oblast", "add"]. Works on GitHub Pages without 404 tricks. */
export function parseHash(hash: string = location.hash): string[] {
  return hash.replace(/^#\/?/, '').split('?')[0]!.split('/').filter(Boolean).map(decodeURIComponent);
}

/**
 * Route guard for a running session: the browser / Android Back (or any hash change the app didn't make
 * itself) first asks `fn`. Return true to allow, false (or a Promise of it) to stay.
 * The kit's leave guard (nav.ts) covers the appbar "Menu" and page unloads; this covers in-app history.
 */
type RouteGuard = (toHash: string) => boolean | Promise<boolean>;
let guard: { fn: RouteGuard; hash: string; asking: boolean } | null = null;
let bypass = false;

export function guardRoute(fn: RouteGuard): () => void {
  const entry = { fn, hash: location.hash, asking: false };
  guard = entry;
  return () => {
    if (guard === entry) guard = null;
  };
}

function replaceHash(hash: string): void {
  // keep history.state: the kit marks the landing entry ("came from the menu") there
  history.replaceState(history.state, '', hash);
}

/**
 * Undo a navigation away from `hash` without rewriting history: Back is undone with a step forward (the
 * guarded entry is still there). Resolves how it was held, so "leave anyway" can redo it the same way.
 */
function hold(hash: string): Promise<'forward' | 'replace'> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (how: 'forward' | 'replace') => {
      if (done) return;
      done = true;
      window.removeEventListener('hashchange', onChange);
      resolve(how);
    };
    const onChange = () => {
      if (location.hash === hash) finish('forward');
    };
    window.addEventListener('hashchange', onChange);
    history.go(1);
    // no forward entry (a link / typed URL replaced the future) → put the URL back in place
    window.setTimeout(() => {
      if (done) return;
      replaceHash(hash);
      finish('replace');
    }, 250);
  });
}

export function useRoute(): string[] {
  const [route, setRoute] = useState(() => parseHash());
  useEffect(() => {
    const on = () => {
      const g = guard;
      if (bypass || !g || location.hash === g.hash) {
        bypass = false;
        setRoute(parseHash());
        return;
      }
      const to = location.hash;
      if (g.asking) {
        void hold(g.hash); // already asking (Back pressed twice) → no second dialog
        return;
      }
      const res = g.fn(to);
      if (res === true) {
        setRoute(parseHash());
        return;
      }
      g.asking = true;
      const held = hold(g.hash);
      void Promise.all([Promise.resolve(res), held]).then(([ok, how]) => {
        g.asking = false;
        if (!ok || guard !== g) return;
        if (how === 'forward') {
          bypass = true;
          history.back();
        } else {
          replaceHash(to);
          setRoute(parseHash());
        }
      });
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

/** In-app navigation (never guarded — screens ask before calling it themselves). */
export function navigate(path: string, replace = false): void {
  const hash = `#/${path.replace(/^\/+/, '')}`;
  if (replace) {
    replaceHash(hash);
    bypass = true;
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else if (location.hash !== hash) {
    bypass = true;
    location.hash = hash;
  }
}

export function href(path: string): string {
  return `#/${path.replace(/^\/+/, '')}`;
}
