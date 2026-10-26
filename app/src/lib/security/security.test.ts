// Security governance and resilience (plan step I12; catalogue Part 11):
// the classification scheme and the installation's accreditation as a
// country rule set (two officials, citing the law, nothing above the platform
// default until adopted, any record or file marked above the accreditation
// refused); clearances as metadata decided by two officials and kept apart
// from access (need to know, purpose and the action are checked on their own;
// a clearance alone grants nothing); the national cyber incident register,
// vulnerability coordination with restricted recipients and a disclosure
// date, security exceptions that expire, critical infrastructure designations
// citing the law, risk acceptance only by two named officials; security
// directives under the relationship rules (an independent institution gets a
// request, never an instruction); cross-domain transfer records; protected
// disclosures through the existing protected intake. No intelligence
// register, source, target, attribution or score about a person anywhere.
import { asNationSets } from '@/lib/casework/testkit';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const { act, attach, getCase, resetCases, registeredEffects, openCase, cancelPending } = await import('@/lib/casework/engine');
const { draftPackage, approvePackage, resetPackages } = await import('@/lib/casework/packages');
const { addDocument, resetDocuments } = await import('@/lib/records/documents');
const { resetDecisions, getDecision } = await import('@/lib/records/decisions');
const { setSovereign, listMinistries, institutionBounds } = await import('@/lib/data/store');
const { resetPermitAuthorities, installProposedDefaults, listMappings } = await import('@/lib/permits/authority');
const { classifyDecision } = await import('@/lib/permits/decisions');
const { listAccess, resetAccessLog } = await import('@/lib/records/access-log');
const { recordVersion: recordLaw, confirmVersion: confirmLaw, resetLaw } = await import('@/lib/law/register');
const { proposeRelationship, confirmRelationship, resetRelationships } = await import('@/lib/data/store/relationships');
const { securityAccessRefusal } = await import('@/lib/auth/roles');
const { resetProtectedIdentities, identityMarkers } = await import('@/lib/oversight/protected-identity');
const { currentParts } = await import('@/lib/constitution/parts');
const C = await import('./classification');
const { SECURITY_PROCEDURES, SECURITY_PERMITS } = await import('./procedures');
const { resetSecurityRecords, securityRecordOfCase, clearanceOf, effectiveStatus, needToKnowGrant } = await import('./register');
const { readSecurityRecord, listSecurity, publicSecurityView, RECIPIENT_TERMS } = await import('./access');
const D = await import('./directives');
const T = await import('./transfers');
const { receiveSecurityDisclosure } = await import('./disclosures');
type Actor = import('@/lib/casework/engine').Actor;
type Ref = (typeof SECURITY_PROCEDURES)[number];

let CYB = '', CIA = '', SAA = '', NSC = '', MIN = '', DPA = '', ACC = '', OTHER = '';
const bounds = () => institutionBounds();
const at = (inst: () => string) => (id: string, role: 'officer' | 'signatory' | 'auditor' | 'administrator' = 'officer', extra: Record<string, unknown> = {}): Actor =>
  ({ id, name: `Official ${id}`, scope: { id, role, institution: inst(), bounds: bounds(), twoStep: true, ...extra } });
const cyb = at(() => CYB), cia = at(() => CIA), saa = at(() => SAA), nsc = at(() => NSC), min = at(() => MIN);
const viewer = (a: Actor) => ({ ...a.scope!, label: a.name });
const pdf = new Uint8Array(Buffer.from('%PDF-1.7\nx\n%%EOF'));
const doc = (caseId: string, cls: string, who: Actor) => { const d = addDocument({ class: cls, title: cls, institution: who.scope!.institution!, belongsTo: { kind: 'case', id: caseId }, bytes: pdf }, 'Clerk') as { id: string }; attach(caseId, d.id, who); };
async function step(id: string, action: string, who: Actor, extra: Record<string, unknown> = {}) { const r = await act(id, { action, ...extra }, who); if ('error' in r) throw new Error(`${action}: ${r.error}`); return r; }
/** A two-official step: proposed by one, confirmed by a different one. */
async function both(id: string, action: string, a: Actor, b: Actor, extra: Record<string, unknown> = {}) { expect(await step(id, action, a, extra)).toMatchObject({ pending: true }); return step(id, action, b); }
const ok = <T,>(r: T): Exclude<T, { error: unknown }> => { if (r && typeof r === 'object' && 'error' in r) throw new Error(String((r as { error: unknown }).error)); return r as Exclude<T, { error: unknown }>; };
const LISTS: Record<string, string[]> = {
  'security.country.cyber_incident_categories': ['ransomware', 'service-disruption'], 'security.country.cyber_severity_scale': ['level-1', 'level-2', 'level-3'],
  'security.country.infrastructure_sectors': ['energy', 'water'],
};
const nation = (p: Ref) => {
  const used = Object.keys(LISTS).filter(k => p.fields.some(f => f.valuesSource?.kind === 'configured' && f.valuesSource.list === k));
  return { ...asNationSets(p), ...(used.length ? { form: { version: 'nation-1', lists: Object.fromEntries(used.map(k => [k, { values: LISTS[k]!.map(v => ({ value: v, label: v })) }])) } } : {}) };
};
let basis: { instrument: string; eId: string }[];
const SCHEME = { name: 'Protective Marking Scheme 2026', levels: [{ key: 'restricted', label: 'RESTRICTED', handling: 'Need to know; official systems only' }, { key: 'confidential', label: 'CONFIDENTIAL', handling: 'Cleared staff; accredited systems' }, { key: 'secret', label: 'SECRET', handling: 'Accredited secret systems only' }], caveats: ['NATIONAL EYES ONLY'] };
const adopt = (input: Parameters<typeof C.proposeSecurityClassification>[0]) => { ok(C.proposeSecurityClassification(input, basis, { name: 'Admin A', id: 'local:a' })); ok(C.confirmSecurityClassification({ name: 'Admin B', id: 'local:b' })); };
const future = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

