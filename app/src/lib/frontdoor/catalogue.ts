// The public service catalogue (plan step I13; forms catalogue Part 13 §3.2
// "Service catalogue contract", GOV-GOV-001 public service catalogue
// registration, GOV-GOV-002 service owner assignment, GOV-GOV-010 retirement;
// CFG-GOV-016). Every service the government offers is a record with every
// version kept: its owner (a slot of the deployment profile, resolved through
// authorityFor() each time it is read, or an institution of the registry; never
// a ministry by name), its legal basis cited from the laws register, the
// procedure that carries it and its forms by formIdentity(), the stages read
// from that procedure (never copied), the fee only as a reference to a rule of
// lib/law/rules.ts (never an amount), channels, eligibility, evidence,
// languages and accessibility, the privacy class of what it collects and who
// supports it.
//
// A version is proposed by one official (an official of the owning institution,
// or of the whole government within reach) and published by a different
// person who can sign at the owning institution (taskRefusal() for
// government.service.publish; dualControlRefusal() compares persons, never
// names). A newer published version supersedes the earlier one, which is kept.
// Retirement is proposed and confirmed the same way and keeps the record.
//
// What the public sees is only the published version, and its status is
// computed every time it is read, never stored: a service declared active or
// pilot shows "unavailable" (with the reasons) while its owner is not named,
// its procedure has no approved version in force or takes no submissions
// (lib/forms/publication.ts submissionRefusal()), or its fee rule is not
// approved. Nothing here ships a service as the nation's: sample entries exist
// only where samplesAllowed(), marked. Held in platform state.

import { touch } from '@/lib/data/repo/track';
import { withDefaults } from '@/lib/data/defaults';
import { recordAudit } from '@/lib/data/store/audit';
import { authorityFor, getMinistry } from '@/lib/data/store';
import { dualControlRefusal, independenceOf } from '@/lib/data/dual-control';
import { reaches, roleOf, taskRefusal, type Scope, type Sensitivity } from '@/lib/auth/roles';
import { isAuthorityKey, type AuthorityKey } from '@/lib/nation/deployment';
import { cite, type Citation } from '@/lib/law/register';
import { ruleInForce } from '@/lib/law/rules';
import { activePackage, ownerInstitution } from '@/lib/casework/packages';
import { submissionRefusal } from '@/lib/forms/publication';
import { parseFormIdentity, catalogueEntries, formIdentity } from '@/lib/forms/identity';
import { catalogueContract } from '@/lib/forms/library/catalogue-contracts';
import { samplesAllowed } from '@/lib/ops/mode';
import { uuid7 } from '@/lib/data/uuid7';

/** How the owning institution declares the service. */
export type DeclaredStatus = 'active' | 'pilot' | 'informational';
/** What the catalogue shows, computed from the records each time. */
export type ShownStatus = 'active' | 'pilot' | 'informational' | 'unavailable' | 'retired' | 'unpublished';
export const DECLARED: DeclaredStatus[] = ['active', 'pilot', 'informational'];
export const STATUS_LABEL: Record<ShownStatus, string> = {
  active: 'Active', pilot: 'Pilot', informational: 'Information only', unavailable: 'Not available yet', retired: 'Retired', unpublished: 'Not published',
};
/** The ways a service can be reached (Part 13 §3.2 "alternative submission channels"). */
export const SERVICE_CHANNELS = ['online', 'assisted', 'paper', 'post', 'telephone'] as const;
export type ServiceChannel = typeof SERVICE_CHANNELS[number];
export const CHANNEL_LABEL: Record<ServiceChannel, string> = { online: 'Online', assisted: 'In person at an office', paper: 'Paper form', post: 'By post', telephone: 'By telephone' };

/** The owner: a slot of the deployment profile (resolved each time) or an institution of the registry. */
export type ServiceOwner = { slot: AuthorityKey } | { institution: string };

