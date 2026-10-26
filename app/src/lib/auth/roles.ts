// What a signed-in official may do (register 15.4). Every platform account has
// a role and, unless it serves the whole government, one institution (a
// ministry id from the registry, /api/org). The same rules run in the
// middleware (every change through the API, when the session can be verified
// there) and in the routes that need the record itself to decide (directives,
// accounts). No imports: this file runs at the edge as well as in Node.

export type OfficialRole = 'administrator' | 'signatory' | 'officer' | 'auditor';

export const ROLES: { id: OfficialRole; label: string; means: string }[] = [
  { id: 'administrator', label: 'Administrator', means: 'Manages official accounts, setup and the structure of government, and does the day-to-day work of an official. Does not decide cases: that needs an account of the institution responsible, with the role Can sign.' },
  { id: 'signatory', label: 'Can sign', means: 'Does the work of an officer, and signs or withdraws directives.' },
  { id: 'officer', label: 'Officer', means: 'Works cases and incidents and drafts directives.' },
  { id: 'auditor', label: 'Auditor (read only)', means: 'Reads every record and changes nothing.' },
];
export const isRole = (v: unknown): v is OfficialRole => ROLES.some(r => r.id === v);
export const roleLabel = (r: OfficialRole) => ROLES.find(x => x.id === r)!.label;

/**
 * Where whole-government reach stops (docs/CONSTITUTIONAL_ARCHITECTURE.md
 * §5.1, §5.3; plan phase 2). Read from the institution register at use
 * (lib/data/store/institutions.ts institutionBounds()) and carried with the
 * signed-in official (lib/auth/official.ts currentOfficial()), so this file
 * keeps no imports.
 */
export interface Boundaries {
  /** Independent institutions: the legislature, courts, the head of state's office, bodies the constitution sets up,
   *  bodies set up by law whose decisions are recorded as protected, and those named for the judiciary and data protection. */
  independent: string[];
  /** Courts (standing judiciary, or named for the judiciary or a constitutional court): closed to every other institution. */
  judicial: string[];
  /** The public audit office, when the nation named one and recorded it as set up by the constitution. */
  audit?: string;
  /** Every registered institution: directives are issued and signed for one only by its own officials. */
  institutions?: string[];
  /** The approved relationships between institutions in force today (lib/data/store/relationships.ts relationshipGrants(); plan phase 3). */
  relationships?: RelationshipGrant[];
  /**
   * Regional and local governments with their own powers (standing `subnational`): whole-government (federal or
   * central) scope stops at them as at an independent institution, and reaches them only under an approved
   * relationship (plan phase 7; audit K; guidance §8.4 test 2). Which competences are reserved is the nation's law:
   * the platform only refuses what no approved relationship covers.
   */
  subnational?: string[];
  /** The institution named for the `legislature` authority: the keeper of the legislative record (plan phase 7). */
  legislature?: string;
  /** The institution named for the `headOfState` authority: records assent where the legislative procedure asks for it. */
  headOfState?: string;
}

/**
 * One approved relationship in force (docs/CONSTITUTIONAL_ARCHITECTURE.md
 * §3.3): `from` holds the power `type` over `to`, within the record types
 * (or, for an instruction, the kinds of directive) and purposes listed.
 * The version is the adopted version in force, named in the access log.
 */
export interface RelationshipGrant { id: string; version: number; from: string; to: string; type: string; recordTypes: string[]; purposes: string[] }

/** Relationships that let the actor read the target's records: read only and for a listed purpose, never every record, a change or a decision (§3.3). */
export const READ_RELATIONSHIPS = ['audit', 'request_information'];
const purposeKey = (p: string) => p.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/**
 * The approved relationship that lets this official's institution read
 * `to`'s records of one of `recordTypes` for the stated purpose, or null.
 * Only officials of the relationship's own institution; never officials
 * serving the whole government by that fact. It grants a read and nothing
 * else: every rule that changes or decides ignores it. The caller writes the
 * read to the access log with the relationship and its version
 * (relationshipRule()).
 */
export function readRelationship(s: Scope, to: string, recordTypes: string[], purpose?: string): RelationshipGrant | null {
  const p = purpose ? purposeKey(purpose) : '';
  if (!s.institution || !p || s.institution === to) return null;
  return s.bounds?.relationships?.find(g => g.from === s.institution && g.to === to && READ_RELATIONSHIPS.includes(g.type)
    && g.recordTypes.some(t => recordTypes.includes(t)) && g.purposes.includes(p)) ?? null;
}
/** How a read under a relationship is named in the access log. */
export const relationshipRule = (g: RelationshipGrant) => `Relationship ${g.id} version ${g.version} (${g.type.replace('_', ' ')}): read only, for a stated purpose`;
/** When the official's institution has a read relationship with `to` but stated no purpose it covers: what to state. */
function relationshipHint(s: Scope, to: string, recordTypes: string[]): string | null {
  if (!s.institution) return null;
  const gs = s.bounds?.relationships?.filter(g => g.from === s.institution && g.to === to && READ_RELATIONSHIPS.includes(g.type) && g.recordTypes.some(t => recordTypes.includes(t))) ?? [];
  if (!gs.length) return null;
  return `Your institution may read these records only for a purpose its relationship lists: state one of ${[...new Set(gs.flatMap(g => g.purposes))].join(', ')}`;
}

/** The part of an official's session the rules read. */
export interface Scope {
  role?: OfficialRole; institution?: string;
  /** The installation requires this official to use the second sign-in step. */
  twoStepRequired?: boolean;
  /** This session passed the second sign-in step. */
  twoStep?: boolean;
  /** Where whole-government reach stops (absent: nothing is independent, as before the register recorded it). */
  bounds?: Boundaries;
  /** The account's attribute scope (facilities, jurisdictions, tasks), read from its record at each request (plan I2). Narrows, never widens. */
  attributes?: AttributeScope;
  /** Delegations of authority to this official in force today, read from the delegations register at each request (plan I2). */
  delegations?: DelegationGrant[];
}

// ── Attribute scope, transparent delegation and task permissions (plan I2) ──
// Read from records at each request (lib/auth/official.ts currentOfficial()):
// the account's attributes and the delegations register. Neither an office
// nor a department grants anything here: attributes only narrow what the
// role and institution allow, and a delegation lets an official of the same
// institution take a decision step another official who can sign there
// delegated to them, under a cited law, for a period, where the procedure
// marks the step delegable (the law allows it).

/** What an account is scoped to within its institution: an absent or empty list leaves that attribute open. */
export interface AttributeScope { facilities?: string[]; jurisdictions?: string[]; tasks?: string[] }
/**
 * A delegation of authority in force (lib/records/delegations.ts, kind
 * `authority`; form ADM-GOV-039): `delegator` (an official who can sign at
 * `institution`) lets the holder take the listed decision steps (`actions`,
 * case package action keys or task ids; `procedures`, package keys or '*')
 * from `from` until `until`, resting on the cited law (`basis`).
 */
export interface DelegationGrant { id: string; delegator: { id: string; name: string }; institution: string; procedures: string[]; actions: string[]; from: string; until?: string; basis: string }

/** The facts about a record an attribute check reads: its facility, its jurisdiction (region) and the task the step is. */
export interface AttributeFacts { facility?: string; jurisdiction?: string; task?: string }
/**
 * Whether the account's attribute scope reaches this record and task: null
 * when it does (or the account is not scoped by that attribute). A record
 * without the attribute (no facility named) is outside a facility-scoped
 * account's reach: scoping narrows, so the unknown is refused.
 */
export function attributeRefusal(s: Scope, on: AttributeFacts): string | null {
  const a = s.attributes;
  if (!a) return null;
  if (a.facilities?.length && !(on.facility && a.facilities.includes(on.facility))) return on.facility ? 'Your account is scoped to other facilities: this record belongs to a facility outside your scope' : 'Your account is scoped to named facilities: this record names none of them';
  if (a.jurisdictions?.length && !(on.jurisdiction && a.jurisdictions.includes(on.jurisdiction))) return on.jurisdiction ? `Your account is scoped to ${a.jurisdictions.join(', ')}: this record is in ${on.jurisdiction}` : 'Your account is scoped to named jurisdictions: this record names no region';
  if (a.tasks?.length && on.task && !a.tasks.includes(on.task)) return `Your account is scoped to named tasks: ${on.task} is not one of them`;
  return null;
}

/**
 * The delegation that lets this official take `action` of procedure
 * `procedure` at `institution` on `on` (YYYY-MM-DD), or null. Only an official
 * of that institution, never across institutions; only in its period; never
 * by the delegator to themselves.
 */
export function delegationCovering(s: Scope & { id?: string }, institution: string, procedure: string | undefined, action: string | undefined, task: string | undefined, on: string): DelegationGrant | null {
  if (s.institution !== institution) return null;
  const familyOf = (k?: string) => (k && /^(adm|proc)\.[a-z-]+\./.test(k) ? k.split('.').slice(0, 2).join('.') : k);
  return s.delegations?.find(g => g.institution === institution && g.from <= on && (!g.until || on < g.until) && g.delegator.id !== s.id
    && (g.procedures.includes('*') || (!!procedure && (g.procedures.includes(procedure) || g.procedures.includes(familyOf(procedure)!))))
    && ((!!action && g.actions.includes(action)) || (!!task && g.actions.includes(task)))) ?? null;
}

/**
 * The catalogue's task-level permission identifiers (forms catalogue parts 9
 * §11, 10 §12.1, 12 §10.2, 13 §11.1; supplement part 21), expressed as
 * roles.ts rules: each needs a role at the institution that `keeper` names
 * (a deployment-profile slot, the permit authority mapping for the permit
 * type, or the institution's own records), and, where it is a decision, a
 * package step marked as one (`needs.task` on the step, lib/casework/types.ts).
 * Mapped to institutions and roles, never to offices: holding an office
 * grants none of them (catalogue: "technical permissions, not statutory
 * powers"; each country maps them to its authorised offices through who is
 * responsible, the permit authority registry and its procedures).
 * `built` says whether a procedure or register carries the task yet.
 */
