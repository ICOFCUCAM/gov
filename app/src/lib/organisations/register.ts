// The organisations register (docs/GOVERNMENT_OPERATING_DIRECTIONS.md 6.6,
// 16.5, 16.6; Gate 4): each regulated organisation (company, NGO,
// university, pharmacy, hospital...) is a record with its standing in each
// register that holds it (registered companies, licensed pharmacies,
// accredited universities...). Register types are configured per authority:
// each names the authority that keeps it (a deployment-profile key or an
// institution id), so only that authority's procedures can change a
// standing in it.
//
// A record changes only through the effects of approved procedures
// (lib/organisations/procedures.ts): registering, granting, renewing,
// suspending, reinstating and revoking are decided cases, with four-eyes
// where the procedure says, citing the law and leaving a sealed decision.
// Every change is a new version or a history entry, never an edit in place.
// Organisations link to registered sites (a university's campuses,
// lib/data/facilities.ts) and become twin entities with their standing.
// Representatives are personal data: lists and the public check carry only
// `publicOrganisation()`. Held in platform state.

import { recordAudit } from '@/lib/data/store/audit';
import { touch } from '@/lib/data/repo/track';
import { uuid7 } from '@/lib/data/uuid7';
import { nextNumber as nextRecordNumber, legacyMax } from '@/lib/data/numbering';
import type { AuthorityKey } from '@/lib/nation/deployment';

export const ORG_KINDS = ['company', 'partnership', 'cooperative', 'ngo', 'association', 'university', 'college', 'school', 'hospital', 'clinic', 'pharmacy', 'professional-practice', 'other'] as const;
export type OrgKind = typeof ORG_KINDS[number];
export type RegisterKind = 'registration' | 'licence' | 'accreditation';
export type StandingState = 'applied' | 'granted' | 'suspended' | 'revoked' | 'expired' | 'refused' | 'struck-off';

export interface RegisterType {
  key: string;
  title: string;
  kind: RegisterKind;
  /** Who keeps it: a deployment-profile authority or an institution id. */
  authority: AuthorityKey | string;
  /** Which kinds of organisation it may hold. */
  orgKinds: OrgKind[];
  /** Months a grant is valid for (none: until revoked or struck off). */
  validityMonths?: number;
  /** Anyone may check an organisation's standing in it (/registers). */
  publicCheck: boolean;
  /** Shipped with the platform, or configured by an administrator. */
  reference: boolean;
  /** The permit type whose approved authority mapping governs it (lib/permits/authority.ts). */
  permitType?: string;
  createdBy: string;
  createdAt: string;
}

export interface Representative { name: string; role: string; since: string }

export interface OrgVersion {
  n: number;
  name: string;
  kind: OrgKind;
  region?: string;
  address?: string;
  representatives: Representative[];
  at: string; by: string; reason: string;
  case?: string;
}

export interface StandingStep { state: StandingState; at: string; by: string; reason: string; case?: string; decision?: string; validUntil?: string }

export interface Standing {
  register: string;
  state: StandingState;
  since: string;
  validUntil?: string;
  conditions: string[];
  certificate?: string;
  history: StandingStep[];
}

export interface Organisation {
  id: string;
  /** The register number, given once (e.g. ORG-2026-000014). */
  number: string;
  versions: OrgVersion[];
  /** Registered sites it operates (campuses, branches, premises). */
  facilities: string[];
  standings: Standing[];
  createdAt: string;
  /** The number it had in the register it was loaded from, kept as an identifier. */
  previousNumber?: string;
  /** The checked load that brought it in (lib/organisations/import.ts), until it is acted on. */
  load?: string;
}

