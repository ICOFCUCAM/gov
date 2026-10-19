// The national twin's data catalogue as DCAT-AP (W3C DCAT 3 with the EU
// application profile), in JSON-LD (review D7, R8). One dcat:Catalog with a
// dcat:Dataset for each registered twin source, each published boundary
// version (lib/data/boundaries.ts) and each OGC API – Features collection
// (lib/twin/ogc*.ts): publisher, licence where it is stated, temporal and
// spatial coverage, and dcat:Distribution links to where the data is served.
// Built only from records the platform holds; nothing is invented, and a
// licence the publisher did not state is said to be not stated.
//
// Access: the catalogue describes the twin's sources, which are not public
// data (the twin and its OGC endpoints sit behind the platform session), so it
// is served under the same rule: a session, like other /api reads.

import { getSovereign } from '@/lib/data/store';
import { listBoundaryVersions } from '@/lib/data/boundaries';
import { listSources, listEntities, sourceCoverage } from './register';
import { getMetric } from './metrics';
import { collectionInfo } from './ogc';
import { facilitiesInfo } from './ogc-facilities';
import { boundariesInfo } from './ogc-boundaries';

export const DCAT_CONTEXT = {
  dcat: 'http://www.w3.org/ns/dcat#',
  dct: 'http://purl.org/dc/terms/',
  foaf: 'http://xmlns.com/foaf/0.1/',
  prov: 'http://www.w3.org/ns/prov#',
  spdx: 'http://spdx.org/rdf/terms#',
  xsd: 'http://www.w3.org/2001/XMLSchema#',
  locn: 'http://www.w3.org/ns/locn#',
  'dcat:startDate': { '@type': 'xsd:date' },
  'dcat:endDate': { '@type': 'xsd:date' },
  'dct:issued': { '@type': 'xsd:dateTime' },
  'dct:modified': { '@type': 'xsd:dateTime' },
} as const;

const NOT_STATED = 'Not stated by the publisher';
const agent = (name: string) => ({ '@type': 'foaf:Agent', 'foaf:name': name });
const licence = (l?: string) => (l ? { '@type': 'dct:LicenseDocument', 'dct:title': l } : { '@type': 'dct:LicenseDocument', 'dct:title': NOT_STATED });
const period = (from?: string, to?: string) => (from ? { 'dct:temporal': { '@type': 'dct:PeriodOfTime', 'dcat:startDate': from, ...(to ? { 'dcat:endDate': to } : {}) } } : {});
const bboxWkt = (b: number[]) => `POLYGON((${b[0]} ${b[1]},${b[2]} ${b[1]},${b[2]} ${b[3]},${b[0]} ${b[3]},${b[0]} ${b[1]}))`;