export interface TaskPermission {
  id: string;
  /** The least role: 'any' for a public or citizen act, 'auditor' for a read-only audit task. */
  role: OfficialRole | 'any';
  /** A legal decision: a step of an approved procedure, sealed, citing the law (two officials where the platform minimum applies). */
  decision?: boolean;
  /** Whose officials act: a deployment-profile slot, the approved permit authority mapping, or the institution's own records. */
  keeper: { slot: string } | 'mapping' | 'own';
  /** What carries it on the platform. */
  step: string;
  built: 'built' | 'not built' | 'legal review';
}
const T = (id: string, role: TaskPermission['role'], keeper: TaskPermission['keeper'], step: string, built: TaskPermission['built'], decision?: true): TaskPermission => ({ id, role, keeper, step, built, ...(decision ? { decision } : {}) });
export const TASK_PERMISSIONS: TaskPermission[] = [
  // Part 9 §11: transport and infrastructure (plan I7): licences and permits under the permit authority mapping.
  T('transport.application.read', 'officer', 'mapping', 'canReadInstitution() for the institution the mapping names', 'not built'),
  T('transport.application.submit', 'any', 'mapping', 'openCase() on the transport procedure (self-service, assisted or paper)', 'not built'),
  T('transport.application.assess', 'officer', 'mapping', 'an assessment step (needs.role officer, task transport.application.assess)', 'not built'),
  T('transport.licence.issue', 'signatory', 'mapping', 'a decision step under the approved permit mapping (powerRefusal())', 'not built', true),
  T('transport.register.correct', 'signatory', 'mapping', 'a correction case decided by two officials', 'not built', true),
  T('transport.inspection.record', 'officer', 'mapping', 'an inspection step recorded under the assigned inspector\'s account (needs.assigned)', 'not built'),
  T('transport.enforcement.recommend', 'officer', 'mapping', 'a recommendation step with reasons (no decision)', 'not built'),
  T('transport.enforcement.approve', 'signatory', 'mapping', 'a decision step under the approved mapping, four-eyes', 'not built', true),
  T('infrastructure.permit.assess', 'officer', 'mapping', 'an assessment step of the building-control procedure', 'not built'),
  T('infrastructure.permit.approve', 'signatory', 'mapping', 'a decision step under the approved permit mapping', 'not built', true),
  T('infrastructure.asset.manage', 'officer', 'own', 'the institution\'s own asset records (ADM-AST-022 … 024)', 'not built'),
  T('transport.audit.read', 'auditor', 'own', 'canReadInstitution() with a purpose; every read in the access log', 'built'),
  // Part 10 §12.1: public safety (plan I7); police evidence, custody and force records need legal review (I11).
  T('safety.incident.create', 'officer', 'own', 'an incident record of the institution (incidents API)', 'built'),
  T('safety.incident.triage', 'officer', 'own', 'acknowledging and escalating an incident (named official)', 'built'),
  T('safety.dispatch.assign', 'officer', 'own', 'dispatch records (substrate dispatches)', 'built'),
  T('safety.command.manage', 'signatory', 'own', 'incident command decisions by an official who can sign', 'not built'),
  T('police.case.read', 'officer', { slot: 'police' }, 'caseReadRefusal() on police.incident cases (intake and referral only)', 'built'),
  T('police.case.update', 'officer', { slot: 'police' }, 'police.incident steps (classification citing the law, referral)', 'built'),
  T('police.evidence.register', 'officer', { slot: 'police' }, 'none: needs the judiciary\'s and the country\'s legal review (plan I11)', 'legal review'),
  T('police.evidence.transfer', 'officer', { slot: 'police' }, 'none: needs legal review (plan I11)', 'legal review'),
  T('police.custody.record', 'officer', { slot: 'police' }, 'none: needs legal review (plan I11)', 'legal review'),
  T('police.force.report', 'officer', { slot: 'police' }, 'none: needs legal review (plan I11)', 'legal review'),
  T('safety.alert.prepare', 'officer', 'own', 'drafting an alert (approval by two officials before release)', 'not built'),
  T('safety.alert.approve', 'signatory', 'own', 'a four-eyes approval step before an alert is released', 'not built', true),
  T('safety.declaration.propose', 'administrator', 'own', 'proposing an emergency as a transition (lib/transitions), citing the law', 'built'),
  T('safety.declaration.approve', 'signatory', 'own', 'confirming the transition by a different person (lib/transitions)', 'built', true),
  T('safety.emergency_power.review', 'signatory', 'own', 'reviewing an emergency in force (lib/transitions/restrictions.ts)', 'built'),
  T('safety.relief.assess', 'officer', 'own', 'a relief assessment step', 'not built'),
  T('safety.recovery.audit', 'auditor', 'own', 'read with a purpose; access log', 'built'),
  // Part 12 §10.2: the legislature (its own record) and elections (plan I11; legal review for voter registration).
  T('legislature.bill.submit', 'officer', { slot: 'legislature' }, 'legislativeRecordRefusal(record): introducing a bill', 'built'),
  T('legislature.bill.amend', 'officer', { slot: 'legislature' }, 'legislativeRecordRefusal(record): an amendment', 'built'),
  T('legislature.vote.record', 'signatory', { slot: 'legislature' }, 'legislativeRecordRefusal(sign): a recorded vote', 'built', true),
  T('legislature.proceedings.publish', 'signatory', { slot: 'legislature' }, 'legislativeRecordRefusal(sign): publication', 'built', true),
  T('election.voter.register', 'officer', { slot: 'electoral' }, 'none: voter registration needs legal review and stays with the electoral body', 'legal review'),
  T('election.voter.correct', 'signatory', { slot: 'electoral' }, 'none: needs legal review', 'legal review', true),
  T('election.candidate.assess', 'officer', { slot: 'electoral' }, 'an electoral-body procedure (plan I11)', 'not built'),
  T('election.result.submit', 'officer', { slot: 'electoral' }, 'an electoral-body procedure (plan I11)', 'not built'),
  T('election.result.certify', 'signatory', { slot: 'electoral' }, 'a four-eyes certification step of the electoral body (plan I11)', 'not built', true),
  T('election.complaint.review', 'signatory', { slot: 'electoral' }, 'an electoral complaint procedure (plan I11)', 'not built', true),
  T('political_party.registration.assess', 'officer', { slot: 'electoral' }, 'a political parties register type (plan I11)', 'not built'),
  T('political_finance.return.review', 'officer', { slot: 'electoral' }, 'campaign finance returns (plan I11)', 'not built'),
  T('independent_body.case.manage', 'officer', 'own', 'caseActRefusal(): an independent institution\'s cases are worked only by its own officials', 'built'),
  // Part 13 §11.1: the digital front door and records (plan I13).
  T('government.service.publish', 'signatory', 'own', 'the public service catalogue (plan I13, lib/frontdoor/catalogue.ts): proposed by one official, published or retired by a different person who can sign at the owning institution; site editor for site content (lib/data/site-editorial.ts)', 'built', true),
  T('government.application.route', 'officer', 'own', 'openCase(): the procedure\'s owner from who is responsible', 'built'),
  T('government.workflow.manage', 'signatory', 'own', 'approving a procedure version (lib/casework/packages.ts, a different official)', 'built', true),
  T('government.document.issue', 'signatory', 'own', 'a decision step sealing a decision (lib/records/decisions.ts)', 'built', true),
  T('government.document.verify', 'any', 'own', '/verify and qualification.verify: public checks', 'built'),
  T('government.record.access', 'officer', 'own', 'caseReadRefusal() and register read rules; every read in the access log', 'built'),
  T('government.record.correct', 'signatory', 'own', 'a correction case under the register\'s procedure', 'built', true),
  T('government.record.dispose', 'signatory', 'own', 'records disposal under an approved retention schedule, authorised by two officials other than the one who listed it (plan I13, rec.disposal, lib/recordkeeping); the platform retention rules (lib/data/retention.ts)', 'built', true),
  T('government.data_exchange.approve', 'administrator', 'own', 'proposeIntegrationApproval() / confirmIntegrationApproval(): two officials', 'built', true),
  T('government.statistics.publish', 'signatory', { slot: 'statistics' }, 'a statistical release procedure (plan I8)', 'not built', true),
  T('government.open_data.approve', 'signatory', 'own', 'an open data release (plan I8)', 'not built', true),
  T('government.dashboard.manage', 'administrator', 'own', 'the twin\'s registered sources and metrics (lib/twin)', 'built'),
  T('government.integration.manage', 'administrator', 'own', 'connected systems (/api/integrations), approved by two officials', 'built'),
  T('government.audit.read', 'auditor', 'own', 'canReadAuditChain(): auditors and the data-protection authority; every read logged', 'built'),
  T('government.production.activate', 'administrator', 'own', 'Update Center change control: proposed by one official, approved by another (lib/data/change-control.ts)', 'built', true),
  // Supplement part 21: shared internal administration (each institution's own; lib/administration/procedures.ts).
  T('administration.establishment.request', 'officer', 'own', 'adm.establishment: request (ADM-HR-001)', 'built'),
  T('administration.establishment.approve', 'signatory', 'own', 'adm.establishment: approve, four-eyes', 'built', true),
  T('administration.payroll.prepare', 'officer', 'own', 'adm.payroll-input: submit (ADM-PAY-011)', 'built'),
  T('administration.payroll.review', 'officer', 'own', 'adm.payroll-review: review, by a person other than the preparer (ADM-PAY-012)', 'built'),
  T('administration.payroll.approve', 'signatory', 'own', 'adm.payroll-review: approve, by a person other than the preparer and the reviewer', 'built', true),
  T('administration.payroll.correct', 'signatory', 'own', 'adm.payroll-correction: approve, four-eyes (ADM-PAY-013)', 'built', true),
  T('administration.access.privileged.approve', 'signatory', 'own', 'adm.privileged-access: approve, time-limited, four-eyes (ADM-ICT-030)', 'built', true),
  T('administration.policy.approve', 'signatory', 'own', 'adm.policy: approve, four-eyes (ADM-GOV-040)', 'built', true),
  T('administration.delegation.approve', 'signatory', 'own', 'adm.delegation: approve, four-eyes; recorded in the delegations register (ADM-GOV-039)', 'built', true),
  T('administration.personnel.read', 'officer', 'own', 'restricted cases: the assigned officials and those who can sign; every read in the access log', 'built'),
  T('administration.legal.advise', 'officer', 'own', 'adm.legal-advice: restricted (ADM-LEG-027)', 'built'),
  T('administration.discipline.decide', 'signatory', 'own', 'adm.disciplinary: decide, four-eyes, restricted (ADM-HR-010)', 'built', true),
];
export const taskPermission = (id: string): TaskPermission | undefined => TASK_PERMISSIONS.find(t => t.id === id);

/**
 * May this official perform the catalogue task `id` at the institution
 * `keeper` resolves to (the caller resolves a slot or a mapping; for 'own',
 * the record's institution)? Null when yes. Roles, institutions and
 * attributes only: never an office.
 */
export function taskRefusal(s: Scope, id: string, institution: string | undefined): string | null {
  const t = taskPermission(id);
  if (!t) return `No task ${id} is defined (lib/auth/roles.ts TASK_PERMISSIONS)`;
  if (t.built === 'legal review') return `${id} needs the country's legal review before anything carries it`;
  const role = roleOf(s);
  if (t.role === 'any') return null;
  if (t.role === 'auditor') return role === 'auditor' ? null : `${id} is an auditor's read`;
  if (role === 'auditor') return 'Auditors can read records but not change them';
  if (!institution) return `Name the institution responsible for ${id} first (Who is responsible, or the permit authority registry)`;
  if (s.institution !== institution) return `${id} is done by officials of the institution responsible for it; serving the whole government or holding an office does not give that authority`;
  if (t.role === 'signatory' && role !== 'signatory') return `${id} needs an official who can sign there`;
  if (t.role === 'administrator' && role !== 'administrator') return `${id} needs an administrator there`;
  return attributeRefusal(s, { task: id });
}

/**
 * Reading an institution's internal administration workspace (plan I2):
 * its own officials, and officials serving the whole government and
 * auditors where whole-government reach goes (never into an independent or
 * regional institution: the legislature, the judiciary and independent
 * institutions keep their own internal administration).
 */
export function canReadAdministration(s: Scope, institution: string): string | null {
  if (s.institution === institution || fullView(s, institution)) return null;
  return isIndependent(s, institution) ? 'This institution is independent: its internal administration is read only by its own officials'
    : isSubnational(s, institution) ? 'This is a regional or local government with its own powers: its internal administration is read by its own officials'
    : 'You can read only your own institution\'s internal administration';
}