/** Register types CivicOS ships; a nation adds its own (licensed pharmacies, licensed doctors...). */
export const REFERENCE_TYPES: Omit<RegisterType, 'createdBy' | 'createdAt'>[] = [
  { key: 'companies', title: 'Registered companies and organisations', kind: 'registration', authority: 'businessRegister', orgKinds: [...ORG_KINDS], publicCheck: true, reference: true, permitType: 'business-registration' },
  { key: 'business-licences', title: 'Business licences', kind: 'licence', authority: 'businessRegister', orgKinds: [...ORG_KINDS], validityMonths: 12, publicCheck: true, reference: true, permitType: 'trading-licence' },
  { key: 'higher-education', title: 'Accredited universities and colleges', kind: 'accreditation', authority: 'higherEducationAccreditation', orgKinds: ['university', 'college'], validityMonths: 60, publicCheck: true, reference: true, permitType: 'university-accreditation' },
  // Cycle 3 sectors: kept by the authorities the deployment profile names; no validity period is assumed (the nation's law sets it).
  { key: 'schools', title: 'Registered schools', kind: 'registration', authority: 'education', orgKinds: ['school', 'college'], publicCheck: true, reference: true, permitType: 'school-registration' },
  { key: 'health-facilities', title: 'Licensed health facilities', kind: 'licence', authority: 'healthRegulation', orgKinds: ['hospital', 'clinic'], publicCheck: true, reference: true, permitType: 'health-facility-licence' },
  { key: 'pharmacies', title: 'Licensed pharmacies', kind: 'licence', authority: 'healthRegulation', orgKinds: ['pharmacy'], publicCheck: true, reference: true, permitType: 'pharmacy-licence' },
];

/** A checked row held on a proposed load until a second official confirms it. */
export interface OrgLoadRow { row: number; name: string; kind: OrgKind; state: StandingState; region?: string; address?: string; previousNumber?: string; since?: string; validUntil?: string; conditions: string[] }
export interface OrgLoad {
  id: string; register: string; by: string; byId?: string; at: string; sha256: string; rows: number; loaded: number; refused: { row: number; reason: string }[];
  withdrawn?: { by: string; at: string; removed: number };
  /** Absent on loads made before two-official loading: those entered at once (confirmed). */
  state?: 'proposed' | 'confirmed' | 'lapsed' | 'withdrawn';
  expiresAt?: string;
  staged?: OrgLoadRow[];
  /** Rows held, as lists show a proposed load. */
  proposed?: number;
  confirmed?: { by: string; byId?: string; at: string; independence: 'identity-provider' | 'accounts-only' | 'unverified' };
}
interface Db { orgs: Organisation[]; types: RegisterType[]; seq: Record<string, number>; orgSeq: number; loads: OrgLoad[] }
const g = globalThis as unknown as { __civicosOrganisations?: Db };
const db = (): Db => {
  const d = touch('__civicosOrganisations', g.__civicosOrganisations ??= { orgs: [], types: [], seq: {}, orgSeq: 0, loads: [] });
  d.orgs ??= []; d.types ??= []; d.seq ??= {}; d.loads ??= [];
  d.orgSeq ??= legacyMax(d.seq);
  return d;
};
export function resetOrganisations(): void { g.__civicosOrganisations = undefined; }
/** The store itself, for the checked load (lib/organisations/import.ts) only. */
export const organisationsDb = db;
export { nextNumber as nextOrganisationNumber };

const clone = <T,>(x: T): T => structuredClone(x);
const KEY = /^[a-z][a-z0-9-]{1,40}$/;
const str = (v: unknown, max = 300) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

// ── Register types ───────────────────────────────────────────────────────────

export function registerTypes(): RegisterType[] {
  const configured = db().types;
  const refs = REFERENCE_TYPES.filter(r => !configured.some(t => t.key === r.key)).map(r => ({ ...r, createdBy: 'CivicOS', createdAt: '2026-01-01T00:00:00.000Z' }));
  return clone([...refs, ...configured]);
}
export const registerType = (key: string): RegisterType | undefined => registerTypes().find(t => t.key === key);

