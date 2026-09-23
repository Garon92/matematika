import { navigate } from '../router';
import { Mascot } from '../ui/Mascot';

export function NotFound() {
  return (
    <div className="g92-main g92-main--narrow screen">
      <div className="g92-empty">
        <Mascot mood="think" size={120} />
        <h1 className="text-2xl font-black">Tahle stránka neexistuje</h1>
        <button type="button" className="g92-btn g92-btn--lg" onClick={() => navigate('')}>
          Domů
        </button>
      </div>
    </div>
  );
}