/** Officials the policy requires to use the second step make no changes until this session has passed it. */
export function secondStepMissing(s: Scope): string | null {
  return s.twoStepRequired && !s.twoStep ? 'Set up the second sign-in step under My account, then sign in again, before making changes' : null;
}

/** Who must use the second sign-in step: nobody (default), officials who can sign (and administrators), or everyone. */
export type TwoStepPolicy = 'none' | 'signers' | 'all';
/** Whether a two-step policy covers an official with this role (the one rule; lib/auth/officials.ts and the accounts screen read it). */
export const twoStepCovers = (policy: TwoStepPolicy, role: OfficialRole): boolean =>
  policy === 'all' || (policy === 'signers' && (role === 'administrator' || role === 'signatory'));

/** When roles were introduced (seconds since 1970): sessions and accounts dated before it carry no role. */
export const ROLES_SINCE = Date.parse('2026-10-18T10:37:47Z') / 1000;
/**
 * The role a session or account acts with. Only records from before roles
 * existed (a session issued, or an account created, before ROLES_SINCE) keep
 * what they could do then, everything; anything newer without a role gets
 * the least: officer (deny by default, architecture review S4).
 */
export const roleOf = (s: { role?: OfficialRole; iat?: number; createdAt?: string }): OfficialRole => {
  if (s.role) return s.role;
  const at = s.iat ?? (s.createdAt ? Date.parse(s.createdAt) / 1000 : undefined);
  return at === undefined || at < ROLES_SINCE ? 'administrator' : 'officer';
};
/** True when the official serves every institution, not one. */
export const wholeGovernment = (s: Scope): boolean => !s.institution;

/** Whether an institution stands outside whole-government reach. */
export const isIndependent = (s: Scope, id: string | undefined): boolean => !!id && !!s.bounds?.independent.includes(id);
/** Whether an institution is a regional or local government with its own powers (outside central reach). */
export const isSubnational = (s: Scope, id: string | undefined): boolean => !!id && !!s.bounds?.subnational?.includes(id);
/** Whether an institution is a court. */
export const isJudicial = (s: Scope, id: string | undefined): boolean => !!id && !!s.bounds?.judicial.includes(id);
/**
 * Whether the official's scope reaches an institution: its own officials
 * always; officials serving the whole government only when it is not
 * independent (whole-government scope stops at the legislature, the courts,
 * the head of state's office and independent bodies).
 */
export const reaches = (s: Scope, id: string): boolean => s.institution === id || (wholeGovernment(s) && !isIndependent(s, id) && !isSubnational(s, id));
const independentRefusal = 'This institution is independent: only its own officials work here; serving the whole government does not reach it';
const subnationalRefusal = 'This is a regional or local government with its own powers: only its own officials work here; the central government acts there only through its own officials, and reads or instructs only under an approved relationship';

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// ── Which rule covers each change through the API ─────────────────────────
// Every mutating route file under app/api must match exactly one of the lists
// below; anything else is refused (deny by default). api-permission-coverage.test.ts
// walks the route files and fails when a new one is not covered, so a route
// cannot slip past the rules by being forgotten.

/** Citizens ask for and manage email updates from the public sites without signing in
 *  (double opt-in and per-sender limits in lib/data/site-subscriptions.ts). */
export const PUBLIC_WRITE: RegExp[] = [/^\/api\/public-sites\/[a-z-]+\/subscribe$/, /^\/api\/subscriptions$/];
/**
 * Machine callers with no browser session that authenticate themselves in the
 * route, whatever they present: every scheduled job under /api/cron
 * (CIVICOS_CRON_SECRET, called by pg_cron; each refuses when the secret is
 * unset), the deployment agent's health reports (per-nation agent credential)
 * and a ministry's connected systems (their own ccf_ / facility feed keys).
 */
export const SELF_AUTHENTICATED: RegExp[] = [/^\/api\/cron\/[a-z0-9-]+$/, /^\/api\/releases\/health$/, /^\/api\/org\/ministries\/[^/]+\/queue\/feed$/, /^\/api\/org\/ministries\/[^/]+\/facilities\/feed$/,
  /^\/api\/federation\/exchange$/,  // an institution's integration key (verifyIntegrationKey), logged with a signed receipt
  /^\/api\/oauth\/token$/,          // OAuth2 client credentials: the integration's id and key (lib/auth/client-credentials.ts)
  /^\/api\/exchange\/services\/[a-z0-9.-]+$/, // another system's call to a service: its integration key of scope service:<id> (verifyIntegrationKey in the route)
  /^\/api\/citizen\/applications$/, // a citizen's own applications: the route checks the citizen's session (lib/auth/citizen.ts)
  /^\/api\/citizen\/representation$/, // I13: representations a citizen grants and revokes: the route checks the citizen's session (lib/auth/citizen.ts)
  /^\/api\/audit\/witnesses$/];     // a witness attestation: signed by a key an administrator registered (verifyWitnessStatement in the route)
/**
 * Routes that verify an `Authorization` bearer themselves (the automation
 * secret of the route's purpose or a platform-tier substrate session: lib/platform-auth.ts,
 * lib/updates/access.ts). Only on these, and on SELF_AUTHENTICATED, does a
 * request carrying an Authorization header skip the session gate; anywhere
 * else the header counts for nothing.
 */
export const BEARER_ROUTES: RegExp[] = [
  /^\/api\/releases\/publisher(\/|$)/,       // publisherAuthorized() under CIVICOS_AUTH=enforce
  /^\/api\/admin\/officers\/bulk$/,           // platformOrSecretAuthorized(req, 'provisioning')
  /^\/api\/federation\/webhooks\/test$/,      // platformOrSecretAuthorized(req, 'provisioning')
  /^\/api\/substrate\/(digest|export)$/,     // CIVICOS_EXPORT_SECRET
  // SensorThings create on a twin stream source's Datastream and DELETE (withdrawal) of a reading it sent: the bound
  // integration's own key, scope sta:write (verifyIntegrationKey in staCreate / staDelete, lib/twin/sta-write.ts);
  // PATCH answers 405. POST Tasks there takes no key: a signed-in official allowed by canTaskSensor (checked in the route).
  /^\/api\/twin\/sta\/v1\.1\/.+$/,
  // The integration that executes a tasking capability reports a task's status with its own key, scope sta:task
  // (verifyIntegrationKey in the route, lib/twin/tasking.ts acknowledgeTask).
  /^\/api\/twin\/tasking\/executor\/[^/]+$/,
];
/** Read-only routes that verify a bearer themselves (machine readers such as a metrics scraper). */
export const BEARER_READS: RegExp[] = [
  /^\/api\/metrics$/,                         // CIVICOS_METRICS_TOKEN, compared in constant time
  /^\/api\/integrations\/verify$/,           // an integration key, compared by its hash in constant time
  // GIS clients (QGIS, ArcGIS, GDAL) reading the twin with an integration key of scope ogc:read, or an
  // access token issued for it (POST /api/oauth/token): OGC API – Features, SensorThings and vector
  // tiles of the facility register, of the nation's boundaries and of the land parcel register (public
  // fields only; machineReadRefusal() in each route,
  // lib/twin/machine-read.ts). The public PMTiles archive is not among them: it is open to everyone (a
  // public read in the middleware); an institution's own archive is for its signed-in officials only.
  /^\/api\/twin\/(ogc|sta)(\/|$)/,
  /^\/api\/twin\/tiles\/facilities(\/|$)/,
  /^\/api\/twin\/tiles\/boundaries(\/|$)/,
  /^\/api\/twin\/tiles\/parcels(\/|$)/,
  // The executing integration pulls the tasks of its tasking capabilities with its own key, scope sta:task.
  /^\/api\/twin\/tasking\/executor$/,
  // The mirror feed for services/civic-api's follower: an integration key of scope mirror:read (review D8).
  /^\/api\/platform\/mirror$/,
];
/** True when the route checks the caller's own credential (bearer, agent or feed key). */
export const verifiesOwnCredential = (pathname: string): boolean =>
  SELF_AUTHENTICATED.some(re => re.test(pathname)) || BEARER_ROUTES.some(re => re.test(pathname)) || BEARER_READS.some(re => re.test(pathname));

/** Changes the structure of government or the installation: administrators only. */
const ADMIN_ONLY: RegExp[] = [
  /^\/api\/auth\/officials(\/|$)/,
  /^\/api\/org\/ministries\/?$/,
  /^\/api\/org\/ministries\/[^/]+\/(merge|deactivate|activate|rename)\/?$/,
  /^\/api\/setup(\/|$)/,
  /^\/api\/sovereign(\/|$)/,
  /^\/api\/facilities\/policy(\/|$)/,
  // The nation's parcel policy: its cadastre authority, parcel id format, overlap rule (four-eyes).
  /^\/api\/parcels\/policy(\/|$)/,
  /^\/api\/map-pack(\/|$)/,
  // The nation's rules for its twin (four-eyes withdrawal of imports).
  /^\/api\/twin\/policy(\/|$)/,
  // Declaring and retiring what a stream's device can be tasked to do (tasking capabilities).
  /^\/api\/twin\/tasking\/capabilities(\/|$)/,
  // The installation itself: backups and their restore, configuration and its
  // apply, deployments, releases and tenant lifecycle.
  /^\/api\/platform(\/|$)/,
  // Connections to other installations and outside systems.
  /^\/api\/federation(\/|$)/,
  // Which keys count as audit-chain witnesses (registering and revoking them).
  /^\/api\/audit\/witnesses\/keys$/,
  /^\/api\/integrations(\/|$)/,
  /^\/api\/webhooks(\/|$)/,
  // The nation's email and SMS providers and its message outbox (lib/messaging).
  /^\/api\/messaging(\/|$)/,
  // Provisioning a new municipality (/admin/onboarding).
  /^\/api\/municipalities\/?$/,
  // The register types of the organisations register (which authority keeps which register).
  /^\/api\/organisations\/types$/,
  /^\/api\/professions\/types$/,
  // What the public product check shows (the nation's public information classification): proposed citing the law, confirmed by a different official.
  /^\/api\/health-regulation\/products$/,
  // The public-health country rule sets (intervention authority rules, CFG-PH-003; the small-cell threshold): proposed citing the law, confirmed by a different official.
  /^\/api\/health-regulation\/programmes$/,
  /^\/api\/dual-control$/,
  // Which authority the law designates for each permit and licence type (four-eyes in the route).
  /^\/api\/permit-authorities$/,
  // Creating or refreshing the demo cast (demo and training installations only; lib/auth/demo-cast.ts).
  /^\/api\/demo\/cast$/,
  // Loading the demo data pack: cast, sample acts and procedures, sample cases (lib/casework/demo-pack.ts).
  /^\/api\/demo\/pack$/,
];
/**
 * The nation's Update Center work that any official who is not an auditor may
 * do: ask for a feature, open and work a support ticket, and send the
 * installation's crash reports (which the data-sovereignty gate still holds
 * back unless an administrator enabled them).
 */
const UPDATE_CENTER_WORK: RegExp[] = [/^\/api\/releases\/(requests|support)(\/|$)/, /^\/api\/releases\/telemetry$/];
/**
 * Installation-level decisions on this nation's own deployment (review H-4):
 * what operational data may leave for the publisher (sovereignty), the
 * deployment agent's credential, break-glass, restoring data, preflight
 * waivers, staging, the release decisions themselves (approve, install,
 * rollback), change control, Update Center settings, the contract, hosting,
 * security-store orders, escrow, the mirror and who is alerted. Only this
 * nation's government-wide administrators (installationAdmin()); no central
 * operator and no other nation takes part. The publisher's own console
 * (/api/releases/publisher) and the agent's health reports keep their own
 * credentials (BEARER_ROUTES, SELF_AUTHENTICATED).
 */
