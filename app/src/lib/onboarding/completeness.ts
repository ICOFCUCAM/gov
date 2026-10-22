// Completeness per item (plan I2 and §3.4; spec Part 2 G, Part 4 F, Part 5
// K): for one institution, each item of its institutional readiness read from
// the systems that hold the fact, with its state (not_started, in_progress,
// verified, blocked, not_applicable; "not_assessed" where no check exists
// yet), the evidence, an accountable owner, the date of the evidence and the
// next action. No composite percentage: a failed critical safeguard is shown
// as such and never averaged away. It replaces the composite readiness score
// (lib/institution/readiness.ts) as the activation gate: in a production
// installation an institution is activated only once its critical items are
// verified (activationRefusal()); demonstrations show the gate without
// applying it. Nothing here is stored: the onboarding hub
// (lib/onboarding/status.ts) and the institution's pages read it.

import { getMinistry, registerActivationGate } from '@/lib/data/store/ministries';
import { termsOf } from '@/lib/data/store/institutions';
import { authorityFor } from '@/lib/data/store/sovereign';
import { listAccounts, twoStepPolicy } from '@/lib/auth/officials';
import { listCases } from '@/lib/casework/engine';
import { listPackages, ownerInstitution, activePackage } from '@/lib/casework/packages';
import { listExports } from '@/lib/portability/export';
import { listIntegrations } from '@/lib/data/store/federation';
import { serviceDirectory } from '@/lib/exchange/services';
import { AUTHORITIES } from '@/lib/nation/deployment';
import { samplesAllowed } from '@/lib/ops/mode';
import { departmentsOf } from '@/lib/institution/departments';
import { ADMINISTRATION_PROCEDURES, administrationKey } from '@/lib/administration/procedures';

export type ItemState = 'not_started' | 'in_progress' | 'verified' | 'blocked' | 'not_applicable' | 'not_assessed';
export type Dimension = 'legal' | 'configuration' | 'staffing' | 'data' | 'integrations' | 'security' | 'service' | 'continuity' | 'governance';
export const DIMENSION_LABEL: Record<Dimension, string> = {
  legal: 'Legal grounding', configuration: 'Service configuration', staffing: 'Staffing and access', data: 'Authoritative data',
  integrations: 'Integrations', security: 'Security and oversight', service: 'Service acceptance', continuity: 'Continuity', governance: 'Governance and support',
};
export const STATE_LABEL: Record<ItemState, string> = { not_started: 'Not started', in_progress: 'In progress', verified: 'Verified', blocked: 'Blocked', not_applicable: 'Not applicable', not_assessed: 'Not assessed' };

export interface CompletenessItem {
  key: string;
  dimension: Dimension;
  label: string;
  state: ItemState;
  /** A failed critical item is never hidden by the others: it holds activation in production. */
  critical: boolean;
  /** What the state rests on: a record, a count, a citation. */
  evidence?: string;
  /** Who is accountable for it (an institution's officials or a named authority). */
  owner: string;
  /** The date of the evidence (YYYY-MM-DD), where the record carries one. */
  date?: string;
  /** What to do next, where it is not verified. */
  next?: string;
  href: string;
}
export interface InstitutionCompleteness {
  institution: { id: string; name: string };
  items: CompletenessItem[];
  /** The activation gate: critical items not verified. */
  gate: { applies: boolean; open: boolean; failing: { key: string; label: string; owner: string; next?: string }[] };
  counts: Record<ItemState, number>;
}

const day = (iso?: string) => (iso ? iso.slice(0, 10) : undefined);

