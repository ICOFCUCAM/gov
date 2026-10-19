// Provenance of the twin's figures as W3C PROV-O in JSON-LD (review D7, R8).
//
//   an import    prov:Activity, run by the official (prov:wasAssociatedWith),
//                that used the source's file (prov:used: a distribution with
//                the SHA-256 of what was read) and generated the observations
//                (prov:generated); a withdrawal is a second activity that
//                invalidated them (never a deletion)
//
// Built only from the run's own record and its observations (live register
// and history archive). Ids are under the twin API so a reader can follow
// them back to the platform.

import { getRun, getEntity, listSources, runObservations, observationId, type TwinRun } from './register';
import { getScenario, verifyVersion } from './scenarios';

export const PROV_CONTEXT = {
  prov: 'http://www.w3.org/ns/prov#',
  dct: 'http://purl.org/dc/terms/',
  dcat: 'http://www.w3.org/ns/dcat#',
  foaf: 'http://xmlns.com/foaf/0.1/',
  spdx: 'http://spdx.org/rdf/terms#',
  xsd: 'http://www.w3.org/2001/XMLSchema#',
  'prov:startedAtTime': { '@type': 'xsd:dateTime' },
  'prov:endedAtTime': { '@type': 'xsd:dateTime' },
  'prov:generatedAtTime': { '@type': 'xsd:dateTime' },
  'prov:invalidatedAtTime': { '@type': 'xsd:dateTime' },
} as const;

/** How many generated observations are listed one by one (the count is always given). */
export const PROV_LIST_LIMIT = 1000;

export const agentId = (api: string, name: string) => `${api}/agents/${encodeURIComponent(name)}`;
export const personAgent = (api: string, name: string) => ({ '@id': agentId(api, name), '@type': ['prov:Agent', 'prov:Person'], 'foaf:name': name });
export const obsUri = (api: string, id: string) => `${api}/observations/${id.split('/').map(encodeURIComponent).join('/')}`;

/** A run's provenance as a PROV-O JSON-LD document, or undefined when there is no such run. */
export function runProv(runId: string, origin: string): Record<string, unknown> | undefined {
  const run: TwinRun | undefined = getRun(runId);
  if (!run) return undefined;
  const api = `${origin}/api/twin`;
  const src = listSources().find(s => s.id === run.sourceId);
  const obs = runObservations(run.id);
  const runIri = `${api}/runs/${run.id}`;
  const fileIri = `${runIri}#file`;
  const sourceIri = `${api}/catalog#source-${run.sourceId}`;
  const listed = obs.slice(0, PROV_LIST_LIMIT);

  const graph: Record<string, unknown>[] = [
    {
      '@id': runIri, '@type': 'prov:Activity',
      'dct:identifier': run.id, 'dct:title': `Import of ${src?.name ?? run.sourceId}`,
      'prov:startedAtTime': run.at, 'prov:endedAtTime': run.at,
      'prov:wasAssociatedWith': { '@id': agentId(api, run.by) },
      'prov:used': { '@id': fileIri },
      'dct:description': `${run.status}: ${run.accepted} of ${run.rows} rows accepted${run.rejected.length ? `, ${run.rows - run.accepted} refused with reasons` : ''}${run.error ? ` (${run.error})` : ''}.`,
      'prov:generated': listed.map(o => ({ '@id': obsUri(api, observationId(o)) })),
      'civicos:generatedCount': obs.length,
    },
    personAgent(api, run.by),
    {
      '@id': fileIri, '@type': ['prov:Entity', 'dcat:Distribution'],
      'dct:title': src?.kind === 'csv-url' ? 'The file fetched from the publisher' : 'The file uploaded by the official',
      ...(src?.kind === 'csv-url' && src.url ? { 'dcat:accessURL': { '@id': src.url } } : {}),
      'dcat:mediaType': src?.format === 'sdmx-csv' ? 'application/vnd.sdmx.data+csv' : 'text/csv',
      ...(run.sha256
        ? { 'spdx:checksum': { '@type': 'spdx:Checksum', 'spdx:algorithm': 'spdx:checksumAlgorithm_sha256', 'spdx:checksumValue': run.sha256 } }
        : { 'dct:description': 'The file\'s SHA-256 was not recorded for this import (recorded before it was kept, or the file could not be read).' }),
      'prov:wasDerivedFrom': { '@id': sourceIri },
    },
    {
      '@id': sourceIri, '@type': ['prov:Entity', 'dcat:Dataset'], 'dct:title': src?.name ?? run.sourceId,
      ...(src ? { 'dct:publisher': { '@type': ['prov:Agent', 'prov:Organization'], 'foaf:name': src.publisher } } : {}),
    },
    ...listed.map(o => ({
      '@id': obsUri(api, observationId(o)), '@type': 'prov:Entity',
      'dct:identifier': observationId(o),
      'dct:subject': getEntity(o.entityId)?.uri ?? o.entityId,
      'civicos:metric': o.metric, 'civicos:value': o.value, 'civicos:unit': o.unit, 'civicos:validFrom': o.validFrom, ...(o.validTo ? { 'civicos:validTo': o.validTo } : {}),
      'prov:wasGeneratedBy': { '@id': runIri }, 'prov:generatedAtTime': o.recordedAt,
      ...(o.supersededAt ? { 'prov:invalidatedAtTime': o.supersededAt, 'prov:wasInvalidatedBy': { '@id': `${runIri}#withdrawal` } } : {}),
    })),
  ];
  if (run.withdrawn) {
    graph.push({
      '@id': `${runIri}#withdrawal`, '@type': 'prov:Activity', 'dct:title': `Withdrawal of ${run.id}`,
      'prov:startedAtTime': run.withdrawn.at, 'prov:wasAssociatedWith': { '@id': agentId(api, run.withdrawn.by) },
      'dct:description': run.withdrawn.reason, 'prov:invalidated': listed.map(o => ({ '@id': obsUri(api, observationId(o)) })),
    }, personAgent(api, run.withdrawn.by));
  }
  return { '@context': { ...PROV_CONTEXT, civicos: `${api}/vocab#` }, '@graph': graph };
}

