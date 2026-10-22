// Independent oversight (plan step I8): the ombudsman, the human rights
// institution, the anti-corruption commission, the public audit office and the
// data-protection authority, each an independent institution working its own
// cases (lib/oversight). The complainant, the whistleblower and the data
// subject are kept apart from the case (protected identity: never in a list, a
// case read, a search or an export; read only by the assigned or specifically
// authorised official, with a purpose, every read logged; acceptance P4-06 and
// P4-07). A finding stays the body's when the institution concerned disputes
// it (P4-04). Evidence and records are asked for only under an approved
// relationship; the data-protection authority reads the access log only for
// the records its case names, and that read is logged (P4-05). Referrals carry
// the case reference only; decisions are classified under proposed,
// unapproved mappings and refused in production until approved.
import { asNationSets } from '@/lib/casework/testkit';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

let official: { id: string; name: string; label: string; institution?: string; role: string; bounds?: unknown } | null = null;
vi.mock('@/lib/auth/official', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/auth/official')>()),
  currentOfficial: async () => (official ? { ...official, sub: official.id } : null),
  caseScope: async () => official,
  refusal: async () => null,
  withOfficial: async <T,>(b: T) => b,
}));

const { act, attach, getCase, resetCases, registeredEffects, listCases } = await import('@/lib/casework/engine');
const { draftPackage, approvePackage, resetPackages } = await import('@/lib/casework/packages');
const { addDocument, resetDocuments } = await import('@/lib/records/documents');
const { resetDecisions, getDecision } = await import('@/lib/records/decisions');
const { setSovereign, listMinistries, institutionBounds } = await import('@/lib/data/store');
const { resetPermitAuthorities, installProposedDefaults, listMappings } = await import('@/lib/permits/authority');
const { classifyDecision } = await import('@/lib/permits/decisions');
const { listView } = await import('@/lib/casework/view');
const { listAccess, resetAccessLog } = await import('@/lib/records/access-log');
const { resetSearchLog } = await import('@/lib/records/access-search');
const { recordVersion: recordLaw, confirmVersion: confirmLaw, resetLaw } = await import('@/lib/law/register');
const { proposeRelationship, confirmRelationship, resetRelationships } = await import('@/lib/data/store/relationships');
const { caseReadRefusal, caseActRefusal } = await import('@/lib/auth/roles');
const { collectInstitution } = await import('@/lib/portability/export');
const { INDEPENDENT_OVERSIGHT_PROCEDURES, OVERSIGHT_PERMITS } = await import('./procedures');
const { receiveProtected, investigationAccess } = await import('./intake');
const { readProtectedIdentity, authoriseIdentityReader, identityMarkers, resetProtectedIdentities } = await import('./protected-identity');
const { findingsOfCase, respondToFinding, submitEvidence, evidenceOfCase, referralsOfCase, controllerRequestsOfCase, answerControllerRequest, correctFinding, resetOversight, getFinding } = await import('./register');
const casesRoute = await import('@/app/api/cases/route');
const caseRoute = await import('@/app/api/cases/[id]/route');
type Actor = import('@/lib/casework/engine').Actor;
type Ref = (typeof INDEPENDENT_OVERSIGHT_PROCEDURES)[number];

