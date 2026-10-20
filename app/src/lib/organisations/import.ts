// Loading an existing register into the organisations register (register
// 18.11): the authority that keeps a register type loads the organisations
// it already holds, as a CSV saved from its spreadsheet or system. Every row
// is checked first; a row that cannot be read is refused with its reason,
// never guessed. A load names the official, keeps the file's SHA-256 and
// goes to the audit chain. Each organisation gets a new register number and
// keeps its old one as an identifier; its standing is the one the file
// states, with a history step that names the load. A load can be withdrawn
// while nobody has acted on what it brought in (organisations no case has
// touched since are removed).

import { createHash } from 'node:crypto';
import { recordAudit } from '@/lib/data/store/audit';
import { parseCsv } from '@/lib/twin/csv';
import { uuid7 } from '@/lib/data/uuid7';
import { organisationsDb, nextOrganisationNumber, registerType, checkNewOrganisation, current, type OrgLoad, type Organisation, type StandingState } from './register';

export const ORG_COLUMNS = [
  { name: 'name', required: true, means: 'The registered name.' },
  { name: 'kind', required: true, means: 'company, ngo, university, pharmacy… (as the register type allows).' },
  { name: 'number', required: false, means: 'Its number in the register you are loading from (kept as an identifier).' },
  { name: 'standing', required: true, means: 'granted, suspended, revoked, expired or struck-off.' },
  { name: 'since', required: false, means: 'When that standing began (YYYY-MM-DD).' },
  { name: 'valid_until', required: false, means: 'When a grant ends (YYYY-MM-DD).' },
  { name: 'conditions', required: false, means: 'Conditions, separated by semicolons.' },
  { name: 'region', required: false, means: 'One of the nation\'s regions.' },
  { name: 'address', required: false, means: 'Registered address.' },
];
export const MAX_ORG_ROWS = 10_000;
const STATES: StandingState[] = ['granted', 'suspended', 'revoked', 'expired', 'struck-off'];
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function loadOrganisations(input: { register: string; csv: string }, by: string, now = new Date()): OrgLoad | { error: string } {
  const t = registerType(input.register);
  if (!t) return { error: `No register ${input.register}` };
  if (typeof input.csv !== 'string' || !input.csv.trim()) return { error: 'Send the file (CSV)' };
  if (input.csv.length > 5_000_000) return { error: 'The file is larger than 5 MB: split it' };
  const rows = parseCsv(input.csv);
  if (!rows.length) return { error: 'The file has no rows under its header' };
  if (rows.length > MAX_ORG_ROWS) return { error: `At most ${MAX_ORG_ROWS} rows in one load` };
  const db = organisationsDb();
  const at = now.toISOString();
  const load: OrgLoad = { id: uuid7(), register: t.key, by, at, sha256: createHash('sha256').update(input.csv, 'utf8').digest('hex'), rows: rows.length, loaded: 0, refused: [] };
  const seen = new Set<string>();
  for (const [i, r] of rows.entries()) {
    const row = i + 2; // the header is row 1
    const ok = checkNewOrganisation({ name: r.name, kind: r.kind, region: r.region, address: r.address });
    if ('error' in ok) { load.refused.push({ row, reason: ok.error }); continue; }
    if (!t.orgKinds.includes(ok.kind)) { load.refused.push({ row, reason: `${t.title} does not hold a ${ok.kind}` }); continue; }
    const state = (r.standing ?? '').trim().toLowerCase() as StandingState;
    if (!STATES.includes(state)) { load.refused.push({ row, reason: `Standing must be one of ${STATES.join(', ')}` }); continue; }
    for (const k of ['since', 'valid_until'] as const) if (r[k] && !DATE.test(r[k]!.trim())) { load.refused.push({ row, reason: `${k} must be a date (YYYY-MM-DD)` }); break; }
    if (load.refused.at(-1)?.row === row) continue;
    const key = `${ok.name.toLowerCase()}|${ok.kind}`;
    if (seen.has(key)) { load.refused.push({ row, reason: `${ok.name} appears twice in the file` }); continue; }
    if (db.orgs.some(o => current(o).name.toLowerCase() === ok.name.toLowerCase() && current(o).kind === ok.kind)) { load.refused.push({ row, reason: `${ok.name} is already in the register` }); continue; }
    seen.add(key);
    const since = r.since?.trim() ? `${r.since.trim()}T00:00:00.000Z` : at;
    const validUntil = r.valid_until?.trim() || undefined;
    const reason = `Loaded from the existing register (file ${load.sha256.slice(0, 12)})`;
    const o: Organisation = {
      id: uuid7(), number: nextOrganisationNumber(now), facilities: [], createdAt: at, load: load.id,
      ...(r.number?.trim() ? { previousNumber: r.number.trim().slice(0, 80) } : {}),
      versions: [{ n: 1, name: ok.name, kind: ok.kind, ...(ok.region ? { region: ok.region } : {}), ...(ok.address ? { address: ok.address } : {}), representatives: [], at, by, reason }],
      standings: [{ register: t.key, state, since, ...(validUntil ? { validUntil } : {}), conditions: (r.conditions ?? '').split(';').map(x => x.trim()).filter(Boolean), history: [{ state, at, by, reason, ...(validUntil ? { validUntil } : {}) }] }],
    };
    db.orgs.push(o);
    load.loaded++;
  }
  db.loads.push(load);
  recordAudit(by, 'organisation.load', `OrganisationLoad:${load.id}`, 'ok', `${t.title} · ${load.loaded} loaded · ${load.refused.length} refused · sha256 ${load.sha256}`);
  return structuredClone(load);
}

/** Withdraw a load: the organisations it brought in that nobody has acted on since leave the register. */
export function withdrawLoad(id: string, by: string, now = new Date()): OrgLoad | { error: string } {
  const db = organisationsDb();
  const load = db.loads.find(l => l.id === id);
  if (!load) return { error: 'No such load' };
  if (load.withdrawn) return { error: 'This load was already withdrawn' };
  const untouched = (o: Organisation) => o.load === id && o.versions.length === 1 && o.standings.every(s => s.history.length === 1) && !o.facilities.length;
  const before = db.orgs.length;
  db.orgs = db.orgs.filter(o => !untouched(o));
  load.withdrawn = { by, at: now.toISOString(), removed: before - db.orgs.length };
  recordAudit(by, 'organisation.load.withdraw', `OrganisationLoad:${id}`, 'ok', `${load.withdrawn.removed} removed`);
  return structuredClone(load);
}

export const listLoads = (): OrgLoad[] => structuredClone(organisationsDb().loads);