export interface ServiceTerms {
  name: string;
  description: string;
  owner: ServiceOwner;
  /** The provisions the service rests on, cited from the laws register when the version was proposed. */
  legalBasis: Citation[];
  /** The procedure that carries applications (its key); none for an information-only service. */
  procedure?: string;
  /** The forms, each by its identity (catalogue:form-id@version); never a bare ID. */
  forms: string[];
  /** Who may use it, in plain words. */
  eligibility: string;
  /** Whether someone may act for the applicant (within a representation the applicant grants). */
  representatives: boolean;
  /** Evidence and prerequisites, in plain words. */
  evidence: string[];
  /** The fee: a reference to a rule of the rates register (never an amount); null when the service has none. */
  fee: { rule: string } | null;
  channels: ServiceChannel[];
  /** Expected outcome, in plain words. */
  outcome: string;
  /** The review route: the owning institution's reconsideration (lib/frontdoor/procedures.ts), and any further route in words. */
  review: string;
  languages: string[];
  accessibility: string;
  /** How sensitive what it collects is (the procedure's sensitivity governs the case itself). */
  privacy: Sensitivity;
  /** Operational contact and support. */
  contact: string;
  /** Life events and categories it is found under. */
  lifeEvents: string[];
  category: string;
  declared: DeclaredStatus;
}

export interface ServiceVersion {
  n: number;
  terms: ServiceTerms;
  proposedBy: { id?: string; name: string };
  proposedAt: string;
  reason: string;
  state: 'proposed' | 'published' | 'superseded' | 'withdrawn';
  publishedBy?: { id?: string; name: string };
  publishedAt?: string;
  independence?: 'identity-provider' | 'accounts-only' | 'unverified';
  withdrawn?: { by: string; at: string; reason: string };
}

export interface ServiceRetirement {
  proposedBy: { id?: string; name: string };
  proposedAt: string;
  reason: string;
  /** What happens to applications in progress and where users go instead (GOV-GOV-010 "migration plan"). */
  plan: string;
  state: 'proposed' | 'confirmed' | 'withdrawn';
  confirmedBy?: { id?: string; name: string };
  confirmedAt?: string;
}

export interface ServiceEntry {
  /** Stable: SVC-<slug>. */
  id: string;
  versions: ServiceVersion[];
  retirement?: ServiceRetirement[];
  /** A demonstration entry (demo and training only), shown marked Sample. */
  sample?: true;
  createdAt: string;
}

type Db = { services: ServiceEntry[] };
const seed = (): Db => ({ services: [] });
const g = globalThis as unknown as { __civicosServiceCatalogue?: Db };
const db = (): Db => touch('__civicosServiceCatalogue', g.__civicosServiceCatalogue = withDefaults(g.__civicosServiceCatalogue ??= seed(), seed()));
export function resetServiceCatalogue(): void { g.__civicosServiceCatalogue = undefined; }
const clone = <T,>(x: T): T => structuredClone(x);

/** Who acts: the verified official (scope) or, where sign-in is not enforced, a declared name. */
export interface CatalogueActor { name: string; id?: string; scope: (Scope & { institution?: string }) | null }

/** The institution an owner resolves to now ('' when its slot is not named). */
export function ownerOf(o: ServiceOwner): string {
  if ('slot' in o) return authorityFor(o.slot) ?? '';
  return getMinistry(o.institution) ? o.institution : '';
}
export const ownerLabel = (o: ServiceOwner): string => {
  const id = ownerOf(o);
  if (id) return getMinistry(id)?.name ?? id;
  return 'slot' in o ? `Not named yet (${o.slot})` : 'Unknown institution';
};

const str = (v: unknown, max = 400) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const list = (v: unknown, max = 30, len = 200): string[] => (Array.isArray(v) ? v.map(x => str(x, len)) : str(v, max * len).split(/\n+/).map(x => x.trim())).filter(Boolean).slice(0, max);
const slug = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

