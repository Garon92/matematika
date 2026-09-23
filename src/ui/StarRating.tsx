import { Icon } from './Icon';

/** 0–3 gold stars; `animate` pops them in one by one. */
export function StarRating({ value, max = 3, size = 20, animate = false, className }: { value: number; max?: number; size?: number; animate?: boolean; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-[2px] ${className ?? ''}`} role="img" aria-label={`${value} z ${max} hvězd`}>
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          className={`${i < value ? 'text-gold' : 'text-surface-3'} ${animate && i < value ? 'star-pop' : ''}`}
          style={animate ? { animationDelay: `${250 + i * 280}ms` } : undefined}
        >
          <Icon name="star" size={size} />
        </span>
      ))}
    </span>
  );
}
