// SDMX, the formats statistics offices, the IMF, the World Bank and Eurostat
// publish data in (review I6, register 16.2): the twin's readers beside plain
// CSV (lib/twin/register.ts runSource). SDMX-CSV first; SDMX-JSON (data
// message 2.0, and 1.0) and SDMX-ML 2.1 structure-specific data below. All
// three produce the same plain rows through observationRow().
//
// SDMX-CSV:
//   1.0  DATAFLOW, the dimensions (REF_AREA, INDICATOR …), TIME_PERIOD,
//        OBS_VALUE, then attributes (UNIT_MEASURE, UNIT_MULT, OBS_STATUS …)
//   2.0  STRUCTURE, STRUCTURE_ID, ACTION (I, A, R or D), then the same
//
// Both "codes" and "codes and labels" headers are read ("REF_AREA: Reference
// area", values "KE-30: Nairobi City"). Each observation becomes a plain row
// for runSource, which checks it like any other: the area must be an entity
// of the register, the metric a registered one (matched by its SDMX concept
// code), the unit that metric's UCUM unit (the source's own unit codes are
// mapped to UCUM per source, `units`). Anything that cannot be read is
// refused with a reason; nothing is guessed.

import { parseCsv } from './csv';

export interface SdmxOptions {
  /** The dimension that says what is measured (default: the first of INDICATOR, MEASURE, SERIES, CONCEPT, SUBJECT present). */
  metricDimension?: string;
  /** Explicit codes → registered metric ids, over the metrics' own SDMX concepts. */
  codes?: Record<string, string>;
  /** SDMX unit codes → UCUM (e.g. PS → {persons}); other units must already be the metric's unit. */
  units?: Record<string, string>;
}

/** Columns of the plain rows this reader produces (the mapping runSource applies to them). */
export const SDMX_ROW = { entity: '__area', value: '__value', metric: '__metric', unit: '__unit', date: '__date', status: '__status', reject: '__reject' } as const;

const METRIC_DIMENSIONS = ['INDICATOR', 'MEASURE', 'SERIES', 'CONCEPT', 'SUBJECT'];
// SDMX CL_OBS_STATUS: A normal, P provisional, E estimated, F forecast, I imputed, R revised (some offices), B break.
const STATUS: Record<string, string> = { A: 'final', P: 'provisional', E: 'provisional', I: 'provisional', R: 'revised', B: 'final' };

/** The code part of a "code: label" value or header. */
const code = (v: string | undefined) => (v ?? '').split(':')[0]!.trim();

/** An SDMX time period as the date it starts: 2024, 2024-Q2, 2024-S1, 2024-M03, 2024-03, 2024-03-31. */
export function sdmxPeriodStart(p: string): string | undefined {
  const s = p.trim();
  let m: RegExpExecArray | null;
  if ((m = /^(\d{4})(?:-A1)?$/.exec(s))) return `${m[1]}-01-01`;
  if ((m = /^(\d{4})-Q([1-4])$/.exec(s))) return `${m[1]}-${String((Number(m[2]) - 1) * 3 + 1).padStart(2, '0')}-01`;
  if ((m = /^(\d{4})-S([12])$/.exec(s))) return `${m[1]}-${m[2] === '1' ? '01' : '07'}-01`;
  if ((m = /^(\d{4})-M?(0[1-9]|1[0-2])$/.exec(s))) return `${m[1]}-${m[2]}-01`;
  if ((m = /^(\d{4}-\d{2}-\d{2})(T.*)?$/.exec(s))) return Number.isFinite(Date.parse(m[1]!)) ? m[1] : undefined;
  return undefined;
}

export function isSdmxCsv(text: string): boolean {
  const head = text.replace(/^﻿/, '').slice(0, 2000).split(/\r?\n/)[0] ?? '';
  const cols = head.split(/[,;\t]/).map(c => code(c.replace(/^"|"$/g, '')).toUpperCase());
  return (cols[0] === 'DATAFLOW' || cols[0] === 'STRUCTURE') && cols.includes('OBS_VALUE') && cols.includes('TIME_PERIOD');
}

/**
 * One SDMX observation as every reader sees it: the dataflow it belongs to,
 * the metric code (the metric dimension's value, or the flow's id when there
 * is none), the reference area, period, value and attributes, all as codes.
 */
interface SdmxObservation { flowId: string; deleted?: boolean; what: string; area: string; period: string; value: string; unit: string; mult: string; status: string }

