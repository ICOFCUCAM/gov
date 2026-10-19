// Disputed and breakaway areas for the worldview setting (map plan phase 3).
// Source: Natural Earth 1:50m "admin 0 breakaway and disputed areas"
// (public domain), which records for each area who administers it, who
// claims it, and how each of some thirty national points of view draws it
// (ADM0_A3_xx: the country it belongs to in that view; FCLASS_xx: whether
// that view treats it as unrecognised or disputed). The platform never
// chooses a side: by default every area is drawn as disputed with this note;
// the nation may choose a point of view in setup.
// Writes src/lib/geo/disputed.json. Run: node scripts/build-disputed.mjs [file.geojson]
import { readFileSync, writeFileSync } from 'node:fs';

const SOURCE_URL = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_breakaway_disputed_areas.geojson';
const local = process.argv[2];
const src = local ? JSON.parse(readFileSync(local, 'utf8')) : await (await fetch(SOURCE_URL)).json();

const COUNTRIES = JSON.parse(readFileSync(new URL('../src/lib/geo/countries.json', import.meta.url), 'utf8'));
const ISO3 = new Set(COUNTRIES.map(c => c.iso3));
// Its B.., C.. and ..1 codes are the area drawn on its own (disputed).
const NE_TO_ISO = {}; // the platform uses Natural Earth's country codes (countries.json), so none differ
const iso = c => { const v = NE_TO_ISO[c] ?? c; return typeof v === 'string' && ISO3.has(v) ? v : null; };
const ABBREV = { 'Azer.': 'AZE' };
const named = note => {
  const out = new Set();
  for (const [k, v] of Object.entries(ABBREV)) if (note.includes(k)) out.add(v);
  for (const c of COUNTRIES) if (c.name.length > 3 && new RegExp(`\\b${c.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(note)) out.add(c.iso3);
  return out;
};

const VIEWS = ['AR', 'BD', 'BR', 'CN', 'DE', 'EG', 'ES', 'FR', 'GB', 'GR', 'ID', 'IL', 'IN', 'IT', 'JP', 'KO', 'MA', 'NL', 'NP', 'PK', 'PL', 'PS', 'PT', 'RU', 'SA', 'SE', 'TR', 'TW', 'UA', 'US', 'VN', 'UN', 'WB'];
const round = c => (typeof c[0] === 'number' ? [Math.round(c[0] * 1000) / 1000, Math.round(c[1] * 1000) / 1000] : c.map(round));
const dedupe = ring => ring.filter((p, i) => i === 0 || p[0] !== ring[i - 1][0] || p[1] !== ring[i - 1][1]);
const clean = g => ({
  type: g.type,
  coordinates: g.type === 'Polygon' ? round(g.coordinates).map(dedupe).filter(r => r.length >= 4)
    : round(g.coordinates).map(p => p.map(dedupe).filter(r => r.length >= 4)).filter(p => p.length),
});
const areas = src.features.map(f => {
  const p = f.properties;
  const views = {};
  for (const v of VIEWS) {
    const owner = iso(p[`ADM0_A3_${v}`]), cls = p[`FCLASS_${v}`];
    // Only what differs from drawing it as disputed: the view gives it to a country.
    // FCLASS 'Unrecognized' means the view does not treat the area as a separate unit: it is part of its owner.
    if (owner && (!cls || !/breakaway|disputed/i.test(cls))) views[v] = owner;
  }
  const note = p.NOTE_BRK || '';
  const parties = new Set([iso(p.ADM0_A3), ...Object.values(views), ...named(note)].filter(Boolean));
  return {
    id: String(p.NE_ID),
    name: p.BRK_NAME || p.NAME,
    note: note || null,
    /** Countries that administer or claim it, or are given it by a point of view. */
    parties: [...parties].sort(),
    views,
    label: [Math.round(p.LABEL_X * 100) / 100, Math.round(p.LABEL_Y * 100) / 100],
    geometry: clean(f.geometry),
  };
});
const out = { source: 'Natural Earth 1:50m admin-0 breakaway and disputed areas', licence: 'public domain', views: VIEWS, areas };
writeFileSync(new URL('../src/lib/geo/disputed.json', import.meta.url), JSON.stringify(out));
console.log(`${areas.length} areas written`);