/** Check and normalise a version's terms; citations are resolved from the laws register on `on`. */
export function checkTerms(input: Record<string, unknown>, on: string): ServiceTerms | { error: string } {
  const name = str(input.name, 160);
  if (name.length < 3) return { error: 'Name the service (at least 3 characters)' };
  const description = str(input.description, 4000);
  if (description.length < 10) return { error: 'Describe the service in plain words' };
  const o = input.owner as Record<string, unknown> | undefined;
  let owner: ServiceOwner;
  if (o && typeof o === 'object' && 'slot' in o) {
    if (!isAuthorityKey(o.slot)) return { error: 'The owner is a slot of the deployment profile (Who is responsible) or an institution of the registry' };
    owner = { slot: o.slot };
  } else if (o && typeof o === 'object' && typeof o.institution === 'string' && getMinistry(o.institution)) owner = { institution: o.institution };
  else return { error: 'The owner is a slot of the deployment profile (Who is responsible) or an institution of the registry' };
  const legalBasis: Citation[] = [];
  for (const c of (Array.isArray(input.legalBasis) ? input.legalBasis : []).slice(0, 10) as { instrument?: unknown; eId?: unknown }[]) {
    const r = cite(str(c?.instrument, 120), str(c?.eId, 120), on);
    if ('error' in r) return { error: `Legal basis: ${r.error}` };
    legalBasis.push(r);
  }
  if (!legalBasis.length) return { error: 'Cite the provision of law the service rests on (laws register)' };
  const declared = DECLARED.includes(input.declared as DeclaredStatus) ? input.declared as DeclaredStatus : null;
  if (!declared) return { error: 'Declare the service active, pilot or information only' };
  const procedure = str(input.procedure, 80) || undefined;
  if (procedure && !/^[a-z][a-z0-9.-]{1,79}$/.test(procedure)) return { error: 'The procedure is named by its key' };
  if (declared !== 'informational' && !procedure) return { error: 'An active or pilot service names the procedure that carries applications' };
  const forms: string[] = [];
  for (const f of list(input.forms, 20, 120)) {
    const id = parseFormIdentity(f);
    if (!id) return { error: `${f}: name a form by its identity (catalogue:form-id@version), never a bare ID` };
    const lib = catalogueContract(f);
    const known = (lib && !('error' in lib)) || catalogueEntries(id.formId).some(e => e.catalogue === id.catalogue);
    if (!known) return { error: `${f}: no such form in the catalogue or the form library` };
    forms.push(formIdentity(id));
  }
  const feeRule = str((input.fee as { rule?: unknown } | null | undefined)?.rule, 80);
  if (feeRule && !/^[a-z][a-z0-9.-]{1,79}$/.test(feeRule)) return { error: 'A fee is named by its rule key in Rates and tariffs (never an amount)' };
  if (input.fee !== undefined && input.fee !== null && typeof input.fee !== 'object') return { error: 'A fee is named by its rule key in Rates and tariffs (never an amount)' };
  const channels = list(input.channels, 5, 20).filter((c): c is ServiceChannel => (SERVICE_CHANNELS as readonly string[]).includes(c));
  if (!channels.length) return { error: `Name at least one channel (${SERVICE_CHANNELS.join(', ')})` };
  const privacy = (['normal', 'restricted', 'secret'] as Sensitivity[]).includes(input.privacy as Sensitivity) ? input.privacy as Sensitivity : 'normal';
  return {
    name, description, owner, legalBasis, ...(procedure ? { procedure } : {}), forms,
    eligibility: str(input.eligibility, 2000), representatives: input.representatives === true,
    evidence: list(input.evidence, 30, 300), fee: feeRule ? { rule: feeRule } : null, channels,
    outcome: str(input.outcome, 1000), review: str(input.review, 1000),
    languages: list(input.languages, 20, 12).filter(l => /^[a-z]{2,3}(-[A-Za-z]{2,4})?$/.test(l)),
    accessibility: str(input.accessibility, 2000), privacy, contact: str(input.contact, 400),
    lifeEvents: list(input.lifeEvents, 10, 80), category: str(input.category, 80), declared,
  };
}