/** An administrator configures a register type (or changes one: same key). */
export function defineRegisterType(input: Partial<RegisterType>, by: string, now = new Date()): RegisterType | { error: string } {
  const key = str(input.key, 41);
  if (!KEY.test(key)) return { error: 'A register needs a short key: lower-case letters, digits and hyphens (e.g. licensed-pharmacies)' };
  const title = str(input.title, 200);
  if (title.length < 3) return { error: 'Give the register its title' };
  if (!['registration', 'licence', 'accreditation'].includes(String(input.kind))) return { error: 'A register is a registration, a licence or an accreditation register' };
  const authority = str(input.authority, 80);
  if (!authority) return { error: 'Name the authority that keeps it (a responsible authority or an institution)' };
  const kinds = Array.isArray(input.orgKinds) ? input.orgKinds.filter((k): k is OrgKind => (ORG_KINDS as readonly string[]).includes(k)) : [];
  if (!kinds.length) return { error: `Say which kinds of organisation it holds: ${ORG_KINDS.join(', ')}` };
  const months = input.validityMonths === undefined || input.validityMonths === null ? undefined : Number(input.validityMonths);
  if (months !== undefined && (!Number.isInteger(months) || months < 1 || months > 240)) return { error: 'Validity is a whole number of months from 1 to 240' };
  // A standing in a register is a licensing decision: the permit type names the authority mapping that governs it (lib/permits/decisions.ts).
  const permitType = str(input.permitType, 61);
  if (!KEY.test(permitType)) return { error: 'Name the permit type whose authority mapping governs this register (e.g. pharmacy-licence); its decisions are refused in production until that mapping is approved' };
  const t: RegisterType = {
    key, title, kind: input.kind as RegisterKind, authority, orgKinds: kinds,
    ...(months ? { validityMonths: months } : {}), publicCheck: input.publicCheck !== false, reference: false,
    permitType, createdBy: by, createdAt: now.toISOString(),
  };
  const d = db();
  d.types = [...d.types.filter(x => x.key !== key), t];
  recordAudit(by, 'organisation.register-type.define', `RegisterType:${key}`, 'ok', `${title} · ${t.kind} · kept by ${authority}`);
  return clone(t);
}

// ── Records ──────────────────────────────────────────────────────────────────

export const current = (o: Organisation): OrgVersion => o.versions[o.versions.length - 1]!;

export function getOrganisation(idOrNumber: string): Organisation | undefined {
  const o = db().orgs.find(x => x.id === idOrNumber || x.number === idOrNumber);
  return o ? clone(o) : undefined;
}

export function listOrganisations(filter: { register?: string; state?: StandingState; kind?: OrgKind; q?: string; limit?: number } = {}): Organisation[] {
  const q = filter.q?.trim().toLowerCase();
  return db().orgs
    .filter(o => !filter.kind || current(o).kind === filter.kind)
    .filter(o => !filter.register || o.standings.some(s => s.register === filter.register && (!filter.state || s.state === filter.state)))
    .filter(o => !q || current(o).name.toLowerCase().includes(q) || o.number.toLowerCase() === q)
    .slice(0, Math.min(filter.limit ?? 500, 2000)).map(clone);
}

function nextNumber(now: Date): string {
  return nextRecordNumber(db() as unknown as Record<string, unknown>, 'orgSeq', 'ORG', now);
}

export interface NewOrganisation { name: unknown; kind: unknown; region?: unknown; address?: unknown; representative?: { name?: unknown; role?: unknown } }

/** Checked before anything is written, so a refused case uses no number. */
export function checkNewOrganisation(input: NewOrganisation): { name: string; kind: OrgKind; region?: string; address?: string; representatives: { name: string; role: string }[] } | { error: string } {
  const name = str(input.name, 300);
  if (name.length < 2) return { error: 'The organisation needs its registered name' };
  const kind = str(input.kind, 40);
  if (!(ORG_KINDS as readonly string[]).includes(kind)) return { error: `Kind must be one of ${ORG_KINDS.join(', ')}` };
  const rep = input.representative && str(input.representative.name, 200) ? [{ name: str(input.representative.name, 200), role: str(input.representative.role, 120) || 'Representative' }] : [];
  return { name, kind: kind as OrgKind, ...(str(input.region) ? { region: str(input.region, 120) } : {}), ...(str(input.address) ? { address: str(input.address, 500) } : {}), representatives: rep };
}