let OMB = '', HRI = '', ACC = '', AUD = '', DPA = '', MIN = '', OTHER = '';
const bounds = () => institutionBounds();
const at = (inst: () => string) => (id: string, role: 'officer' | 'signatory' | 'auditor' | 'administrator' = 'officer'): Actor => ({ id, name: `Official ${id}`, scope: { id, role, institution: inst(), bounds: bounds() } });
const omb = at(() => OMB), acc = at(() => ACC), aud = at(() => AUD), dpa = at(() => DPA), min = at(() => MIN);
const scopeOf = (a: Actor) => ({ ...a.scope!, label: a.name });
const pdf = new Uint8Array(Buffer.from('%PDF-1.7\nx\n%%EOF'));
const doc = (caseId: string, cls: string, who: Actor) => { const d = addDocument({ class: cls, title: cls, institution: who.scope!.institution!, belongsTo: { kind: 'case', id: caseId }, bytes: pdf }, 'Clerk') as { id: string }; attach(caseId, d.id, who); };
async function step(id: string, action: string, who: Actor, extra: Record<string, unknown> = {}) { const r = await act(id, { action, ...extra }, who); if ('error' in r) throw new Error(`${action}: ${r.error}`); return r; }
const LISTS: Record<string, string[]> = { 'oversight.country.ombudsman_issue_kinds': ['delay'], 'oversight.country.rights_categories': ['equality'], 'oversight.country.integrity_concern_kinds': ['procurement'] };
const nation = (p: Ref) => {
  const used = Object.keys(LISTS).filter(k => p.fields.some(f => f.valuesSource?.kind === 'configured' && f.valuesSource.list === k));
  return { ...asNationSets(p), ...(used.length ? { form: { version: 'nation-1', lists: Object.fromEntries(used.map(k => [k, { values: LISTS[k]!.map(v => ({ value: v, label: v })) }])) } } : {}) };
};
const as = (a: Actor | null) => { official = a ? { id: a.id!, name: a.name, label: a.name, institution: a.scope!.institution, role: a.scope!.role!, bounds: bounds() } : null; };
const readCase = async (id: string, who: Actor, purpose?: string) => { as(who); return caseRoute.GET(new NextRequest(`http://localhost/api/cases/${id}${purpose ? `?purpose=${encodeURIComponent(purpose)}` : ''}`), { params: Promise.resolve({ id }) }); };
const NAME = 'PROTECTED-NAME-Amina-Osei';
const CONTACT = { method: 'email', value: 'protected-source@example.org' };
const ok = <T,>(r: T | { error: string }): T => { if (r && typeof r === 'object' && 'error' in r) throw new Error((r as { error: string }).error); return r as T; };
let basis: { instrument: string; eId: string }[];
const relate = (from: string, to: string, type: 'audit' | 'request_information', recordTypes: string[], purposes: string[]) => {
  const { relationship } = ok(proposeRelationship({ from, to, type, scope: { recordTypes, purposes }, legalBasis: basis }, { by: 'Admin A', byId: 'local:a' }));
  ok(confirmRelationship(relationship.id, { by: 'Admin B', byId: 'local:b', role: 'administrator' }, () => false));
  return relationship.id;
};

