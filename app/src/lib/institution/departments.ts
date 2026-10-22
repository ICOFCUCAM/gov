// Departments as records (plan I2; spec Part 1 §3.2 "functional departments",
// §10 internal administration; Part 2 B "Administration: staff, roles,
// locations, delegated authority, queues"). A department is kept on its
// institution's registry record (Ministry.departments, so every earlier reader
// of `{ id, name }` keeps working) and carries:
//
//   office     the office accountable for it (lib/nation/office-register.ts):
//              an office of the same institution; holding it grants nothing
//   functions  the internal administration functions it performs (§10)
//   services   what it delivers: a name, and the procedure carrying it
//   staff      official accounts serving in it (accounts of the institution);
//              serving in a department grants nothing either
//   history    every version, with who changed it, who confirmed it and why
//
// How departments change follows the institution's own change processes
// (lib/data/store/institutions.ts): during first-run setup an administrator
// records them directly; afterwards a change (establish, amend, end) is
// proposed by one administrator (of the institution, or of the whole
// government where its reach goes) through lib/law/policy-change.ts, citing
// the law where one applies, and confirmed by a different official (an
// administrator or one who can sign); an independent institution's
// departments are proposed and confirmed only by its own officials (its
// internal administration stays its own: supplement part 21). An ended
// department is kept with its reason, never deleted (plan I0.2).

import type { AdminFunctionKey, Department, DepartmentChange, DepartmentService, DepartmentTerms, DepartmentVersion, Ministry } from '@/lib/api/types';
import { proposePolicy, confirmPolicy, withdrawPolicy, lapsePolicy, type PolicyVersion } from '@/lib/law/policy-change';
import { dualControlPendingHours } from '@/lib/data/dual-control';
import { recordAudit } from '@/lib/data/store/audit';
import { getMinistry, listMinistries, isActiveDepartment } from '@/lib/data/store/ministries';
import { isIndependentInstitution, setupRunning } from '@/lib/data/store/institutions';
import { getOfficeRecord, officeTermsOf } from '@/lib/nation/office-register';
import { accountById } from '@/lib/auth/officials';
import { listPackages, ownerInstitution } from '@/lib/casework/packages';
import { authorityFor } from '@/lib/data/store/sovereign';
import { uid } from '@/lib/data/store/shared';

/** The internal administration functions every institution has (spec Part 1 §10; the plan adds monitoring and evaluation). */
export const ADMIN_FUNCTIONS: { key: AdminFunctionKey; label: string; records: string }[] = [
  { key: 'hr', label: 'Human resources', records: 'Positions, authorized establishment, assignments, training, leave, performance processes and personnel actions' },
  { key: 'finance', label: 'Finance', records: 'Budget allocations, commitments, invoices, payments, reconciliation and period close' },
  { key: 'procurement', label: 'Procurement', records: 'Plans, requisitions, tenders, contracts, acceptance and supplier records' },
  { key: 'assets', label: 'Asset management', records: 'Asset identity, custodian, location, condition, maintenance and disposal' },
  { key: 'records', label: 'Records management', records: 'Classification, ownership, retention schedules, legal holds, transfer and authorized disposal' },
  { key: 'legal', label: 'Legal services', records: 'Advice requests, legal opinions, contracts, statutory obligations and litigation referrals' },
  { key: 'internal-audit', label: 'Internal audit', records: 'Audit plans, engagements, findings, management responses and closure evidence' },
  { key: 'ict', label: 'ICT and operations', records: 'Services, incidents, access requests, changes, service availability, backup and recovery evidence' },
  { key: 'communications', label: 'Communications', records: 'Publications, translations, approvals, mailing lists and corrections' },
  { key: 'planning', label: 'Planning and performance', records: 'Approved plans, indicators, targets, source records, reporting periods and corrective actions' },
  { key: 'monitoring', label: 'Monitoring and evaluation', records: 'Indicator returns, evaluations and the corrective actions they lead to' },
];
const FUNCTION_KEYS = ADMIN_FUNCTIONS.map(f => f.key);
export const functionLabel = (k: AdminFunctionKey) => ADMIN_FUNCTIONS.find(f => f.key === k)?.label ?? k;

