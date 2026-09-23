import { AREAS, levelsOf, sampleIn, type AreaId } from '../lib/levels';

const areaTitle = (id: AreaId) => AREAS.find((a) => a.id === id)?.title ?? '';
import { areaStars, recommend, totalStars } from '../lib/progress';
import { dueCards } from '../lib/srs';
import { dayStat, visibleStreak } from '../lib/stats';
import { vocative } from '../lib/format';
import { opSymbol } from '../lib/notation';
import { plural } from '../lib/czech';
import { usePrefs, useSettings, useStore, today } from '../state/store';
import { href, navigate } from '../router';
import { Icon, type IconName } from '../ui/Icon';
import { Mascot } from '../ui/Mascot';
import { ProgressRing } from '../ui/ProgressRing';
import { AREA_COLORS, areaStyle } from './areaStyle';
import { Onboarding } from './Onboarding';

function AreaTile({ id }: { id: AreaId }) {
  const prefs = usePrefs();
  const area = AREAS.find((a) => a.id === id)!;
  const progress = useStore('progress');
  const { got, max } = areaStars(progress, id);
  const count = levelsOf(id).length;
  return (
    <a href={href(`oblast/${id}`)} className="area-tile g92-accent" style={areaStyle(id)}>
      <span className={`area-tile__symbol ${area.symbol.length > 2 ? 'is-long' : ''} ${area.symbol === '·' && prefs.notation === 'school' ? 'is-dot' : ''}`} aria-hidden="true">
        {id === 'mul' ? opSymbol('mul', prefs.notation) : id === 'div' ? opSymbol('div', prefs.notation) : area.symbol}
      </span>
      <span className="area-tile__body">
        <span className="area-tile__title">{area.title}</span>
        <span className="area-tile__meta">
          <Icon name="star" size={16} className="text-gold" /> {got}/{max}
          <span className="opacity-60"> · {count} {plural(count, 'úroveň', 'úrovně', 'úrovní')}</span>
        </span>
        <span className="g92-progress g92-progress--sm area-tile__bar" style={{ ['--value' as string]: got / max }} />
      </span>
    </a>
  );
}

function ModeTile({ to, icon, title, desc, badge, variant }: { to: string; icon: IconName; title: string; desc: string; badge?: number; variant?: string }) {
  return (
    <a href={href(to)} className={`mode-tile ${variant ?? ''}`}>
      <span className="mode-tile__icon">
        <Icon name={icon} size={30} />
      </span>
      <span className="min-w-0">
        <span className="mode-tile__title">{title}</span>
        <span className="mode-tile__desc">{desc}</span>
      </span>
      {badge !== undefined && badge > 0 && <span className="mode-tile__badge" aria-label={`${badge} k procvičení`}>{badge}</span>}
    </a>
  );
}

export function Home() {
  const prefs = usePrefs();
  const settings = useSettings();
  const progress = useStore('progress');
  const stats = useStore('stats');
  const deck = useStore('deck');
  const onboarded = useStore('onboarded');
  const t = today();
  const day = dayStat(stats, t);
  const streak = visibleStreak(stats.streak, t);
  const due = dueCards(deck, t).length;
  const rec = recommend(progress, prefs.unlockAll);
  const stars = totalStars(progress);
  const name = settings.playerName?.trim();
  const goalDone = day.correct >= prefs.dailyGoal;

  if (!onboarded) return <Onboarding />;

  return (
    <div className="g92-main screen home">
      <section className="hero">
        <Mascot mood={goalDone ? 'cheer' : 'happy'} size={92} className="hero__mascot" />
        <div className="min-w-0 flex-1">
          <h1 className="hero__title">Ahoj{name ? `, ${vocative(name)}` : ''}!</h1>
          <p className="hero__sub">{goalDone ? 'Dnešní cíl splněn. Jsi hvězda!' : 'Co si dnes spočítáme?'}</p>
        </div>
        <div className="hero__stats">
          <div className="stat-chip" title="Dny v řadě">
            <Icon name="flame" size={22} className={streak > 0 ? 'text-warning' : 'text-subtle'} />
            <b>{streak}</b>
            <span>{plural(streak, 'den', 'dny', 'dní')}</span>
          </div>
          <div className="stat-chip" title="Hvězdy">
            <Icon name="star" size={22} className="text-gold" />
            <b>{stars}</b>
            <span>{plural(stars, 'hvězda', 'hvězdy', 'hvězd')}</span>
          </div>
          <div className="stat-chip stat-chip--goal" title={`Dnešní cíl: ${prefs.dailyGoal} správně`}>
            <ProgressRing value={day.correct / prefs.dailyGoal} size={40} stroke={5} color={goalDone ? 'var(--g92-success)' : 'var(--accent)'}>
              {goalDone ? <Icon name="check" size={18} className="text-success" /> : <Icon name="target" size={18} className="text-accent-text" />}
            </ProgressRing>
            <b>
              {Math.min(day.correct, prefs.dailyGoal)}/{prefs.dailyGoal}
            </b>
            <span>dnes</span>
          </div>
        </div>
      </section>

      <button type="button" className="play-cta" onClick={() => navigate(`uroven/${rec.id}`)}>
        <span className="play-cta__icon">
          <Icon name="play" size={34} />
        </span>
        <span className="min-w-0 text-left">
          <span className="play-cta__label">Hrát</span>
          <span className="play-cta__level">
            {rec.title.startsWith(areaTitle(rec.area)) ? rec.title : `${areaTitle(rec.area)}: ${rec.title}`}
            <span className="play-cta__inline-sample"> · {sampleIn(rec.sample, prefs.notation)}</span>
          </span>
        </span>
        <span className="play-cta__sample g92-accent tabular-nums" style={{ ['--accent' as string]: AREA_COLORS[rec.area] }} aria-hidden="true">
          {sampleIn(rec.sample, prefs.notation)}
        </span>
      </button>

      <section aria-labelledby="h-areas">
        <h2 id="h-areas" className="section-title">
          Procvičování
        </h2>
        <div className="area-grid">
          {AREAS.map((a) => (
            <AreaTile key={a.id} id={a.id} />
          ))}
        </div>
      </section>

      <section aria-labelledby="h-modes">
        <h2 id="h-modes" className="section-title">
          Hvězdy a hry
        </h2>
        <div className="mode-grid">
          <ModeTile to="nebe" icon="sky" title="Hvězdné nebe" desc="Kolik je hvězd? Až 10 milionů" variant="mode-tile--sky" />
          <ModeTile to="kalkulacka" icon="calculator" title="Hvězdná kalkulačka" desc="A + B = C z hvězdiček" variant="mode-tile--sky" />
          <ModeTile to="zavod" icon="clock" title="Závod s časem" desc="Kolik stihneš za minutu?" />
          <ModeTile to="chyby" icon="repeat" title="Chyby k procvičení" desc={due > 0 ? 'Čekají na tebe' : 'Nic nečeká'} badge={due} />
          <ModeTile to="trenink" icon="shuffle" title="Volný trénink" desc="Vlastní rozsah a operace" />
          <ModeTile to="rodice" icon="users" title="Pro rodiče" desc="Přehled a nastavení" />
        </div>
      </section>
    </div>
  );
}
