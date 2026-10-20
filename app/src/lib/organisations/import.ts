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
//
// A load enters standings without a case, so it carries the same safeguards
// as a decision (acceptance hardening): it is proposed by one official of the
// authority that keeps the register type, its rows checked and held but not
// yet in the register, and enters the register only when a different person
// confirms it within the dual-control waiting period. In a production
// installation the register type's authority mapping must be approved and in
// force, and no load enters while that mapping is suspended.

import { createHash } from 'node:crypto';
import { recordAudit } from '@/lib/data/store/audit';
import { parseCsv } from '@/lib/twin/csv';
import { uuid7 } from '@/lib/data/uuid7';
import { dualControlRefusal, independenceOf } from '@/lib/data/dual-control';
import { dualControlPolicy } from '@/lib/casework/dual-control-policy';
import { ownerInstitution } from '@/lib/casework/packages';
import { authorityFor } from '@/lib/data/store';
import { samplesAllowed } from '@/lib/ops/mode';
import { powerRefusal } from '@/lib/permits/authority';
import { organisationsDb, nextOrganisationNumber, registerType, checkNewOrganisation, current, type OrgLoad, type OrgLoadRow, type Organisation, type RegisterType, type StandingState } from './register';

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

/** Why no load may enter this register type now (the authority mapping, in production; a suspension, always), or null. */
function authorityRefusal(t: RegisterType, now: Date): string | null {
  if (!t.permitType) return samplesAllowed() ? null : `${t.title} names no permit type, so no authority mapping covers a load`;
  const keeper = ownerInstitution(t.authority, authorityFor) ?? '';
  return powerRefusal(t.permitType, 'issue', keeper, a => ownerInstitution(a, authorityFor), { on: now.toISOString().slice(0, 10), required: !samplesAllowed() });
}

/** Check a file and propose it: its rows are held on the load, not yet in the register, until a second official confirms. */
export function loadOrganisations(input: { register: string; csv: string }, by: string, now = new Date(), byId?: string): OrgLoad | { error: string } {
  const t = registerType(input.register);
  if (!t) return { error: `No register ${input.register}` };
  const held = authorityRefusal(t, now);
  if (held) return { error: held };
  if (typeof input.csv !== 'string' || !input.csv.trim()) return { error: 'Send the file (CSV)' };
  if (input.csv.length > 5_000_000) return { error: 'The file is larger than 5 MB: split it' };
  const rows = parseCsv(input.csv);
  if (!rows.length) return { error: 'The file has no rows under its header' };
  if (rows.length > MAX_ORG_ROWS) return { error: `At most ${MAX_ORG_ROWS} rows in one load` };
  const db = organisationsDb();
  const at = now.toISOString();
  const load: OrgLoad = {
    id: uuid7(), register: t.key, by, ...(byId ? { byId } : {}), at, sha256: createHash('sha256').update(input.csv, 'utf8').digest('hex'), rows: rows.length, loaded: 0, refused: [],
    state: 'proposed', expiresAt: new Date(now.getTime() + dualControlPolicy().pendingHours * 3_600_000).toISOString(), staged: [],
  };
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
    if (inRegister(ok.name, ok.kind)) { load.refused.push({ row, reason: `${ok.name} is already in the register` }); continue; }
    seen.add(key);
    load.staged!.push({
      row, name: ok.name, kind: ok.kind, state,
      ...(ok.region ? { region: ok.region } : {}), ...(ok.address ? { address: ok.address } : {}),
      ...(r.number?.trim() ? { previousNumber: r.number.trim().slice(0, 80) } : {}),
      ...(r.since?.trim() ? { since: r.since.trim() } : {}), ...(r.valid_until?.trim() ? { validUntil: r.valid_until.trim() } : {}),
      conditions: (r.conditions ?? '').split(';').map(x => x.trim()).filter(Boolean),
    });
  }
  db.loads.push(load);
  recordAudit(by, 'organisation.load.propose', `OrganisationLoad:${load.id}`, 'ok', `${t.title} · ${load.staged!.length} checked, awaiting a second official · ${load.refused.length} refused · sha256 ${load.sha256}`);
  return publicLoad(load);
}

const inRegister = (name: string, kind: string) => organisationsDb().orgs.some(o => current(o).name.toLowerCase() === name.toLowerCase() && current(o).kind === kind);