const AUDIT = 'institution.department';

/** The terms of a department as it stands (records from before read as name only). */
export function termsOfDepartment(d: Department): DepartmentTerms {
  return { name: d.name, ...(d.office ? { office: d.office } : {}), functions: [...(d.functions ?? [])], services: structuredClone(d.services ?? []), staff: [...(d.staff ?? [])] };
}

/** One department as the screens and the API show it: its record, the office's title, the staff's names, each service's procedure state. */
export interface DepartmentView extends DepartmentTerms {
  id: string;
  status: 'active' | 'ended';
  version: number;
  officeTitle?: string;
  /** The office is no longer in force (or no longer the institution's): the department has no accountable office in force. */
  officeProblem?: string;
  staffNames: { id: string; name: string; office?: string; role?: string; problem?: string }[];
  serviceStates: (DepartmentService & { state: 'approved' | 'draft' | 'none' | 'not a procedure' })[];
  ended?: { at?: string; by?: string; reason?: string };
  history: DepartmentVersion[];
}

export function departmentView(m: Pick<Ministry, 'id'>, d: Department, now = new Date()): DepartmentView {
  const t = termsOfDepartment(d);
  const office = t.office ? getOfficeRecord(t.office) : undefined;
  const ot = office ? officeTermsOf(office, now) : null;
  const officeProblem = t.office && !ot ? 'The office is not in force' : ot && ot.institution !== m.id ? 'The office belongs to another institution' : undefined;
  const pkgs = listPackages();
  return {
    id: d.id, status: isActiveDepartment(d) ? 'active' : 'ended', version: d.version ?? 1, ...t,
    ...(ot ? { officeTitle: ot.title } : {}), ...(officeProblem ? { officeProblem } : {}),
    staffNames: t.staff.map(id => {
      const a = accountById(id);
      if (!a) return { id, name: 'Account not found', problem: 'No such account' };
      return { id, name: a.name, office: a.office, ...(a.role ? { role: a.role } : {}), ...(a.disabled ? { problem: 'Account disabled' } : a.institution !== m.id ? { problem: 'Serves another institution now' } : {}) };
    }),
    serviceStates: t.services.map(s => {
      if (!s.procedure) return { ...s, state: 'not a procedure' as const };
      const versions = pkgs.filter(p => p.key === s.procedure);
      return { ...s, state: versions.some(p => p.state === 'approved') ? 'approved' as const : versions.length ? 'draft' as const : 'none' as const };
    }),
    ...(d.status === 'ended' ? { ended: { ...(d.endedAt ? { at: d.endedAt } : {}), ...(d.endedBy ? { by: d.endedBy } : {}), ...(d.endReason ? { reason: d.endReason } : {}) } } : {}),
    history: structuredClone(d.history ?? []),
  };
}

/** An institution's departments as records (in operation first; ended ones kept). */
export function departmentsOf(id: string, opts: { ended?: boolean } = {}, now = new Date()): DepartmentView[] {
  const m = getMinistry(id);
  if (!m) return [];
  return m.departments.filter(d => opts.ended || isActiveDepartment(d)).map(d => departmentView(m, d, now))
    .sort((a, b) => (a.status === b.status ? a.name.localeCompare(b.name) : a.status === 'active' ? -1 : 1));
}

/** The departments an official account serves in, across institutions. */
export const departmentsOfAccount = (accountId: string): { institution: string; department: string; name: string }[] =>
  listMinistries().flatMap(m => m.departments.filter(d => isActiveDepartment(d) && (d.staff ?? []).includes(accountId)).map(d => ({ institution: m.id, department: d.id, name: d.name })));