/**
 * A scenario version's provenance: the version as a prov:Entity derived from
 * the observations it started from (prov:wasDerivedFrom, each pointing to the
 * import that generated it), generated by the official's modelling activity,
 * a revision of the previous version, with its evidence hash. Modelled, never
 * an observation.
 */
export function scenarioProv(id: string, version: number, origin: string): Record<string, unknown> | undefined {
  const s = getScenario(id);
  const v = s?.versions.find(x => x.version === version);
  if (!s || !v) return undefined;
  const api = `${origin}/api/twin`;
  const vIri = `${api}/scenarios/${s.id}/versions/${v.version}`;
  const actIri = `${vIri}#modelling`;
  const inputs = v.inputs.map(i => ({ id: observationId({ runId: i.runId, entityId: i.entityId, metric: v.metric, validFrom: i.validFrom }), i }));
  const graph: Record<string, unknown>[] = [
    {
      '@id': vIri, '@type': 'prov:Entity',
      'dct:identifier': `${s.id} v${v.version}`, 'dct:title': `${s.name}, version ${v.version}`,
      'dct:description': `Modelled ${v.metric} from what the twin knew on ${v.asOf}, under ${v.assumptions.length} stated assumption${v.assumptions.length === 1 ? '' : 's'}. Modelled, never an observation.`,
      'prov:wasGeneratedBy': { '@id': actIri }, 'prov:generatedAtTime': v.at,
      'prov:wasAttributedTo': { '@id': agentId(api, v.by) },
      'prov:wasDerivedFrom': inputs.map(x => ({ '@id': obsUri(api, x.id) })),
      ...(v.version > 1 ? { 'prov:wasRevisionOf': { '@id': `${api}/scenarios/${s.id}/versions/${v.version - 1}` } } : {}),
      'civicos:evidenceHash': v.evidenceHash, 'civicos:evidenceVerifies': verifyVersion(s.id, v),
      'civicos:assumptions': v.assumptions,
    },
    {
      '@id': actIri, '@type': 'prov:Activity', 'dct:title': `Modelling ${s.name} v${v.version}`,
      'prov:startedAtTime': v.at, 'prov:endedAtTime': v.at,
      'prov:wasAssociatedWith': { '@id': agentId(api, v.by) },
      'prov:used': inputs.map(x => ({ '@id': obsUri(api, x.id) })),
    },
    personAgent(api, v.by),
    ...inputs.map(({ id: oid, i }) => ({
      '@id': obsUri(api, oid), '@type': 'prov:Entity', 'dct:identifier': oid, 'dct:subject': getEntity(i.entityId)?.uri ?? i.entityId,
      'civicos:value': i.value, 'civicos:unit': i.unit, 'civicos:validFrom': i.validFrom,
      'prov:wasGeneratedBy': { '@id': `${api}/runs/${i.runId}` },
    })),
  ];
  return { '@context': { ...PROV_CONTEXT, civicos: `${api}/vocab#` }, '@graph': graph };
}
