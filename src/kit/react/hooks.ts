/**
 * React 19 hooks for the g92 kit (vendored only into React apps).
 *   const s = useSettings();                     // live global settings (sound, theme, playerName…)
 *   const [best, setBest] = useStoreValue(store, 'best');
 *   const activity = useActivity();              // all apps' activity (menu-style stats)
 *   useAppbarEvent('g92-help', () => setHelpOpen(true));
 */
import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { getActivity, subscribeActivity, type ActivityMap } from '../activity';
import { settings, type G92Settings } from '../settings';
import type { Store } from '../store';

export function useSettings(): Readonly<G92Settings> {
  return useSyncExternalStore(settings.subscribe, settings.snapshot, settings.snapshot);
}

export function useStoreValue<T extends Record<string, unknown>, K extends keyof T>(store: Store<T>, key: K): [T[K], (v: T[K] | ((prev: T[K]) => T[K])) => void] {
  const subscribe = useCallback((cb: () => void) => store.subscribe((k) => k === key && cb()), [store, key]);
  const get = useCallback(() => store.get(key), [store, key]);
  const value = useSyncExternalStore(subscribe, get, get);
  const set = useCallback(
    (v: T[K] | ((prev: T[K]) => T[K])) => {
      if (typeof v === 'function') store.update(key, v as (prev: T[K]) => T[K]);
      else store.set(key, v);
    },
    [store, key],
  );
  return [value, set];
}

let activityCache: ActivityMap = getActivity();
const subscribeActivityCached = (cb: () => void) =>
  subscribeActivity((all) => {
    activityCache = all;
    cb();
  });

export function useActivity(): ActivityMap {
  return useSyncExternalStore(subscribeActivityCached, () => activityCache, () => activityCache);
}

/** Listen to an event of the first <g92-appbar> in the document (g92-help, g92-settings, g92-fullscreen). */
export function useAppbarEvent(name: 'g92-help' | 'g92-settings' | 'g92-fullscreen', handler: (e: CustomEvent) => void): void {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    const fn = (e: Event) => ref.current(e as CustomEvent);
    document.addEventListener(name, fn);
    return () => document.removeEventListener(name, fn);
  }, [name]);
}
