import { describe, expect, it } from 'vitest';
import { activeAppId, addProfile, appIdOf, MAIN, profiles, removeProfile, updateProfile } from '../../state/profiles';

describe('child profiles', () => {
  it('the first profile keeps the original namespace', () => {
    expect(appIdOf(MAIN)).toBe('matematika');
    expect(appIdOf('p1')).toBe('matematika@p1');
    expect(activeAppId()).toBe('matematika');
  });
  it('adds, renames and removes children', () => {
    const before = profiles().length;
    const p = addProfile('  Ema  ', '🦊');
    expect(p.name).toBe('Ema');
    expect(profiles()).toHaveLength(before + 1);
    updateProfile(p.id, { name: 'Emička', avatar: '🐱' });
    expect(profiles().find((x) => x.id === p.id)).toMatchObject({ name: 'Emička', avatar: '🐱' });
    removeProfile(p.id);
    expect(profiles()).toHaveLength(before);
    removeProfile(MAIN);
    expect(profiles().some((x) => x.id === MAIN)).toBe(true);
  });
});
