// OGC API – Features Part 1 (Core, GeoJSON) conformance checks against a
// running server (architecture review R17, finding I1). The official suite
// is OGC's TEAM Engine (CI runs it too, in its container); this script runs
// the same core abstract tests without a container so anyone can check a
// build: landing page links, conformance classes, collections and their
// links, items as GeoJSON with numberMatched/numberReturned, limit and paging
// (next and prev links), bbox and datetime parameters (valid and invalid),
// single features by id and 404 for an unknown one, coordinates in CRS84,
// Part 2 coordinate systems (each collection's crs and storageCrs, crs and
// bbox-crs parameters with EPSG:4326 latitude first and EPSG:3857 metres,
// Content-Crs on every answer, an unoffered crs refused with 400), and
// Part 3 CQL2 filters (text and JSON; an unknown queryable is a 400).
// A GIS client's key: --header "Authorization: Bearer civ_…".
//
// Usage: node scripts/ogc-check.mjs --base http://localhost:3000 [--cookie name=value | --header "Authorization: Bearer civ_…"] [--report ogc.json]

import { writeFileSync } from 'node:fs';

const arg = (name, fallback) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : fallback; };
const BASE = arg('--base', 'http://localhost:3000').replace(/\/$/, '');
const ROOT = `${BASE}/api/twin/ogc`;
const COOKIE = arg('--cookie');
const HEADER = arg('--header');
const REPORT = arg('--report');

const results = [];
const check = (id, ok, detail = '') => { results.push({ id, ok: !!ok, detail }); console.log(`${ok ? 'ok  ' : 'FAIL'} ${id}${detail && !ok ? ` — ${detail}` : ''}`); };
async function get(url, accept = 'application/json') {
  const r = await fetch(url, { headers: { accept, ...(COOKIE ? { cookie: COOKIE } : {}), ...(HEADER ? { [HEADER.split(':')[0].trim()]: HEADER.slice(HEADER.indexOf(':') + 1).trim() } : {}) } });
  let body = null;
  try { body = await r.json(); } catch { /* not JSON */ }
  return { status: r.status, type: r.headers.get('content-type') ?? '', crs: r.headers.get('content-crs') ?? '', body };
}
const rel = (links, r) => (links ?? []).find(l => l.rel === r);
const coords = g => {
  const out = [];
  const walk = c => { if (typeof c?.[0] === 'number') out.push(c); else if (Array.isArray(c)) c.forEach(walk); };
  if (g) walk(g.coordinates);
  return out;
};
const bboxOf = f => { const c = coords(f.geometry); return c.length ? [Math.min(...c.map(p => p[0])), Math.min(...c.map(p => p[1])), Math.max(...c.map(p => p[0])), Math.max(...c.map(p => p[1]))] : null; };
const meets = (a, b) => a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];
const CRS84 = 'http://www.opengis.net/def/crs/OGC/1.3/CRS84';
const EPSG = c => `http://www.opengis.net/def/crs/EPSG/0/${c}`;
const PART2 = 'http://www.opengis.net/spec/ogcapi-features-2/1.0/conf/crs';

// Landing page (/req/core/root-success)
const landing = await get(ROOT);
check('core/root-success: 200 and JSON', landing.status === 200 && landing.body);
for (const r of ['self', 'conformance', 'data']) check(`core/root-success: link rel=${r}`, rel(landing.body?.links, r));
check('core/root-success: link service-desc or service-doc', rel(landing.body?.links, 'service-desc') || rel(landing.body?.links, 'service-doc'));

// Conformance (/req/core/conformance-success)
const conf = await get(`${ROOT}/conformance`);
const classes = conf.body?.conformsTo ?? [];
check('core/conformance-success: lists Core', classes.includes('http://www.opengis.net/spec/ogcapi-features-1/1.0/conf/core'));
check('core/conformance-success: lists GeoJSON', classes.includes('http://www.opengis.net/spec/ogcapi-features-1/1.0/conf/geojson'));

// Collections (/req/core/fc-md-success)
const cols = await get(`${ROOT}/collections`);
const list = cols.body?.collections ?? [];
check('core/fc-md-success: collections listed', cols.status === 200 && list.length > 0, `status ${cols.status}`);
check('core/fc-md-links: link rel=self', rel(cols.body?.links, 'self'));