describe('independent oversight', () => {
  beforeEach(() => {
    for (const r of [resetCases, resetPackages, resetDocuments, resetDecisions, resetPermitAuthorities, resetAccessLog, resetSearchLog, resetLaw, resetRelationships, resetProtectedIdentities, resetOversight]) r();
    vi.stubEnv('CIVICOS_DATA_KEK', Buffer.alloc(32, 7).toString('base64'));
    official = null;
    [OMB, HRI, ACC, AUD, DPA, MIN, OTHER] = listMinistries().slice(0, 7).map(m => m.id) as [string, string, string, string, string, string, string];
    setSovereign({ deployment: { authorities: { ombudsman: OMB, humanRights: HRI, anticorruption: ACC, supremeAudit: AUD, dataProtection: DPA } } }, 'Administrator');
    for (const p of INDEPENDENT_OVERSIGHT_PROCEDURES) {
      const d = draftPackage(nation(p), 'Author', 'author', registeredEffects()); if ('error' in d) throw new Error(`${p.key}: ${d.error}`);
      const a = approvePackage(p.key, 1, 'Approver', 'approver', '2026-01-01', registeredEffects(), new Date('2026-01-01')); if ('error' in a) throw new Error(`${p.key}: ${a.error}`);
    }
    const law = ok(recordLaw({ instrument: { title: 'Oversight Act', type: 'act', jurisdiction: 'X', year: 2020, number: '1', issuingAuthority: 'Parliament' }, dates: { inForce: '2020-01-01' }, provisions: [{ eId: 'sec_9', num: '9', text: 'The body may require information.' }] }, 'L1', 'l1'));
    confirmLaw(law.instrument.id, law.version.id, 'L2', 'l2');
    basis = [{ instrument: law.instrument.id, eId: 'sec_9' }];
  });
  afterEach(() => { vi.unstubAllEnvs(); setSovereign({ deployment: { authorities: {} } }, 'test'); });

  it('ships drafts only: restricted, no suspect, no identity of the person who raised it, no AI, no day count; every decision classified under a proposed, unapproved mapping', () => {
    for (const p of INDEPENDENT_OVERSIGHT_PROCEDURES) {
      expect(p.sensitivity, p.key).toBe('restricted');
      expect(p.reference, p.key).toBe(true);
      for (const f of p.fields) expect(`${f.key} ${f.label}`, `${p.key} ${f.key}`).not.toMatch(/suspect|accused|culprit|offender|score|rating|risk level/i);
      // The person who raised it is never a case field: kept apart in the protected-identity vault.
      expect(p.fields.map(f => f.key).filter(k => /name|contact|complainant|whistleblower|reporter|raisedBy|subjectPerson/i.test(k)), p.key).toEqual([]);
      expect(JSON.stringify(p.actions)).not.toMatch(/\bai\b|advisory|model/i);
      expect(p.deadlines.every(d => d.days === undefined), p.key).toBe(true);
      for (const a of p.actions.filter(x => x.decision)) {
        const cls = classifyDecision({ fields: {} } as never, a, p as never);
        expect(cls, `${p.key} ${a.key}`).toMatchObject({ kind: 'mapping' });
        expect(Object.values(OVERSIGHT_PERMITS)).toContain((cls as { permitType: string }).permitType);
        expect(a.needs.role).toBe('signatory');
      }
    }
    installProposedDefaults('Installer');
    for (const [prefix, permitType] of Object.entries(OVERSIGHT_PERMITS)) {
      const m = listMappings(permitType);
      expect(m, permitType).toHaveLength(1);
      expect(m[0], permitType).toMatchObject({ state: 'draft' });
      expect(m[0]!.lead, permitType).toBe({ 'ombudsman.': 'ombudsman', 'human-rights.': 'humanRights', 'integrity.': 'anticorruption', 'audit.': 'supremeAudit', 'data-protection.': 'dataProtection' }[prefix]);
    }
  });

  it('makes each oversight body independent: whole-government officials, auditors and administrators neither read nor act on its cases', async () => {
    const b = bounds();
    for (const id of [OMB, HRI, ACC, AUD, DPA]) expect(b.independent, id).toContain(id);
    const r = ok(receiveProtected({ procedure: 'ombudsman.complaint', fields: { concerns: MIN, allegedAction: 'Licence application left unanswered', description: 'Waited a long time' }, identity: { name: NAME, contact: CONTACT } }, omb('intake')));
    const facts = { owner: OMB, sensitivity: 'restricted' as const, independent: true, assigned: ['intake'] };
    for (const role of ['administrator', 'auditor', 'signatory', 'officer'] as const) {
      expect(caseReadRefusal({ id: 'wg', role, bounds: b }, facts, 'audit purpose'), role).toMatch(/independent/);
      expect(caseActRefusal({ id: 'wg', role, bounds: b }, facts), role).toBeTruthy();
    }
    // The institution complained about is refused too, and the refusal is logged.
    expect((await readCase(r.case.id, min('m1', 'signatory'))).status).toBe(403);
    expect(listAccess({}).some(e => e.record.id === r.case.ref && e.result === 'refused')).toBe(true);
    expect(await act(r.case.id, { action: 'register' }, min('m1', 'signatory'))).toMatchObject({ error: expect.stringMatching(/independent/) });
    // Opening one is the body's own: another institution cannot open it.
    expect(receiveProtected({ procedure: 'ombudsman.complaint', fields: { concerns: MIN, allegedAction: 'x', description: 'x' }, identity: { anonymous: true } }, min('m2'))).toMatchObject({ error: expect.any(String) });
  });

  it('keeps a complainant\'s protected identity out of the case, the list, the case read and the export; read only by the assigned or authorised official, with a purpose, every read logged (P4-06)', async () => {
    const r = ok(receiveProtected({ procedure: 'human-rights.complaint', fields: { concerns: MIN, rightsCategory: 'equality', description: 'Refused service at the counter', vulnerablePerson: true }, identity: { name: NAME, contact: CONTACT, consentToShare: false, protections: 'Fears reprisal at work' } }, at(() => HRI)('intake')));
    expect(r.identity).toEqual({ id: expect.stringMatching(/^PID-/), role: 'complainant', anonymous: false });
    const leak = /PROTECTED-NAME|protected-source@example\.org|Fears reprisal/;
    expect(JSON.stringify(getCase(r.case.id))).not.toMatch(leak);
    expect(JSON.stringify(listView(getCase(r.case.id)!))).not.toMatch(leak);
    // The ordinary case search and the case read, even by an official who can sign there.
    as(at(() => HRI)('s1', 'signatory'));
    const list = await (await casesRoute.GET(new NextRequest('http://localhost/api/cases?procedure=human-rights.complaint'))).json();
    expect(list.cases).toHaveLength(1);
    expect(JSON.stringify(list)).not.toMatch(leak);
    const read = await readCase(r.case.id, at(() => HRI)('s1', 'signatory'));
    expect(read.status).toBe(200);
    expect(JSON.stringify(await read.json())).not.toMatch(leak);
    expect(identityMarkers(r.case.id)).toEqual([r.identity]);
    // The vault: the assigned official with a purpose; never without one; never an unassigned signatory, an auditor or another institution.
    const hri = at(() => HRI);
    expect(readProtectedIdentity(r.identity.id, scopeOf(hri('intake')))).toMatchObject({ error: expect.stringMatching(/Say why/) });
    expect(readProtectedIdentity(r.identity.id, scopeOf(hri('intake')), 'Contact the complainant about an interview')).toMatchObject({ name: NAME, contact: CONTACT, consentToShare: false });
    expect(readProtectedIdentity(r.identity.id, scopeOf(hri('s1', 'signatory')), 'Curiosity')).toMatchObject({ error: expect.stringMatching(/assigned to the case or one specifically authorised/) });
    expect(readProtectedIdentity(r.identity.id, scopeOf(hri('a1', 'auditor')), 'Audit')).toMatchObject({ error: expect.stringMatching(/Auditors/) });
    expect(readProtectedIdentity(r.identity.id, scopeOf(min('m1', 'signatory')), 'We need to know who complained')).toMatchObject({ error: expect.stringMatching(/only by the institution that keeps it/) });
    expect(readProtectedIdentity(r.identity.id, { id: 'wg', role: 'administrator', bounds: bounds(), label: 'Whole-government admin' }, 'Oversight')).toMatchObject({ error: expect.any(String) });
    // A signatory authorises a colleague (never themselves); the colleague then reads it with a purpose.
    expect(authoriseIdentityReader(r.identity.id, { id: 's1', name: 'Official s1' }, scopeOf(hri('s1', 'signatory')))).toMatchObject({ error: expect.stringMatching(/themselves/) });
    expect(authoriseIdentityReader(r.identity.id, { id: 'inv2', name: 'Investigator 2' }, scopeOf(hri('intake')))).toMatchObject({ error: expect.stringMatching(/can sign/) });
    ok(authoriseIdentityReader(r.identity.id, { id: 'inv2', name: 'Investigator 2' }, scopeOf(hri('s1', 'signatory'))));
    expect(readProtectedIdentity(r.identity.id, scopeOf(hri('inv2')), 'Arrange the interview')).toMatchObject({ name: NAME });
    const log = listAccess({ register: 'protected-identities' });
    expect(log.map(e => `${e.action}:${e.result}`).sort()).toEqual(['permission:allowed', 'refused:refused', 'refused:refused', 'refused:refused', 'refused:refused', 'refused:refused', 'view:allowed', 'view:allowed'].sort());
    expect(log.every(e => e.correlation === r.case.ref)).toBe(true);
    expect(JSON.stringify(log)).not.toMatch(leak);
    // An anonymous complaint keeps no name or contact at all.
    const anon = ok(receiveProtected({ procedure: 'human-rights.complaint', fields: { concerns: MIN, rightsCategory: 'equality', description: 'x' }, identity: { anonymous: true, name: 'ignored', contact: CONTACT } }, hri('intake')));
    const e = ok(readProtectedIdentity(anon.identity.id, scopeOf(hri('intake')), 'Check'));
    expect(e.name).toBeUndefined();
    expect(e.contact).toBeUndefined();
    // Nothing is opened without the identity record: a named complaint without a name is refused before the case opens.
    const before = listCases({}).length;
    expect(receiveProtected({ procedure: 'human-rights.complaint', fields: { concerns: MIN, description: 'x' }, identity: {} }, hri('intake'))).toMatchObject({ error: expect.stringMatching(/name/) });
    expect(listCases({}).length).toBe(before);
  });

  it('never puts a whistleblower\'s identity in the commission\'s ordinary case export (P4-07)', () => {
    const r = ok(receiveProtected({ procedure: 'integrity.disclosure', fields: { concerns: MIN, allegationKind: 'procurement', allegation: 'Contract split to avoid tender' }, identity: { name: NAME, contact: CONTACT, protections: 'Works in the procurement unit' } }, acc('intake')));
    const out = collectInstitution(ACC);
    const cases = JSON.parse(out.parts.find(p => p.name === 'cases.json')!.data.toString('utf8')) as { ref: string }[];
    expect(cases.map(c => c.ref)).toEqual([r.case.ref]);
    for (const p of out.parts) expect(p.data.toString('utf8'), p.name).not.toMatch(/PROTECTED-NAME|protected-source@example\.org|procurement unit/);
    // The assigned official still reads it, logged.
    expect(readProtectedIdentity(r.identity.id, scopeOf(acc('intake')), 'Protection measures')).toMatchObject({ name: NAME });
  });

  it('works an ombudsman complaint: admitted, evidence only under an approved relationship, findings answered beside them, issued by two officials, followed up; a referral is a reference only', async () => {
    const r = ok(receiveProtected({ procedure: 'ombudsman.complaint', fields: { concerns: MIN, issueCategory: 'delay', allegedAction: 'Licence application left unanswered', description: 'No answer for a year' }, identity: { name: NAME } }, omb('inv')));
    const id = r.case.id;
    doc(id, 'complaint', omb('inv')); await step(id, 'register', omb('inv'));
    const admitted = await step(id, 'admit', omb('s1', 'signatory'), { reason: 'Maladministration within the mandate' });
    expect(admitted.decision).toBeDefined();
    expect(getDecision(admitted.decision!.id)!.content.authority).toMatchObject({ basis: 'unmapped', permitType: 'ombudsman-recommendation' });
    // Evidence is asked for only under an approved request-information relationship covering the records and the purpose.
    const ev = { evidenceTo: MIN, evidencePurpose: 'Complaint investigation', evidenceRequested: 'The licence file and its timeline' };
    expect(await act(id, { action: 'request-evidence', fields: ev, reason: 'Timeline' }, omb('inv'))).toMatchObject({ error: expect.stringMatching(/No approved relationship/) });
    const rel = relate(OMB, MIN, 'request_information', ['cases'], ['Complaint investigation']);
    await step(id, 'request-evidence', omb('inv'), { fields: ev, reason: 'Timeline' });
    const [req] = evidenceOfCase(id);
    expect(req).toMatchObject({ to: MIN, relationship: { id: rel, version: 1 }, purpose: 'Complaint investigation' });
    expect(submitEvidence(req!.number, { description: 'Licence file' }, scopeOf(at(() => OTHER)('x')))).toMatchObject({ error: expect.stringMatching(/institution concerned/) });
    ok(submitEvidence(req!.number, { description: 'Licence file, 40 pages' }, scopeOf(min('m1'))));
    // The finding: the body's, with reasons; the ministry answers beside it and never changes it.
    await step(id, 'record-finding', omb('inv'), { fields: { findingCriteria: 'Decide within the time the law sets', findingCondition: 'No decision for twelve months', findingRecommendation: 'Decide the application and apologise' }, reason: 'File shows no action' });
    const [f] = findingsOfCase(id);
    expect(f).toMatchObject({ concerns: MIN, stage: 'draft', versions: [{ n: 1, condition: 'No decision for twelve months' }] });
    expect(respondToFinding(f!.number, { position: 'disputed', text: 'x' }, scopeOf(min('m1')))).toMatchObject({ error: expect.stringMatching(/not been sent/) });
    await step(id, 'communicate', omb('s1', 'signatory'), { reason: 'For the ministry\'s response' });
    ok(respondToFinding(f!.number, { position: 'disputed', text: 'The application was incomplete' }, scopeOf(min('m1'))));
    expect(getFinding(f!.number)).toMatchObject({ stage: 'communicated', versions: [{ n: 1, condition: 'No decision for twelve months' }], responses: [{ position: 'disputed', by: { institution: MIN } }] });
    // Issued by two officials: the proposer cannot confirm.
    doc(id, 'findings-report', omb('inv'));
    expect((await act(id, { action: 'issue', reason: 'Upheld' }, omb('s1', 'signatory')))).toMatchObject({ pending: true });
    expect(await act(id, { action: 'issue' }, omb('s1', 'signatory'))).toHaveProperty('error');
    const issued = await step(id, 'issue', omb('s2', 'signatory'));
    expect(getFinding(f!.number)).toMatchObject({ stage: 'issued', decision: issued.decision!.id });
    expect(issued.case.history.at(-1)).toMatchObject({ by: { name: 'Official s1' }, confirmedBy: { name: 'Official s2' } });
    await step(id, 'follow-up', omb('inv'), { fields: { followUpFinding: f!.number, followUpStatus: 'implemented', followUpNote: 'Decided and apologised' }, reason: 'Checked' });
    expect(getFinding(f!.number)!.followUps).toMatchObject([{ status: 'implemented' }]);
    // A referral carries the case reference only: nothing is opened at the receiving institution.
    const r2 = ok(receiveProtected({ procedure: 'ombudsman.complaint', fields: { concerns: MIN, allegedAction: 'Bribe demanded', description: 'Asked for money' }, identity: { anonymous: true } }, omb('inv')));
    doc(r2.case.id, 'complaint', omb('inv')); await step(r2.case.id, 'register', omb('inv'));
    const casesBefore = listCases({}).length;
    await step(r2.case.id, 'refer', omb('s1', 'signatory'), { fields: { referTo: ACC, referralKind: 'other' }, reason: 'Integrity matter for the commission' });
    expect(listCases({}).length).toBe(casesBefore);
    const [ref] = referralsOfCase(r2.case.id);
    expect(Object.keys(ref!).sort()).toEqual(['at', 'body', 'by', 'case', 'kind', 'number', 'reason', 'to']);
    expect(ref).toMatchObject({ to: ACC, case: { ref: r2.case.ref }, kind: 'other' });
  });

  it('keeps an audit finding under the audit office when the audited ministry disputes it (P4-04)', async () => {
    const c = (await import('@/lib/casework/engine')).openCase({ procedure: 'audit.engagement', fields: { auditee: MIN, auditKind: 'compliance', auditScope: 'Grants paid in the year', auditObjectives: 'Compliance with the grant rules', mandate: 'Audit Act s. 9' } }, aud('lead')) as { id: string; ref: string };
    doc(c.id, 'audit-plan', aud('lead'));
    await step(c.id, 'approve-plan', aud('s1', 'signatory'), { reason: 'Annual plan' });
    await step(c.id, 'approve-plan', aud('s2', 'signatory'));
    doc(c.id, 'engagement-letter', aud('lead')); await step(c.id, 'notify', aud('lead'));
    relate(AUD, MIN, 'audit', ['cases'], ['Statutory compliance audit']);
    await step(c.id, 'request-evidence', aud('lead'), { fields: { evidenceTo: MIN, evidencePurpose: 'Statutory compliance audit', evidenceRequested: 'Grant decisions and payment records' }, reason: 'Sample of grants' });
    ok(submitEvidence(evidenceOfCase(c.id)[0]!.number, { description: 'Payment ledger extract', document: 'DOC-1', sha256: 'a'.repeat(64) }, scopeOf(min('m1'))));
    await step(c.id, 'record-finding', aud('lead'), { fields: { findingCriteria: 'Grant rules s. 4', findingCondition: 'Three grants paid without a signed agreement', findingCause: 'No checklist', findingEffect: 'Funds at risk', findingEvidence: 'Payment ledger extract', findingRecommendation: 'Introduce a pre-payment checklist' }, reason: 'Sample tested' });
    const [f] = findingsOfCase(c.id);
    await step(c.id, 'communicate', aud('s1', 'signatory'), { reason: 'Draft findings for the response' });
    // The ministry disputes it: recorded beside the finding; it cannot change the finding or move the engagement.
    ok(respondToFinding(f!.number, { position: 'disputed', text: 'The agreements were signed late but exist', evidence: ['Late agreements'] }, scopeOf(min('m1'))));
    expect(await act(c.id, { action: 'approve-report', reason: 'x' }, min('m1', 'signatory'))).toMatchObject({ error: expect.stringMatching(/independent/) });
    expect((await readCase(c.id, min('m1', 'signatory'))).status).toBe(403);
    const after = getFinding(f!.number)!;
    expect(after.versions).toHaveLength(1);
    expect(after.versions[0]).toMatchObject({ condition: 'Three grants paid without a signed agreement', recommendation: 'Introduce a pre-payment checklist', by: { institution: AUD } });
    expect(after.responses).toMatchObject([{ position: 'disputed', by: { institution: MIN } }]);
    // The audit office alone corrects its finding (a new version, the earlier kept) and approves the report with two officials.
    ok(correctFinding(f!.number, { ...after.versions[0]!, condition: 'Three grants paid before a signed agreement' }, 'Response considered: agreements signed late', { name: 'Official lead', institution: AUD }));
    doc(c.id, 'audit-report', aud('lead'));
    await step(c.id, 'approve-report', aud('s1', 'signatory'), { reason: 'Report approved' });
    const approved = await step(c.id, 'approve-report', aud('s2', 'signatory'));
    const final = getFinding(f!.number)!;
    expect(final).toMatchObject({ stage: 'issued', decision: approved.decision!.id });
    expect(final.versions.map(v => v.condition)).toEqual(['Three grants paid without a signed agreement', 'Three grants paid before a signed agreement']);
    expect(correctFinding(f!.number, final.versions[1]!, 'x', { name: 'x' })).toMatchObject({ error: expect.stringMatching(/issued finding is not changed/) });
    await step(c.id, 'publish', aud('s1', 'signatory'), { fields: { publication: 'Laid before the legislature' }, reason: 'As the Audit Act provides' });
    await step(c.id, 'follow-up', aud('lead'), { fields: { followUpFinding: f!.number, followUpStatus: 'in-progress', followUpNote: 'Checklist drafted' }, reason: 'Follow-up visit' });
    expect(getFinding(f!.number)!.followUps).toMatchObject([{ status: 'in-progress' }]);
  });

  it('handles a data-protection request through the controller and the access log, never a direct read; the authority\'s investigation read is scoped and logged (P4-05)', async () => {
    const r = ok(receiveProtected({ procedure: 'data-protection.rights-request', fields: { controller: MIN, requestKind: 'correction', description: 'My address on the licence file is wrong', records: 'cases:LIC-2026-000001' }, identity: { name: NAME, contact: CONTACT } }, dpa('dp1')));
    const id = r.case.id;
    doc(id, 'request', dpa('dp1')); await step(id, 'register', dpa('dp1'));
    const ask = { dpPurpose: 'Data protection request', dpAsked: 'Correct the address or say why not' };
    expect(await act(id, { action: 'ask-controller', fields: ask, reason: 'Request forwarded' }, dpa('dp1'))).toMatchObject({ error: expect.stringMatching(/No approved relationship/) });
    relate(DPA, MIN, 'request_information', ['cases'], ['Data protection request']);
    await step(id, 'ask-controller', dpa('dp1'), { fields: ask, reason: 'Request forwarded' });
    const [q] = controllerRequestsOfCase(id);
    expect(q).toMatchObject({ controller: MIN, kind: 'correction', records: [{ register: 'cases', id: 'LIC-2026-000001' }] });
    expect(JSON.stringify(q)).not.toMatch(/PROTECTED-NAME|protected-source/);
    // The authority cannot move on before the controller answers; only the controller answers.
    expect(await act(id, { action: 'review' }, dpa('dp1'))).toMatchObject({ error: expect.stringMatching(/not answered/) });
    expect(answerControllerRequest(q!.number, { outcome: 'corrected', reasons: 'x' }, scopeOf(at(() => OTHER)('o1')))).toMatchObject({ error: expect.any(String) });
    expect(answerControllerRequest(q!.number, { outcome: 'corrected', reasons: 'x' }, scopeOf(dpa('dp1')))).toMatchObject({ error: expect.any(String) });
    ok(answerControllerRequest(q!.number, { outcome: 'corrected', reasons: 'Address corrected from the civil register' }, scopeOf(min('m1'))));
    await step(id, 'review', dpa('dp1'));
    // The access log, only for the records the case names: allowed to the assigned official, refused to others, both logged.
    const seen = ok(investigationAccess(id, scopeOf(dpa('dp1'))));
    expect(seen.records).toEqual([{ register: 'cases', id: 'LIC-2026-000001' }]);
    expect(investigationAccess(id, scopeOf(dpa('dp9')))).toMatchObject({ error: expect.stringMatching(/assigned/) });
    expect(investigationAccess(id, scopeOf(min('m1', 'signatory')))).toMatchObject({ error: expect.any(String) });
    const reads = listAccess({ register: 'access-log' });
    expect(reads.map(e => e.result).sort()).toEqual(['allowed', 'refused', 'refused']);
    expect(reads.every(e => e.correlation === r.case.ref && e.record.query === 'cases:LIC-2026-000001')).toBe(true);
    // The finding is recorded apart from the allegation; the decision needs two officials.
    await step(id, 'record-finding', dpa('dp1'), { fields: { findingCondition: 'The controller corrected the address within its procedure', findingRecommendation: 'No further action' }, reason: 'Controller\'s answer checked' });
    doc(id, 'decision-report', dpa('dp1'));
    await step(id, 'decide', dpa('s1', 'signatory'), { reason: 'Request satisfied' });
    const d = await step(id, 'decide', dpa('s2', 'signatory'));
    expect(getDecision(d.decision!.id)!.content.authority).toMatchObject({ permitType: 'data-protection-decision' });
    expect(findingsOfCase(id)[0]).toMatchObject({ stage: 'issued', concerns: MIN });
  });

  it('refuses every oversight decision in production until the nation approves its mapping', async () => {
    const r = ok(receiveProtected({ procedure: 'ombudsman.complaint', fields: { concerns: MIN, allegedAction: 'x', description: 'x' }, identity: { anonymous: true } }, omb('inv')));
    doc(r.case.id, 'complaint', omb('inv')); await step(r.case.id, 'register', omb('inv'));
    vi.stubEnv('CIVICOS_MODE', 'production');
    expect(await act(r.case.id, { action: 'admit', reason: 'Within the mandate' }, omb('s1', 'signatory'))).toMatchObject({ error: expect.stringMatching(/ombudsman-recommendation|mapping|authority/i) });
  });
});
