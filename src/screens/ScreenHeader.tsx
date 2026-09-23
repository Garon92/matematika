import { navigate } from '../router';
import { Icon } from '../ui/Icon';

/**
 * Screen title with the in-app "up" button. It uses a house + "Domů" (or "Zpět" for deeper screens) so it can't be
 * mistaken for the appbar's "Menu" back arrow, which leaves Matematika.
 */
export function ScreenHeader({ title, back = '', children, subtitle }: { title: string; back?: string; children?: React.ReactNode; subtitle?: React.ReactNode }) {
  const home = back === '';
  return (
    <header className="screen-header">
      <button type="button" className="g92-btn g92-btn--soft screen-header__up" onClick={() => navigate(back)} aria-label={home ? 'Domů' : 'Zpět'}>
        <Icon name={home ? 'home' : 'back'} size={22} />
        <span className="screen-header__up-label">{home ? 'Domů' : 'Zpět'}</span>
      </button>
      <div className="min-w-0 flex-1">
        <h1 className="screen-header__title">{title}</h1>
        {subtitle && <p className="screen-header__sub">{subtitle}</p>}
      </div>
      {children}
    </header>
  );
}
