import { Icon } from '../ui/Icon';

export type PadKey = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'back' | 'ok';

const PHONE: PadKey[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'back', '0', 'ok'];
const CALC: PadKey[] = ['7', '8', '9', '4', '5', '6', '1', '2', '3', 'back', '0', 'ok'];

export function Numpad({ onKey, layout = 'phone', disabled = false, okReady = true }: {
  onKey: (k: PadKey) => void;
  layout?: 'phone' | 'calc';
  disabled?: boolean;
  okReady?: boolean;
}) {
  const keys = layout === 'calc' ? CALC : PHONE;
  return (
    <div className="numpad" role="group" aria-label="Číselná klávesnice">
      {keys.map((k) => (
        <button
          key={k}
          type="button"
          className={`numpad__key ${k === 'ok' ? 'numpad__key--ok' : ''} ${k === 'back' ? 'numpad__key--back' : ''} ${k === 'ok' && !okReady ? 'is-idle' : ''}`}
          disabled={disabled}
          onClick={() => onKey(k)}
          onPointerDown={(e) => e.preventDefault()}
          aria-label={k === 'back' ? 'Smazat' : k === 'ok' ? 'Zkontrolovat' : k}
        >
          {k === 'back' ? <Icon name="backspace" size={30} /> : k === 'ok' ? <Icon name="check" size={34} /> : k}
        </button>
      ))}
    </div>
  );
}
