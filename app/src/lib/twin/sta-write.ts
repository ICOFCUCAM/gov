// SensorThings API v1.1 create for the twin's stream sources (review I3;
// register 16.19): a sensor gateway posts the readings of a Datastream bound
// to a stream source (lib/twin/stream.ts, `ingest.integrationId`):
//
//   POST /Observations                        { Datastream: { "@iot.id": "telemetry:<stream>" }, phenomenonTime, result }
//   POST /Datastreams('telemetry:<stream>')/Observations   { phenomenonTime, result }
//   POST /CreateObservations                  the Data Array extension:
//        [{ Datastream: { "@iot.id": … }, components: ["phenomenonTime", "result"], dataArray: [[time, value], …] }]
//
// Only the integration bound to the stream source may post (its own key,
// `Authorization: Bearer civ_…`, scope sta:write, approved, within its rate
// limit; lib/data/store verifyIntegrationKey). Readings go through the one
// ingestion path (lib/twin/stream-ingest.ts): checked, refused with reasons,
// audited once per request, kept as readings that the stream's daily run turns
// into observations. Nothing else is created, changed or deleted here: Things,
// Sensors and Datastreams come from the register; PATCH and DELETE are
// refused.

import { verifyIntegrationKey } from '@/lib/data/store';
import { listSources, type TwinSource } from './register';
import { STA_WRITE_SCOPE } from './stream';
import { ingestReadings, type IncomingReading } from './stream-ingest';

export interface StaWriteAnswer { status: number; body: unknown; headers?: Record<string, string> }

const err = (status: number, message: string, headers?: Record<string, string>): StaWriteAnswer => ({ status, body: { code: status, type: 'error', message }, ...(headers ? { headers } : {}) });

/** The id in a path segment such as Datastreams('telemetry:x'), quotes undoubled. */
const SEG = /^([A-Za-z]+)(?:\('((?:[^']|'')*)'\))?$/;
/** A Datastream reference in a body: { "@iot.id": "telemetry:<stream>" }. */
const datastreamOf = (v: unknown): string | undefined => {
  const id = v && typeof v === 'object' ? (v as Record<string, unknown>)['@iot.id'] : undefined;
  return typeof id === 'string' ? id : undefined;
};
const quote = (id: string) => `('${id.replace(/'/g, "''").replace(/[^A-Za-z0-9:_.~'|-]/g, c => encodeURIComponent(c))}')`;
/** Header text kept to printable ASCII (reasons may carry other characters). */
const ascii = (s: string) => s.replace(/[^\x20-\x7e]/g, c => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);

/** The stream source a key may post a Datastream's readings to, or the refusal. */
function sourceFor(datastream: string, integrationId: string): TwinSource | StaWriteAnswer {
  const m = /^telemetry:(.+)$/.exec(datastream);
  if (!m) return err(400, `Readings are created only on a stream's Datastream (telemetry:<stream id>), not on ${datastream.slice(0, 80)}`);
  const streamId = m[1]!;
  const receiving = listSources().filter(s => s.kind === 'stream' && s.stream?.streamId === streamId && s.stream.ingest);
  if (!receiving.length) return err(404, `No twin stream source receives readings for ${datastream}`);
  const mine = receiving.find(s => s.stream!.ingest!.integrationId === integrationId);
  if (!mine) return err(403, `This integration may not post readings for ${datastream}`);
  return mine;
}

/**
 * Answer a SensorThings create: `path` is the resource path after /v1.1,
 * `body` the parsed JSON, `authorization` the request's header.
 */