/** An observation as a plain row for runSource, or a row carrying the reason it is refused. */
function observationRow(o: SdmxObservation, metricFor: (code: string) => string | undefined, opts: SdmxOptions): Record<string, string> {
  const out: Record<string, string> = {};
  const reject = (why: string) => { out[SDMX_ROW.reject] = why; return out; };
  if (o.deleted) return reject('A deletion (ACTION D) is not applied: withdraw the import that brought the value instead');
  const metric = opts.codes?.[o.what] ?? metricFor(o.what);
  if (!metric) return reject(`No registered metric has the SDMX code "${o.what}" (set it on the metric, or map the code on the source)`);
  const start = sdmxPeriodStart(o.period);
  if (!start) return reject(`"${o.period}" is not an SDMX time period`);
  const rawValue = o.value.trim();
  const status = o.status.toUpperCase();
  if (status === 'M' || rawValue === '' || /^nan$/i.test(rawValue)) return reject('The value is missing (OBS_STATUS M or empty)');
  let value = Number(rawValue.replace(/[\s,]/g, ''));
  if (!Number.isFinite(value)) return reject(`"${rawValue}" is not a number`);
  if (o.mult) {
    if (!/^-?\d{1,2}$/.test(o.mult)) return reject(`"${o.mult}" is not a unit multiplier`);
    value = value * 10 ** Number(o.mult);
  }
  out[SDMX_ROW.entity] = o.area;
  out[SDMX_ROW.metric] = metric;
  out[SDMX_ROW.value] = String(value);
  out[SDMX_ROW.date] = start;
  // The source's own unit codes as UCUM (per source); other codes must already be the metric's UCUM unit.
  out[SDMX_ROW.unit] = opts.units?.[o.unit] ?? o.unit;
  if (status && STATUS[status]) out[SDMX_ROW.status] = STATUS[status]!;
  return out;
}

/** The metric dimension of a file: the one asked for, or the first of INDICATOR, MEASURE, SERIES, CONCEPT, SUBJECT present. */
function metricDimension(has: (c: string) => boolean, opts: SdmxOptions, what: string): string | undefined {
  const dim = opts.metricDimension?.toUpperCase() ?? METRIC_DIMENSIONS.find(has);
  if (opts.metricDimension && !has(dim!)) throw new Error(`This ${what} has no ${opts.metricDimension} ${what === 'SDMX-CSV' ? 'column' : 'dimension'}`);
  return dim;
}

