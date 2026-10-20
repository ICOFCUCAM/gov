// An NGSI-LD view of a twin entity (ETSI GS CIM 009; review D7, R8), served by
// /api/twin/entities/[id] when the client asks for application/ld+json.
//
//   place, nation   AdministrativeArea (Smart Data Models style), with the
//                   parent area as a Relationship
//   facility        PointOfInterest, with its position as a GeoProperty
//   institution     Organization
//   observations    one Property per metric: its value as known now with
//                   observedAt (when it was true), unitCode and the source as
//                   datasetId; with ?options=temporalValues every current
//                   value of the metric over time (the temporal representation)
//
// The register's ids stay the primary keys (urn:ngsi-ld:<Type>:<id> is
// derived from them) and the entity's persistent URI is given as sameAs.

import { getEntity, stateAsOf, listSources, entityHistory, type TwinEntity, type Observation } from './register';
import { getMetric } from './metrics';

export const NGSI_CORE_CONTEXT = 'https://uri.etsi.org/ngsi-ld/v1/ngsi-ld-core-context-v1.8.jsonld';

/** Terms of this view, mapped to Smart Data Models and schema.org. */
export const NGSI_TERMS = {
  AdministrativeArea: 'https://smartdatamodels.org/dataModel.Administrative/AdministrativeArea',
  PointOfInterest: 'https://smartdatamodels.org/dataModel.PointOfInterest/PointOfInterest',
  Organization: 'https://schema.org/Organization',
  name: 'https://schema.org/name',
  sameAs: 'https://schema.org/sameAs',
  identifier: 'https://schema.org/identifier',
  containedInPlace: 'https://schema.org/containedInPlace',
  ucum: 'http://unitsofmeasure.org/ucum#code',
} as const;

const TYPE: Record<TwinEntity['kind'], string> = { nation: 'AdministrativeArea', place: 'AdministrativeArea', facility: 'PointOfInterest', institution: 'Organization', organisation: 'Organization' };

/** UN/CEFACT common codes (NGSI-LD unitCode) for the UCUM units that have one; others carry the UCUM code only. */
const CEFACT: Record<string, string> = {
  '1': 'C62', '%': 'P1', km: 'KMT', m: 'MTR', km2: 'KMK', ha: 'HAR', m3: 'MTQ', L: 'LTR', t: 'TNE', kg: 'KGM', g: 'GRM',
  MW: 'MAW', kW: 'KWT', GW: 'A90', 'kW.h': 'KWH', 'MW.h': 'MWH', Cel: 'CEL', d: 'DAY', a: 'ANN', h: 'HUR', '{persons}': 'IE',
};

export const ngsiId = (e: Pick<TwinEntity, 'id' | 'kind'>): string => `urn:ngsi-ld:${TYPE[e.kind]}:${e.id}`;
const datasetId = (sourceId: string) => `urn:ngsi-ld:Dataset:${sourceId}`;

function property(o: Observation, sourceName: Map<string, string>) {
  const unit = getMetric(o.metric)?.unit ?? o.unit;
  return {
    type: 'Property', value: o.value, observedAt: `${o.validFrom}T00:00:00Z`,
    ...(CEFACT[unit] ? { unitCode: CEFACT[unit] } : {}),
    ...(o.unit ? { ucum: { type: 'Property', value: o.unit } } : {}),
    datasetId: datasetId(o.sourceId),
    source: { type: 'Property', value: sourceName.get(o.sourceId) ?? o.sourceId },
    ...(o.validTo ? { validTo: { type: 'Property', value: o.validTo } } : {}),
    ...(o.quality?.status ? { status: { type: 'Property', value: o.quality.status } } : {}),
  };
}

/** The entity in NGSI-LD (normalized form), or undefined when the register has no such entity. */
export function ngsiEntity(id: string, opts: { temporal?: boolean } = {}): Record<string, unknown> | undefined {
  const e = getEntity(id);
  if (!e) return undefined;
  const parent = e.parent ? getEntity(e.parent) : undefined;
  const sourceName = new Map(listSources().map(s => [s.id, s.name]));
  const out: Record<string, unknown> = {
    '@context': [NGSI_CORE_CONTEXT, NGSI_TERMS],
    id: ngsiId(e), type: TYPE[e.kind],
    name: { type: 'Property', value: e.name },
    identifier: { type: 'Property', value: e.id },
    ...(e.uri ? { sameAs: { type: 'Property', value: e.uri } } : {}),
    ...(e.code ? { code: { type: 'Property', value: e.code } } : {}),
    ...(parent ? { containedInPlace: { type: 'Relationship', object: ngsiId(parent) } } : {}),
    ...(e.location ? { location: { type: 'GeoProperty', value: { type: 'Point', coordinates: [e.location.lng, e.location.lat] } } } : {}),
  };
  if (opts.temporal) {
    const byMetric = new Map<string, Observation[]>();
    for (const o of entityHistory(id)) (byMetric.get(o.metric) ?? byMetric.set(o.metric, []).get(o.metric)!).push(o);
    for (const [metric, list] of byMetric) out[metric] = list.map(o => ({ ...property(o, sourceName), instanceId: `urn:ngsi-ld:Instance:${o.runId}:${o.validFrom}` }));
  } else {
    for (const o of stateAsOf({ entityId: id })) out[o.metric] = property(o, sourceName);
  }
  return out;
}