/** May this official propose a version for this owner? (an official of the owner, or of the whole government within reach; never an auditor) */
export function serviceProposeRefusal(s: Scope, owner: string): string | null {
  if (roleOf(s) === 'auditor') return 'Auditors can read the catalogue but not change it';
  if (!owner) return 'No institution is named as responsible for this service yet (Configuration → Who is responsible)';
  return reaches(s, owner) ? null : 'A service is proposed by officials of the institution that owns it';
}
/** May this official publish (or retire) a service of this owner? An official who can sign there (government.service.publish). */
export const servicePublishRefusal = (s: Scope, owner: string): string | null => (owner ? taskRefusal(s, 'government.service.publish', owner) : 'No institution is named as responsible for this service yet (Configuration → Who is responsible)');

const who = (a: CatalogueActor) => ({ ...(a.id ? { id: a.id } : {}), name: a.name });

/** Propose a version: a new service (no `id`) or a new version of one. */
export function proposeService(input: { id?: unknown; terms?: unknown; reason?: unknown; sample?: unknown }, actor: CatalogueActor, now = new Date()): ServiceEntry | { error: string } {
  const terms = checkTerms((input.terms ?? {}) as Record<string, unknown>, now.toISOString().slice(0, 10));
  if ('error' in terms) return terms;
  const reason = str(input.reason, 1000);
  if (!reason) return { error: 'Say why (a new service, or what changed)' };
  const owner = ownerOf(terms.owner);
  if (actor.scope) { const why = serviceProposeRefusal(actor.scope, owner); if (why) return { error: why }; }
  if (input.sample === true && !samplesAllowed()) return { error: 'A production installation holds no sample service' };
  const d = db();
  const at = now.toISOString();
  let e = input.id ? d.services.find(x => x.id === str(input.id, 80)) : undefined;
  if (input.id && !e) return { error: 'No such service' };
  if (e && e.retirement?.some(r => r.state === 'confirmed')) return { error: 'This service is retired: its record is kept; propose a new service instead' };
  if (e?.versions.some(v => v.state === 'proposed')) return { error: 'A version of this service is already waiting to be published: publish or withdraw it first' };
  if (e) {
    const current = e.versions.filter(v => v.state === 'published').at(-1);
    if (current && ownerOf(current.terms.owner) !== owner && actor.scope && servicePublishRefusal(actor.scope, ownerOf(current.terms.owner)) && serviceProposeRefusal(actor.scope, ownerOf(current.terms.owner))) return { error: 'Moving a service to another owner is proposed by officials of its current owner' };
  }
  if (!e) {
    let id = `SVC-${slug(terms.name) || 'service'}`;
    if (d.services.some(x => x.id === id)) id = `${id}-${uuid7(now).slice(-6)}`;
    e = { id, versions: [], createdAt: at, ...(input.sample === true ? { sample: true as const } : {}) };
    d.services.push(e);
  }
  const n = (e.versions.at(-1)?.n ?? 0) + 1;
  e.versions.push({ n, terms, proposedBy: who(actor), proposedAt: at, reason, state: 'proposed' });
  recordAudit(actor.name, 'service.propose', `Service:${e.id}`, 'ok', `version ${n} · ${terms.declared} · owner ${'slot' in terms.owner ? terms.owner.slot : terms.owner.institution} · ${reason.slice(0, 160)}`);
  return clone(e);
}