const INSTALLATION: RegExp[] = [/^\/api\/releases(\/|$)/];
/** Signing in and out, one's own second step (authenticator app or passkeys, and the passkey
 *  sign-in challenge) and one's own password stay open to every role; the health probe is public.
 *  Switching to a member of the demo cast is a sign-in too: the route lets only a signed-in
 *  administrator or cast member (any role, so the cast's auditor can switch back) do it, and
 *  answers 404 outside demo and training installations (lib/auth/demo-cast.ts actAsRefusal()). */
const ANY_ROLE: RegExp[] = [/^\/api\/auth\/official\/?$/, /^\/api\/auth\/two-step\/?$/, /^\/api\/auth\/passkeys(\/options)?\/?$/, /^\/api\/auth\/password\/?$/, /^\/api\/health\/?$/, /^\/api\/demo\/act-as$/];
/** Inside one ministry's workspace: officials of that ministry, or of the whole government (not into an independent institution). */
const MINISTRY = /^\/api\/org\/ministries\/([^/]+)\//;
/**
 * The legislature's own record (plan phase 7; guidance §2.3): bills, their versions, stages, amendments, recorded
 * votes, committee referrals and reports, passage, commencement, publication and the clerk's certification. Written
 * only by officials of the institution named for the legislature (legislativeRecordRefusal()); assent only by the
 * head of state's office where one is named (assentRefusal()). Checked again in the route against the record.
 */
const LEGISLATURE = /^\/api\/legislature(\/|$)/;
const ASSENT = /^\/api\/legislature\/bills\/[^/]+\/assent$/;
/** An institution's constitutional terms: listed in OFFICIAL_WORK, decided in the route (lib/data/store/institutions.ts). */
const CONSTITUTIONAL = /^\/api\/org\/ministries\/[^/]+\/standing$/;
/**
 * The day-to-day work of any official who is not an auditor. Routes here that
 * need the record to decide (directives, boundaries, facilities, the Update
 * Center's four-eyes steps) check again with refusal() or their own rules.
 */
const OFFICIAL_WORK: RegExp[] = [
  /^\/api\/ai\/advisory$/,                    // advisory text (refuses when the nation has the assistant off)
  /^\/api\/audit\/proof$/,                    // builds a proof of the audit chain (no change)
  /^\/api\/boundaries(\/|$)/,                 // canManageBoundaries() in the route
  /^\/api\/directives(\/|$)/,                 // canDraftDirective() / canSignDirective() in the route
  /^\/api\/law(\/|$)/,                        // the laws register: canRecordLaw() / canConfirmLaw() in the route
  /^\/api\/cases(\/|$)/,                      // cases: caseActRefusal() in the workflow engine (lib/casework/engine.ts)
  /^\/api\/organisations\/loads$/,           // loading an existing register: the authority that keeps it (the route checks)
  /^\/api\/education$/,                      // institutional returns: canRecordEducationReturn() in the route
  /^\/api\/health-regulation$/,              // capacity returns: canRecordHealthReturn() in the route
  /^\/api\/rules$/,                          // operational rules: canManageRule() in the route
  // Independent oversight (plan I8, lib/oversight): intake with the protected identity kept apart, reading it (the assigned or authorised
  // official, logged), and what the institution concerned adds beside the body's record (a response, evidence, a controller's answer);
  // each checked against the record in lib/oversight. Cases themselves move only through /api/cases.
  /^\/api\/oversight$/,
  // The economic group (plan I5): a sealed bid received and withdrawn, a committee member's own declaration of interests and its
  // management, an institution adopting the procurement templates (lib/procurement); progress on a Cabinet action and its closure,
  // the Cabinet rules proposed and confirmed (lib/cabinet). Each checked in the route against the record and the rules below.
  /^\/api\/procurement$/,
  /^\/api\/cabinet-office$/,
  /^\/api\/indicators$/,                     // indicator definitions: indicatorDraftRefusal() / indicatorApproveRefusal() in the store; the small-cell rule adminOnly() in the route
  /^\/api\/access-log\/retention$/,          // oversight confirmation of shortening the access log: canConfirmAccessLogRetention() in the route
  /^\/api\/case-packages(\/|$)/,              // procedures: drafted by the responsible institution, approved by one who can sign there (route)
  /^\/api\/documents\/verify$/,               // checks a document code (no change)
  /^\/api\/facilities\/(check|candidates)(\/|$)/, // checks and candidate review (rules in the route)
  /^\/api\/facilities\/[^/]+$/,               // one site (canSignForSite() etc. in the route)
  /^\/api\/ops\/incidents(\/|$)/,
  // The land parcel register: canRecordParcel() / canCertifyParcel() in the route (the cadastre authority).
  /^\/api\/parcels(\/|$)/,
  /^\/api\/payments$/,
  /^\/api\/permits(\/|$)/,
  /^\/api\/signatures$/,
  // Site editor and site settings: proposed by one official, published by another (lib/data/site-editorial.ts);
  // only officials of the site's own institution or of the whole government (canActForSite() in the route).
  /^\/api\/public-sites\/[a-z-]+(\/|$)/,
  // The Update Center's ordinary work is UPDATE_CENTER_WORK; the rest of /api/releases is INSTALLATION.
  /^\/api\/twin\/(keys|metrics|runs|scenarios|sources|conflicts)(\/|$)/, // registering metrics and withdrawing imports are audited with the official
  /^\/api\/twin\/tasking\/tasks(\/|$)/,       // a signed-in official allowed by canTaskSensor() (checked in the route)
  // Account changes waiting for an independent institution's confirmation: proposed by an administrator through
  // /api/auth/officials, confirmed here by an official who can sign at that institution (canConfirmAccountChange()
  // in the route), withdrawn by the proposer or an administrator. Not ADMIN_ONLY: the confirmer is the institution's.
  /^\/api\/auth\/account-changes(\/|$)/,
  // An institution's constitutional terms (standing, independence): proposed by an administrator citing the law,
  // confirmed by a different official, by the institution itself when it is independent (checked in the route).
  // Before MINISTRY so an independent institution's own official can confirm while whole-government scope cannot act there.
  /^\/api\/org\/ministries\/[^/]+\/standing$/,
  // Relationships between institutions (plan phase 3): proposed by an administrator citing the law, confirmed by a
  // different official, by each independent end's own official who can sign (checked in the route,
  // lib/data/store/relationships.ts). Not ADMIN_ONLY: the confirmer may be an independent institution's signatory.
  /^\/api\/org\/relationships$/,
  // Offices of state and who holds them (lib/nation/office-register.ts): proposed by an administrator citing the law,
  // confirmed by a different official, by the office's institution when it is independent (checked in the store).
  // Holding an office grants no permission: nothing in this file reads it.
  /^\/api\/offices$/,
  // The constitutional profile (plan phase 5, lib/constitution/profile.ts): each step checks who may take it in the
  // store (drafting by a whole-government administrator; legal review, validation and approval by people other than
  // the drafter; consultation by the consulted institution's own officials; disputes by any administrator or one who
  // can sign). Not ADMIN_ONLY: an independent institution's signatory answers a consultation or raises a dispute.
  /^\/api\/constitution\/profile$/,
  // Transitions and emergencies (plan phase 6, lib/transitions/events.ts): each kind checks who records and confirms it
  // (an office's institution, a court's own officials, the institution the nation names for an impeachment stage, the
  // declarant of an interest …). Not ADMIN_ONLY: a court's signatory records a ruling. Nothing here reads a transition
  // to grant a permission; a declared conflict of interest only removes one (caseActRefusal()).
  /^\/api\/constitution\/transitions$/,
  // The seal key register (lib/keys/seal-register.ts): proposed by an administrator or a signatory of the seal keys
  // authority, approved only by officials who can sign there (sealKeyProposeRefusal() / sealKeyApproveRefusal(),
  // checked in the store). Not ADMIN_ONLY: the approvers are the named authority's own officials.
  /^\/api\/seal-keys$/,
  // Territory and infrastructure (plan I7): the nation's building control rules (proposed by an official of the building
  // control authority citing the law, confirmed by a different one who can sign there: checked in the route); a local
  // government's council rules and its own procedures (only its own officials: checked in the route, never whole-government
  // scope). Cases themselves move only through /api/cases.
  /^\/api\/building$/,
  /^\/api\/local-government$/,
  // I13 (plan step I13): the public service catalogue (proposed by an official of the owning institution, published or retired by a
  // different one who can sign there), service management (dashboards, objectives and targets, performance reports, disruptions,
  // changes, architecture exceptions; each checked in lib/frontdoor) and records management (adopting the procedures, the archive's
  // receipt of a transfer by its own official; schedules, holds, disposals and migrations move only through /api/cases).
  /^\/api\/services$/,
  /^\/api\/services\/management$/,
  /^\/api\/records-management$/,
];

export type MutationRule = 'public-write' | 'self-authenticated' | 'bearer' | 'any-role' | 'admin' | 'installation' | 'ministry' | 'official' | 'legislature';

/** The rule that covers a change to `pathname`, or null when none does (refused). */
export function mutationRule(pathname: string): MutationRule | null {
  if (PUBLIC_WRITE.some(re => re.test(pathname))) return 'public-write';
  if (SELF_AUTHENTICATED.some(re => re.test(pathname))) return 'self-authenticated';
  if (ANY_ROLE.some(re => re.test(pathname))) return 'any-role';
  if (ADMIN_ONLY.some(re => re.test(pathname))) return 'admin';
  if (BEARER_ROUTES.some(re => re.test(pathname))) return 'bearer';
  if (UPDATE_CENTER_WORK.some(re => re.test(pathname))) return 'official';
  if (INSTALLATION.some(re => re.test(pathname))) return 'installation';
  if (CONSTITUTIONAL.test(pathname)) return 'official';
  if (LEGISLATURE.test(pathname)) return 'legislature';
  if (MINISTRY.test(pathname)) return 'ministry';
  if (OFFICIAL_WORK.some(re => re.test(pathname))) return 'official';
  return null;
}

/**
 * Whether a change through the API is allowed: null when it is, otherwise the
 * reason shown to the official. Reads only the method and path, so it can run
 * before the route; routes that need the record (directives) check again.
 * A change no rule covers is refused (deny by default).
 */
export function apiPermission(s: Scope, method: string, pathname: string): string | null {
  if (!MUTATING.has(method.toUpperCase())) return null;
  const rule = mutationRule(pathname);
  // Open to anyone, or the route checks its caller's own credential.
  if (rule === 'public-write' || rule === 'self-authenticated' || rule === 'any-role') return null;
  const missing = secondStepMissing(s);
  if (missing) return missing;
  const role = roleOf(s);
  if (role === 'auditor') return 'Auditors can read records but not change them';
  if (rule === 'admin') return adminOnly(s);
  if (rule === 'installation') return installationAdmin(s);
  if (rule === 'ministry') return ministryPermission(s, decodeURIComponent(MINISTRY.exec(pathname)![1]!));
  if (rule === 'official' || rule === 'bearer') return null;
  // The legislature's record: decided here when the boundaries are known (the signed-in official carries them),
  // and always again in the route against the record itself.
  if (rule === 'legislature') {
    if (!s.bounds) return null;
    return ASSENT.test(pathname) ? assentRefusal(s, s.bounds.headOfState, s.bounds.legislature) : legislativeRecordRefusal(s, s.bounds.legislature, 'record');
  }
  return 'No permission rule covers this change, so it is refused (lib/auth/roles.ts)';
}

