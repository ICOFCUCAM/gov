// SDMX-CSV, the CSV format statistics offices, the IMF, the World Bank and
// Eurostat publish SDMX data in (review I6, register 16.2): the twin's second
// reader beside plain CSV (lib/twin/register.ts runSource).
//
//   1.0  DATAFLOW, the dimensions (REF_AREA, INDICATOR …), TIME_PERIOD,
//        OBS_VALUE, then attributes (UNIT_MEASURE, UNIT_MULT, OBS_STATUS …)
//   2.0  STRUCTURE, STRUCTURE_ID, ACTION (I, A, R or D), then the same
//
// Both "codes" and "codes and labels" headers are read ("REF_AREA: Reference
// area", values "KE-30: Nairobi City"). Each observation becomes a plain row
// for runSource, which checks it like any other: the area must be an entity
// of the register, the metric a registered one (matched by its SDMX concept
// code), the unit that metric's unit. Anything that cannot be read is refused
// with a reason; nothing is guessed.

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
  const dim = (opts.metricDimension?.toUpperCase()) ?? METRIC_DIMENSIONS.find(has);
  if (opts.metricDimension && !has(dim!)) throw new Error(`This SDMX-CSV has no ${opts.metricDimension} column`);
  const get = (r: Record<string, string>, c: string) => { const h = byCode.get(c); return h === undefined ? '' : r[h] ?? ''; };

  const rows = raw.map(r => {
    const out: Record<string, string> = {};
    const reject = (why: string) => { out[SDMX_ROW.reject] = why; return out; };
    const action = code(get(r, 'ACTION')).toUpperCase();
    if (version === '2.0' && action === 'D') return reject('A deletion (ACTION D) is not applied: withdraw the import that brought the value instead');
    // AGENCY:ID(VERSION), possibly followed by ": label" in the codes-and-labels form.
    const flow = get(r, version === '2.0' ? 'STRUCTURE_ID' : 'DATAFLOW').replace(/\):\s.*$/, ')').trim();
    const flowId = /:([^:(]+)/.exec(flow)?.[1] ?? flow.replace(/\(.*$/, '');
    const what = dim ? code(get(r, dim)) : flowId;
    const metric = opts.codes?.[what] ?? metricFor(what);
    if (!metric) return reject(`No registered metric has the SDMX code "${what}" (set it on the metric, or map the code on the source)`);
    const start = sdmxPeriodStart(code(get(r, 'TIME_PERIOD')));
    if (!start) return reject(`"${get(r, 'TIME_PERIOD')}" is not an SDMX time period`);
    const rawValue = get(r, 'OBS_VALUE').trim();
    const status = code(get(r, 'OBS_STATUS')).toUpperCase();
    if (status === 'M' || rawValue === '' || /^nan$/i.test(rawValue)) return reject('The value is missing (OBS_STATUS M or empty)');
    let value = Number(rawValue.replace(/[\s,]/g, ''));
    if (!Number.isFinite(value)) return reject(`"${rawValue}" is not a number`);
    const mult = code(get(r, 'UNIT_MULT'));
    if (mult) {
      if (!/^-?\d{1,2}$/.test(mult)) return reject(`"${mult}" is not a unit multiplier`);
      value = value * 10 ** Number(mult);
    }
    out[SDMX_ROW.entity] = code(get(r, 'REF_AREA'));
    out[SDMX_ROW.metric] = metric;
    out[SDMX_ROW.value] = String(value);
    out[SDMX_ROW.date] = start;
    const unit = code(get(r, 'UNIT_MEASURE'));
    out[SDMX_ROW.unit] = opts.units?.[unit] ?? unit;
    if (status && STATUS[status]) out[SDMX_ROW.status] = STATUS[status]!;
    return out;
  });
  return { version, rows };
}