export function institutionCompleteness(id: string, now = new Date()): InstitutionCompleteness | null {
  const m = getMinistry(id);
  if (!m) return null;
  const on = now.toISOString().slice(0, 10);
  const admins = `Administrators of ${m.name}`;
  const items: CompletenessItem[] = [];
  const item = (x: Omit<CompletenessItem, 'critical'> & { critical?: boolean }) => items.push({ critical: false, ...x });
  const resolve = (o: string) => ownerInstitution(o, authorityFor);

  // ── Legal grounding ──
  const t = termsOf(m, now);
  item({ key: 'mandate', dimension: 'legal', label: 'Mandate recorded: standing with the law that establishes it', critical: true, owner: `${admins}, confirmed by a different official`,
    state: t.basis?.length ? 'verified' : 'not_started', href: '/ministries',
    ...(t.basis?.length ? { evidence: t.basis.map(c => `${c.title ?? c.instrument} ${c.num ?? c.eId}`).join('; ').slice(0, 300), date: t.effectiveFrom } : { next: 'Record the establishing law under the institution\'s constitutional standing (cite it from the laws register; a different official confirms)' }) });
  const slots = AUTHORITIES.filter(a => authorityFor(a.key) === id);
  item({ key: 'responsibilities', dimension: 'legal', label: 'Responsibilities the nation named (Who is responsible)', owner: 'Administrators serving the whole government',
    state: slots.length ? 'verified' : 'not_applicable', href: '/gov/configuration/responsible', ...(slots.length ? { evidence: slots.map(a => a.label).join(', ') } : { evidence: 'Not named for a register or power: an institution may have none' }) });
  const own = listPackages().filter(p => resolve(p.owner) === id);
  const keys = [...new Set(own.map(p => p.key))];
  const inForce = keys.filter(k => activePackage(k, on));
  item({ key: 'procedures', dimension: 'legal', label: 'Its procedures approved by a second official', owner: `Officials who can sign at ${m.name}`, href: '/gov/law/procedures',
    state: !keys.length ? 'not_started' : inForce.length === keys.length ? 'verified' : inForce.length ? 'in_progress' : 'not_started',
    evidence: `${inForce.length} of ${keys.length} procedure(s) in force`, ...(own.some(p => p.approvedAt) ? { date: day(own.filter(p => p.approvedAt).map(p => p.approvedAt!).sort().at(-1)) } : {}),
    ...(inForce.length < keys.length || !keys.length ? { next: keys.length ? `Approve the drafts: ${keys.filter(k => !inForce.includes(k)).slice(0, 4).join(', ')}` : 'Draft the institution\'s procedures (Laws → Procedures; internal administration from its workspace)' } : {}) });

  // ── Configuration ──
  const depts = departmentsOf(id);
  const withOffice = depts.filter(d => d.office && !d.officeProblem);
  const lastChange = depts.flatMap(d => d.history.map(h => h.at)).sort().at(-1);
  item({ key: 'departments', dimension: 'configuration', label: 'Departments recorded, each with an accountable office', owner: `${admins}, confirmed by a different official`, href: `/gov/institutions/departments?institution=${id}`,
    state: !depts.length ? 'not_started' : withOffice.length === depts.length ? 'verified' : 'in_progress', evidence: `${withOffice.length} of ${depts.length} department(s) with an accountable office in force`,
    ...(lastChange ? { date: day(lastChange) } : {}), ...(withOffice.length < depts.length || !depts.length ? { next: 'Name the accountable office of each department (Ministries & agencies → Departments)' } : {}) });
  const withServices = depts.filter(d => d.services.length);
  item({ key: 'services', dimension: 'configuration', label: 'Services each department delivers recorded', owner: admins, href: `/gov/institutions/departments?institution=${id}`,
    state: !depts.length ? 'not_started' : withServices.length === depts.length ? 'verified' : withServices.length ? 'in_progress' : 'not_started', evidence: `${withServices.length} of ${depts.length} department(s) with services`,
    ...(withServices.length < depts.length ? { next: 'List the services of each department, with the procedure carrying each' } : {}) });
  const adminKeys = ADMINISTRATION_PROCEDURES.map(p => administrationKey(p.key, id));
  const adminInForce = adminKeys.filter(k => activePackage(k, on));
  const adminDrafted = adminKeys.filter(k => listPackages({ key: k }).length);
  item({ key: 'administration', dimension: 'configuration', label: 'Internal administration procedures adopted (payroll, establishment, privileged access, policy, delegation…)', owner: `Officials who can sign at ${m.name}`, href: `/gov/institutions/administration?institution=${id}`,
    state: adminInForce.length === adminKeys.length ? 'verified' : adminDrafted.length ? 'in_progress' : 'not_started', evidence: `${adminInForce.length} of ${adminKeys.length} in force, ${adminDrafted.length} drafted`,
    ...(adminInForce.length < adminKeys.length ? { next: adminDrafted.length ? 'Approve the drafted internal administration procedures (a second official)' : 'Draft them from the internal administration workspace' } : {}) });

  // ── Staffing ──
  const accounts = listAccounts().filter(a => a.institution === id && !a.disabled && !a.demo);
  const signers = accounts.filter(a => a.role === 'signatory');
  item({ key: 'officials', dimension: 'staffing', label: 'Named officials with accounts', critical: true, owner: admins, href: '/admin/officials',
    state: accounts.length ? 'verified' : 'not_started', evidence: `${accounts.length} active account(s)`, ...(accounts.length ? { date: day(accounts.map(a => a.createdAt).sort().at(-1)) } : { next: 'Create the officials\' accounts (Staff → Sign-in accounts)' }) });
  item({ key: 'separation', dimension: 'staffing', label: 'Two officials who can sign (separation of duties for every decision)', critical: true, owner: admins, href: '/admin/officials',
    state: signers.length >= 2 ? 'verified' : signers.length ? 'in_progress' : 'not_started', evidence: `${signers.length} official(s) who can sign`, ...(signers.length < 2 ? { next: 'Give at least two officials the role Can sign: one proposes, a different one confirms' } : {}) });
  const staffed = depts.filter(d => d.staff.length);
  item({ key: 'staffed', dimension: 'staffing', label: 'Departments staffed', owner: admins, href: `/gov/institutions/departments?institution=${id}`,
    state: !depts.length ? 'not_started' : staffed.length === depts.length ? 'verified' : staffed.length ? 'in_progress' : 'not_started', evidence: `${staffed.length} of ${depts.length} with staff recorded`,
    ...(staffed.length < depts.length ? { next: 'Record who serves in each department' } : {}) });

  // ── Authoritative data ──
  const cases = listCases({ owner: id, limit: 5000 });
  const samples = cases.filter(c => c.source === 'sample');
  item({ key: 'no-samples', dimension: 'data', label: 'No sample record mixed into production', critical: true, owner: admins, href: '/gov/work/cases',
    state: samplesAllowed() ? 'not_applicable' : samples.length ? 'blocked' : 'verified', evidence: samplesAllowed() ? 'A demonstration or training installation: samples are allowed and marked' : `${samples.length} sample case(s)`,
    ...(!samplesAllowed() && samples.length ? { next: 'A production installation acts on no sample case: close them as samples and load real records' } : {}) });

  // ── Integrations ──
  const services = serviceDirectory().filter(s => slots.some(a => a.key === s.owner));
  const approvedCallers = listIntegrations().filter(i => i.status === 'approved' && services.some(s => i.scopes.includes(`service:${s.id}`)));
  item({ key: 'exchange', dimension: 'integrations', label: 'The exchange services it answers have an approved caller', owner: `${m.name}, approved by two officials`, href: '/integrations',
    state: !services.length ? 'not_applicable' : approvedCallers.length ? 'verified' : 'not_started', evidence: services.length ? `${services.length} service(s), ${approvedCallers.length} approved caller(s)` : 'It answers no exchange service',
    ...(services.length && !approvedCallers.length ? { next: 'Approve the integrations that call its services, each for its purposes (two officials)' } : {}) });

  // ── Security and oversight ──
  const policy = twoStepPolicy();
  item({ key: 'two-step', dimension: 'security', label: 'Second sign-in step required of officials who can sign', owner: 'Administrators serving the whole government', href: '/admin/officials',
    state: policy === 'none' ? 'not_started' : 'verified', evidence: `Policy: ${policy}`, ...(policy === 'none' ? { next: 'Set the two-step policy to officials who can sign (or everyone)' } : {}) });
  item({ key: 'access-log', dimension: 'security', label: 'Reads of restricted records logged', owner: 'The data-protection authority reviews', href: '/gov/access-log',
    state: 'verified', evidence: 'Every read of a restricted case or register record is in the access log (lib/records/access-log.ts)' });

  // ── Service acceptance ──
  const decided = cases.filter(c => c.source !== 'sample' && c.decisions.length);
  item({ key: 'end-to-end', dimension: 'service', label: 'A real case decided end to end under an approved procedure', owner: `Officials of ${m.name}`, href: '/gov/work/cases',
    state: decided.length ? 'verified' : 'not_started', evidence: `${decided.length} decided case(s)`, ...(decided.length ? { date: day(decided.map(c => c.history.at(-1)?.at ?? c.openedAt).sort().at(-1)) } : { next: 'Work a real case through to its decision' }) });

  // ── Continuity ──
  const exports = listExports(id).filter(x => x.state === 'confirmed' && x.export);
  item({ key: 'export', dimension: 'continuity', label: 'Its records exported and verified (portability)', owner: `${admins}, confirmed by an official who can sign there`, href: '/gov/configuration/edition#export',
    state: exports.length ? 'verified' : 'not_started', ...(exports.length ? { evidence: `Export ${exports[0]!.id}, ${exports[0]!.export!.sha256.slice(0, 12)}`, date: day(exports[0]!.export!.createdAt) } : { next: 'Propose an export of its records; a different official confirms' }) });
  item({ key: 'load-test', dimension: 'continuity', label: 'Load and recovery exercised for this institution', owner: 'Whoever runs the installation', href: '/platform',
    state: 'not_assessed', evidence: 'No check exists yet: shown as not assessed, never as passed' });

  // ── Governance and support ──
  const ict = depts.filter(d => d.functions.includes('ict') && d.staff.length);
  item({ key: 'support-owners', dimension: 'governance', label: 'Incident response and support owners assigned (an ICT department with staff)', owner: admins, href: `/gov/institutions/departments?institution=${id}`,
    state: ict.length ? 'verified' : 'not_started', ...(ict.length ? { evidence: ict.map(d => d.name).join(', ') } : { next: 'Record which department runs ICT and operations, and who serves in it' }) });

  const counts = { not_started: 0, in_progress: 0, verified: 0, blocked: 0, not_applicable: 0, not_assessed: 0 } as Record<ItemState, number>;
  for (const i of items) counts[i.state]++;
  const failing = items.filter(i => i.critical && i.state !== 'verified' && i.state !== 'not_applicable').map(i => ({ key: i.key, label: i.label, owner: i.owner, ...(i.next ? { next: i.next } : {}) }));
  return { institution: { id: m.id, name: m.name }, items, gate: { applies: !samplesAllowed(), open: failing.length === 0, failing }, counts };
}

/**
 * The activation gate (replacing the composite readiness score): in a
 * production installation an institution is activated only when its critical
 * items are verified. Null when it may be activated.
 */
export function activationRefusal(id: string, now = new Date()): string | null {
  if (samplesAllowed()) return null;
  const c = institutionCompleteness(id, now);
  if (!c || c.gate.open) return null;
  return `Not activated: ${c.gate.failing.map(f => `${f.label} (${f.owner}${f.next ? `; next: ${f.next}` : ''})`).join(' · ')}`;
}

registerActivationGate(id => activationRefusal(id));