// ── Checking a change ─────────────────────────────────────────────────────

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** Check the values a change asks for against the records they name; values left out keep the department's current ones. */
function parseTerms(m: Ministry, input: unknown, now: Date): Partial<DepartmentTerms> | { error: string } {
  if (input === undefined || input === null) return {};
  if (typeof input !== 'object' || Array.isArray(input)) return { error: 'The department\'s terms are { name, office, functions, services, staff }' };
  const x = input as Record<string, unknown>;
  const out: Partial<DepartmentTerms> = {};
  if (x.name !== undefined) { const n = str(x.name, 160); if (!n) return { error: 'Give the department a name' }; out.name = n; }
  if (x.office !== undefined && x.office !== null && x.office !== '') {
    const o = getOfficeRecord(str(x.office, 120));
    const t = o ? officeTermsOf(o, now) : null;
    if (!o || !t) return { error: 'The accountable office is an office in force in the office register (National settings → Offices)' };
    if (t.institution !== m.id) return { error: `${t.title} belongs to another institution: a department is accountable to an office of its own institution` };
    out.office = o.id;
  } else if (x.office === null || x.office === '') out.office = undefined;
  if (x.functions !== undefined) {
    if (!Array.isArray(x.functions) || x.functions.some(f => !FUNCTION_KEYS.includes(f as AdminFunctionKey))) return { error: `Functions are among ${FUNCTION_KEYS.join(', ')}` };
    out.functions = [...new Set(x.functions as AdminFunctionKey[])];
  }
  if (x.services !== undefined) {
    if (!Array.isArray(x.services) || x.services.length > 50) return { error: 'Services are a list (up to 50) of { name, procedure? }' };
    const list: DepartmentService[] = [];
    for (const s of x.services) {
      const v = (typeof s === 'string' ? { name: s } : s) as { name?: unknown; procedure?: unknown } | null;
      const name = str(v?.name, 200);
      if (!name) return { error: 'Each service has a name' };
      const procedure = str(v?.procedure, 60);
      if (procedure) {
        const versions = listPackages({ key: procedure });
        if (!versions.length) return { error: `No procedure ${procedure} in the register (Laws → Procedures)` };
        const owner = ownerInstitution(versions[0]!.owner, authorityFor);
        if (owner && owner !== m.id) return { error: `${procedure} is another institution's procedure` };
      }
      list.push({ name, ...(procedure ? { procedure } : {}) });
    }
    out.services = list;
  }
  if (x.staff !== undefined) {
    if (!Array.isArray(x.staff) || x.staff.length > 500) return { error: 'Staff is a list of official account ids' };
    const ids = [...new Set((x.staff as unknown[]).map(v => str(v, 80)).filter(Boolean))];
    for (const id of ids) {
      const a = accountById(id);
      if (!a) return { error: `No official account ${id}` };
      if (a.institution !== m.id) return { error: `${a.name} is not an official of ${m.name}: staff are the institution's own accounts` };
    }
    out.staff = ids;
  }
  return out;
}

/** Check a whole change against the institution as it stands. */
function parseChange(m: Ministry, input: unknown, now: Date): DepartmentChange | { error: string } {
  const x = (input ?? {}) as { kind?: unknown; department?: unknown; terms?: unknown; reason?: unknown };
  const kind = x.kind;
  if (kind !== 'establish' && kind !== 'amend' && kind !== 'end') return { error: 'A change establishes, amends or ends a department (kind: establish | amend | end)' };
  const reason = str(x.reason, 500);
  if (!reason) return { error: 'Give the reason for the change: it is kept with the department\'s history' };
  const terms = parseTerms(m, x.terms, now);
  if ('error' in terms) return terms;
  if (kind === 'establish') {
    if (!terms.name) return { error: 'Name the new department' };
    if (m.departments.some(d => isActiveDepartment(d) && d.name === terms.name)) return { error: `${terms.name} already exists` };
    return { kind, terms, reason };
  }
  const id = str(x.department, 80);
  const d = m.departments.find(y => y.id === id);
  if (!d) return { error: 'Name the department (its id)' };
  if (!isActiveDepartment(d)) return { error: `${d.name} was ended on ${d.endedAt?.slice(0, 10) ?? 'an earlier date'}: it is kept, and changes no more` };
  if (kind === 'amend' && !Object.keys(terms).length) return { error: 'Say what changes' };
  if (kind === 'amend' && terms.name && m.departments.some(y => y.id !== d.id && isActiveDepartment(y) && y.name === terms.name)) return { error: `${terms.name} already exists` };
  return { kind, department: d.id, ...(kind === 'amend' ? { terms } : {}), reason };
}