export function adminOnly(s: Scope): string | null {
  return roleOf(s) === 'administrator' ? null : 'Only an administrator can make this change';
}

/**
 * Installation-level decisions on this nation's deployment (the INSTALLATION
 * paths, and both officials of a dual-control step there): an administrator
 * who serves the whole government of this nation. An administrator scoped to
 * one institution, and every officer, signatory or auditor, may not.
 */
export function installationAdmin(s: Scope): string | null {
  if (roleOf(s) === 'administrator' && wholeGovernment(s)) return null;
  return 'Only an administrator serving the whole government can take installation-level decisions (Update Center)';
}

/** Whether the official may act inside one ministry's workspace. */
export function ministryPermission(s: Scope, ministryId: string): string | null {
  if (roleOf(s) === 'auditor') return 'Auditors can read records but not change them';
  if (reaches(s, ministryId)) return null;
  return wholeGovernment(s) ? (isSubnational(s, ministryId) ? subnationalRefusal : independentRefusal) : 'You can act only for your own institution';
}

/**
 * Downloading an institution's own site archive (restricted sites at their
 * exact position, lib/twin/tiles-archive.ts institutionArchive()): its own
 * officials of every role, auditors included, and the whole government.
 */
export function canDownloadSiteArchive(s: Scope, ministryId: string): string | null {
  if (reaches(s, ministryId)) return null;
  return isIndependent(s, ministryId)
    ? 'This institution is independent: only its own officials may download its site archive'
    : 'Only officials of this institution (or of the whole government) may download its site archive';
}

/**
 * Managing an official's account (creating it, changing its role or
 * institution, a password reset code, resetting its second step, disabling
 * or enabling it) when the account's institution, now or after the change,
 * is independent (plan phase 2, audit D; guidance §5.1 "independent bodies
 * retain their own user administration"): an administrator of that
 * institution does it; an administrator serving the whole government only
 * with the confirmation of an official who can sign there
 * (lib/auth/account-changes.ts, a different person); an administrator of
 * another institution not at all. Executive institutions: any administrator,
 * as before. Returns null (go ahead), the institutions that must confirm, or
 * the reason it is refused.
 */
export function accountChangeRule(s: Scope, institutions: (string | null | undefined)[]): null | { confirmBy: string[] } | string {
  if (roleOf(s) !== 'administrator') return 'Only an administrator can change accounts';
  const outside = [...new Set(institutions.filter((x): x is string => !!x && isIndependent(s, x) && x !== s.institution))];
  if (!outside.length) return null;
  if (!wholeGovernment(s)) return 'This account belongs to an independent institution: only its own administrators manage it (or an administrator serving the whole government, confirmed by an official who can sign there)';
  return { confirmBy: outside };
}

/**
 * An institution's portable export (Health I4 standalone-and-pilot,
 * lib/portability/export.ts): proposed by an administrator whose scope
 * reaches the institution, its own or, for an institution that is not
 * independent, the whole government's (reaches()). An independent
 * institution's export is never set going from whole-government scope.
 */
export function exportProposeRefusal(s: Scope, institution: string): string | null {
  if (roleOf(s) !== 'administrator') return 'Only an administrator proposes an institution\'s export';
  if (reaches(s, institution)) return null;
  if (!wholeGovernment(s)) return 'You can propose an export only for your own institution';
  return isSubnational(s, institution) ? subnationalRefusal : 'This institution is independent: only its own administrators propose its export; serving the whole government does not reach it';
}
/** Confirming it: a different official who can sign at that institution (its own, or the whole government's where that reaches it). */
export function exportConfirmRefusal(s: Scope, institution: string): string | null {
  if (roleOf(s) !== 'signatory') return 'An official who can sign at the institution confirms its export';
  if (reaches(s, institution)) return null;
  return 'Only an official who can sign at this institution confirms its export';
}
/** Downloading the sealed archive: the institution's administrators and officials who can sign there (logged as an export). */
export function exportDownloadRefusal(s: Scope, institution: string): string | null {
  const role = roleOf(s);
  if (role !== 'administrator' && role !== 'signatory') return 'Only the institution\'s administrators and officials who can sign there download its export';
  return reaches(s, institution) ? null : 'Only officials of this institution download its export';
}

/** The pilot's exit gate (lib/pilot/exit-gate.ts, read only): administrators, auditors, the pilot institutions' own officials and the whole government. */
export function canSeePilotGate(s: Scope, institutions: string[]): string | null {
  const role = roleOf(s);
  if (role === 'administrator' || role === 'auditor' || wholeGovernment(s) || institutions.includes(s.institution!)) return null;
  return 'Only the pilot institutions\' officials, administrators and auditors see the pilot\'s exit gate';
}

/** Confirming an account change waiting for an independent institution: an official who can sign there, or its administrator. */
export function canConfirmAccountChange(s: Scope, institution: string): string | null {
  const role = roleOf(s);
  if (s.institution !== institution || (role !== 'signatory' && role !== 'administrator')) return 'An official who can sign at the institution concerned (or its administrator) confirms this account change';
  return null;
}

/** Connecting or disconnecting a ministry's case system issues a machine key: administrators, or those who can sign for that ministry. */
export function canManageFeeds(s: Scope, ministryId: string): string | null {
  const where = ministryPermission(s, ministryId);
  if (where) return where;
  const role = roleOf(s);
  return role === 'administrator' || role === 'signatory' ? null : 'Only an administrator or an official who can sign may connect a case system';
}

/** Connecting a twin stream source to an outside sender (an integration's key for SensorThings, the nation's MQTT broker): administrators, or officials who can sign. */
export function canConnectStream(s: Scope): string | null {
  const role = roleOf(s);
  return role === 'administrator' || role === 'signatory' ? null : 'Only an administrator or an official who can sign may connect a stream to a sensor gateway or broker';
}

/**
 * Creating or cancelling a task for a stream's device (a tasking capability,
 * lib/twin/tasking.ts): it acts on physical equipment, so administrators and
 * officials who can sign; officers and auditors see tasks but do not make them.
 */
export function canTaskSensor(s: Scope): string | null {
  const role = roleOf(s);
  return role === 'administrator' || role === 'signatory' ? null : 'Only an administrator or an official who can sign may task a sensor or device';
}

/** Publishing a proposed site, certifying it for its institution, or confirming a move: those who can sign for the owning institution. */
export function canSignForSite(s: Scope, ownerId: string): string | null {
  const where = ministryPermission(s, ownerId);
  if (where) return where;
  const role = roleOf(s);
  return role === 'administrator' || role === 'signatory' ? null : 'Only an official who can sign for the institution may do this';
}

/**
 * Changing an institution's public website (review M-2): proposing or
 * publishing in the Site editor, its settings (Link, Embed, Migrate, Host and
 * the registered website) and fetching its feed. Officials of the institution
 * that owns the site (lib/data/site-settings.ts siteOwner()), or of the whole
 * government; a site no registered institution owns is for the whole
 * government only. Publishing still needs a different official (site-editorial.ts).
 */
export function canActForSite(s: Scope, ownerId: string | undefined): string | null {
  if (roleOf(s) === 'auditor') return 'Auditors can read records but not change them';
  if (ownerId === undefined ? wholeGovernment(s) : reaches(s, ownerId)) return null;
  return isIndependent(s, ownerId)
    ? 'This institution is independent: only its own officials may change its website'
    : 'Only officials of the institution that owns this website (or of the whole government) may change it';
}

// ── Who may read an institution's personal data (review M-3) ─────────────
/**
 * Reads that carry personal data held for one institution (case subjects,
 * assignees and notes, permit applicants, and the case register's loads and
 * connected systems). Each route on this list checks canReadInstitution() or
 * canReadPermits() (api-permission-coverage.test.ts holds them to it).
 */
export const INSTITUTION_READS: RegExp[] = [
  /^\/api\/org\/ministries\/[^/]+\/queue$/,
  /^\/api\/org\/ministries\/[^/]+\/queue\/import$/,
  /^\/api\/org\/ministries\/[^/]+\/queue\/feeds$/,
  /^\/api\/org\/ministries\/[^/]+\/queue\/feeds\/[^/]+\/signing-key$/,
  /^\/api\/permits(\/[^/]+)?$/,
  /^\/api\/work$/,
];

/**
 * Officials who see every institution's records: those serving the whole
 * government, and auditors, but never into an independent institution
 * (plan phase 2): there only its own officials read. The government's
 * auditors (internal audit) stop there too; the public audit office reads
 * an independent body's cases only with a stated purpose (caseReadRefusal()),
 * never a court's.
 */
const fullView = (s: Scope, id?: string): boolean => (wholeGovernment(s) || roleOf(s) === 'auditor') && !isIndependent(s, id) && !isSubnational(s, id);

/** The record types an institution's queue read covers. */
export const INSTITUTION_RECORDS = ['queue', 'cases'];
/**
 * Reading one institution's cases and the records around them: its own
 * officials, the whole government and auditors (not into an independent
 * institution); and officials of an institution with an approved `audit` or
 * `request_information` relationship covering its queue or cases, for a
 * purpose that relationship lists (read only; the route logs the read).
 */
export function canReadInstitution(s: Scope, ministryId: string, purpose?: string): string | null {
  if (s.institution === ministryId || fullView(s, ministryId)) return null;
  if (readRelationship(s, ministryId, INSTITUTION_RECORDS, purpose)) return null;
  return relationshipHint(s, ministryId, INSTITUTION_RECORDS)
    ?? (isIndependent(s, ministryId) ? 'This institution is independent: its records are read only by its own officials'
      : isSubnational(s, ministryId) ? 'This is a regional or local government with its own powers: its records are read by its own officials, or under an approved relationship for a purpose it lists'
      : 'You can read only your own institution\'s records');
}

/**
 * Reading permits and their applicants: officials of an institution that
 * holds the permit register (lib/data/store permitHolders(): from the
 * registry, the institutions whose kind keeps permits), the whole government
 * and auditors.
 */
export function canReadPermits(s: Scope, holders: string[]): string | null {
  if (fullView(s) || (s.institution !== undefined && holders.includes(s.institution))) return null;
  return 'Permits and their applicants are read only by the institution that issues them';
}

/** Deciding a permit: the same officials as canReadPermits(), except auditors. */
export function canDecidePermit(s: Scope, holders: string[]): string | null {
  if (roleOf(s) === 'auditor') return 'Auditors can read records but not change them';
  return canReadPermits(s, holders);
}

/** Certifying a site's location for the national mapping agency: its officials (or the whole government's administrators while none is named). */
export function canCertifyForAgency(s: Scope, agencyId: string | undefined): string | null {
  if (roleOf(s) === 'auditor') return 'Auditors can read records but not change them';
  if (agencyId ? s.institution === agencyId || (wholeGovernment(s) && roleOf(s) === 'administrator') : wholeGovernment(s) && roleOf(s) === 'administrator') return null;
  return 'Only the national mapping agency certifies locations at this stage';
}