/** The dataflow id in an SDMX reference (AGENCY:ID(VERSION), or a URN …Dataflow=AGENCY:ID(VERSION)). */
const flowIdOf = (ref: string) => /Dataflow=[^:]+:([^(]+)\(/.exec(ref)?.[1] ?? /:([^:(]+)/.exec(ref)?.[1] ?? ref.replace(/\(.*$/, '');

/**
 * Read SDMX-CSV into plain rows for runSource. `metricFor(code)` names the
 * registered metric an SDMX code stands for (undefined when none does).
 */
export function sdmxRows(text: string, metricFor: (code: string) => string | undefined, opts: SdmxOptions = {}): { version: '1.0' | '2.0'; rows: Record<string, string>[] } {
  const raw = parseCsv(text);
  if (!raw.length) return { version: '1.0', rows: [] };
  const headers = Object.keys(raw[0]!);
  const byCode = new Map(headers.map(h => [code(h).toUpperCase(), h]));
  const version = byCode.has('STRUCTURE') ? '2.0' : '1.0';
  const has = (c: string) => byCode.has(c);
  if (!has('OBS_VALUE') || !has('TIME_PERIOD')) throw new Error('Not SDMX-CSV: it needs TIME_PERIOD and OBS_VALUE columns');
  if (!has('REF_AREA')) throw new Error('This SDMX-CSV has no REF_AREA column: the twin places values by reference area');
  const dim = metricDimension(has, opts, 'SDMX-CSV');
  const get = (r: Record<string, string>, c: string) => { const h = byCode.get(c); return h === undefined ? '' : r[h] ?? ''; };

  const rows = raw.map(r => {
    // AGENCY:ID(VERSION), possibly followed by ": label" in the codes-and-labels form.
    const flow = get(r, version === '2.0' ? 'STRUCTURE_ID' : 'DATAFLOW').replace(/\):\s.*$/, ')').trim();
    const flowId = /:([^:(]+)/.exec(flow)?.[1] ?? flow.replace(/\(.*$/, '');
    return observationRow({
      flowId,
      deleted: version === '2.0' && code(get(r, 'ACTION')).toUpperCase() === 'D',
      what: dim ? code(get(r, dim)) : flowId,
      area: code(get(r, 'REF_AREA')),
      period: code(get(r, 'TIME_PERIOD')),
      value: get(r, 'OBS_VALUE'),
      unit: code(get(r, 'UNIT_MEASURE')),
      mult: code(get(r, 'UNIT_MULT')),
      status: code(get(r, 'OBS_STATUS')),
    }, metricFor, opts);
  });
  return { version, rows };
}

// ── SDMX-JSON (data message 2.0, and 1.0) ──────────────────────────────────

interface JsonComponent { id: string; values?: { id?: string; value?: unknown; start?: string }[] }
interface JsonStructure {
  id?: string;
  links?: { urn?: string; href?: string }[];
  dimensions?: { dataSet?: JsonComponent[]; series?: JsonComponent[]; observation?: JsonComponent[] };
  attributes?: { dataSet?: JsonComponent[]; series?: JsonComponent[]; observation?: JsonComponent[] };
}
interface JsonDataSet {
  structure?: number; action?: string; links?: { urn?: string; href?: string }[];
  attributes?: (number | null)[];
  series?: Record<string, { attributes?: (number | null)[]; observations?: Record<string, unknown[]> }>;
  observations?: Record<string, unknown[]>;
}
interface JsonMessage { meta?: { schema?: string }; data?: JsonData }
interface JsonData { structures?: JsonStructure[]; structure?: JsonStructure; dataSets?: JsonDataSet[] }

export function isSdmxJson(text: string): boolean {
  const head = text.replace(/^﻿/, '').trimStart().slice(0, 200_000);
  return head.startsWith('{') && /"dataSets"\s*:/.test(head) && /"structures?"\s*:/.test(head);
}

/** A component's value at an index, as a code. */
function valueCode(c: JsonComponent | undefined, idx: unknown): string {
  if (!c || idx === null || idx === undefined) return '';
  const v = c.values?.[Number(idx)];
  const raw = v?.id ?? v?.value ?? v?.start;
  return raw === undefined || raw === null || typeof raw === 'object' ? '' : String(raw);
}

/**
 * Read an SDMX-JSON data message (2.0, or 1.0) into plain rows: every data
 * set's series and their observations (or flat observations), with
 * dimensions and attributes at data-set, series and observation level.
 */
export function sdmxJsonRows(text: string, metricFor: (code: string) => string | undefined, opts: SdmxOptions = {}): { version: '1.0' | '2.0'; rows: Record<string, string>[] } {
  let msg: JsonMessage & JsonData;
  try { msg = JSON.parse(text.replace(/^﻿/, '')); } catch { throw new Error('Not SDMX-JSON: the file is not valid JSON'); }
  const data: JsonData = msg.data ?? msg;
  const structures = data.structures ?? (data.structure ? [data.structure] : []);
  if (!structures.length || !Array.isArray(data.dataSets)) throw new Error('Not SDMX-JSON data: it needs data.structures (or data.structure) and data.dataSets');
  const version: '1.0' | '2.0' = data.structures || /\/2\.\d/.test(msg.meta?.schema ?? '') ? '2.0' : '1.0';
  const rows: Record<string, string>[] = [];
  for (const ds of data.dataSets) {
    const st = structures[ds.structure ?? 0];
    if (!st) throw new Error(`A data set names structure ${ds.structure}, which the message does not have`);
    const dims = st.dimensions ?? {}, attrs = st.attributes ?? {};
    const all = [...(dims.dataSet ?? []), ...(dims.series ?? []), ...(dims.observation ?? []), ...(attrs.dataSet ?? []), ...(attrs.series ?? []), ...(attrs.observation ?? [])];
    const has = (c: string) => all.some(x => x.id?.toUpperCase() === c);
    if (!has('TIME_PERIOD')) throw new Error('This SDMX-JSON has no TIME_PERIOD dimension');
    if (!has('REF_AREA')) throw new Error('This SDMX-JSON has no REF_AREA dimension: the twin places values by reference area');
    const dim = metricDimension(has, opts, 'SDMX-JSON');
    const ref = [...(st.links ?? []), ...(ds.links ?? [])].map(l => l.urn ?? l.href ?? '').find(u => /Dataflow=/.test(u)) ?? st.id ?? '';
    const flowId = flowIdOf(ref);
    const deleted = /^delete$/i.test(ds.action ?? '');
    const base: Record<string, string> = {};
    for (const c of dims.dataSet ?? []) base[c.id.toUpperCase()] = valueCode(c, 0);
    (ds.attributes ?? []).forEach((idx, i) => { const c = attrs.dataSet?.[i]; if (c) base[c.id.toUpperCase()] = valueCode(c, idx); });
    const observation = (codes: Record<string, string>, key: string, obs: unknown[]) => {
      const c = { ...codes };
      key.split(':').forEach((idx, i) => { const d = dims.observation?.[i]; if (d && idx !== '') c[d.id.toUpperCase()] = valueCode(d, idx); });
      (obs ?? []).slice(1).forEach((idx, i) => { const a = attrs.observation?.[i]; const v = valueCode(a, idx); if (a && v) c[a.id.toUpperCase()] = v; });
      const value = obs?.[0];
      rows.push(observationRow({
        flowId, deleted, what: dim ? c[dim] ?? '' : flowId, area: c.REF_AREA ?? '', period: c.TIME_PERIOD ?? '',
        value: value === null || value === undefined ? '' : String(value), unit: c.UNIT_MEASURE ?? '', mult: c.UNIT_MULT ?? '', status: c.OBS_STATUS ?? '',
      }, metricFor, opts));
    };
    for (const [key, series] of Object.entries(ds.series ?? {})) {
      const codes = { ...base };
      key.split(':').forEach((idx, i) => { const d = dims.series?.[i]; if (d) codes[d.id.toUpperCase()] = valueCode(d, idx); });
      (series.attributes ?? []).forEach((idx, i) => { const a = attrs.series?.[i]; const v = valueCode(a, idx); if (a && v) codes[a.id.toUpperCase()] = v; });
      for (const [k, obs] of Object.entries(series.observations ?? {})) observation(codes, k, obs);
    }
    for (const [k, obs] of Object.entries(ds.observations ?? {})) observation(base, k, obs);
  }
  return { version, rows };
}

// ── SDMX-ML 2.1 structure-specific data ────────────────────────────────────

export function isSdmxMl(text: string): boolean {
  return /<([\w-]+:)?(StructureSpecific|StructureSpecificTimeSeries|Generic|GenericTimeSeries)Data\b/.test(text.replace(/^﻿/, '').slice(0, 4000));
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const unescapeXml = (v: string) => v.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e: string) =>
  (e[0] === '#' ? String.fromCodePoint(e[1]!.toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : ENTITIES[e] ?? m));

/** The un-prefixed attributes of an element's tag text, by upper-case id (namespaced ones such as xsi:type are left out). */
function xmlAttributes(tag: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of tag.matchAll(/([\w:.-]+)\s*=\s*("([^"]*)"|'([^']*)')/g)) {
    if (m[1]!.includes(':')) continue;
    out[m[1]!.toUpperCase()] = unescapeXml(m[3] ?? m[4] ?? '');
  }
  return out;
}

/**
 * Read SDMX-ML 2.1 structure-specific data (the XML statistics offices and
 * the IMF publish): each DataSet's Series and Obs elements, whose XML
 * attributes are the dimensions and attributes by id (flat Obs carry every
 * dimension; DataSet attributes apply to all). A DataSet with
 * action="Delete" is refused row by row. Generic data messages, DOCTYPEs and
 * entity declarations are refused with the reason. No XML library: the
 * reader scans the elements it needs.
 */
export function sdmxMlRows(text: string, metricFor: (code: string) => string | undefined, opts: SdmxOptions = {}): { version: '2.1'; rows: Record<string, string>[] } {
  const xml = text.replace(/^﻿/, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '');
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error('SDMX-ML with a DOCTYPE or entity declarations is refused');
  if (/<([\w-]+:)?Generic(TimeSeries)?Data\b/.test(xml.slice(0, 4000))) throw new Error('This is SDMX-ML generic data: ask the publisher for structure-specific data, SDMX-JSON or SDMX-CSV');
  if (!/<([\w-]+:)?StructureSpecific(TimeSeries)?Data\b/.test(xml.slice(0, 4000))) throw new Error('Not SDMX-ML structure-specific data');
  const header = /<([\w-]+:)?Header\b[\s\S]*?<\/([\w-]+:)?Header>/.exec(xml)?.[0] ?? '';
  const flowRef = /Dataflow=[^"'\s]+/.exec(header)?.[0] ?? /<([\w-]+:)?Ref\b[^>]*\bid="([^"]+)"/.exec(header)?.[2] ?? '';
  const flowId = flowRef ? flowIdOf(flowRef) : '';
  let dataSet: Record<string, string> | null = null, deleted = false, series: Record<string, string> | null = null;
  const seen = new Set<string>();
  const found: { codes: Record<string, string>; deleted: boolean }[] = [];
  for (const m of xml.matchAll(/<(\/?)([\w-]+:)?([\w.-]+)((?:\s+[\w:.-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>/g)) {
    const [, close, , local, attrText = '', selfClose] = m;
    if (local === 'DataSet') {
      if (close) { dataSet = null; series = null; continue; }
      deleted = /(^|\s)action\s*=\s*["']Delete["']/i.test(attrText);
      dataSet = xmlAttributes(attrText);
      delete dataSet.ACTION;
      continue;
    }
    if (!dataSet) continue;
    if (local === 'Series') {
      series = close || selfClose ? null : { ...dataSet, ...xmlAttributes(attrText) };
      continue;
    }
    if (local === 'Obs' && !close) {
      const codes = { ...(series ?? dataSet), ...xmlAttributes(attrText) };
      Object.keys(codes).forEach(k => seen.add(k));
      found.push({ codes, deleted });
    }
  }
  if (!found.length) return { version: '2.1', rows: [] };
  const has = (c: string) => seen.has(c);
  if (!has('TIME_PERIOD') || !has('OBS_VALUE')) throw new Error('This SDMX-ML has no TIME_PERIOD or OBS_VALUE on its observations');
  if (!has('REF_AREA')) throw new Error('This SDMX-ML has no REF_AREA: the twin places values by reference area');
  const dim = metricDimension(has, opts, 'SDMX-ML');
  const rows = found.map(({ codes: c, deleted: del }) => observationRow({
    flowId, deleted: del, what: dim ? c[dim] ?? '' : flowId, area: c.REF_AREA ?? '', period: c.TIME_PERIOD ?? '',
    value: c.OBS_VALUE ?? '', unit: c.UNIT_MEASURE ?? '', mult: c.UNIT_MULT ?? '', status: c.OBS_STATUS ?? '',
  }, metricFor, opts));
  return { version: '2.1', rows };
}

// ── Formats ────────────────────────────────────────────────────────────────

/** The SDMX formats a twin source may be read in. */
export type SdmxFormat = 'sdmx-csv' | 'sdmx-json' | 'sdmx-ml';
export const SDMX_FORMATS: readonly SdmxFormat[] = ['sdmx-csv', 'sdmx-json', 'sdmx-ml'];
export const isSdmxFormat = (f: unknown): f is SdmxFormat => SDMX_FORMATS.includes(f as SdmxFormat);

/** Media type and name per format (fetching, the catalogue and provenance). */
export const SDMX_MEDIA: Record<SdmxFormat, { type: string; name: string; accept: string }> = {
  'sdmx-csv': { type: 'application/vnd.sdmx.data+csv', name: 'SDMX-CSV', accept: 'application/vnd.sdmx.data+csv, text/csv, text/plain;q=0.8, */*;q=0.1' },
  'sdmx-json': { type: 'application/vnd.sdmx.data+json', name: 'SDMX-JSON', accept: 'application/vnd.sdmx.data+json;version=2.0.0, application/vnd.sdmx.data+json, application/json;q=0.8, */*;q=0.1' },
  'sdmx-ml': { type: 'application/vnd.sdmx.structurespecificdata+xml', name: 'SDMX-ML', accept: 'application/vnd.sdmx.structurespecificdata+xml;version=2.1, application/xml;q=0.8, text/xml;q=0.8, */*;q=0.1' },
};

/** Read an SDMX file in its source's format into plain rows. */
export function readSdmx(format: SdmxFormat, text: string, metricFor: (code: string) => string | undefined, opts: SdmxOptions = {}): Record<string, string>[] {
  if (format === 'sdmx-json') return sdmxJsonRows(text, metricFor, opts).rows;
  if (format === 'sdmx-ml') return sdmxMlRows(text, metricFor, opts).rows;
  return sdmxRows(text, metricFor, opts).rows;
}
