import type { AreaId } from '../lib/levels';

export const AREA_COLORS: Record<AreaId, string> = {
  count: '#e9a100',
  add: '#16a34a',
  sub: '#ea580c',
  mul: '#2563eb',
  div: '#db2777',
  mix: '#7c5cff',
};

export function areaStyle(area: AreaId): React.CSSProperties {
  return { ['--accent' as string]: AREA_COLORS[area] };
}