/** Publish the waiting version: a different person who can sign at the owning institution. */
export function publishService(id: unknown, actor: CatalogueActor, now = new Date()): ServiceEntry | { error: string } {
  const e = db().services.find(x => x.id === str(id, 80));
  if (!e) return { error: 'No such service' };
  const v = e.versions.find(x => x.state === 'proposed');
  if (!v) return { error: 'No version is waiting to be published' };
  const owner = ownerOf(v.terms.owner);
  if (actor.scope) { const why = servicePublishRefusal(actor.scope, owner); if (why) return { error: why }; }
  else if (!samplesAllowed()) return { error: 'A service is published by a signed-in official' };
  const same = dualControlRefusal({ by: v.proposedBy.name, ...(v.proposedBy.id ? { byId: v.proposedBy.id } : {}) }, { by: actor.name, ...(actor.id ? { byId: actor.id } : {}) });
  if (same) return { error: same };
  const at = now.toISOString();
  for (const x of e.versions) if (x.state === 'published') x.state = 'superseded';
  Object.assign(v, { state: 'published', publishedBy: who(actor), publishedAt: at, independence: independenceOf(v.proposedBy.id, actor.id) });
  recordAudit(actor.name, 'service.publish', `Service:${e.id}`, 'ok', `version ${v.n} proposed by ${v.proposedBy.name}`);
  return clone(e);
}

/** Withdraw the waiting version (its proposer, or one who could publish it), with a reason; kept. */
export function withdrawServiceVersion(id: unknown, reason: unknown, actor: CatalogueActor, now = new Date()): ServiceEntry | { error: string } {
  const e = db().services.find(x => x.id === str(id, 80));
  const v = e?.versions.find(x => x.state === 'proposed');
  if (!e || !v) return { error: 'No version is waiting' };
  const why = str(reason, 500);
  if (!why) return { error: 'Say why it is withdrawn' };
  const mine = actor.id ? v.proposedBy.id === actor.id : v.proposedBy.name === actor.name;
  if (actor.scope && !mine && servicePublishRefusal(actor.scope, ownerOf(v.terms.owner))) return { error: 'The proposer, or an official who could publish it, withdraws a proposal' };
  Object.assign(v, { state: 'withdrawn', withdrawn: { by: actor.name, at: now.toISOString(), reason: why } });
  recordAudit(actor.name, 'service.withdraw', `Service:${e.id}`, 'ok', `version ${v.n}: ${why.slice(0, 160)}`);
  return clone(e);
}

/** Propose retiring a published service (GOV-GOV-010): the record is kept; a different official who can sign confirms. */
export function proposeRetirement(id: unknown, input: { reason?: unknown; plan?: unknown }, actor: CatalogueActor, now = new Date()): ServiceEntry | { error: string } {
  const e = db().services.find(x => x.id === str(id, 80));
  if (!e) return { error: 'No such service' };
  const current = e.versions.filter(v => v.state === 'published').at(-1);
  if (!current) return { error: 'Only a published service is retired' };
  if (e.retirement?.some(r => r.state !== 'withdrawn')) return { error: 'This service is already retired or a retirement is waiting' };
  const reason = str(input.reason, 1000), plan = str(input.plan, 2000);
  if (!reason || !plan) return { error: 'Give the reason and the plan for applications in progress and where users go instead' };
  if (actor.scope) { const why = serviceProposeRefusal(actor.scope, ownerOf(current.terms.owner)); if (why) return { error: why }; }
  (e.retirement ??= []).push({ proposedBy: who(actor), proposedAt: now.toISOString(), reason, plan, state: 'proposed' });
  recordAudit(actor.name, 'service.retire.propose', `Service:${e.id}`, 'ok', reason.slice(0, 200));
  return clone(e);
}

