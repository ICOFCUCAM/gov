// Matching place names across sources: the nation's region list, the
// official subdivision list and the boundary files spell names with or
// without accents, hyphens and suffixes ("Nairobi City", "Nairobi").
export const normName = (s: string): string =>
  s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim();

/** Names a unit may be known by, normalised; the bare name without a trailing type word ("Nairobi City" → "nairobi"). */
export function nameKeys(...names: (string | undefined)[]): string[] {
  const out = new Set<string>();
  for (const n of names) {
    if (!n) continue;
    const k = normName(n);
    if (!k) continue;
    out.add(k);
    const bare = k.replace(/\s+(city|county|province|region|district|state|prefecture|governorate|department|municipality|oblast|krai)$/, '');
    if (bare) out.add(bare);
  }
  return [...out];
}

// Common English forms that differ from Natural Earth's short names.
export const COUNTRY_ALIASES: Record<string, string> = {
  'united states': 'united states of america', usa: 'united states of america', us: 'united states of america',
  uk: 'united kingdom', britain: 'united kingdom', 'great britain': 'united kingdom',
  'democratic republic of the congo': 'dem rep congo', drc: 'dem rep congo', 'republic of the congo': 'congo',
  'south korea': 'south korea', 'korea republic of': 'south korea', 'north korea': 'north korea',
  'czech republic': 'czechia', 'ivory coast': 'cote d ivoire', 'east timor': 'timor leste', swaziland: 'eswatini',
  'central african republic': 'central african rep', 'south sudan': 's sudan', 'bosnia and herzegovina': 'bosnia and herz',
  'dominican republic': 'dominican rep', 'equatorial guinea': 'eq guinea', 'solomon islands': 'solomon is',
};

/** Name keys for a country, with the map's short form of common long names. */
export function countryKeys(name: string): string[] {
  return nameKeys(name).flatMap(k => [k, COUNTRY_ALIASES[k] ?? '']).filter(Boolean);
}
