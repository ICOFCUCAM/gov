// Reading a position typed by an official: decimal degrees ("-1.28638,
// 36.81724") or degrees-minutes-seconds ("1°17'11\"S 36°49'2\"E",
// "-1 17 11, 36 49 2", "S 1 17 11 E 36 49 2"). Letters say which is latitude
// (N/S) and longitude (E/W); without letters, latitude comes first.

export type Parsed = { lat: number; lng: number } | { error: string };

const HEMI = /^[NSEW]$/i;

function value(part: (string)[]): { v: number; axis?: 'lat' | 'lng' } | { error: string } {
  const letters = part.filter(t => HEMI.test(t)).map(t => t.toUpperCase());
  const nums = part.filter(t => !HEMI.test(t));
  if (letters.length > 1) return { error: 'Each coordinate takes one of N, S, E or W' };
  if (!nums.length || nums.length > 3) return { error: 'Give degrees, or degrees minutes seconds' };
  const n = nums.map(Number);
  if (n.some(x => !Number.isFinite(x))) return { error: 'Only numbers and N, S, E, W' };
  const negative = nums[0]!.startsWith('-');
  const [d, m = 0, s = 0] = [Math.abs(n[0]!), n[1], n[2]];
  if (nums.length > 1 && !Number.isInteger(d)) return { error: 'With minutes, degrees must be whole' };
  if (m < 0 || m >= 60 || s < 0 || s >= 60) return { error: 'Minutes and seconds go up to 59' };
  if (nums.slice(1).some(x => x.startsWith('-'))) return { error: 'Only the degrees can carry a minus sign' };
  let v = d + m / 60 + s / 3600;
  const h = letters[0];
  if (negative && (h === 'N' || h === 'E')) return { error: 'A minus sign and N or E contradict each other' };
  if (negative || h === 'S' || h === 'W') v = -v;
  return { v, axis: h === 'N' || h === 'S' ? 'lat' : h === 'E' || h === 'W' ? 'lng' : undefined };
}

/** Read a typed position in decimal degrees or degrees-minutes-seconds. */
export function parseCoordinates(text: string): Parsed {
  const s = text
    .replace(/[−‒–—]/g, '-')
    .replace(/[°º˚′″'"’”]|''/g, ' ')
    .replace(/\b(deg|min|sec)\b/gi, ' ')
    .trim();
  if (!s) return { error: 'Type the position' };
  const tokens = s.match(/-?\d+(?:[.]\d+)?|[NSEW]|,|;/gi) ?? [];
  const rest = s.replace(/-?\d+(?:[.]\d+)?|[NSEW]|,|;|\s/gi, '');
  if (rest) return { error: `Not understood: "${rest.slice(0, 12)}"` };
  // Split into two coordinates.
  let parts: string[][];
  const sep = tokens.findIndex(t => t === ',' || t === ';');
  if (sep >= 0) {
    parts = [tokens.slice(0, sep), tokens.slice(sep + 1)].map(p => p.filter(t => t !== ',' && t !== ';'));
  } else if (tokens.some(t => HEMI.test(t))) {
    const prefix = HEMI.test(tokens[0]!);
    const at = prefix ? tokens.findIndex((t, i) => i > 0 && HEMI.test(t)) : tokens.findIndex(t => HEMI.test(t)) + 1;
    parts = at > 0 ? [tokens.slice(0, at), tokens.slice(at)] : [tokens];
  } else {
    const half = tokens.length / 2;
    parts = Number.isInteger(half) && half >= 1 && half <= 3 ? [tokens.slice(0, half), tokens.slice(half)] : [tokens];
  }
  if (parts.length !== 2 || parts.some(p => !p.length)) return { error: 'Give two coordinates: latitude and longitude' };
  const a = value(parts[0]!), b = value(parts[1]!);
  if ('error' in a) return a;
  if ('error' in b) return b;
  if (a.axis && a.axis === b.axis) return { error: 'One coordinate must be N or S and the other E or W' };
  const [lat, lng] = a.axis === 'lng' || b.axis === 'lat' ? [b.v, a.v] : [a.v, b.v];
  if (Math.abs(lat) > 90) return { error: 'Latitude must be between −90 and 90' };
  if (Math.abs(lng) > 180) return { error: 'Longitude must be between −180 and 180' };
  return { lat: Math.round(lat * 1e6) / 1e6, lng: Math.round(lng * 1e6) / 1e6 };
}

/** A position written back as degrees-minutes-seconds, e.g. 1°17′11″S 36°49′02″E. */
export function toDms(lat: number, lng: number): string {
  const one = (v: number, pos: string, neg: string) => {
    const a = Math.abs(v); let d = Math.floor(a); let m = Math.floor((a - d) * 60); let s = Math.round(((a - d) * 60 - m) * 60);
    if (s === 60) { s = 0; m++; } if (m === 60) { m = 0; d++; }
    return `${d}°${String(m).padStart(2, '0')}′${String(s).padStart(2, '0')}″${v < 0 ? neg : pos}`;
  };
  return `${one(lat, 'N', 'S')} ${one(lng, 'E', 'W')}`;
}