export function decideRetirement(id: unknown, decision: unknown, actor: CatalogueActor, now = new Date()): ServiceEntry | { error: string } {
  const e = db().services.find(x => x.id === str(id, 80));
  const r = e?.retirement?.find(x => x.state === 'proposed');
  if (!e || !r) return { error: 'No retirement is waiting' };
  const current = e.versions.filter(v => v.state === 'published').at(-1)!;
  if (decision === 'withdraw') {
    Object.assign(r, { state: 'withdrawn' });
    recordAudit(actor.name, 'service.retire.withdraw', `Service:${e.id}`, 'ok', 'retirement withdrawn');
    return clone(e);
  }
  if (decision !== 'confirm') return { error: 'decision is confirm or withdraw' };
  if (actor.scope) { const why = servicePublishRefusal(actor.scope, ownerOf(current.terms.owner)); if (why) return { error: why }; }
  const same = dualControlRefusal({ by: r.proposedBy.name, ...(r.proposedBy.id ? { byId: r.proposedBy.id } : {}) }, { by: actor.name, ...(actor.id ? { byId: actor.id } : {}) });
  if (same) return { error: same };
  Object.assign(r, { state: 'confirmed', confirmedBy: who(actor), confirmedAt: now.toISOString() });
  recordAudit(actor.name, 'service.retire', `Service:${e.id}`, 'ok', `proposed by ${r.proposedBy.name}: ${r.reason.slice(0, 160)}`);
  return clone(e);
}

// ── Reading ────────────────────────────────────────────────────────────────

export interface ServiceStatus {
  shown: ShownStatus;
  /** Why it is not what the owner declared (each a plain sentence). */
  reasons: string[];
  owner: { id: string; name: string } | null;
  /** The procedure's stages in force (read from it, never stored here). */
  stages: { key: string; label: string; terminal?: boolean }[];
  procedure: { key: string; version: number; title: string } | null;
  fee: { rule: string; version?: number; approved: boolean } | null;
}

/** The status a service shows today, computed from the records: never stored. */
export function serviceStatus(e: ServiceEntry, on = new Date()): ServiceStatus {
  const day = on.toISOString().slice(0, 10);
  const v = e.versions.filter(x => x.state === 'published').at(-1);
  if (!v) return { shown: 'unpublished', reasons: ['No version is published'], owner: null, stages: [], procedure: null, fee: null };
  const t = v.terms;
  const ownerId = ownerOf(t.owner);
  const owner = ownerId ? { id: ownerId, name: getMinistry(ownerId)?.name ?? ownerId } : null;
  const pkg = t.procedure ? activePackage(t.procedure, day) : undefined;
  const fee = t.fee ? { rule: t.fee.rule, ...(ruleInForce(t.fee.rule, day) ? { version: ruleInForce(t.fee.rule, day)!.version } : {}), approved: !!ruleInForce(t.fee.rule, day) } : null;
  const base = { owner, stages: pkg ? pkg.stages.map(s => ({ key: s.key, label: s.label, ...(s.terminal ? { terminal: true } : {}) })) : [], procedure: pkg ? { key: pkg.key, version: pkg.version, title: pkg.title } : null, fee };
  if (e.retirement?.some(r => r.state === 'confirmed')) return { shown: 'retired', reasons: [], ...base };
  if (t.declared === 'informational') return { shown: 'informational', reasons: [], ...base };
  const reasons: string[] = [];
  if (!owner) reasons.push('No institution is named as responsible for it yet');
  if (!pkg) reasons.push(`The procedure ${t.procedure} has no approved version in force`);
  else {
    if (owner && ownerInstitution(pkg.owner, authorityFor) !== owner.id) reasons.push('Its procedure belongs to another institution');
    const closed = submissionRefusal(pkg, on);
    if (closed) reasons.push(closed);
  }
  if (fee && !fee.approved) reasons.push(`Its fee rule ${fee.rule} is not approved`);
  return { shown: reasons.length ? 'unavailable' : t.declared, reasons, ...base };
}

export const listServices = (): ServiceEntry[] => db().services.map(clone);
export const getService = (id: string): ServiceEntry | undefined => { const e = db().services.find(x => x.id === id); return e ? clone(e) : undefined; };
/** The published version of a service, if any. */
export const publishedVersion = (e: ServiceEntry): ServiceVersion | undefined => e.versions.filter(v => v.state === 'published').at(-1);