/** A new record (only through a decided registration case). */
export function createOrganisation(input: NewOrganisation, caseId: string, by: string, now = new Date()): Organisation | { error: string } {
  const c = checkNewOrganisation(input);
  if ('error' in c) return c;
  const same = db().orgs.find(o => current(o).name.toLowerCase() === c.name.toLowerCase() && current(o).kind === c.kind);
  if (same) return { error: `${c.name} is already registered as ${same.number}` };
  const at = now.toISOString();
  const o: Organisation = {
    id: uuid7(), number: nextNumber(now), facilities: [], standings: [], createdAt: at,
    versions: [{ n: 1, name: c.name, kind: c.kind, ...(c.region ? { region: c.region } : {}), ...(c.address ? { address: c.address } : {}), representatives: c.representatives.map(r => ({ ...r, since: at.slice(0, 10) })), at, by, reason: 'Registered', case: caseId }],
  };
  db().orgs.push(o);
  recordAudit(by, 'organisation.create', `Organisation:${o.number}`, 'ok', `${c.kind} · case ${caseId}`);
  return clone(o);
}

/** A new version (change of name, address or representatives), through a decided case. */
export function amendOrganisation(id: string, patch: { name?: string; address?: string; region?: string; representatives?: Representative[] }, reason: string, caseId: string, by: string, now = new Date()): Organisation | { error: string } {
  const o = db().orgs.find(x => x.id === id || x.number === id);
  if (!o) return { error: 'No such organisation' };
  if (!reason.trim()) return { error: 'Say why the record changes' };
  const v = current(o);
  o.versions.push({ ...clone(v), ...(patch.name ? { name: patch.name.slice(0, 300) } : {}), ...(patch.address ? { address: patch.address.slice(0, 500) } : {}), ...(patch.region ? { region: patch.region.slice(0, 120) } : {}), ...(patch.representatives ? { representatives: patch.representatives } : {}), n: v.n + 1, at: now.toISOString(), by, reason: reason.slice(0, 500), case: caseId });
  recordAudit(by, 'organisation.amend', `Organisation:${o.number}`, 'ok', `version ${v.n + 1} · case ${caseId}`);
  return clone(o);
}

const addMonths = (iso: string, months: number) => { const d = new Date(iso); d.setUTCMonth(d.getUTCMonth() + months); return d.toISOString().slice(0, 10); };

/** Which state changes a standing allows (applied → granted or refused; granted → suspended, revoked, expired...). */
const MOVES: Record<StandingState, StandingState[]> = {
  applied: ['granted', 'refused'],
  granted: ['granted', 'suspended', 'revoked', 'expired', 'struck-off'],
  suspended: ['granted', 'revoked', 'struck-off'],
  expired: ['granted', 'struck-off'],
  refused: ['applied'],
  revoked: [],
  'struck-off': [],
};

export interface StandingChange { register: string; state: StandingState; reason: string; case?: string; decision?: string; conditions?: string[]; validUntil?: string; certificate?: string }

/** Change an organisation's standing in one register (only through a decided case, or the expiry job). */
export function setStanding(id: string, ch: StandingChange, by: string, now = new Date()): Standing | { error: string } {
  const o = db().orgs.find(x => x.id === id || x.number === id);
  if (!o) return { error: 'No such organisation' };
  const t = registerType(ch.register);
  if (!t) return { error: `No register ${ch.register}` };
  if (!t.orgKinds.includes(current(o).kind)) return { error: `${t.title} does not hold a ${current(o).kind}` };
  const at = now.toISOString();
  let s = o.standings.find(x => x.register === ch.register);
  if (s && !MOVES[s.state].includes(ch.state)) return { error: `A standing that is ${s.state} cannot become ${ch.state}` };
  if (!s && !['applied', 'granted'].includes(ch.state)) return { error: `${current(o).name} has no standing in ${t.title} to change` };
  // A grant (or renewal) runs for the register's validity from today, unless the decision says otherwise.
  const validUntil = ch.state === 'granted' ? (ch.validUntil ?? (t.validityMonths ? addMonths(at, t.validityMonths) : undefined)) : s?.validUntil;
  const step: StandingStep = { state: ch.state, at, by, reason: ch.reason.slice(0, 500), ...(ch.case ? { case: ch.case } : {}), ...(ch.decision ? { decision: ch.decision } : {}), ...(validUntil ? { validUntil } : {}) };
  if (!s) {
    s = { register: ch.register, state: ch.state, since: at, conditions: ch.conditions ?? [], history: [step], ...(validUntil ? { validUntil } : {}) };
    o.standings.push(s);
  } else {
    if (s.state !== ch.state) s.since = at;
    s.state = ch.state;
    if (validUntil) s.validUntil = validUntil; else delete s.validUntil;
    if (ch.conditions) s.conditions = ch.conditions;
    s.history.push(step);
  }
  if (ch.certificate) s.certificate = ch.certificate;
  recordAudit(by, `organisation.standing.${ch.state}`, `Organisation:${o.number}`, 'ok', `${t.title}${validUntil && ch.state === 'granted' ? ` · valid until ${validUntil}` : ''}${ch.case ? ` · case ${ch.case}` : ''}`);
  return clone(s);
}

