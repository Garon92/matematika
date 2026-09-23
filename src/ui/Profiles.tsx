import { useState, useSyncExternalStore } from 'react';
import { confirmDialog, sfx, toast } from '../kit';
import { activeProfileId, addProfile, AVATARS, MAIN, profiles, profilesVersion, removeProfile, subscribeProfiles, switchProfile, updateProfile, type Profile } from '../state/profiles';
import { useSettings } from '../state/store';
import { openReactDialog } from '../kit/react/dialog';
import { Icon } from './Icon';

function displayName(p: Profile): string {
  return p.name || (p.id === MAIN ? 'Hráč' : 'Bez jména');
}

/** Big "Kdo bude počítat?" picker for children. */
export function openProfilePicker(): void {
  openReactDialog({ title: 'Kdo bude počítat?', wide: true }, (close) => <Picker close={close} />);
}

function Picker({ close }: { close: () => void }) {
  const list = profiles();
  const active = activeProfileId();
  return (
    <div className="profile-picker">
      {list.map((p) => (
        <button
          key={p.id}
          type="button"
          className={`profile-card ${p.id === active ? 'is-active' : ''}`}
          onClick={() => {
            sfx.pop();
            if (p.id === active) close();
            else switchProfile(p.id);
          }}
        >
          <span className="profile-card__avatar" aria-hidden="true">
            {p.avatar}
          </span>
          <span className="profile-card__name">{displayName(p)}</span>
          {p.id === active && <span className="g92-badge g92-badge--success">teď hraje</span>}
        </button>
      ))}
    </div>
  );
}

/** Re-render when a profile (or the family name of the main profile) changes. */
export function useProfiles(): void {
  useSettings();
  useSyncExternalStore(subscribeProfiles, profilesVersion);
}

/** Small chip on Home: avatar + name → picker (only when there is more than one child). */
export function ProfileChip() {
  useProfiles();
  const list = profiles();
  if (list.length < 2) return null;
  const p = list.find((x) => x.id === activeProfileId()) ?? list[0]!;
  return (
    <button type="button" className="profile-chip" onClick={openProfilePicker} aria-label={`Hraje ${displayName(p)} – změnit`}>
      <span className="profile-chip__avatar" aria-hidden="true">
        {p.avatar}
      </span>
      <span className="profile-chip__name">{displayName(p)}</span>
      <Icon name="users" size={18} />
    </button>
  );
}

function AvatarPicker({ value, onChange }: { value: string; onChange: (a: string) => void }) {
  return (
    <div className="avatar-grid" role="radiogroup" aria-label="Obrázek">
      {AVATARS.map((a) => (
        <button key={a} type="button" role="radio" aria-checked={a === value} className={`avatar-opt ${a === value ? 'is-active' : ''}`} onClick={() => onChange(a)}>
          {a}
        </button>
      ))}
    </div>
  );
}

function ProfileEditor({ initial, onSave, onCancel }: { initial?: Profile; onSave: (name: string, avatar: string) => void; onCancel: () => void }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [avatar, setAvatar] = useState(initial?.avatar ?? AVATARS[1]!);
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(name, avatar);
      }}
    >
      <label className="g92-field">
        <span className="g92-label">Jméno</span>
        <input className="g92-input" value={name} onChange={(e) => setName(e.target.value)} maxLength={24} autoComplete="off" autoFocus placeholder="Např. Ema" />
      </label>
      <span className="g92-label">Obrázek</span>
      <AvatarPicker value={avatar} onChange={setAvatar} />
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" className="g92-btn g92-btn--ghost" onClick={onCancel}>
          Zrušit
        </button>
        <button type="submit" className="g92-btn">
          Uložit
        </button>
      </div>
    </form>
  );
}

/** Parents screen: manage children profiles. */
export function ProfilesManager() {
  useProfiles();
  const [, force] = useState(0);
  const refresh = () => force((x) => x + 1);
  const list = profiles();
  const active = activeProfileId();

  const edit = (p?: Profile) =>
    openReactDialog({ title: p ? 'Upravit dítě' : 'Přidat dítě' }, (close) => (
      <ProfileEditor
        initial={p}
        onCancel={() => close()}
        onSave={(name, avatar) => {
          if (p) updateProfile(p.id, { name, avatar });
          else {
            addProfile(name, avatar);
            toast(`Přidáno: ${name || 'nové dítě'}. Přepnout můžete na úvodní obrazovce.`, { variant: 'success' });
          }
          close();
          refresh();
        }}
      />
    ));

  return (
    <div className="flex flex-col gap-3">
      <ul className="profile-list">
        {list.map((p) => (
          <li key={p.id}>
            <span className="profile-card__avatar profile-card__avatar--sm" aria-hidden="true">
              {p.avatar}
            </span>
            <span className="min-w-0 flex-1">
              <b>{displayName(p)}</b>
              {p.id === active && <span className="g92-badge g92-badge--success ml-2">právě hraje</span>}
            </span>
            {p.id !== active && (
              <button type="button" className="g92-btn g92-btn--soft g92-btn--sm" onClick={() => switchProfile(p.id)}>
                Přepnout
              </button>
            )}
            <button type="button" className="g92-btn g92-btn--ghost g92-btn--sm" onClick={() => edit(p)} aria-label={`Upravit ${displayName(p)}`}>
              Upravit
            </button>
            {p.id !== MAIN && (
              <button
                type="button"
                className="g92-btn g92-btn--ghost g92-btn--sm g92-btn--icon"
                aria-label={`Smazat ${displayName(p)}`}
                onClick={async () => {
                  const ok = await confirmDialog({
                    title: `Smazat ${displayName(p)}?`,
                    message: 'Smaže se i všechen postup tohoto dítěte. Nejde to vrátit.',
                    confirmLabel: 'Smazat',
                    danger: true,
                  });
                  if (ok) {
                    const wasActive = p.id === active;
                    removeProfile(p.id);
                    if (wasActive) location.reload();
                    else refresh();
                  }
                }}
              >
                <Icon name="trash" size={18} />
              </button>
            )}
          </li>
        ))}
      </ul>
      <button type="button" className="g92-btn g92-btn--secondary self-start" onClick={() => edit()} disabled={list.length >= 8}>
        <Icon name="plus" size={20} /> Přidat dítě
      </button>
      <p className="g92-hint">Každé dítě má svoje hvězdy, chyby k procvičení, statistiky i sérii dní. Přepíná se na úvodní obrazovce.</p>
    </div>
  );
}
