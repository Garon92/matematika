/** "Hvězdička" — the friendly star mascot. */
export type Mood = 'happy' | 'wow' | 'think' | 'oops' | 'sleep' | 'cheer';

const STAR = (() => {
  const pts: string[] = [];
  for (let k = 0; k < 10; k++) {
    const r = k % 2 === 0 ? 46 : 23;
    const a = -Math.PI / 2 + (k * Math.PI) / 5;
    pts.push(`${(60 + Math.cos(a) * r).toFixed(1)},${(62 + Math.sin(a) * r).toFixed(1)}`);
  }
  return pts.join(' ');
})();

export function Mascot({ mood = 'happy', size = 96, className, animate = true }: { mood?: Mood; size?: number; className?: string; animate?: boolean }) {
  const eyesClosed = mood === 'sleep' || mood === 'cheer';
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={`mascot ${animate ? `mascot--${mood}` : ''} ${className ?? ''}`}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id="mascot-g" cx="0.4" cy="0.35" r="0.75">
          <stop offset="0" stopColor="#fff2a6" />
          <stop offset="0.5" stopColor="#ffcf33" />
          <stop offset="1" stopColor="#ffb300" />
        </radialGradient>
      </defs>
      <g className="mascot__body">
        <polygon points={STAR} fill="url(#mascot-g)" stroke="#ffb300" strokeWidth="9" strokeLinejoin="round" />
        {/* cheeks */}
        <ellipse cx="42" cy="74" rx="6.5" ry="4.2" fill="#ff8fab" opacity="0.7" />
        <ellipse cx="78" cy="74" rx="6.5" ry="4.2" fill="#ff8fab" opacity="0.7" />
        {/* eyes */}
        {eyesClosed ? (
          <g stroke="#3b2a12" strokeWidth="3.4" strokeLinecap="round" fill="none">
            <path d={mood === 'cheer' ? 'M43 62 q5 -6 10 0' : 'M43 63 q5 4 10 0'} />
            <path d={mood === 'cheer' ? 'M67 62 q5 -6 10 0' : 'M67 63 q5 4 10 0'} />
          </g>
        ) : (
          <g className="mascot__eyes">
            <ellipse cx="48" cy={mood === 'think' ? 58 : 62} rx="5.2" ry="6.6" fill="#3b2a12" />
            <ellipse cx="72" cy={mood === 'think' ? 58 : 62} rx="5.2" ry="6.6" fill="#3b2a12" />
            <circle cx="49.8" cy={mood === 'think' ? 55.5 : 59.5} r="2" fill="#fff" />
            <circle cx="73.8" cy={mood === 'think' ? 55.5 : 59.5} r="2" fill="#fff" />
          </g>
        )}
        {/* mouth */}
        {mood === 'wow' || mood === 'cheer' ? (
          <path d="M51 76 q9 13 18 0 z" fill="#7a2e1a" stroke="#3b2a12" strokeWidth="2.5" strokeLinejoin="round" />
        ) : mood === 'oops' ? (
          <ellipse cx="60" cy="80" rx="4.5" ry="5" fill="#7a2e1a" stroke="#3b2a12" strokeWidth="2.2" />
        ) : mood === 'think' ? (
          <path d="M53 79 q7 -3 14 1" stroke="#3b2a12" strokeWidth="3.2" strokeLinecap="round" fill="none" />
        ) : mood === 'sleep' ? (
          <path d="M55 79 q5 3 10 0" stroke="#3b2a12" strokeWidth="3" strokeLinecap="round" fill="none" />
        ) : (
          <path d="M50 76 q10 10 20 0" stroke="#3b2a12" strokeWidth="3.4" strokeLinecap="round" fill="none" />
        )}
      </g>
    </svg>
  );
}