describe('security governance and resilience (I12)', () => {
  beforeEach(() => {
    for (const r of [resetCases, resetPackages, resetDocuments, resetDecisions, resetPermitAuthorities, resetAccessLog, resetLaw, resetRelationships, resetProtectedIdentities, resetSecurityRecords, C.resetSecurityClassification, D.resetSecurityDirectives, T.resetTransfers]) r();
    vi.stubEnv('CIVICOS_DATA_KEK', Buffer.alloc(32, 7).toString('base64'));
    [CYB, CIA, SAA, NSC, MIN, DPA, ACC, OTHER] = listMinistries().slice(0, 8).map(m => m.id) as [string, string, string, string, string, string, string, string];
    setSovereign({ deployment: { authorities: { cyberAuthority: CYB, criticalInfrastructure: CIA, securityAccreditation: SAA, nationalSecurity: NSC, dataProtection: DPA, anticorruption: ACC } } }, 'Administrator');
    for (const p of SECURITY_PROCEDURES) {
      const d = draftPackage(nation(p), 'Author', 'author', registeredEffects()); if ('error' in d) throw new Error(`${p.key}: ${d.error}`);
      const a = approvePackage(p.key, 1, 'Approver', 'approver', '2026-01-01', registeredEffects(), new Date('2026-01-01')); if ('error' in a) throw new Error(`${p.key}: ${a.error}`);
    }
    const law = ok(recordLaw({ instrument: { title: 'Cybersecurity and Critical Infrastructure Act', type: 'act', jurisdiction: 'X', year: 2024, number: '7', issuingAuthority: 'Parliament' }, dates: { inForce: '2024-01-01' }, provisions: [{ eId: 'sec_5', num: '5', text: 'The Minister may designate critical infrastructure.' }] }, 'L1', 'l1'));
    confirmLaw(law.instrument.id, law.version.id, 'L2', 'l2');
    basis = [{ instrument: law.instrument.id, eId: 'sec_5' }];
  });
  afterEach(() => { vi.unstubAllEnvs(); setSovereign({ deployment: { authorities: {} } }, 'test'); });

  it('ships drafts only: restricted, metadata only, no intelligence, source, target, attribution or score, no AI, no day count; every decision under a proposed, unapproved mapping', () => {
    for (const p of SECURITY_PROCEDURES) {
      expect(p.sensitivity, p.key).toBe('restricted');
      expect(p.reference, p.key).toBe(true);
      for (const f of p.fields) expect(`${f.key} ${f.label}`, `${p.key} ${f.key}`).not.toMatch(/intelligence|informant|collection method|surveil|intercept|target|attribut|perpetrator|attacker|threat actor|suspect|score|rating/i);
      expect(JSON.stringify(p.actions)).not.toMatch(/\bai\b|advisory|model/i);
      expect(p.deadlines).toEqual([]);
      for (const a of p.actions.filter(x => x.decision)) {
        expect(a.needs.role, `${p.key} ${a.key}`).toBe('signatory');
        const cls = classifyDecision({ fields: {} } as never, a, p as never);
        expect(cls, `${p.key} ${a.key}`).toMatchObject({ kind: 'mapping' });
        expect(Object.values(SECURITY_PERMITS)).toContain((cls as { permitType: string }).permitType);
      }
    }
    // Risk acceptance, a clearance and a designation are two-official decisions; a designation cites the law.
    const action = (k: string, a: string) => SECURITY_PROCEDURES.find(p => p.key === k)!.actions.find(x => x.key === a)!;
    for (const [k, a] of [['ci.risk', 'accept-risk'], ['security.clearance', 'grant'], ['ci.designation', 'designate'], ['cyber.exception', 'approve'], ['cyber.incident', 'close']]) expect(action(k!, a!).needs.fourEyes, `${k} ${a}`).toBe(true);
    expect(action('ci.designation', 'designate').requires?.citations).toBe(true);
    installProposedDefaults('Installer');
    const LEAD: Record<string, string> = { 'cyber.': 'cyberAuthority', 'ci.': 'criticalInfrastructure', 'security.': 'securityAccreditation' };
    for (const [k, permitType] of Object.entries(SECURITY_PERMITS)) {
      const m = listMappings(permitType);
      expect(m, permitType).toHaveLength(1);
      expect(m[0]!.state, permitType).toBe('draft');
      expect(m[0]!.lead).toBe(LEAD[Object.keys(LEAD).find(p => k.startsWith(p))!]);
    }
  });

  it('holds nothing above the platform default until the nation adopts a scheme and declares an accreditation (two officials, citing the law); anything marked above it is refused, files too', () => {
    expect(C.markingRefusal('')).toBeNull();
    expect(C.markingRefusal('secret')).toMatch(/No classification scheme is adopted: nothing is held above the platform default/);
    expect(C.classificationStatus().statement).toMatch(/holds nothing above the platform default/);
    // An administrator proposes citing the law; the same person cannot confirm; a different official does.
    expect(C.proposeSecurityClassification({ scheme: SCHEME }, [], { name: 'Admin A', id: 'local:a' })).toMatchObject({ error: expect.stringMatching(/Cite the legal basis/) });
    ok(C.proposeSecurityClassification({ scheme: SCHEME }, basis, { name: 'Admin A', id: 'local:a' }));
    expect(C.confirmSecurityClassification({ name: 'Admin A', id: 'local:a' })).toHaveProperty('error');
    ok(C.confirmSecurityClassification({ name: 'Admin B', id: 'local:b' }));
    // A scheme without an accreditation still holds nothing above the default.
    expect(C.markingRefusal('restricted')).toMatch(/not accredited above the platform default/);
    expect(C.markingRefusal('top-secret')).toMatch(/not a level of the adopted classification scheme/);
    expect(C.proposeSecurityClassification({ accreditation: { level: 'cosmic', statement: 'x' } }, basis, { name: 'Admin A', id: 'local:a' })).toMatchObject({ error: expect.stringMatching(/not a level of the scheme/) });
    adopt({ accreditation: { level: 'confidential', statement: 'Accreditation decision AC-2026-04 of the security authority' } });
    // Values left out of a proposal keep their setting: the scheme stayed.
    expect(C.securityClassification()).toMatchObject({ scheme: { name: SCHEME.name }, accreditation: { level: 'confidential' }, version: 2 });
    expect(C.markingRefusal('restricted')).toBeNull();
    expect(C.markingRefusal('confidential', ['NATIONAL EYES ONLY'])).toBeNull();
    expect(C.markingRefusal('confidential', ['ALLIES'])).toMatch(/not a handling caveat/);
    expect(C.markingRefusal('secret')).toMatch(/accredited up to CONFIDENTIAL: a record or file marked SECRET is not held here/);
    expect(C.classificationStatus().statement).toMatch(/accredited up to CONFIDENTIAL/);
    // An upload marked above the accreditation is refused before anything is stored.
    expect(addDocument({ class: 'evidence', title: 'x', institution: CYB, belongsTo: { kind: 'case', id: 'c1' }, bytes: pdf, classification: 'secret' }, 'Clerk')).toMatchObject({ error: expect.stringMatching(/not held here/) });
    expect(addDocument({ class: 'evidence', title: 'x', institution: CYB, belongsTo: { kind: 'case', id: 'c1' }, bytes: pdf, classification: 'restricted' }, 'Clerk')).toHaveProperty('id');
    // It is a part of the constitutional profile once adopted.
    expect(currentParts().find(p => p.key === 'securityClassification')).toMatchObject({ version: 2 });
  });

  it('works a national cyber incident end to end: the marking checked, severity on the nation\'s scale with reasons, restricted recipients, two officials to close; recipients see coordination, not detail; every read logged', async () => {
    adopt({ scheme: SCHEME, accreditation: { level: 'confidential', statement: 'AC-1' } });
    const c = openCase({ procedure: 'cyber.incident', fields: { summary: 'Outage of a payments service', marking: 'secret', affectedServices: 'Payments gateway', discoveredAt: '2026-10-20T08:00:00Z' } }, cyb('inc'));
    if ('error' in c) throw new Error(c.error);
    doc(c.id, 'incident-report', cyb('inc'));
    // Marked above the accreditation: refused at registration.
    expect(await act(c.id, { action: 'register' }, cyb('inc'))).toMatchObject({ error: expect.stringMatching(/not held here/) });
    await step(c.id, 'register', cyb('inc'), { fields: { marking: '', evidenceSource: 'SOC ticket 4411', reportingInstitution: MIN } });
    const rec = securityRecordOfCase(c.id)!;
    expect(rec).toMatchObject({ kind: 'incident', owner: CYB, status: 'reported', marking: '' });
    // Severity must be on the nation's scale (no computed score).
    expect(await act(c.id, { action: 'triage', fields: { incidentCategory: 'ransomware', severity: '97' }, reason: 'x' }, cyb('inc'))).toHaveProperty('error');
    await step(c.id, 'triage', cyb('inc'), { fields: { incidentCategory: 'ransomware', severity: 'level-2' }, reason: 'Encrypted hosts on one network segment' });
    await step(c.id, 'escalate', cyb('s1', 'signatory'), { fields: { recipients: MIN, coordinationActions: 'Isolate the segment; report status twice daily' }, reason: 'Ministry operates the service' });
    await step(c.id, 'approve-containment', cyb('s1', 'signatory'), { fields: { containmentActions: 'Segment isolated' }, reason: 'Approved by the duty signatory' });
    await step(c.id, 'preserve-evidence', cyb('inc'), { fields: { evidenceManifest: 'Disk images IMG-1 sha256:ab12…, custody log CL-9' }, reason: 'Preserved' });
    await step(c.id, 'recover', cyb('inc'), { fields: { serviceStatus: 'Operational', recoveryVerification: 'Integrity checked against backups' }, reason: 'Restored' });
    await step(c.id, 'review', cyb('inc'), { fields: { rootCause: 'Unpatched VPN appliance', correctiveActions: 'Patch policy; owner: IT security' }, reason: 'Review held' });
    const closed = await both(c.id, 'close', cyb('s1', 'signatory'), cyb('s2', 'signatory'), { fields: { residualRisk: 'Legacy appliances elsewhere' }, reason: 'Recovered and reviewed' });
    expect(getDecision(closed.decision!.id)!.content.decision).toBe('close-incident');
    const done = securityRecordOfCase(c.id)!;
    expect(done.status).toBe('closed');
    expect(done.versions.map(v => v.step)).toEqual(['open', 'triage', 'escalate', 'approve-containment', 'preserve-evidence', 'recover', 'review', 'close']);
    expect(done.recipients.map(r => r.institution)).toEqual([MIN]);
    expect(done.decisions).toEqual([closed.decision!.id]);

    // The full record: the keeping institution's officials who need to know it, with a purpose. Whole government and administrators: no.
    expect(readSecurityRecord(done.number, viewer(cyb('inc')), { purpose: 'Incident follow-up' })).toHaveProperty('record');
    expect(readSecurityRecord(done.number, viewer(cyb('other')), { purpose: 'Curiosity' })).toMatchObject({ error: expect.stringMatching(/Need to know/) });
    expect(readSecurityRecord(done.number, viewer(cyb('adm', 'administrator')), { purpose: 'x' })).toMatchObject({ error: expect.stringMatching(/Administrators have no access/) });
    const whole = { id: 'wg', label: 'Whole government', role: 'signatory' as const, bounds: bounds(), twoStep: true };
    expect(readSecurityRecord(done.number, whole, { purpose: 'x' })).toMatchObject({ error: expect.stringMatching(/serving the whole government gives no access/) });
    // The recipient institution: the recipient view, coordination terms only, never the evidence or root cause.
    expect(readSecurityRecord(done.number, viewer(min('m1', 'signatory')), { purpose: 'Coordination', view: 'full' })).toMatchObject({ error: expect.stringMatching(/recipient view/) });
    const rv = readSecurityRecord(done.number, viewer(min('m1', 'signatory')), { purpose: 'Coordination', view: 'recipient' });
    if ('error' in rv) throw new Error(rv.error);
    expect(Object.keys((rv.record as { terms: object }).terms).every(k => RECIPIENT_TERMS.incident.includes(k))).toBe(true);
    expect(JSON.stringify(rv.record)).not.toMatch(/Disk images|Unpatched VPN|SOC ticket/);
    expect(readSecurityRecord(done.number, viewer(at(() => OTHER)('o1', 'signatory')), { purpose: 'x', view: 'recipient' })).toMatchObject({ error: expect.stringMatching(/only with the recipients/) });
    // Lists carry no terms; every attempt is in the access log.
    const listed = listSecurity(viewer(min('m1', 'signatory')));
    expect(listed.map(l => l.number)).toEqual([done.number]);
    expect(JSON.stringify(listed)).not.toMatch(/Payments gateway|containment/i);
    const log = listAccess({ register: 'security', recordId: done.number, limit: 50 });
    expect(log.filter(e => e.result === 'refused').length).toBeGreaterThanOrEqual(4);
    expect(log.some(e => e.result === 'allowed' && e.purpose === 'Coordination')).toBe(true);
  });

  it('decides a clearance as metadata by two officials, and keeps it apart from access: a clearance alone grants nothing; need to know, a purpose and the action are each checked', async () => {
    adopt({ scheme: SCHEME, accreditation: { level: 'confidential', statement: 'AC-1' } });
    const subject = 'local:analyst';
    const c = ok(openCase({ procedure: 'security.clearance', fields: { summary: 'Clearance for an incident analyst', subjectOfficial: subject, sponsoringInstitution: CYB, levelRequested: 'confidential', clearancePurpose: 'Handles marked incident reports' } }, saa('vet')));
    doc(c.id, 'sponsorship', saa('vet'));
    await step(c.id, 'register', saa('vet'));
    await step(c.id, 'record-assessment', saa('vet'), { fields: { vettingReference: 'VET-2026-0042 (held by the security authority)' }, reason: 'Assessment complete' });
    // One official cannot grant alone; the platform never decides it.
    const granted = await both(c.id, 'grant', saa('s1', 'signatory'), saa('s2', 'signatory'), { fields: { levelGranted: 'confidential', validUntil: future(365) }, reason: 'Assessment favourable' });
    expect(getDecision(granted.decision!.id)!.content.officials.map(o => o.role)).toEqual(['decided', 'confirmed']);
    expect(clearanceOf(subject)).toMatchObject({ level: 'confidential' });
    // Nothing of the vetting is held: only its reference.
    expect(Object.keys(securityRecordOfCase(c.id)!.terms)).not.toContain('vettingContent');

    // A marked record of the cyber authority.
    const inc = ok(openCase({ procedure: 'cyber.incident', fields: { summary: 'Marked incident', marking: 'confidential', affectedServices: 'x', discoveredAt: '2026-10-20T08:00:00Z' } }, cyb('inc')));
    doc(inc.id, 'incident-report', cyb('inc'));
    await step(inc.id, 'register', cyb('inc'));
    const n = securityRecordOfCase(inc.id)!.number;
    const analyst = { id: subject, label: 'Analyst', role: 'officer' as const, institution: CYB, bounds: bounds(), twoStep: true };
    // Cleared at the level, same institution, a purpose: still refused without need to know.
    expect(readSecurityRecord(n, analyst, { purpose: 'Analysis' })).toMatchObject({ error: expect.stringMatching(/Need to know: .* A clearance, a role or a seniority does not give access/) });
    // Named by one who can sign there (logged), with a purpose: allowed.
    expect(needToKnowGrant(n, { op: 'grant', official: { id: subject, name: 'Analyst' }, reason: 'Assigned to the analysis' }, viewer(cyb('o2')))).toMatchObject({ error: expect.stringMatching(/who can sign/) });
    ok(needToKnowGrant(n, { op: 'grant', official: { id: subject, name: 'Analyst' }, reason: 'Assigned to the analysis' }, viewer(cyb('s1', 'signatory'))));
    expect(readSecurityRecord(n, analyst, { purpose: '' })).toMatchObject({ error: expect.stringMatching(/purpose/) });
    expect(readSecurityRecord(n, analyst, { purpose: 'Analysis' })).toHaveProperty('record');
    // The action: a marked record is never exported.
    expect(readSecurityRecord(n, analyst, { purpose: 'Analysis', action: 'export' })).toMatchObject({ error: expect.stringMatching(/never exported/) });
    // Assurance: a marked record needs the second sign-in step in this session.
    expect(readSecurityRecord(n, { ...analyst, twoStep: false }, { purpose: 'Analysis' })).toMatchObject({ error: expect.stringMatching(/second sign-in step/) });
    // The officer who registered it needs to know it, but has no clearance: refused.
    expect(readSecurityRecord(n, viewer(cyb('inc')), { purpose: 'Follow-up' })).toMatchObject({ error: expect.stringMatching(/clearance at its level/) });
    // A suspended clearance no longer counts.
    await both(c.id, 'suspend', saa('s1', 'signatory'), saa('s2', 'signatory'), { reason: 'Under review' });
    expect(clearanceOf(subject)).toBeNull();
    expect(readSecurityRecord(n, analyst, { purpose: 'Analysis' })).toMatchObject({ error: expect.stringMatching(/clearance/) });
    // A clearance is not a level outside the scheme.
    const c2 = ok(openCase({ procedure: 'security.clearance', fields: { summary: 'x', subjectOfficial: 'local:b', sponsoringInstitution: CYB, levelRequested: 'cosmic', clearancePurpose: 'x' } }, saa('vet')));
    doc(c2.id, 'sponsorship', saa('vet'));
    expect(await act(c2.id, { action: 'register' }, saa('vet'))).toMatchObject({ error: expect.stringMatching(/level of the nation's adopted classification scheme/) });
    // The rule itself, without records: the dimensions are independent.
    const facts = { owner: CYB, rank: 2, needToKnow: ['x'], recipients: [] };
    const s = { id: 'x', role: 'officer' as const, institution: CYB, twoStep: true };
    expect(securityAccessRefusal(s, facts, { action: 'read', view: 'full', purpose: 'p', clearance: { rank: 3 } })).toBeNull();
    expect(securityAccessRefusal({ ...s, id: 'y' }, facts, { action: 'read', view: 'full', purpose: 'p', clearance: { rank: 3 } })).toMatch(/Need to know/);
    expect(securityAccessRefusal(s, facts, { action: 'read', view: 'full', purpose: 'p', clearance: { rank: 1 } })).toMatch(/clearance/);
    expect(securityAccessRefusal(s, facts, { action: 'read', view: 'full', purpose: 'p', clearance: null })).toMatch(/clearance/);
    expect(securityAccessRefusal(null, facts, { action: 'read', view: 'full', purpose: 'p', clearance: { rank: 3 } })).toMatch(/Sign in/);
  });

  it('expires a security exception on its date and never reads it as current; renewal and approval are two-official decisions', async () => {
    const c = ok(openCase({ procedure: 'cyber.exception', fields: { summary: 'Legacy protocol on a border system', requestingInstitution: MIN, control: 'TLS 1.2 minimum', justification: 'Vendor upgrade pending', compensatingControls: 'Network isolation', requestedUntil: future(90) } }, cyb('o1')));
    doc(c.id, 'exception-request', cyb('o1'));
    await step(c.id, 'register', cyb('o1'));
    // The end date is checked when the second official confirms: a past date is refused, and the proposal is withdrawn.
    expect(await act(c.id, { action: 'approve', fields: { validUntil: '2020-01-01' }, reason: 'x' }, cyb('s1', 'signatory'))).toMatchObject({ pending: true });
    expect(await act(c.id, { action: 'approve' }, cyb('s2', 'signatory'))).toMatchObject({ error: expect.stringMatching(/after today/) });
    ok(cancelPending(c.id, cyb('s1', 'signatory'), 'Wrong date'));
    await both(c.id, 'approve', cyb('s1', 'signatory'), cyb('s2', 'signatory'), { fields: { validUntil: future(30) }, reason: 'Isolation in place' });
    const r = securityRecordOfCase(c.id)!;
    expect(r).toMatchObject({ status: 'approved', validUntil: future(30) });
    expect(effectiveStatus(r)).toBe('approved');
    expect(effectiveStatus(r, new Date(Date.now() + 40 * 86_400_000))).toBe('expired');
  });

  it('coordinates a vulnerability with restricted recipients and publishes only the public summary, only once its disclosure date has come', async () => {
    const c = ok(openCase({ procedure: 'cyber.vulnerability', fields: { summary: 'Flaw in a citizen portal component', affectedProduct: 'Portal 4.2', technicalDetail: 'Unauthenticated path traversal via /files?p=../../' } }, cyb('v1')));
    doc(c.id, 'vulnerability-report', cyb('v1'));
    await step(c.id, 'register', cyb('v1'));
    await step(c.id, 'triage', cyb('v1'), { fields: { severity: 'level-3' }, reason: 'Remote and unauthenticated' });
    await step(c.id, 'coordinate', cyb('s1', 'signatory'), { fields: { recipients: MIN }, reason: 'The ministry runs the portal' });
    await step(c.id, 'plan-remediation', cyb('v1'), { fields: { remediationActions: 'Patch 4.2.1', remediationDue: future(14) }, reason: 'Agreed with the supplier' });
    await step(c.id, 'attest', cyb('v1'), { fields: { attestation: 'Retested after the patch' }, reason: 'Verified' });
    await step(c.id, 'set-disclosure', cyb('s1', 'signatory'), { fields: { disclosureDate: future(7), publicSummary: 'A flaw in a portal component was fixed in 4.2.1; update.' }, reason: 'Coordinated date' });
    expect(await act(c.id, { action: 'disclose', reason: 'Date reached' }, cyb('s1', 'signatory'))).toMatchObject({ pending: true });
    expect(await act(c.id, { action: 'disclose' }, cyb('s2', 'signatory'))).toMatchObject({ error: expect.stringMatching(/has not come/) });
    expect(publicSecurityView().advisories).toEqual([]);
    const n = securityRecordOfCase(c.id)!.number;
    const rv = readSecurityRecord(n, viewer(min('m1', 'signatory')), { purpose: 'Patch', view: 'recipient' });
    if ('error' in rv) throw new Error(rv.error);
    expect(JSON.stringify(rv.record)).not.toMatch(/path traversal/);
  });

  it('designates critical infrastructure only citing the law, by two officials; accepts a residual risk only by two named officials', async () => {
    const c = ok(openCase({ procedure: 'ci.designation', fields: { summary: 'Regional water treatment works', sector: 'water', service: 'Drinking water for the capital region', criteriaVersion: 'CI criteria 2026 v1' } }, cia('d1')));
    // The operator is an organisation of the register or a registered institution, when named.
    expect(await act(c.id, { action: 'register', fields: { operator: 'ORG-NOT-THERE' } }, cia('d1'))).toMatchObject({ error: expect.stringMatching(/neither in the organisations register/) });
    await step(c.id, 'register', cia('d1'), { fields: { operator: MIN } });
    doc(c.id, 'designation-assessment', cia('d1'));
    expect(await act(c.id, { action: 'designate', fields: { assessment: 'Meets criteria 1–3' }, reason: 'Critical to the region' }, cia('s1', 'signatory'))).toMatchObject({ error: expect.stringMatching(/Cite the provisions of law/) });
    const d = await both(c.id, 'designate', cia('s1', 'signatory'), cia('s2', 'signatory'), { fields: { assessment: 'Meets criteria 1–3' }, reason: 'Critical to the region', citations: basis });
    expect(getDecision(d.decision!.id)!.content.citations[0]).toMatchObject({ eId: 'sec_5' });
    const des = securityRecordOfCase(c.id)!;
    expect(des.status).toBe('designated');

    const risk = ok(openCase({ procedure: 'ci.risk', fields: { summary: 'Single power feed', designation: des.number, methodologyVersion: 'Risk method v2', threatHypothesis: 'Grid outage', estimate: 'Likely, high impact (method v2)' } }, cia('r1')));
    doc(risk.id, 'risk-assessment', cia('r1'));
    await step(risk.id, 'register', cia('r1'));
    expect(await step(risk.id, 'accept-risk', cia('s1', 'signatory'), { fields: { residualRisk: 'Outage over 24 h', acceptanceScope: 'Until the second feed', validUntil: future(180) }, reason: 'Second feed funded' })).toMatchObject({ pending: true });
    // The same person cannot confirm (two people, not two accounts).
    expect(await act(risk.id, { action: 'accept-risk' }, cia('s1', 'signatory'))).toHaveProperty('error');
    const accepted = await step(risk.id, 'accept-risk', cia('s2', 'signatory'));
    expect(getDecision(accepted.decision!.id)!.content.officials.map(o => o.name)).toEqual(['Official s1', 'Official s2']);
    expect(securityRecordOfCase(risk.id)).toMatchObject({ status: 'accepted', validUntil: future(180) });
    // Only the keeping body works these cases: a ministry cannot.
    expect(await act(risk.id, { action: 'review', fields: { reviewNote: 'x' }, reason: 'x' }, min('m1', 'signatory'))).toHaveProperty('error');
  });

  it('refuses every security decision in production while no approved mapping covers it', async () => {
    const c = ok(openCase({ procedure: 'cyber.exercise', fields: { summary: 'National tabletop', exerciseScope: 'Ransomware on a hospital network (tabletop)', participants: MIN, safeguards: 'No live systems' } }, cyb('e1')));
    doc(c.id, 'exercise-plan', cyb('e1'));
    await step(c.id, 'register', cyb('e1'));
    vi.stubEnv('CIVICOS_MODE', 'production');
    expect(await act(c.id, { action: 'approve', reason: 'Plan sound' }, cyb('s1', 'signatory'))).toMatchObject({ error: expect.stringMatching(/cyber-exercise-approval|approved/) });
  });

  it('issues a security directive by two officials under the relationship rules: an independent institution receives a request, never an instruction; acknowledgement is apart from compliance; an expired one is never current', () => {
    const drafter = viewer(nsc('n1', 'officer')), signer = viewer(nsc('n2', 'signatory'));
    const base = { title: 'Patch edge devices', force: 'binding-order', recipients: [MIN], authority: basis, scope: 'All internet-facing devices', compliance: 'Report patch status', challengeRoute: 'Review by the national security council; report unlawful directives to the ombudsman', effectiveFrom: '2026-01-01', expiresOn: future(30) };
    // An instruction to the independent data-protection authority: refused; a request: allowed.
    expect(D.draftSecurityDirective({ ...base, kind: 'instruction', recipients: [DPA] }, drafter)).toMatchObject({ error: expect.stringMatching(/independent and cannot be instructed/) });
    expect(D.draftSecurityDirective({ ...base, kind: 'request', force: 'policy-directive', recipients: [DPA] }, drafter)).toHaveProperty('ref');
    // One institution does not instruct another without an approved instruct relationship.
    expect(D.draftSecurityDirective({ ...base, kind: 'instruction' }, drafter)).toMatchObject({ error: expect.any(String) });
    const { relationship } = ok(proposeRelationship({ from: NSC, to: MIN, type: 'instruct', scope: { recordTypes: ['instruction'], purposes: ['national security'] }, legalBasis: basis }, { by: 'Admin A', byId: 'local:a' }));
    ok(confirmRelationship(relationship.id, { by: 'Admin B', byId: 'local:b', role: 'administrator' }, () => false));
    const nscB = () => ({ ...drafter, bounds: bounds() }), sigB = () => ({ ...signer, bounds: bounds() });
    expect(D.draftSecurityDirective({ ...base, kind: 'instruction', authority: [] }, nscB())).toMatchObject({ error: expect.stringMatching(/legal authority/) });
    expect(D.draftSecurityDirective({ ...base, kind: 'instruction', marking: 'secret' }, nscB())).toMatchObject({ error: expect.stringMatching(/No classification scheme/) });
    const d = ok(D.draftSecurityDirective({ ...base, kind: 'instruction' }, nscB()));
    // A ministry, the whole government or the drafter alone never issues it.
    expect(D.issueSecurityDirective(d.ref, viewer(min('m1', 'signatory')))).toMatchObject({ error: expect.stringMatching(/only by officials of the institution named/) });
    expect(D.issueSecurityDirective(d.ref, { ...nscB(), role: 'signatory' })).toHaveProperty('error');
    const issued = ok(D.issueSecurityDirective(d.ref, sigB()));
    expect(issued.versions[0]!.confirmed!.by.name).toBe('Official n2');
    expect(D.statusOf(issued)).toBe('in-force');
    // Recipients: acknowledgement (receipt) and compliance are separate records.
    const m = viewer(min('m1', 'officer'));
    ok(D.acknowledgeSecurityDirective(d.ref, m));
    expect(D.listSecurityDirectives(m)[0]!.compliance).toEqual([]);
    ok(D.reportCompliance(d.ref, { state: 'partly-implemented', note: '80% patched' }, m));
    // Only the issuer and the recipients see it.
    expect(D.listSecurityDirectives(viewer(at(() => OTHER)('o1', 'signatory')))).toEqual([]);
    // An amendment keeps the original version.
    ok(D.amendSecurityDirective(d.ref, { scope: 'All internet-facing and VPN devices', reason: 'VPN added' }, nscB()));
    const v2 = ok(D.issueSecurityDirective(d.ref, sigB()));
    expect(v2.versions.map(v => v.scope)).toEqual(['All internet-facing devices', 'All internet-facing and VPN devices']);
    // Past its expiry it is never current.
    expect(D.statusOf(v2, new Date(Date.now() + 60 * 86_400_000))).toBe('expired');
  });

  it('records a cross-domain transfer as metadata, released by a different person who can sign; a failed validation is never released', () => {
    adopt({ scheme: SCHEME, accreditation: { level: 'restricted', statement: 'AC-2' } });
    const rec = viewer(min('t1', 'officer')), rel = viewer(min('t2', 'signatory'));
    const input = { fromDomain: 'Ministry restricted network', toDomain: 'National security accredited system', dataClass: 'secret', purpose: 'Incident coordination', policy: 'Transfer policy CDS-3 v2', permitted: ['incident reference', 'affected service'], redaction: 'Personal data removed', validation: { result: 'passed', note: 'Schema and content inspection passed' } };
    // The record's own marking above the accreditation: refused; the class moved is a level of the scheme (metadata, not the content).
    expect(T.recordTransfer({ ...input, marking: 'secret' }, rec)).toMatchObject({ error: expect.stringMatching(/not held here/) });
    expect(T.recordTransfer({ ...input, dataClass: 'cosmic' }, rec)).toMatchObject({ error: expect.stringMatching(/not a level/) });
    const t = ok(T.recordTransfer(input, rec));
    expect(T.decideTransfer(t.ref, { outcome: 'released', reason: 'x' }, { ...rec, role: 'signatory' })).toHaveProperty('error');
    expect(ok(T.decideTransfer(t.ref, { outcome: 'released', reason: 'Within policy' }, rel)).decision).toMatchObject({ outcome: 'released' });
    ok(T.recordReceipt(t.ref, { reference: 'RCPT-77' }, rec));
    const bad = ok(T.recordTransfer({ ...input, validation: { result: 'failed', note: 'Content inspection failed' } }, rec));
    expect(T.decideTransfer(bad.ref, { outcome: 'released', reason: 'x' }, rel)).toMatchObject({ error: expect.stringMatching(/never released/) });
    ok(T.decideTransfer(bad.ref, { outcome: 'quarantined', reason: 'Inspection failed' }, rel));
    expect(T.listTransfers(viewer(cyb('x', 'signatory')))).toEqual([]);
  });

  it('takes a protected disclosure about a security institution through the existing protected intake, the person kept apart and marked material refused', async () => {
    const { draftPackage: dp, approvePackage: ap } = await import('@/lib/casework/packages');
    const { REFERENCE_PROTECTED_DISCLOSURE } = await import('@/lib/oversight/procedures');
    ok(dp({ ...asNationSets(REFERENCE_PROTECTED_DISCLOSURE), form: { version: 'nation-1', lists: { 'oversight.country.integrity_concern_kinds': { values: [{ value: 'misuse', label: 'misuse' }] } } } } as never, 'Author', 'author', registeredEffects()));
    ok(ap('integrity.disclosure', 1, 'Approver', 'approver', '2026-01-01', registeredEffects(), new Date('2026-01-01')));
    const acc = at(() => ACC)('intake');
    const input = { procedure: 'integrity.disclosure', fields: { concerns: NSC, allegation: 'Directives issued without the cited authority' }, identity: { name: 'PROTECTED-NAME-X', contact: { method: 'email', value: 'x@example.org' } } };
    expect(receiveSecurityDisclosure({ ...input, materialMarking: 'secret' }, acc)).toMatchObject({ error: expect.stringMatching(/not taken in here/) });
    const r = ok(receiveSecurityDisclosure({ ...input, materialReference: 'Held by the inspector general, ref IG-12' }, acc));
    expect(JSON.stringify(getCase(r.case.id))).not.toMatch(/PROTECTED-NAME-X|x@example.org/);
    expect(String(getCase(r.case.id)!.fields.allegation)).toMatch(/reference only/);
    expect(identityMarkers(r.case.id)).toEqual([{ id: r.identity.id, role: 'whistleblower', anonymous: false }]);
  });
});
