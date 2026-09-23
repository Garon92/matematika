import { navigate } from '../router';
import { Icon } from '../ui/Icon';

export function ScreenHeader({ title, back = '', children, subtitle }: { title: string; back?: string; children?: React.ReactNode; subtitle?: React.ReactNode }) {
  return (
    <header className="screen-header">
      <button type="button" className="g92-btn g92-btn--ghost g92-btn--icon" onClick={() => navigate(back)} aria-label="Zpět">
        <Icon name="back" size={24} />
      </button>
      <div className="min-w-0 flex-1">
        <h1 className="screen-header__title">{title}</h1>
        {subtitle && <p className="screen-header__sub">{subtitle}</p>}
      </div>
      {children}
    </header>
  );
}