const describe = (m: Ministry) => (c: DepartmentChange) => {
  const d = c.department ? m.departments.find(x => x.id === c.department) : undefined;
  const what = c.kind === 'establish' ? `establish ${c.terms?.name}` : c.kind === 'end' ? `end ${d?.name ?? c.department}` : `amend ${d?.name ?? c.department} (${Object.keys(c.terms ?? {}).join(', ')})`;
  return `${m.name}: ${what} · ${c.reason}`.slice(0, 300);
};

/** Apply an adopted change: a new version of the department, the earlier one kept. */
function apply(m: Ministry, c: DepartmentChange, who: { by: string; confirmedBy?: string; basis?: PolicyVersion<DepartmentChange>['basis'] }, now: Date): Department {
  const at = now.toISOString();
  let d: Department;
  if (c.kind === 'establish') {
    d = { id: c.department ?? uid('DEP'), name: c.terms!.name!, status: 'active', functions: [], services: [], staff: [], version: 0, history: [] };
    m.departments.push(d);
  } else d = m.departments.find(x => x.id === c.department)!;
  // A department from before (no history yet) keeps what it was as version 1 of its history.
  if (!d.history?.length && c.kind !== 'establish') {
    d.history = [{ ...termsOfDepartment(d), version: 1, at: m.createdAt, change: 'record', by: 'Recorded before departments kept versions', status: 'active' }];
    d.version = 1;
  }
  const next: DepartmentTerms = { ...termsOfDepartment(d), ...(c.terms ?? {}) };
  if (c.terms && 'office' in c.terms && !c.terms.office) delete next.office;
  Object.assign(d, { name: next.name, functions: next.functions, services: next.services, staff: next.staff });
  if (next.office) d.office = next.office; else delete d.office;
  if (c.kind === 'end') Object.assign(d, { status: 'ended', endedAt: at, endedBy: who.by, endReason: c.reason });
  d.version = (d.version ?? 0) + 1;
  (d.history ??= []).push({ ...termsOfDepartment(d), version: d.version, at, change: c.kind, by: who.by, ...(who.confirmedBy ? { confirmedBy: who.confirmedBy } : {}), reason: c.reason, ...(who.basis?.length ? { basis: who.basis } : {}), status: isActiveDepartment(d) ? 'active' : 'ended' });
  return d;
}

/** The administrator's standing to propose: of the institution, or of the whole government where its reach goes (never into an independent institution). */
export interface DepartmentActor { by: string; byId?: string; role?: string; institution?: string }
function proposerRefusal(m: Ministry, a: DepartmentActor): string | null {
  if (a.role === undefined) return null; // sign-in not enforced (demonstrations, tests): the declared name
  if (a.role !== 'administrator') return 'An administrator proposes a change to an institution\'s departments';
  if (a.institution === m.id) return null;
  if (a.institution) return 'You can change only your own institution\'s departments';
  return isIndependentInstitution(m.id) ? `${m.name} is independent: its own administrators change its departments (its internal administration is its own)` : null;
}

/**
 * During first-run setup only: an administrator records a department change
 * directly (the commissioning step). Afterwards refused: use
 * proposeDepartmentChange(). Audited; every version kept.
 */
export function recordDepartmentDuringSetup(id: string, input: unknown, actor: DepartmentActor, now = new Date()): Department | { error: string } {
  if (!setupRunning()) return { error: 'Setup is complete: departments now change only through the change process (one official proposes, a different one confirms)' };
  const m = getMinistry(id);
  if (!m) return { error: 'No such institution' };
  const why = proposerRefusal(m, actor);
  if (why) return { error: why };
  const c = parseChange(m, input, now);
  if ('error' in c) return c;
  const d = apply(m, c, { by: actor.by }, now);
  recordAudit(actor.by, `${AUDIT}.setup`, `Ministry:${id}`, 'ok', `${describe(m)(c)} · recorded during first-run setup`);
  return structuredClone(d);
}

