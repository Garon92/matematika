export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  label,
  block = false,
  className,
}: {
  value: T;
  options: readonly { value: T; label: React.ReactNode; title?: string }[];
  onChange: (v: T) => void;
  label: string;
  block?: boolean;
  className?: string;
}) {
  return (
    <div className={`g92-segmented ${block ? 'g92-segmented--block' : ''} ${className ?? ''}`} role="group" aria-label={label}>
      {options.map((o) => (
        <button key={String(o.value)} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)} title={o.title}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function SwitchRow({ label, hint, checked, onChange, id }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void; id: string }) {
  return (
    <div className="g92-switch-row">
      <label htmlFor={id} className="flex min-w-0 flex-col">
        <span className="font-bold">{label}</span>
        {hint && <span className="g92-hint">{hint}</span>}
      </label>
      <input id={id} type="checkbox" role="switch" className="g92-toggle" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </div>
  );
}