/** The catalogue, with links under `origin` (the address the request came to). */
export async function twinCatalog(origin: string): Promise<Record<string, unknown>> {
  const nation = getSovereign();
  const nationEntity = listEntities('nation')[0];
  const nationSpatial = { '@type': 'dct:Location', 'dct:identifier': nationEntity?.code ?? 'not set', 'locn:geographicName': nation.stateName };
  const api = `${origin}/api/twin`;
  const ogc = `${api}/ogc`;

  const sources = listSources().map(s => {
    const cov = sourceCoverage(s.id);
    const media = s.format === 'sdmx-csv' ? 'application/vnd.sdmx.data+csv' : 'text/csv';
    return {
      '@id': `${api}/catalog#source-${s.id}`, '@type': 'dcat:Dataset',
      'dct:identifier': s.id, 'dct:title': s.name,
      'dct:description': `${s.name}, published by ${s.publisher}: ${cov.observations} current observations of ${cov.metrics.length ? cov.metrics.map(m => getMetric(m)?.label ?? m).join(', ') : 'nothing yet'} for ${cov.entities} places or institutions.`,
      'dct:publisher': agent(s.publisher), 'dct:license': licence(s.licence),
      'dct:issued': s.registeredAt, ...(s.lastRun ? { 'dct:modified': s.lastRun } : {}),
      'dcat:keyword': cov.metrics, 'dct:spatial': nationSpatial, ...period(cov.from, cov.to),
      'dct:accrualPeriodicity': s.schedule === 'manual' ? 'irregular' : s.schedule,
      'prov:wasAttributedTo': agent(s.registeredBy),
      'dcat:distribution': [
        ...(s.kind === 'csv-url' && s.url ? [{ '@type': 'dcat:Distribution', 'dct:title': 'As published', 'dcat:accessURL': { '@id': s.url }, 'dcat:mediaType': media, 'dct:format': s.format === 'sdmx-csv' ? 'SDMX-CSV' : 'CSV' }] : []),
        ...cov.metrics.map(m => ({ '@type': 'dcat:Distribution', 'dct:title': `${getMetric(m)?.label ?? m} in the twin (as of a date)`, 'dcat:accessURL': { '@id': `${api}/state?metric=${encodeURIComponent(m)}` }, 'dcat:mediaType': 'application/json' })),
      ],
    };
  });

  const boundaries = listBoundaryVersions().filter(v => v.state === 'published').map(v => {
    const xs = v.units.map(u => u.lng), ys = v.units.map(u => u.lat);
    return {
      '@id': `${api}/catalog#boundaries-${v.id}`, '@type': 'dcat:Dataset',
      'dct:identifier': v.id, 'dct:title': `${v.level === 1 ? 'Regions' : 'Districts'}, version ${v.n}`,
      'dct:description': `${v.unitCount} ${v.level === 1 ? 'regions' : 'districts'} of ${nation.stateName} as published by ${v.source.publisher}, in force from ${v.validFrom}${v.inForce ? ' (in force now)' : ''}.`,
      'dct:publisher': agent(v.source.publisher), 'dct:license': licence(v.source.licence),
      ...(v.publishedAt ? { 'dct:issued': v.publishedAt } : {}), ...period(v.validFrom),
      'dct:spatial': { ...nationSpatial, ...(xs.length ? { 'dcat:bbox': bboxWkt([Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]) } : {}) },
      'prov:wasAttributedTo': agent(v.publishedBy ?? v.proposedBy),
      'dcat:distribution': [{
        '@type': 'dcat:Distribution', 'dct:title': 'OGC API – Features (GeoJSON)',
        'dcat:accessURL': { '@id': `${ogc}/collections/boundaries/items?level=${v.level}&datetime=${v.validFrom}` },
        'dcat:mediaType': 'application/geo+json', 'dct:conformsTo': { '@id': 'http://www.opengis.net/spec/ogcapi-features-1/1.0/conf/core' },
        'spdx:checksum': { '@type': 'spdx:Checksum', 'spdx:algorithm': 'spdx:checksumAlgorithm_sha256', 'spdx:checksumValue': v.fileSha256 },
      }],
    };
  });

  const collections = [await collectionInfo(ogc), facilitiesInfo(ogc), boundariesInfo(ogc)].map(c => {
    const bbox = (c as { extent?: { spatial?: { bbox?: number[][] } } }).extent?.spatial?.bbox?.[0];
    return {
      '@id': `${ogc}/collections/${c.id}`, '@type': 'dcat:Dataset',
      'dct:identifier': c.id, 'dct:title': c.title, 'dct:description': c.description,
      'dct:publisher': agent(nation.stateName),
      'dct:license': licence('attribution' in c && typeof c.attribution === 'string' ? c.attribution : undefined),
      'dct:spatial': { ...nationSpatial, ...(bbox ? { 'dcat:bbox': bboxWkt(bbox) } : {}) },
      'dcat:distribution': [{
        '@type': 'dcat:Distribution', 'dct:title': 'OGC API – Features (GeoJSON, CRS84)',
        'dcat:accessURL': { '@id': `${ogc}/collections/${c.id}/items` }, 'dcat:mediaType': 'application/geo+json',
        'dct:conformsTo': { '@id': 'http://www.opengis.net/spec/ogcapi-features-1/1.0/conf/core' },
      }],
    };
  });

  return {
    '@context': DCAT_CONTEXT,
    '@id': `${api}/catalog`, '@type': 'dcat:Catalog',
    'dct:title': `${nation.stateName}: national data catalogue`,
    'dct:description': 'The sources of the national twin, the published boundary versions and the geographic collections, with who publishes them, their licences, the period and area they cover and where they are served. Observations only: samples and scenarios are not datasets here.',
    'dct:publisher': agent(nation.stateName), 'dct:language': nation.locale,
    'dct:modified': new Date().toISOString(),
    'dcat:dataset': [...sources, ...boundaries, ...collections],
  };
}