export function staCreate(base: string, path: string[], body: unknown, authorization: string | null, now = new Date()): StaWriteAnswer {
  if (!authorization) return err(401, `Send the key of the integration bound to the stream: Authorization: Bearer civ_… (scope ${STA_WRITE_SCOPE})`, { 'WWW-Authenticate': `Bearer realm="civicos-twin", scope="${STA_WRITE_SCOPE}"` });
  const key = verifyIntegrationKey(authorization, STA_WRITE_SCOPE, now.getTime());
  if (!key.ok) {
    const h: Record<string, string> = {};
    if (key.status === 401) h['WWW-Authenticate'] = `Bearer realm="civicos-twin", scope="${STA_WRITE_SCOPE}"`;
    if (key.retryAfterSeconds) h['Retry-After'] = String(key.retryAfterSeconds);
    return err(key.status, key.error, h);
  }
  const by = `Integration ${key.client.name} (${key.client.id})`;
  const segs = path.map(p => SEG.exec(p));
  if (segs.some(s => !s)) return err(404, `Nothing at "${path.join('/')}"`);
  const names = segs.map(s => s![1]!);

  // Data Array extension: many readings, possibly for several Datastreams.
  if (names.length === 1 && names[0] === 'CreateObservations') {
    if (!Array.isArray(body) || !body.length) return err(400, 'CreateObservations takes an array of { Datastream, components, dataArray }');
    const links: string[] = [];
    const reasons: { index: number; reason: string }[] = [];
    for (const group of body as Record<string, unknown>[]) {
      const ds = datastreamOf(group?.Datastream);
      const components = Array.isArray(group?.components) ? (group.components as unknown[]).map(String) : [];
      const rows = Array.isArray(group?.dataArray) ? (group.dataArray as unknown[]) : [];
      const fail = (reason: string) => { for (let i = 0; i < Math.max(1, rows.length); i++) { reasons.push({ index: links.length, reason }); links.push('error'); } };
      if (!ds) { fail('Name the Datastream: { "@iot.id": "telemetry:<stream id>" }'); continue; }
      const unknown = components.find(c => !['phenomenonTime', 'result', 'resultTime', 'parameters'].includes(c));
      if (unknown) { fail(`The component ${unknown.slice(0, 40)} is not taken (phenomenonTime, result, resultTime, parameters)`); continue; }
      const ti = components.indexOf('phenomenonTime'), vi = components.indexOf('result'), pi = components.indexOf('parameters');
      if (ti < 0 || vi < 0) { fail('The components name phenomenonTime and result'); continue; }
      const source = sourceFor(ds, key.client.id);
      if ('status' in source) { fail((source.body as { message: string }).message); continue; }
      const items: IncomingReading[] = rows.map(r => (Array.isArray(r) ? { phenomenonTime: r[ti], result: r[vi], unit: pi >= 0 ? (r[pi] as { unit?: unknown } | undefined)?.unit : undefined } : { result: undefined }));
      const done = ingestReadings(source, items, { via: 'sta', by, now });
      if ('error' in done) { fail(done.error); continue; }
      const kept = new Map<number, string>();
      let k = 0;
      const refusedAt = new Map(done.refused.map(r => [r.index, r.reason]));
      items.forEach((_, i) => { if (!refusedAt.has(i)) kept.set(i, done.accepted[k++]!.id); });
      items.forEach((_, i) => {
        const reason = refusedAt.get(i);
        if (reason) { reasons.push({ index: links.length, reason }); links.push('error'); }
        else links.push(`${base}/Observations${quote(`${ds}~${kept.get(i)}`)}`);
      });
    }
    const headers: Record<string, string> = {};
    if (reasons.length) headers['X-Refused'] = ascii(JSON.stringify(reasons.slice(0, 20))).slice(0, 4000);
    return { status: 201, body: links, headers };
  }

  // One Observation, on the Observations set or through its Datastream.
  let ds: string | undefined;
  if (names.length === 1 && names[0] === 'Observations' && segs[0]![2] === undefined) ds = datastreamOf((body as Record<string, unknown> | null)?.Datastream);
  else if (names.length === 2 && names[0] === 'Datastreams' && segs[0]![2] !== undefined && names[1] === 'Observations' && segs[1]![2] === undefined) ds = segs[0]![2]!.replace(/''/g, "'");
  else return err(405, 'Only Observations of a stream source\'s Datastream are created here (POST Observations, Datastreams(\'telemetry:<stream id>\')/Observations or CreateObservations); the register holds everything else');
  if (!body || typeof body !== 'object' || Array.isArray(body)) return err(400, 'Send one Observation: { "phenomenonTime": "…Z", "result": 12.5 }');
  if (!ds) return err(400, 'Name the Datastream: { "Datastream": { "@iot.id": "telemetry:<stream id>" } }');
  const source = sourceFor(ds, key.client.id);
  if ('status' in source) return source;
  const b = body as Record<string, unknown>;
  const params = b.parameters && typeof b.parameters === 'object' ? (b.parameters as { unit?: unknown }) : undefined;
  const done = ingestReadings(source, [{ phenomenonTime: b.phenomenonTime, result: b.result, unit: params?.unit }], { via: 'sta', by, now });
  if ('error' in done) return err(400, done.error);
  if (done.refused.length) return err(done.refused[0]!.reason.includes('already held') ? 409 : 400, done.refused[0]!.reason);
  const r = done.accepted[0]!;
  const id = `${ds}~${r.id}`;
  const self = `${base}/Observations${quote(id)}`;
  return {
    status: 201,
    headers: { Location: self },
    body: { '@iot.id': id, '@iot.selfLink': self, phenomenonTime: r.ts, resultTime: r.receivedAt, result: r.value, parameters: { kind: 'reading', via: 'sta' }, 'Datastream@iot.navigationLink': `${self}/Datastream` },
  };
}