/** One administrator proposes a change to an institution's departments (citing the law where one applies); a different official confirms it. */
export function proposeDepartmentChange(id: string, input: unknown, legalBasis: unknown, actor: DepartmentActor, now = new Date()) {
  const m = getMinistry(id);
  if (!m) return { error: 'No such institution' };
  if (m.status === 'merged') return { error: 'This institution was merged into another' };
  const why = proposerRefusal(m, actor);
  if (why) return { error: why };
  const c = parseChange(m, input, now);
  if ('error' in c) return c;
  // A new department's id is fixed when proposed, so the confirmation adopts exactly what was proposed.
  const change: DepartmentChange = c.kind === 'establish' ? { ...c, department: uid('DEP') } : c;
  return proposePolicy<DepartmentChange>(m.departmentChanges ??= {}, change, {}, legalBasis, {
    by: actor.by, ...(actor.byId ? { byId: actor.byId } : {}), now, pendingHours: dualControlPendingHours(), audit: AUDIT,
    context: `Departments of ${m.name}`, describe: describe(m), check: () => null,
    // Internal organisation may rest on the institution's own decision rather than a provision of law: a citation, when given, is resolved.
    optionalBasis: true,
  });
}

/** Whether a confirmation must come from the institution itself: an independent institution's departments are its own. */
export const departmentConfirmerRequired = (id: string): boolean => isIndependentInstitution(id);

/**
 * A different official confirms the waiting change (an administrator or one
 * who can sign; for an independent institution, one of its own officials).
 */
export function confirmDepartmentChange(id: string, actor: DepartmentActor, now = new Date()) {
  const m = getMinistry(id);
  if (!m) return { error: 'No such institution' };
  if (actor.role && actor.role !== 'administrator' && actor.role !== 'signatory') return { error: 'An administrator or an official who can sign confirms a change to an institution\'s departments' };
  if (actor.role && departmentConfirmerRequired(id) && actor.institution !== id) return { error: `${m.name} is independent: one of its own officials confirms changes to its departments` };
  if (actor.role && actor.institution && actor.institution !== id) return { error: 'You can confirm only your own institution\'s changes' };
  const pending = m.departmentChanges?.pending;
  if (pending) {
    // The department may have changed since the proposal: check it again before adopting it.
    const again = parseChange(m, { ...pending.values, department: pending.values.kind === 'establish' ? undefined : pending.values.department }, now);
    if ('error' in again) return { error: `The proposal no longer fits the institution: ${again.error}` };
  }
  return confirmPolicy<DepartmentChange>(m.departmentChanges ??= {}, {
    by: actor.by, ...(actor.byId ? { byId: actor.byId } : {}), now, audit: AUDIT, describe: describe(m),
    adopt: v => { apply(m, v.values, { by: v.by, confirmedBy: actor.by, basis: v.basis }, now); },
  });
}

export const withdrawDepartmentChange = (id: string, by: string, reason?: string) => {
  const m = getMinistry(id);
  if (!m) return { error: 'No such institution' };
  return withdrawPolicy(m.departmentChanges ??= {}, { by, ...(reason ? { reason } : {}), audit: AUDIT });
};

/** Lapse waiting changes whose time has passed (read time). */
export function lapseDepartmentChanges(now = new Date()): void {
  for (const m of listMinistries()) if (m.departmentChanges?.pending) lapsePolicy(m.departmentChanges, now, AUDIT);
}

/** Every institution with a department change waiting for its second official (the onboarding hub lists them). */
export const waitingDepartmentChanges = () => listMinistries().filter(m => m.departmentChanges?.pending).map(m => ({ id: m.id, name: m.name, what: describe(m)(m.departmentChanges!.pending!.values), pending: structuredClone(m.departmentChanges!.pending!) }));

/**
 * The earlier direct routes (POST …/departments { name }, DELETE or POST
 * …/departments/{deptId} { reason }) keep working: during setup they record the
 * change at once; afterwards they propose it (the answer says it waits).
 */
export function departmentChange(id: string, input: unknown, legalBasis: unknown, actor: DepartmentActor, now = new Date()): { recorded: Department } | { proposed: object } | { error: string } {
  if (setupRunning()) {
    const r = recordDepartmentDuringSetup(id, input, actor, now);
    return 'error' in r ? r : { recorded: r };
  }
  const p = proposeDepartmentChange(id, input, legalBasis, actor, now);
  return 'error' in p ? p : { proposed: p };
}