/** What the public catalogue shows of one service: only the published version, its computed status, nothing about who proposed it. */
export interface PublicService {
  id: string; version: number; name: string; description: string; owner: string; status: ShownStatus; statusLabel: string; reasons: string[];
  legalBasis: { title?: string; num?: string; instrument: string; eId: string; version: string }[];
  forms: string[]; eligibility: string; representatives: boolean; evidence: string[];
  fee: { rule: string; approved: boolean; version?: number } | null;
  channels: { key: ServiceChannel; label: string }[]; outcome: string; review: string; stages: string[];
  languages: string[]; accessibility: string; contact: string; lifeEvents: string[]; category: string;
  /** When the published version was last verified (its publication). */
  verifiedAt: string; sample?: true;
}

export function publicService(e: ServiceEntry, on = new Date()): PublicService | null {
  const v = publishedVersion(e);
  if (!v) return null;
  const s = serviceStatus(e, on);
  const t = v.terms;
  return {
    id: e.id, version: v.n, name: t.name, description: t.description, owner: s.owner?.name ?? ownerLabel(t.owner), status: s.shown, statusLabel: STATUS_LABEL[s.shown], reasons: s.reasons,
    legalBasis: t.legalBasis.map(c => ({ instrument: c.instrument, eId: c.eId, version: c.version, ...(c.title ? { title: c.title } : {}), ...(c.num ? { num: c.num } : {}) })),
    forms: [...t.forms], eligibility: t.eligibility, representatives: t.representatives, evidence: [...t.evidence], fee: s.fee,
    channels: t.channels.map(k => ({ key: k, label: CHANNEL_LABEL[k] })), outcome: t.outcome, review: t.review, stages: s.stages.map(x => x.label),
    languages: [...t.languages], accessibility: t.accessibility, contact: t.contact, lifeEvents: [...t.lifeEvents], category: t.category,
    verifiedAt: v.publishedAt ?? v.proposedAt, ...(e.sample ? { sample: true as const } : {}),
  };
}

/**
 * The public listing: published entries only, with computed status. A sample
 * entry appears only where samples are allowed (never in production), marked.
 */
export function publicCatalogue(on = new Date()): PublicService[] {
  const samples = samplesAllowed();
  return db().services.filter(e => (!e.sample || samples)).map(e => publicService(e, on)).filter((x): x is PublicService => !!x);
}

/** Counts for the onboarding hub and the console (no person). */
export function catalogueCounts(on = new Date()): { services: number; published: number; waiting: number; byStatus: Partial<Record<ShownStatus, number>>; samples: number } {
  const all = db().services;
  const byStatus: Partial<Record<ShownStatus, number>> = {};
  for (const e of all) { const s = serviceStatus(e, on).shown; byStatus[s] = (byStatus[s] ?? 0) + 1; }
  return { services: all.length, published: all.filter(e => publishedVersion(e)).length, waiting: all.filter(e => e.versions.some(v => v.state === 'proposed')).length, byStatus, samples: all.filter(e => e.sample).length };
}

/** Proposals waiting for a second official (the onboarding hub's waiting list). */
export const waitingServices = (): { id: string; what: string; by: string; at: string }[] => db().services.flatMap(e => [
  ...e.versions.filter(v => v.state === 'proposed').map(v => ({ id: e.id, what: `Service ${v.terms.name}: version ${v.n} waiting to be published`, by: v.proposedBy.name, at: v.proposedAt })),
  ...(e.retirement ?? []).filter(r => r.state === 'proposed').map(r => ({ id: e.id, what: `Service ${publishedVersion(e)?.terms.name ?? e.id}: retirement waiting for a second official`, by: r.proposedBy.name, at: r.proposedAt })),
]);