/** Loading and publishing the nation's boundaries: the national mapping agency's officials, or whole-government administrators. */
export function canManageBoundaries(s: Scope, agencyId: string | undefined): string | null {
  if (roleOf(s) === 'auditor') return 'Auditors can read records but not change them';
  if (agencyId && s.institution === agencyId && roleOf(s) !== 'officer') return null;
  if (agencyId && s.institution === agencyId) return 'Officials who can sign at the mapping agency load and publish boundaries';
  if (wholeGovernment(s) && roleOf(s) === 'administrator') return null;
  return 'Only the national mapping agency or a government administrator loads and publishes boundaries';
}

/** Recording a land parcel (or loading a file of them): officials of the nation's cadastre authority (not auditors), or whole-government administrators. */
export function canRecordParcel(s: Scope, authorityId: string | undefined): string | null {
  const role = roleOf(s);
  if (role === 'auditor') return 'Auditors can read records but not change them';
  if (authorityId && s.institution === authorityId) return null;
  if (wholeGovernment(s) && role === 'administrator') return null;
  return 'Only the nation\'s cadastre authority (or a government administrator) records land parcels';
}

/** Publishing a parcel, confirming or discarding a change to it, withdrawing it or a load: those who can sign at the cadastre authority, or whole-government administrators. */
export function canCertifyParcel(s: Scope, authorityId: string | undefined): string | null {
  const role = roleOf(s);
  if (role === 'auditor') return 'Auditors can read records but not change them';
  if (authorityId && s.institution === authorityId && (role === 'signatory' || role === 'administrator')) return null;
  if (wholeGovernment(s) && role === 'administrator') return null;
  return 'Only an official who can sign at the cadastre authority (or a government administrator) publishes or withdraws land parcels';
}

/**
 * Seeing a parcel's rights and their holders (personal data): the cadastre
 * authority's own officials of every role, and whole-government
 * administrators and auditors. Nobody else; never in tiles, the OGC
 * collection, lists or exports (lib/data/parcels.ts publicParcel()).
 */
export function canSeeParcelRights(s: Scope, authorityId: string | undefined | (string | undefined)[]): string | null {
  // The cadastre authority, and since plan step I7 the land registry the nation names for registered interests (lib/data/parcels.ts rightsKeepers()).
  const keepers = (Array.isArray(authorityId) ? authorityId : [authorityId]).filter((x): x is string => !!x);
  if (s.institution && keepers.includes(s.institution)) return null;
  const role = roleOf(s);
  if (wholeGovernment(s) && (role === 'administrator' || role === 'auditor')) return null;
  return 'Rights and holders are shown only to the cadastre authority and officials with need';
}

/** The issuer of a directive by an official serving the whole government: the executive office, never another institution. */
export const EXECUTIVE_OFFICE = 'executive-office';
/** Kinds of directive that only ask or inform: the only kinds addressed to an independent institution (never an instruction). */
export const COMMUNICATION_KINDS = ['request', 'communication', 'referral'];
/** Kinds of directive that instruct (bind the institutions they address). */
export const INSTRUCTION_KINDS = ['executive-order', 'policy', 'budget', 'instruction', 'declaration'];

/**
 * Whether a directive of `kind` from `issuer` may address these registered
 * institutions (plan phase 3; guidance §5.1: "executive cannot issue binding
 * directives to an independent body", default deny). A request, a
 * communication or a referral may go to anyone. An instruction needs an
 * approved `instruct` relationship from the issuer to the target covering
 * its kind when the target is independent, or when the issuer is itself a
 * registered institution addressing another (an institution instructs
 * another only under a power the law gives it). The executive office (the
 * whole government) instructs institutions within its reach as before.
 * Pure: the caller passes the boundaries (institutionBounds()).
 */
export function directiveTargetRefusal(bounds: Boundaries | undefined, issuer: { id: string; name: string }, kind: string, targets: { id: string; name: string }[]): string | null {
  if (COMMUNICATION_KINDS.includes(kind)) return null;
  const registeredIssuer = !!bounds?.institutions?.includes(issuer.id);
  const covered = (to: string) => !!bounds?.relationships?.some(g => g.type === 'instruct' && g.from === issuer.id && g.to === to && (!g.recordTypes.length || g.recordTypes.includes(kind)));
  const missing = targets.filter(t => t.id !== issuer.id && (isIndependent({ bounds }, t.id) || isSubnational({ bounds }, t.id) || registeredIssuer) && !covered(t.id));
  if (!missing.length) return null;
  const independent = missing.filter(t => isIndependent({ bounds }, t.id));
  const regional = missing.filter(t => isSubnational({ bounds }, t.id) && !isIndependent({ bounds }, t.id));
  const list = (xs: { name: string }[]) => xs.map(t => t.name).join(', ');
  const fix = 'record one under National settings · Relationships, citing the law, or send this as a request, a communication or a referral';
  if (independent.length) {
    return `${list(independent)} ${independent.length === 1 ? 'is' : 'are'} independent and cannot be instructed: no approved relationship lets ${issuer.name} instruct ${independent.length === 1 ? 'it' : 'them'} (${kind}); ${fix}`;
  }
  if (regional.length) {
    return `${list(regional)} ${regional.length === 1 ? 'is a regional or local government' : 'are regional or local governments'} with ${regional.length === 1 ? 'its' : 'their'} own powers: no approved relationship lets ${issuer.name} instruct ${regional.length === 1 ? 'it' : 'them'} (${kind}); ${fix}`;
  }
  return `No approved relationship lets ${issuer.name} instruct ${list(missing)} (${kind}): an institution instructs another only under a power the law gives it; ${fix}`;
}

/**
 * The issuer a new directive is recorded under, whatever the request names:
 * an official's own institution, or the executive office for an official
 * serving the whole government (plan phase 2, audit E). Without a signed-in
 * official (sign-in not enforced), the issuer as named.
 */
export function directiveIssuer(s: Scope | null, requested: string): string {
  if (!s) return requested;
  return wholeGovernment(s) ? EXECUTIVE_OFFICE : s.institution!;
}

export function canDraftDirective(s: Scope): string | null {
  return roleOf(s) === 'auditor' ? 'Auditors can read records but not change them' : null;
}

/**
 * Sign or withdraw: signatories and administrators, for their own
 * institution's directives; officials serving the whole government for the
 * executive office's (and directives recorded before issuers were checked),
 * never in the name of a registered institution they do not belong to.
 */
export function canSignDirective(s: Scope, issuer: string): string | null {
  const role = roleOf(s);
  if (role !== 'signatory' && role !== 'administrator') return 'Only an official who can sign may sign or withdraw a directive';
  if (s.institution === issuer) return null;
  if (wholeGovernment(s) && !s.bounds?.institutions?.includes(issuer) && !isIndependent(s, issuer)) return null;
  return wholeGovernment(s)
    ? 'Signing for an institution needs an account of that institution; officials serving the whole government sign the executive office\'s directives'
    : 'You can sign only your own institution\'s directives';
}

/** Drafts are seen only by the issuing institution (and officials serving the whole government, except an independent institution's). */
export function canSeeDraft(s: Scope, issuer: string): boolean {
  return reaches(s, issuer);
}

/** The role a substrate officer has on the platform, from the officer register's role. */
export function roleFromSubstrate(role: string): OfficialRole {
  if (role === 'platform-admin') return 'administrator';
  if (role === 'auditor') return 'auditor';
  if (['president', 'minister', 'cabinet-secretary', 'cabinet-officer', 'permanent-secretary'].includes(role)) return 'signatory';
  return 'officer';
}

// ── Cases and registers: record-level rules (docs/GOVERNMENT_OPERATING_MODEL.md §4) ──
// A case is worked by officials of the institution that owns its procedure;
// a legal decision needs "Can sign" there. Administrators get no automatic
// domain authority (directions 8.2, 20.6): an administrator, or anyone
// serving the whole government, acts on a case only through an account of the
// owning institution with the needed role. Courts' cases are closed to every
// other institution, administrators included (directions 4.6).

export type Sensitivity = 'normal' | 'restricted' | 'secret';

/** What the rules need to know about a case (or a register record) and the action. */
export interface CaseFacts {
  /** The institution that owns the procedure (resolved from the deployment profile). */
  owner: string;
  sensitivity: Sensitivity;
  /** The owner is a court: nobody outside it reads or acts. */
  judicial?: boolean;
  /** The owner is independent (legislature, court, head of state, independent body): nobody outside it reads or
   *  acts, except the public audit office reading with a stated purpose (never a court's). */
  independent?: boolean;
  /** Official ids assigned to the case, and named supervisors (secret cases). */
  assigned?: string[];
  supervisors?: string[];
  /** The action is a legal decision (grant, refuse, register, revoke…). */
  decision?: boolean;
  /** The action needs a recent second sign-in step. */
  stepUp?: boolean;
  /** The procedure's key: a read relationship may cover cases of one procedure only. */
  recordType?: string;
  /** Official ids recused from this case by a declared conflict of interest (lib/transitions; plan phase 6). */
  recused?: string[];
  /** The record's facility, jurisdiction (region) and the step's task, for an account scoped by attributes (plan I2). */
  facility?: string;
  jurisdiction?: string;
  task?: string;
  /** The step's action key, and whether the procedure marks it delegable (the law allows a delegation for it; plan I2). */
  action?: string;
  delegable?: boolean;
}
/** The record types a case read covers: every case of the institution, or this procedure's. */
export const caseRecordTypes = (c: Pick<CaseFacts, 'recordType'>) => ['cases', ...(c.recordType ? [c.recordType] : [])];

/** The part of a session the case rules read, besides the role and institution. */
export interface CaseScope extends Scope {
  /** The official's id (session subject). */
  id?: string;
  /** When this session last passed the second sign-in step (ms since 1970). */
  twoStepAt?: number;
}

/** How recent the second sign-in step must be for an action that asks for it. */
export const STEP_UP_MINUTES = 15;

const assignedTo = (s: CaseScope, c: CaseFacts) => !!s.id && (c.assigned ?? []).includes(s.id);
const supervises = (s: CaseScope, c: CaseFacts) => !!s.id && (c.supervisors ?? []).includes(s.id);

/** May this official take this action on this case? null when yes, otherwise the reason. */
export function caseActRefusal(s: CaseScope, c: CaseFacts, now = Date.now()): string | null {
  const missing = secondStepMissing(s);
  if (missing) return missing;
  const role = roleOf(s);
  if (role === 'auditor') return 'Auditors can read records but not change them';
  if (s.institution !== c.owner) {
    return c.judicial
      ? 'A court\'s cases are worked only by the court\'s own officials'
      : c.independent
        ? 'This institution is independent: its cases are worked only by its own officials'
        : 'Cases are worked only by officials of the institution responsible for them; serving the whole government or administering the installation does not give that authority';
  }
  // A declared conflict of interest: the official steps aside from every action on the case (guidance §4.13).
  if (s.id && (c.recused ?? []).includes(s.id)) return 'You declared a conflict of interest on this case and stepped aside: another official acts on it (the recusal is lifted only by two officials)';
  // Attribute scope (plan I2): an account scoped to facilities, jurisdictions or tasks acts only within them.
  const scoped = attributeRefusal(s, c);
  if (scoped) return scoped;
  // Transparent delegation (plan I2): a decision step the procedure marks delegable may be taken under a
  // delegation in force from an official who can sign there; the engine records both (Step.delegation).
  if (c.decision && role !== 'signatory' && !(c.delegable && delegationCovering(s, c.owner, c.recordType, c.action, c.task, new Date(now).toISOString().slice(0, 10)))) return 'A decision needs an official who can sign for the institution';
  if (c.sensitivity === 'restricted' && !assignedTo(s, c) && role !== 'signatory') return 'This case is restricted to the officials assigned to it and those who can sign';
  if (c.sensitivity === 'secret' && !assignedTo(s, c) && !supervises(s, c)) return 'This case is open only to the officials assigned to it and its named supervisors';
  if (c.stepUp && !(s.twoStepAt && now - s.twoStepAt <= STEP_UP_MINUTES * 60_000)) return `This step needs the second sign-in step within the last ${STEP_UP_MINUTES} minutes: sign in again`;
  return null;
}

