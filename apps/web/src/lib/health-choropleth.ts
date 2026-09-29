/** Hex #rrggbb → rgb */
function parseHex(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.replace(/(.)/g, '$1$1') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mix(a: number, b: number, t: number) {
  return Math.round(a + (b - a) * t);
}

export function healthDistrictFill(
  caseTotal: number,
  maxTotal: number,
  accentHex: string,
): { fillColor: string; fillOpacity: number } {
  if (maxTotal <= 0 || caseTotal <= 0) {
    return { fillColor: '#0f172a', fillOpacity: 0.45 };
  }
  const t = Math.min(1, caseTotal / maxTotal);
  const [r, g, b] = parseHex(accentHex);
  const base = parseHex('#0f172a');
  const fillColor = `#${[mix(base[0], r, t), mix(base[1], g, t), mix(base[2], b, t)]
    .map((c) => c.toString(16).padStart(2, '0'))
    .join('')}`;
  return { fillColor, fillOpacity: 0.35 + t * 0.45 };
}

export const HEALTH_TYPE_COLORS: Record<string, string> = {
  dengue: '#10b981',
  measles: '#a855f7',
};
