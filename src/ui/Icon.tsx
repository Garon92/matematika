import { UI_ICONS, type UiIconName } from '../kit';

const s = (inner: string) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${inner}</svg>`;

const OWN = {
  speaker: s('<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4Z" fill="currentColor" fill-opacity=".2"/><path d="M15.5 9a4.5 4.5 0 0 1 0 6M18.2 6.5a8 8 0 0 1 0 11"/>'),
  bulb: s('<path d="M9 17.5h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.4 1.1 2.2v.5h5v-.5c0-.8.4-1.6 1.1-2.2A6 6 0 0 0 12 3Z" fill="currentColor" fill-opacity=".2"/>'),
  backspace: s('<path d="M9 5h10.5A1.5 1.5 0 0 1 21 6.5v11a1.5 1.5 0 0 1-1.5 1.5H9l-6-7Z" fill="currentColor" fill-opacity=".15"/><path d="M12 9.5l5 5M17 9.5l-5 5"/>'),
  lock: s('<rect x="5" y="10.5" width="14" height="10" rx="3" fill="currentColor" fill-opacity=".2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>'),
  repeat: s('<path d="M4 12a8 8 0 0 1 13.7-5.6L20 8.5"/><path d="M20 4v4.5h-4.5"/><path d="M20 12a8 8 0 0 1-13.7 5.6L4 15.5"/><path d="M4 20v-4.5h4.5"/>'),
  users: s('<circle cx="9" cy="8.5" r="3.3" fill="currentColor" fill-opacity=".2"/><path d="M3 19.5a6 6 0 0 1 12 0"/><circle cx="17" cy="9.5" r="2.5"/><path d="M16.5 14.2a5 5 0 0 1 4.5 5"/>'),
  calculator: s('<rect x="5" y="3" width="14" height="18" rx="3" fill="currentColor" fill-opacity=".15"/><path d="M8.5 7h7M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 15.5h.01M12 15.5h.01M15.5 15.5h.01"/>'),
  target: s('<circle cx="12" cy="12" r="8.5" fill="currentColor" fill-opacity=".12"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/>'),
  chart: s('<path d="M4 20h16"/><rect x="6" y="11" width="3" height="6" rx="1" fill="currentColor" fill-opacity=".2"/><rect x="11" y="6" width="3" height="11" rx="1" fill="currentColor" fill-opacity=".2"/><rect x="16" y="13" width="3" height="4" rx="1" fill="currentColor" fill-opacity=".2"/>'),
  download: s('<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14"/>'),
  upload: s('<path d="M12 15V4M7.5 8.5 12 4l4.5 4.5M5 19.5h14"/>'),
  trash: s('<path d="M5 7h14M10 7V5h4v2M7 7l1 12.5h8L17 7"/>'),
  plus: s('<path d="M12 5v14M5 12h14"/>'),
  minus: s('<path d="M5 12h14"/>'),
  sky: s('<path d="M12 3.5l1.6 4.4 4.4 1.6-4.4 1.6L12 15.5l-1.6-4.4L6 9.5l4.4-1.6Z" fill="currentColor" fill-opacity=".25"/><path d="M18.5 15l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7ZM5.5 16l.5 1.3 1.3.5-1.3.5-.5 1.3-.5-1.3-1.3-.5 1.3-.5Z" fill="currentColor"/>'),
  eye: s('<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" fill="currentColor" fill-opacity=".12"/><circle cx="12" cy="12" r="3"/>'),
  eyeOff: s('<path d="M4 4l16 16M10.6 6A9.7 9.7 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.6 3.4M6.5 7.3C4 9 2.5 12 2.5 12S6 18.5 12 18.5c1.6 0 3-.4 4.2-1.1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>'),
  info: s('<circle cx="12" cy="12" r="9" fill="currentColor" fill-opacity=".12"/><path d="M12 11v5.5M12 7.8v.01"/>'),
  chevronRight: s('<path d="M9 5l7 7-7 7"/>'),
  shuffle: s('<path d="M4 7h3.5c4.5 0 5 10 9.5 10H20M4 17h3.5c1.4 0 2.4-1 3.2-2.3M20 7h-3c-1.4 0-2.4 1-3.2 2.3"/><path d="M17.5 4.5 20 7l-2.5 2.5M17.5 14.5 20 17l-2.5 2.5"/>'),
} as const;

export type IconName = keyof typeof OWN | UiIconName;

export function Icon({ name, className, size }: { name: IconName; className?: string; size?: number }) {
  const html = (OWN as Record<string, string>)[name] ?? (UI_ICONS as Record<string, string>)[name] ?? '';
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center [&>svg]:h-full [&>svg]:w-full ${className ?? ''}`}
      style={size ? { width: size, height: size } : undefined}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
