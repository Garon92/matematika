/**
 * Several children on one device. Each profile has its own progress, mistakes, stats and daily streak.
 * The first ("main") profile keeps the plain `g92:matematika:*` keys (so existing progress and the menu's
 * daily chips keep working); other profiles live under `g92:matematika@<id>:*`.
 * Switching a profile reloads the page — every store is created for exactly one profile.
 */
// direct module imports (not the kit barrel) keep this file DOM-free and unit-testable
import { getSettings, setSettings } from '../kit/settings';
import { readJSON, safeStorage, writeJSON } from '../kit/storage';

export interface Profile {
  id: string;
  name: string;
  avatar: string;
}

interface ProfilesData {
  list: Profile[];
  active: string;
}

export const MAIN = 'main';
const KEY = 'g92:matematika:profiles';
export const AVATARS = ['⭐', '🦊', '🐻', '🐼', '🐸', '🦄', '🐱', '🐶', '🐰', '🐯', '🦁', '🐙', '🚀', '🌈', '⚽', '🎨'];

function load(): ProfilesData {
  const d = readJSON<Partial<ProfilesData>>(KEY, {});
  const list = Array.isArray(d.list) && d.list.length > 0 ? d.list : [{ id: MAIN, name: '', avatar: '⭐' }];
  if (!list.some((p) => p.id === MAIN)) list.unshift({ id: MAIN, name: '', avatar: '⭐' });
  const active = d.active && list.some((p) => p.id === d.active) ? d.active : MAIN;
  return { list, active };
}

function save(d: ProfilesData): void {
  writeJSON(KEY, d);
}

/** Store namespace of a profile. */
export function appIdOf(id: string): string {
  return id === MAIN ? 'matematika' : `matematika@${id}`;
}

export function activeProfileId(): string {
  return load().active;
}

export function activeAppId(): string {
  return appIdOf(activeProfileId());
}

/** Profiles with display names (the main profile's name is the shared g92 player name). */
export function profiles(): Profile[] {
  const player = getSettings().playerName?.trim() ?? '';
  return load().list.map((p) => (p.id === MAIN ? { ...p, name: player || p.name } : p));
}

export function activeProfile(): Profile {
  const id = activeProfileId();
  return profiles().find((p) => p.id === id) ?? profiles()[0]!;
}

export function switchProfile(id: string): void {
  const d = load();
  if (!d.list.some((p) => p.id === id) || d.active === id) return;
  save({ ...d, active: id });
  location.hash = '#/';
  location.reload();
}

export function addProfile(name: string, avatar: string): Profile {
  const d = load();
  const id = `p${Date.now().toString(36)}`;
  const p: Profile = { id, name: name.trim().slice(0, 24), avatar };
  save({ ...d, list: [...d.list, p] });
  return p;
}

export function updateProfile(id: string, patch: Partial<Omit<Profile, 'id'>>): void {
  if (id === MAIN && patch.name !== undefined) setSettings({ playerName: patch.name.trim().slice(0, 24) });
  const d = load();
  save({ ...d, list: d.list.map((p) => (p.id === id ? { ...p, ...patch, name: (patch.name ?? p.name).trim().slice(0, 24) } : p)) });
}

/** Removes a profile and all of its data (the main profile cannot be removed). */
export function removeProfile(id: string): void {
  if (id === MAIN) return;
  const d = load();
  const prefix = `g92:${appIdOf(id)}:`;
  const keys: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) keys.push(k);
    }
  } catch {
    /* storage blocked */
  }
  keys.forEach((k) => safeStorage.removeItem(k));
  const list = d.list.filter((p) => p.id !== id);
  save({ list, active: d.active === id ? MAIN : d.active });
}