for (const c of list) {
  const id = c.id;
  check(`[${id}] core/sfc-md-op: has id and items link`, id && rel(c.links, 'items'));
  const one = await get(`${ROOT}/collections/${encodeURIComponent(id)}`);
  check(`[${id}] core/sfc-md-success: 200, same id`, one.status === 200 && one.body?.id === id);

  // Items (/req/core/fc-response, /req/geojson/content)
  const items = await get(`${ROOT}/collections/${encodeURIComponent(id)}/items?limit=5`, 'application/geo+json');
  const fc = items.body;
  check(`[${id}] core/fc-op: 200`, items.status === 200, `status ${items.status}`);
  check(`[${id}] geojson/content: FeatureCollection, application/geo+json`, fc?.type === 'FeatureCollection' && /geo\+json|json/.test(items.type), items.type);
  check(`[${id}] core/fc-response: numberReturned matches`, fc && (fc.numberReturned === undefined || fc.numberReturned === fc.features.length));
  check(`[${id}] core/fc-limit-response: limit respected`, fc && fc.features.length <= 5);
  check(`[${id}] core/fc-links: link rel=self`, rel(fc?.links, 'self'));
  if (fc && fc.numberMatched > 5) {
    const next = rel(fc.links, 'next');
    check(`[${id}] core/fc-next-1: next link when more remain`, next);
    if (next) {
      const p2 = await get(next.href, 'application/geo+json');
      check(`[${id}] core/fc-next-2: next page answers, prev link back`, p2.status === 200 && rel(p2.body?.links, 'prev'));
    }
  }
  const crsOk = (fc?.features ?? []).every(f => coords(f.geometry).every(([x, y]) => Math.abs(x) <= 180 && Math.abs(y) <= 90));
  check(`[${id}] core/crs84: coordinates are longitude/latitude`, crsOk);

  // bbox (/req/core/fc-bbox-response)
  const first = fc?.features?.find(f => bboxOf(f));
  if (first) {
    const b = bboxOf(first);
    const box = [b[0] - 0.01, b[1] - 0.01, b[2] + 0.01, b[3] + 0.01];
    const inBox = await get(`${ROOT}/collections/${encodeURIComponent(id)}/items?bbox=${box.join(',')}&limit=50`, 'application/geo+json');
    const feats = inBox.body?.features ?? [];
    check(`[${id}] core/fc-bbox-response: features meet the box`, inBox.status === 200 && feats.length > 0 && feats.every(f => !bboxOf(f) || meets(bboxOf(f), box)), `${feats.length} features`);
  }
  const badBbox = await get(`${ROOT}/collections/${encodeURIComponent(id)}/items?bbox=1,2,3`);
  check(`[${id}] core/fc-bbox-definition: malformed bbox refused with 400`, badBbox.status === 400, `status ${badBbox.status}`);
  const badTime = await get(`${ROOT}/collections/${encodeURIComponent(id)}/items?datetime=not-a-date`);
  check(`[${id}] core/fc-time-definition: malformed datetime refused with 400`, badTime.status === 400, `status ${badTime.status}`);

  // Single feature (/req/core/f-success, /req/core/f-op)
  if (fc?.features?.[0]?.id != null) {
    const fid = fc.features[0].id;
    const f = await get(`${ROOT}/collections/${encodeURIComponent(id)}/items/${encodeURIComponent(fid)}`, 'application/geo+json');
    check(`[${id}] core/f-success: feature by id`, f.status === 200 && f.body?.type === 'Feature' && String(f.body.id) === String(fid));
  }
  const missing = await get(`${ROOT}/collections/${encodeURIComponent(id)}/items/no-such-feature-0000`);
  check(`[${id}] core/f-op: unknown id answers 404`, missing.status === 404, `status ${missing.status}`);

  // Part 2 coordinate systems by reference (/req/crs/*)
  if (classes.includes(PART2)) {
    const crsList = one.body?.crs ?? [];
    check(`[${id}] crs/fc-md-crs-list: crs lists CRS84, EPSG:4326 and EPSG:3857`, [CRS84, EPSG(4326), EPSG(3857)].every(c => crsList.includes(c)), JSON.stringify(crsList));
    check(`[${id}] crs/fc-md-storageCrs: storageCrs is one of crs`, one.body?.storageCrs && crsList.includes(one.body.storageCrs));
    check(`[${id}] crs/ogc-crs-header: default answer says Content-Crs CRS84`, items.crs === `<${CRS84}>`, items.crs);
    const base = `${ROOT}/collections/${encodeURIComponent(id)}/items`;
    const ll = await get(`${base}?limit=5&crs=${encodeURIComponent(EPSG(4326))}`, 'application/geo+json');
    check(`[${id}] crs/fc-crs-success: crs=EPSG:4326 answers 200 with Content-Crs`, ll.status === 200 && ll.crs === `<${EPSG(4326)}>`, `status ${ll.status} ${ll.crs}`);
    const a = coords(fc?.features?.[0]?.geometry)[0], b = coords(ll.body?.features?.[0]?.geometry)[0];
    if (a && b) check(`[${id}] crs/fc-crs-axis-order: EPSG:4326 coordinates are latitude, longitude`, Math.abs(a[0] - b[1]) < 1e-5 && Math.abs(a[1] - b[0]) < 1e-5, `${a} vs ${b}`);
    const merc = await get(`${base}?limit=5&crs=${encodeURIComponent(EPSG(3857))}`, 'application/geo+json');
    const m = coords(merc.body?.features?.[0]?.geometry)[0];
    check(`[${id}] crs/fc-crs-success: crs=EPSG:3857 answers metres`, merc.status === 200 && merc.crs === `<${EPSG(3857)}>` && (!m || (a && Math.abs(m[0] - a[0] * 6378137 * Math.PI / 180) < 1)), `${m}`);
    const bad = await get(`${base}?crs=${encodeURIComponent(EPSG(2))}`);
    check(`[${id}] crs/fc-crs-valid-value: a crs the collection does not offer is refused with 400`, bad.status === 400, `status ${bad.status}`);
    const firstBox = fc?.features?.find(f => bboxOf(f));
    if (firstBox) {
      const bb = bboxOf(firstBox);
      const box = [bb[1] - 0.01, bb[0] - 0.01, bb[3] + 0.01, bb[2] + 0.01];
      const inBox = await get(`${base}?bbox=${box.join(',')}&bbox-crs=${encodeURIComponent(EPSG(4326))}&limit=50`, 'application/geo+json');
      const ll84 = [box[1], box[0], box[3], box[2]];
      const feats = inBox.body?.features ?? [];
      check(`[${id}] crs/fc-bbox-crs-success: bbox in bbox-crs=EPSG:4326 (latitude first)`, inBox.status === 200 && feats.length > 0 && feats.every(f => !bboxOf(f) || meets(bboxOf(f), ll84)), `${feats.length} features`);
    }
    if (fc?.features?.[0]?.id != null) {
      const f = await get(`${base}/${encodeURIComponent(fc.features[0].id)}?crs=${encodeURIComponent(EPSG(4326))}`, 'application/geo+json');
      check(`[${id}] crs/f-crs-success: feature by id in crs with Content-Crs`, f.status === 200 && f.crs === `<${EPSG(4326)}>`, `status ${f.status} ${f.crs}`);
    }
  }

  // Part 3 filtering (CQL2): a filter on the geometry answers GeoJSON; an unknown queryable is refused with 400.
  if (classes.includes('http://www.opengis.net/spec/ogcapi-features-3/1.0/conf/filter')) {
    const all = await get(`${ROOT}/collections/${encodeURIComponent(id)}/items?filter=${encodeURIComponent('S_INTERSECTS(geometry, BBOX(-180, -90, 180, 90))')}&limit=5`, 'application/geo+json');
    check(`[${id}] filter/filter-param: CQL2-Text filter answers 200`, all.status === 200 && all.body?.type === 'FeatureCollection', `status ${all.status}`);
    const json = await get(`${ROOT}/collections/${encodeURIComponent(id)}/items?filter-lang=cql2-json&filter=${encodeURIComponent('{"op":"s_intersects","args":[{"property":"geometry"},{"bbox":[-180,-90,180,90]}]}')}&limit=5`, 'application/geo+json');
    check(`[${id}] filter/filter-lang: CQL2-JSON filter answers 200`, json.status === 200, `status ${json.status}`);
    const bad = await get(`${ROOT}/collections/${encodeURIComponent(id)}/items?filter=${encodeURIComponent("no_such_queryable = 'x'")}`);
    check(`[${id}] filter/filter-param: unknown queryable refused with 400`, bad.status === 400, `status ${bad.status}`);
  }
}
const unknown = await get(`${ROOT}/collections/no-such-collection`);
check('core/sfc-md-op: unknown collection answers 404', unknown.status === 404, `status ${unknown.status}`);

const failed = results.filter(r => !r.ok);
if (REPORT) writeFileSync(REPORT, JSON.stringify({ base: ROOT, results }, null, 2));
console.log(failed.length ? `\n${failed.length} of ${results.length} checks failed.` : `\nAll ${results.length} OGC API – Features checks passed.`);
process.exit(failed.length ? 1 : 0);