/** A different official confirms a proposed load: its checked rows enter the register (rows that entered meanwhile are refused). */
export function confirmLoad(id: string, by: string, now = new Date(), byId?: string): OrgLoad | { error: string } {
  const db = organisationsDb();
  const load = db.loads.find(l => l.id === id);
  if (!load) return { error: 'No such load' };
  if ((load.state ?? 'confirmed') !== 'proposed') return { error: `This load is ${load.state ?? 'confirmed'}; only a proposed load is confirmed` };
  if (Date.parse(load.expiresAt ?? load.at) < now.getTime()) {
    load.state = 'lapsed'; load.staged = [];
    recordAudit(by, 'organisation.load.lapse', `OrganisationLoad:${id}`, 'ok', 'Not confirmed within the waiting period; propose the file again');
    return { error: 'This load lapsed unconfirmed after the waiting period; propose the file again' };
  }
  const why = dualControlRefusal({ by: load.by, ...(load.byId ? { byId: load.byId } : {}) }, { by, ...(byId ? { byId } : {}) });
  if (why) return { error: why };
  const independence = independenceOf(load.byId, byId);
  if (dualControlPolicy().requireIdentityBinding && independence !== 'identity-provider') return { error: 'The nation requires both officials to be linked to the national identity provider before a load is confirmed (Officials → link identity)' };
  const t = registerType(load.register);
  if (!t) return { error: `No register ${load.register}` };
  const held = authorityRefusal(t, now);
  if (held) return { error: held };
  const at = now.toISOString();
  const reason = `Loaded from the existing register (file ${load.sha256.slice(0, 12)}), proposed by ${load.by}, confirmed by ${by}`;
  for (const r of load.staged ?? []) {
    if (inRegister(r.name, r.kind)) { load.refused.push({ row: r.row, reason: `${r.name} entered the register after the load was proposed` }); continue; }
    const since = r.since ? `${r.since}T00:00:00.000Z` : at;
    const o: Organisation = {
      id: uuid7(), number: nextOrganisationNumber(now), facilities: [], createdAt: at, load: load.id,
      ...(r.previousNumber ? { previousNumber: r.previousNumber } : {}),
      versions: [{ n: 1, name: r.name, kind: r.kind, ...(r.region ? { region: r.region } : {}), ...(r.address ? { address: r.address } : {}), representatives: [], at, by, reason }],
      standings: [{ register: t.key, state: r.state, since, ...(r.validUntil ? { validUntil: r.validUntil } : {}), conditions: r.conditions, history: [{ state: r.state, at, by, reason, ...(r.validUntil ? { validUntil: r.validUntil } : {}) }] }],
    };
    db.orgs.push(o);
    load.loaded++;
  }
  load.refused.sort((a, b) => a.row - b.row);
  Object.assign(load, { state: 'confirmed', staged: [], confirmed: { by, ...(byId ? { byId } : {}), at, independence } });
  recordAudit(by, 'organisation.load', `OrganisationLoad:${load.id}`, 'ok', `${t.title} · ${load.loaded} loaded · ${load.refused.length} refused · proposed by ${load.by} · ${independence} · sha256 ${load.sha256}`);
  return publicLoad(load);
}

/** A load as lists show it: the held rows are counted, not listed. */
function publicLoad(l: OrgLoad): OrgLoad {
  const { staged, ...rest } = structuredClone(l);
  return { ...rest, state: l.state ?? 'confirmed', ...(staged?.length ? { proposed: staged.length } : {}) };
}

/** Withdraw a load: the organisations it brought in that nobody has acted on since leave the register. */
export function withdrawLoad(id: string, by: string, now = new Date()): OrgLoad | { error: string } {
  const db = organisationsDb();
  const load = db.loads.find(l => l.id === id);
  if (!load) return { error: 'No such load' };
  if (load.withdrawn) return { error: 'This load was already withdrawn' };
  if (load.state === 'proposed' || load.state === 'lapsed') {
    load.withdrawn = { by, at: now.toISOString(), removed: 0 };
    load.staged = [];
    if (load.state === 'proposed') load.state = 'withdrawn';
    recordAudit(by, 'organisation.load.withdraw', `OrganisationLoad:${id}`, 'ok', 'Withdrawn before confirmation; nothing entered the register');
    return publicLoad(load);
  }
  const untouched = (o: Organisation) => o.load === id && o.versions.length === 1 && o.standings.every(s => s.history.length === 1) && !o.facilities.length;
  const before = db.orgs.length;
  db.orgs = db.orgs.filter(o => !untouched(o));
  load.withdrawn = { by, at: now.toISOString(), removed: before - db.orgs.length };
  recordAudit(by, 'organisation.load.withdraw', `OrganisationLoad:${id}`, 'ok', `${load.withdrawn.removed} removed`);
  return publicLoad(load);
}

export const listLoads = (): OrgLoad[] => organisationsDb().loads.map(publicLoad);