/**
 * May this official read this case? null when yes. Restricted and secret
 * reads by auditors need a stated purpose; every such read is written to the
 * access log by the caller (lib/records/access-log.ts).
 */
export function caseReadRefusal(s: CaseScope, c: CaseFacts, purpose?: string): string | null {
  const role = roleOf(s);
  const own = s.institution === c.owner;
  if (c.judicial && !own) return 'A court\'s cases are read only by the court\'s own officials';
  // An approved audit or request-information relationship from the official's institution covering these
  // cases and the stated purpose (plan phase 3): a read, never a change or a decision (caseActRefusal() does
  // not consult it), never a court's case, never a secret one. The caller logs it with the relationship.
  const types = caseRecordTypes(c);
  if (!own && c.sensitivity !== 'secret' && readRelationship(s, c.owner, types, purpose)) return null;
  const hint = own ? null : relationshipHint(s, c.owner, types);
  // An independent institution's cases: its own officials; from outside only the public audit office's
  // auditors, with a stated purpose (the caller writes every such read and refusal to the access log).
  if (c.independent && !own) {
    const publicAudit = role === 'auditor' && !!s.bounds?.audit && s.institution === s.bounds.audit;
    if (!publicAudit) return hint ?? 'This institution is independent: its cases are read only by its own officials';
    return purpose?.trim() ? null : 'Say why you need to read this independent institution\'s case (audit purpose)';
  }
  // A regional or local government's cases (plan phase 7, audit K): its own officials, or under an approved relationship.
  if (!own && isSubnational(s, c.owner)) return hint ?? 'This is a regional or local government with its own powers: its cases are read by its own officials, or under an approved relationship for a purpose it lists';
  // Attribute scope (plan I2): an own official scoped to facilities or jurisdictions reads only within them.
  if (own && role !== 'auditor') { const scoped = attributeRefusal(s, { facility: c.facility, jurisdiction: c.jurisdiction }); if (scoped) return scoped; }
  const auditorWithPurpose = role === 'auditor' && (own || wholeGovernment(s)) && !!purpose?.trim();
  if (c.sensitivity === 'normal') return own || wholeGovernment(s) ? null : hint ?? 'Cases are read by officials of the responsible institution and of the whole government';
  if (c.sensitivity === 'restricted') {
    if (own && (assignedTo(s, c) || role === 'signatory')) return null;
    if (auditorWithPurpose) return null;
    return role === 'auditor' ? 'Say why you need to read this restricted case' : 'This case is restricted to the officials assigned to it and those who can sign';
  }
  if (own && (assignedTo(s, c) || supervises(s, c))) return null;
  if (auditorWithPurpose) return null;
  return role === 'auditor' ? 'Say why you need to read this case' : 'This case is open only to the officials assigned to it and its named supervisors';
}

/** The access log (lib/records/access-log.ts): auditors, and officials of the nation's data-protection authority. Administrators do not read it by their role. */
export function canReadAccessLog(s: Scope, dataProtection: string | undefined): string | null {
  if (roleOf(s) === 'auditor') return null;
  if (dataProtection && s.institution === dataProtection) return null;
  return 'The access log is read by auditors and by the data-protection authority';
}

/**
 * Reading the platform audit chain (GET /api/audit; step I0.1): auditors and
 * the data-protection authority's officials, as for the access log. The chain
 * names who acted across every institution, courts, the legislature and
 * independent bodies included, and its entries carry no institution to filter
 * by, so neither an administrator nor any whole-government or ministry
 * official reads it through the API: audit administration stays apart from
 * operations, and whole-government reach stops at independent institutions.
 * Its integrity check (/api/audit/verify) stays public; screens that show an
 * institution its own history read their records, not the chain.
 */
export function canReadAuditChain(s: Scope, dataProtection: string | undefined): string | null {
  if (roleOf(s) === 'auditor') return null;
  if (dataProtection && s.institution === dataProtection) return null;
  return 'The audit chain is read by auditors and by the data-protection authority';
}

/** Operational rules (lib/law/rules.ts): drafted by officials of the authority that owns the rule; approved by one who can sign there. Administrators have no say in rates. */
export function canManageRule(s: Scope, owner: string | undefined, approve: boolean): string | null {
  if (roleOf(s) === 'auditor') return 'Auditors can read rules but not change them';
  if (!owner || s.institution !== owner) return 'Rules are drafted and approved by the authority that owns them (named under Who is responsible)';
  if (approve && roleOf(s) !== 'signatory') return 'Approving a rule needs an official who can sign for the authority';
  return null;
}

/**
 * Indicator definitions (lib/indicators/register.ts, plan step I3): drafted by
 * an official of the institution that owns the definition, or by a
 * whole-government official where that institution is within reach (never
 * into an independent or subnational one); a definition each institution keeps
 * for its own records may be drafted by any official who is not an auditor.
 * Approved only by an official who can sign at the institution the approval is
 * for (administrators and whole-government officials have no say in what an
 * institution's figures mean).
 */
export function indicatorDraftRefusal(s: Scope, owner: string | undefined): string | null {
  if (roleOf(s) === 'auditor') return 'Auditors can read indicator definitions but not change them';
  if (owner === undefined) return null;
  if (!owner) return 'No institution is named as responsible for this indicator (Configuration → Who is responsible)';
  return reaches(s, owner) ? null : 'An indicator is drafted by officials of the institution that owns it';
}
export function indicatorApproveRefusal(s: Scope, institution: string | undefined): string | null {
  if (roleOf(s) === 'auditor') return 'Auditors can read indicator definitions but not approve them';
  if (!institution || s.institution !== institution) return 'An indicator is approved by an official of the institution whose figures it defines';
  if (roleOf(s) !== 'signatory') return 'Approving an indicator needs an official who can sign for the institution';
  return null;
}

/** Confirming that the access log may be shortened: the data-protection authority's officials who can sign; auditors while none is named. Never an administrator (directions 15.3). */
export function canConfirmAccessLogRetention(s: Scope, dataProtection: string | undefined): string | null {
  const role = roleOf(s);
  if (dataProtection) return s.institution === dataProtection && role === 'signatory' ? null : 'The data-protection authority confirms this (an official who can sign there)';
  return role === 'auditor' ? null : 'An auditor confirms this while no data-protection authority is named';
}

/**
 * The seal key register (lib/keys/seal-register.ts). Proposing a key, or
 * reporting one compromised: an administrator, or an official who can sign at
 * the institution the nation's seal-key rules name (`authority`). Approving a
 * key, confirming a reported compromise and reviewing it afterwards: only an
 * official who can sign at that institution; nobody while the nation has
 * named none (the platform never assumes one). Whole-government scope and
 * seniority grant nothing here.
 */
export function sealKeyProposeRefusal(s: Scope, authority: string | undefined): string | null {
  const role = roleOf(s);
  if (role === 'auditor') return 'Auditors can read records but not change them';
  if (role === 'administrator') return null;
  if (authority && s.institution === authority && role === 'signatory') return null;
  return 'An administrator, or an official who can sign at the seal keys authority, proposes a seal key or reports one compromised';
}
export function sealKeyApproveRefusal(s: Scope, authority: string | undefined): string | null {
  const role = roleOf(s);
  if (role === 'auditor') return 'Auditors can read records but not change them';
  if (!authority) return 'Name the seal keys authority first (Who is responsible, and the seal-key rules citing the law that names it): the platform never assumes who approves the state\'s seal';
  if (s.institution !== authority || role !== 'signatory') return 'Only an official who can sign at the seal keys authority approves a seal key, confirms a compromise or reviews it';
  return null;
}
/** The country's seal-key rules (lib/law/policy-change.ts): proposed by an administrator; confirmed by a different administrator or one who can sign at the seal keys authority. */
export function sealKeyRulesRefusal(s: Scope, authority: string | undefined, step: 'propose' | 'confirm'): string | null {
  const role = roleOf(s);
  if (role === 'auditor') return 'Auditors can read records but not change them';
  if (role === 'administrator') return null;
  if (step === 'confirm' && authority && s.institution === authority && role === 'signatory') return null;
  return step === 'propose' ? 'An administrator proposes the seal-key rules, citing the law' : 'An administrator, or an official who can sign at the seal keys authority, confirms the seal-key rules';
}

/** Recording a version of a law (lib/law/register.ts): officials of the nation's law-register authority; whole-government administrators only while none is named. */
export function canRecordLaw(s: Scope, authority: string | undefined): string | null {
  const role = roleOf(s);
  if (role === 'auditor') return 'Auditors can read records but not change them';
  if (authority) return s.institution === authority ? null : 'Only the law-register authority records laws';
  return wholeGovernment(s) && role === 'administrator' ? null : 'Name the law-register authority under Who is responsible first';
}

/**
 * Keeping the legislature's own record (plan phase 7; guidance §2.3, §6.2): only officials of the institution
 * named for the legislature, never an official serving the whole government (the legislature is independent)
 * and never another institution's. `record`: introducing a bill, its versions, stages, amendments, referrals,
 * reports and proposing a correction (officers, administrators and officials who can sign there). `sign`: what
 * the clerk answers for — recording a vote, passage, commencement, publication, the certification, sending the
 * enacted text to the laws register, approving the legislative procedure and confirming a correction (an
 * official who can sign there).
 */
export function legislativeRecordRefusal(s: Scope, legislature: string | undefined, level: 'record' | 'sign'): string | null {
  const role = roleOf(s);
  if (role === 'auditor') return 'Auditors can read records but not change them';
  if (!legislature) return 'Name the legislature under Who is responsible first: its record is kept by its own officials';
  if (s.institution !== legislature) {
    return wholeGovernment(s)
      ? 'The legislature\'s record is kept by its own officials (the clerk); serving the whole government does not reach it'
      : 'The legislature\'s record is kept by its own officials (the clerk); another institution cannot write or change it';
  }
  if (level === 'sign' && role !== 'signatory') return 'An official who can sign at the legislature (the clerk) records this';
  return null;
}

/**
 * Recording the head of state's assent to a bill (or that it was withheld): an official who can sign at the
 * institution named for the head of state. Where the nation names none, the legislature's clerk records the
 * assent as communicated to the chamber (marked so), never an official serving the whole government.
 */