/** Record the sealed decision on the latest step of a standing (after the decision is sealed). */
export function attachStandingDecision(id: string, register: string, decision: string): void {
  const s = db().orgs.find(x => x.id === id || x.number === id)?.standings.find(x => x.register === register);
  const last = s?.history[s.history.length - 1];
  if (last && !last.decision) last.decision = decision;
}

/** Record the certificate issued for a standing. */
export function attachCertificate(id: string, register: string, code: string): void {
  const s = db().orgs.find(x => x.id === id || x.number === id)?.standings.find(x => x.register === register);
  if (s) s.certificate = code;
}

/** Link registered sites to an organisation (its campuses, branches, premises), through a decided case. */
export function linkFacilities(id: string, facilities: string[], caseId: string, by: string): Organisation | { error: string } {
  const o = db().orgs.find(x => x.id === id || x.number === id);
  if (!o) return { error: 'No such organisation' };
  const added = [...new Set(facilities)].filter(f => !o.facilities.includes(f));
  o.facilities.push(...added);
  if (added.length) recordAudit(by, 'organisation.facilities.link', `Organisation:${o.number}`, 'ok', `${added.length} site(s) · case ${caseId}`);
  return clone(o);
}

/** Grants whose validity has passed become expired (run by the case-deadlines job). */
export function expireStandings(now = new Date()): { organisation: string; register: string }[] {
  const today = now.toISOString().slice(0, 10);
  const out: { organisation: string; register: string }[] = [];
  for (const o of db().orgs) for (const s of o.standings) {
    if (s.state === 'granted' && s.validUntil && s.validUntil < today) {
      const r = setStanding(o.id, { register: s.register, state: 'expired', reason: `Validity ended on ${s.validUntil}` }, 'System (validity)', now);
      if (!('error' in r)) out.push({ organisation: o.number, register: s.register });
    }
  }
  return out;
}

// ── What others see ──────────────────────────────────────────────────────────

export interface PublicOrganisation {
  number: string; name: string; kind: OrgKind; region?: string;
  standings: { register: string; title: string; state: StandingState; since: string; validUntil?: string; conditions: string[]; certificate?: string }[];
}

/** Without representatives or history: for lists, the public check and the twin. */
export function publicOrganisation(o: Organisation, onlyPublicRegisters = false): PublicOrganisation {
  const v = current(o);
  const types = new Map(registerTypes().map(t => [t.key, t]));
  return {
    number: o.number, name: v.name, kind: v.kind, ...(v.region ? { region: v.region } : {}),
    standings: o.standings.filter(s => !onlyPublicRegisters || types.get(s.register)?.publicCheck)
      .map(s => ({ register: s.register, title: types.get(s.register)?.title ?? s.register, state: s.state, since: s.since, ...(s.validUntil ? { validUntil: s.validUntil } : {}), conditions: s.conditions, ...(s.certificate ? { certificate: s.certificate } : {}) })),
  };
}

/** Anyone's check: is this organisation in this register, and in what standing? (Public registers only.) */
export function checkStanding(register: string, q: string): PublicOrganisation[] | { error: string } {
  const t = registerType(register);
  if (!t || !t.publicCheck) return { error: 'No such public register' };
  const term = q.trim().toLowerCase();
  if (term.length < 3) return { error: 'Type at least three letters of the name, or the register number' };
  return db().orgs
    .filter(o => o.standings.some(s => s.register === register && s.state !== 'applied' && s.state !== 'refused'))
    .filter(o => o.number.toLowerCase() === term || current(o).name.toLowerCase().includes(term))
    .slice(0, 20).map(o => {
      const p = publicOrganisation(o, true);
      return { ...p, standings: p.standings.filter(s => s.register === register) };
    });
}
