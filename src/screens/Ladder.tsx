import { areaById, levelsOf, sampleIn, type AreaId } from '../lib/levels';
import { opSymbol } from '../lib/notation';
import { areaStars, isUnlocked, recommend, starsOf } from '../lib/progress';
import { markArea, usePrefs, useStore } from '../state/store';
import { navigate } from '../router';
import { sfx, toast } from '../kit';
import { Icon } from '../ui/Icon';
import { StarRating } from '../ui/StarRating';
import { areaStyle } from './areaStyle';
import { ScreenHeader } from './ScreenHeader';
import { NotFound } from './NotFound';

export function Ladder({ areaId }: { areaId: string }) {
  const area = areaById(areaId);
  const prefs = usePrefs();
  const progress = useStore('progress');
  if (!area) return <NotFound />;
  const levels = levelsOf(area.id);
  const { got, max } = areaStars(progress, area.id);
  const rec = recommend(progress, prefs.unlockAll, area.id as AreaId);

  return (
    <div className="g92-main screen g92-accent" style={areaStyle(area.id)}>
      <ScreenHeader
        title={area.title}
        subtitle={
          <>
            <Icon name="star" size={16} className="text-gold" /> {got} z {max} hvězd
          </>
        }
      >
        <span className={`ladder-symbol ${area.symbol === '·' && prefs.notation === 'school' ? 'is-dot' : ''}`} aria-hidden="true">
          {area.id === 'mul' ? opSymbol('mul', prefs.notation) : area.id === 'div' ? opSymbol('div', prefs.notation) : area.symbol}
        </span>
      </ScreenHeader>
      <ol className="ladder">
        {levels.map((l, i) => {
          const open = isUnlocked(progress, l, prefs.unlockAll);
          const s = starsOf(progress, l.id);
          const current = l.id === rec.id;
          return (
            <li key={l.id}>
              <button
                type="button"
                className={`level-card ${open ? '' : 'is-locked'} ${current ? 'is-current' : ''} ${s === 3 ? 'is-perfect' : ''}`}
                onClick={() => {
                  if (!open) {
                    sfx.error();
                    toast('Nejdřív získej hvězdičku v předchozí úrovni.', { icon: '🔒' });
                    return;
                  }
                  markArea(area.id);
                  navigate(`uroven/${l.id}`);
                }}
                aria-label={`${i + 1}. ${l.title}${open ? '' : ' (zamčeno)'}, ${s} z 3 hvězd`}
              >
                <span className="level-card__num">{i + 1}</span>
                <span className={`level-card__sample tabular-nums ${l.sample.length > 7 ? 'is-long' : ''}`}>{sampleIn(l.sample, prefs.notation)}</span>
                <span className="level-card__title">{l.title}</span>
                {open ? <StarRating value={s} size={22} /> : <Icon name="lock" size={24} className="text-subtle" />}
                {current && open && <span className="level-card__go">Hraj!</span>}
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