export function assentRefusal(s: Scope, headOfState: string | undefined, legislature: string | undefined): string | null {
  const role = roleOf(s);
  if (role === 'auditor') return 'Auditors can read records but not change them';
  if (headOfState) {
    if (s.institution !== headOfState) return 'Assent is recorded by the head of state\'s office, not by another institution';
    return role === 'signatory' ? null : 'An official who can sign at the head of state\'s office records assent';
  }
  const why = legislativeRecordRefusal(s, legislature, 'sign');
  return why ? `${why} (no head of state's office is named, so the clerk records assent as communicated)` : null;
}

/** Confirming (four-eyes) or withdrawing a version of a law: those who can sign at the law-register authority; whole-government administrators only while none is named. */
export function canConfirmLaw(s: Scope, authority: string | undefined): string | null {
  const role = roleOf(s);
  if (role === 'auditor') return 'Auditors can read records but not change them';
  if (authority) return s.institution === authority && role === 'signatory' ? null : 'Only an official who can sign at the law-register authority confirms or withdraws a law';
  return wholeGovernment(s) && role === 'administrator' ? null : 'Name the law-register authority under Who is responsible first';
}

/**
 * Reading the civil register (people, births, deaths, marriages; personal
 * data): officials of the civil registration authority, and auditors with a
 * stated purpose. Every search and read is written to the access log.
 */
export function canReadCivil(s: Scope, authority: string | undefined, purpose?: string): string | null {
  if (authority && s.institution === authority && roleOf(s) !== 'auditor') return null;
  if (roleOf(s) === 'auditor') return purpose?.trim() ? null : 'Say why you need to read the civil register';
  return 'The civil register is read by the civil registration authority';
}

/** Tax records (lib/tax/register.ts; tax secrecy): the tax authority's officials; auditors with a purpose. */
export function canReadTax(s: Scope, authority: string | undefined, purpose?: string): string | null {
  if (roleOf(s) === 'auditor') return purpose?.trim() ? null : 'Say why you need to read tax records';
  if (authority && s.institution === authority) return null;
  return 'Tax records are read by the tax authority; other institutions check registration through the exchange (taxpayer.status)';
}

/**
 * Public finance records (lib/finance, plan I5): the finance authority's
 * officials read every institution's; another institution's officials read
 * their own institution's appropriations, commitments, payments and
 * forecasts; whole-government officials where whole-government reach goes;
 * auditors with a purpose (the public audit office reads under its mandate,
 * never changing them). Payment records and payee accounts are restricted:
 * every read in the access log (the route).
 */
export function canReadFinance(s: Scope, institution: string | undefined, financeAuthority: string | undefined, purpose?: string): string | null {
  if (roleOf(s) === 'auditor') return purpose?.trim() ? null : 'Say why you need to read public finance records';
  if (financeAuthority && s.institution === financeAuthority) return null;
  if (institution && (s.institution === institution || fullView(s, institution))) return null;
  return 'Public finance records are read by the finance authority and by each institution for its own';
}
/**
 * Procurement records (lib/procurement, plan I5): each procuring institution
 * its own; the review body the tenders a complaint before it concerns;
 * whole-government reach as usual; auditors with a purpose. A declaration's
 * details only within the procuring institution. Bid contents are sealed
 * until the opening whoever reads.
 */
export function canReadProcurement(s: Scope, institution: string, reviewBody: string | undefined, purpose?: string): string | null {
  if (roleOf(s) === 'auditor') return purpose?.trim() ? null : 'Say why you need to read procurement records';
  if (s.institution === institution || fullView(s, institution)) return null;
  if (reviewBody && s.institution === reviewBody) return null;
  return 'Procurement records are read by the procuring institution (and the review body for a complaint before it)';
}
/**
 * Cabinet records (lib/cabinet, plan I5): the cabinet office's officials read
 * them all; another institution its own submissions, the actions assigned to
 * it and the decisions distributed or published to it. Auditors with a
 * purpose. Never whole-government reach into an independent institution's
 * submissions: those are only its own.
 */
export function cabinetReadScope(s: Scope, cabinetOffice: string | undefined, purpose?: string): { view: 'all' | 'own' } | { refused: string } {
  if (roleOf(s) === 'auditor') return purpose?.trim() ? { view: 'all' } : { refused: 'Say why you need to read Cabinet records' };
  if (cabinetOffice && s.institution === cabinetOffice) return { view: 'all' };
  return s.institution ? { view: 'own' } : { refused: 'Cabinet records are read by the cabinet office; other institutions see their own submissions and the actions assigned to them' };
}

/** Education records (lib/education/register.ts): the education authority's officials; auditors with a purpose. Holders' names are personal data. */
export function canReadEducation(s: Scope, authority: string | undefined, purpose?: string): string | null {
  if (roleOf(s) === 'auditor') return purpose?.trim() ? null : 'Say why you need to read education records';
  if (authority && s.institution === authority) return null;
  return 'Education records are read by the education authority; others check a qualification through the exchange (qualification.verify)';
}

/** Recording an institution's return (aggregate counts it reported): the education authority's officials, never auditors. */
export function canRecordEducationReturn(s: Scope, authority: string | undefined): string | null {
  if (roleOf(s) === 'auditor') return 'Auditors read returns but do not record them';
  if (authority && s.institution === authority) return null;
  return 'Returns are recorded by the education authority (named under Who is responsible)';
}

/** Recording a licensed facility's capacity return: the health regulator's officials, never auditors. */
export function canRecordHealthReturn(s: Scope, authority: string | undefined): string | null {
  if (roleOf(s) === 'auditor') return 'Auditors read returns but do not record them';
  if (authority && s.institution === authority) return null;
  return 'Capacity returns are recorded by the health regulator (named under Who is responsible)';
}

/** Full records of regulated professionals: officials of a regulator that keeps a profession (they see only those); auditors with a purpose. */
export function canReadProfessionals(s: Scope, keptHere: string[], purpose?: string): string | null {
  if (roleOf(s) === 'auditor') return purpose?.trim() ? null : 'Say why you need to read professionals\' records';
  if (keptHere.length) return null;
  return 'Professionals\' records are read by the regulator that keeps the profession; anyone can check standing on the public registers';
}

/** Customs declarations (lib/customs/register.ts; commercially confidential): the customs authority's officials; auditors with a purpose. */
export function canReadCustoms(s: Scope, authority: string | undefined, purpose?: string): string | null {
  if (roleOf(s) === 'auditor') return purpose?.trim() ? null : 'Say why you need to read customs declarations';
  if (authority && s.institution === authority) return null;
  return 'Customs declarations are read by the customs authority; other institutions check release through the exchange (customs.release)';
}

/**
 * A full record of the register of medicines and medical devices
 * (lib/health/products/register.ts: dossier versions, the assessment,
 * composition, sites, grounds of enforcement, recall completions): the
 * officials of the medicines authority the nation named (`medicinesRegulation`)
 * only. Nobody else, not the whole government, an administrator elsewhere or a
 * provisional stand-in: they see publicProductView(). Every read is logged by
 * the route.
 */
export function canReadProduct(s: Scope, authority: string | undefined): string | null {
  if (authority && s.institution === authority && roleOf(s) !== 'administrator') return null;
  return authority
    ? 'Full product records are read by the medicines authority\'s officials; everyone else sees the public product check (publicProductView) or the product.status exchange'
    : 'No medicines authority is named under Who is responsible: nobody reads full product records until the nation names it';
}

/**
 * Human services (plan step I6): the identity register, travel documents, the
 * labour register and the social protection register are read by the officials
 * of the institution the nation names for each (identity, travelDocuments,
 * labour, socialProtection), and by auditors with a stated purpose; never by
 * the whole government or an administrator elsewhere by default. Every search
 * and read, allowed or refused, is written to the access log by the route.
 * Other institutions learn only an exchange answer (identity.verify,
 * travel-document.status, employer.standing).
 */
function humanServicesRead(s: Scope, authority: string | undefined, purpose: string | undefined, what: string, exchange: string): string | null {
  if (roleOf(s) === 'auditor') return purpose?.trim() ? null : `Say why you need to read ${what}`;
  if (authority && s.institution === authority) return null;
  return authority ? `${what[0]!.toUpperCase()}${what.slice(1)} are read by the authority that keeps them; other institutions ${exchange}` : `No institution is named for ${what} under Who is responsible: nobody reads them until the nation names it`;
}
export const canReadIdentity = (s: Scope, authority: string | undefined, purpose?: string) => humanServicesRead(s, authority, purpose, 'identity records', 'check a credential through the exchange (identity.verify)');
export const canReadTravelDocuments = (s: Scope, authority: string | undefined, purpose?: string) => humanServicesRead(s, authority, purpose, 'travel document records', 'check a document through the exchange (travel-document.status)');
export const canReadLabour = (s: Scope, authority: string | undefined, purpose?: string) => humanServicesRead(s, authority, purpose, 'labour records', 'check an employer through the exchange (employer.standing)');
export const canReadSocial = (s: Scope, authority: string | undefined, purpose?: string) => humanServicesRead(s, authority, purpose, 'social protection records', 'receive nothing from them but what a law and an approved exchange allow');

/** Visas and residence permits (lib/immigration/register.ts): the immigration authority's officials; auditors with a purpose. Never the whole government by default (directions 15.1). */
export function canReadImmigration(s: Scope, authority: string | undefined, purpose?: string): string | null {
  if (roleOf(s) === 'auditor') return purpose?.trim() ? null : 'Say why you need to read immigration records';
  if (authority && s.institution === authority) return null;
  return 'Immigration records are read by the immigration authority; other institutions check status through the exchange (immigration.status)';
}

/**
 * An organisation's full record (representatives, every version and step):
 * officials of an institution that keeps a register it is in, officials of
 * the whole government, auditors with a purpose. Everyone else sees its
 * public view (name, number, kind, standings).
 */
export function canReadOrganisation(s: Scope, keepers: string[], purpose?: string): string | null {
  const role = roleOf(s);
  if (role === 'auditor') return purpose?.trim() ? null : 'Say why you need to read this organisation\'s full record';
  if (!s.institution) return null;
  return keepers.includes(s.institution) ? null : 'The full record is read by the authorities that keep its registers';
}

/** Choosing which source stands where two disagree (lib/twin/conflicts.ts): those who can sign at the statistics authority; whole-government administrators while none is named. */
export function canResolveTwinConflict(s: Scope, statistics: string | undefined): string | null {
  const role = roleOf(s);
  if (role === 'auditor') return 'Auditors can read records but not change them';
  if (statistics) return s.institution === statistics && role === 'signatory' ? null : 'Only an official who can sign at the statistics authority decides which figure stands';
  return wholeGovernment(s) && role === 'administrator' ? null : 'Name the statistics authority under Who is responsible first';
}

/**
 * The demo citizen's own Civic Wallet actions (demo and training installations only, owner's decision
 * 2026-10-21): applying for a permit, paying a bill, signing and checking a document. Under enforced
 * sign-in the demo citizen session (civicos_session) may make exactly these POSTs and no other change;
 * the middleware applies it only while samplesAllowed() and with no official session. A production
 * installation has no demo citizen, so the list never applies there.
 */
export const CITIZEN_DEMO_WRITES: RegExp[] = [/^\/api\/permits$/, /^\/api\/payments$/, /^\/api\/signatures$/, /^\/api\/documents\/verify$/];

/** Reading where setup stands (/admin/onboarding): administrators, and auditors who read every record. */
export function canSeeOnboarding(s: Scope): string | null {
  const role = roleOf(s);
  return role === 'administrator' || role === 'auditor' ? null : 'Only administrators and auditors can see where setup stands';
}
