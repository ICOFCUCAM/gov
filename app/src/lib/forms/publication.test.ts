// Publication gates (owner's direction of 21 October 2026 §3; supplement §3,
// the ten production activation gates; Part 22 lifecycle). Checks the
// platform verifies are kept apart from approvals a person gives; a human
// approval is only an act of a signed-in official, a different person from
// the drafter, written to the audit chain; no status field publishes a form.
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { asNationSets, setNationDays } from '@/lib/casework/testkit';
import { setSovereign, listMinistries, listAudit } from '@/lib/data/store';
import { recordVersion, confirmVersion, resetLaw } from '@/lib/law/register';
import { installReferenceProcedures, REFERENCE_BIRTH } from '@/lib/civil/procedures';
import { draftPackage, approvePackage, editDraft, getPackage, listPackages, resetPackages } from '@/lib/casework/packages';
import { installReferenceProcedures as installAll } from '@/lib/casework/modules';
import { registeredEffects, resetCases, submitForm, type Actor } from '@/lib/casework/engine';
import { publicationOf, recordApproval, resetPublication, submissionRefusal, contractDigest, type Official } from './publication';
import { GET, POST } from '@/app/api/case-packages/route';
import type { CasePackage } from '@/lib/casework/types';

let CIVIL = '', OTHER = '';
let law = { instrument: '', version: '', digest: '' };
const official = (id: string, role: 'officer' | 'signatory' | 'administrator' = 'signatory', institution = CIVIL): Official => ({ id, name: `Official ${id}`, scope: { id, role, institution } });
const citing = () => [{ instrument: law.instrument, eId: 'sec_12', version: law.version, digest: law.digest, on: '2026-01-01' }];

function draftV2(extra: Partial<CasePackage> = {}) {
  // The nation states why it asks for each piece of evidence (the reference leaves the parent's identity document without one: a blocker, as it should be).
  const documents = REFERENCE_BIRTH.documents.map(d => (d.citation || d.purpose ? d : { ...d, purpose: 'To confirm who the parent named on the entry is' }));
  const r = draftPackage({ ...asNationSets(REFERENCE_BIRTH), version: 2, reference: false, citations: citing(), documents, ...extra }, 'Official rg', 'rg', registeredEffects());
  if ('error' in r) throw new Error(r.error);
  return r;
}
function approveV2() {
  const ok = approvePackage('civil.birth', 2, 'Official drg', 'drg', '2026-01-01', registeredEffects(), new Date('2026-01-01'));
  if ('error' in ok) throw new Error(ok.error);
  return ok;
}
const pub = () => publicationOf(getPackage('civil.birth', 2)!, new Date(), registeredEffects());
const gate = (id: string) => pub().automatic.find(g => g.id === id)!;
const human = (id: string) => pub().human.find(g => g.id === id)!;

/** Every human approval but the release, by officials other than the drafter. */
function reviewAll() {
  for (const [kind, who] of [['legal-review', 'lr'], ['authority', 'au'], ['privacy', 'pv']] as const) {
    const r = recordApproval('civil.birth', 2, { kind, note: 'Reviewed against the act' }, official(who));
    if ('error' in r) throw new Error(`${kind}: ${r.error}`);
  }
}
const ROLLBACK = 'Withdraw the self-service channel; version 1 stays in force for assisted applications; submissions kept.';

describe('form publication gates', () => {
  beforeEach(() => {
    for (const r of [resetLaw, resetPackages, resetCases, resetPublication]) r();
    const m = listMinistries();
    CIVIL = m[0]!.id; OTHER = m[1]!.id;
    setSovereign({ regions: ['North', 'South'], languages: [], deployment: { authorities: { civilRegistration: CIVIL, lawRegister: CIVIL } } } as never, 'Administrator');
    const v = recordVersion({ instrument: { title: 'Civil Registration Act', type: 'act', jurisdiction: 'MDA', year: 2020, number: '7', issuingAuthority: 'National Assembly' }, dates: { inForce: '2020-06-01' }, provisions: [{ eId: 'sec_12', num: '12', text: 'Every birth shall be registered by the Registrar.' }] }, 'Legal officer A', 'la');
    if ('error' in v) throw new Error(v.error);
    confirmVersion(v.instrument.id, v.version.id, 'Legal officer B', 'lb');
    law = { instrument: v.instrument.id, version: v.version.id, digest: v.version.digest };
    installReferenceProcedures('Administrator');
    setNationDays();
  });
  afterEach(() => { vi.unstubAllEnvs(); });

  it('reads the gates of every reference procedure, each a draft that shows its real status', () => {
    installAll('Administrator');
    const all = listPackages();
    expect(all.length).toBeGreaterThan(20);
    for (const p of all) {
      const s = publicationOf(p, new Date(), registeredEffects());
      expect(['contract_draft', 'blocked', 'under_review'], `${p.key}@${p.version}`).toContain(s.status);
    }
  });

  it('keeps the checks the platform verifies apart from the approvals a person gives', () => {
    draftV2();
    const p = pub();
    expect(p.status).toBe('contract_draft');
    expect(p.automatic.map(g => g.id)).toEqual(['schema', 'legal-basis', 'authority', 'privacy', 'evidence', 'accessibility', 'scope', 'values']);
    expect(p.automatic.every(g => g.kind === 'automatic')).toBe(true);
    expect(p.human.map(g => g.id)).toEqual(['procedure-approval', 'legal-review', 'authority', 'privacy', 'scope-review', 'release-approval']);
    expect(p.human.every(g => g.kind === 'human')).toBe(true);
    // A reference procedure that needs no scope review does not ask for one.
    expect(p.human.find(g => g.id === 'scope-review')).toMatchObject({ applies: false, passed: true });
  });

  it('goes draft → under review → approved → production only through recorded acts of different officials', () => {
    draftV2();
    approveV2();
    const automaticFailures = pub().automatic.filter(g => !g.passed);
    expect(automaticFailures).toEqual([]);
    expect(pub().status).toBe('under_review');
    reviewAll();
    expect(pub().status).toBe('approved');
    expect(recordApproval('civil.birth', 2, { kind: 'release-proposal', rollbackPlan: ROLLBACK, releaseNotes: 'First release' }, official('p1'))).not.toHaveProperty('error');
    expect(pub().status).toBe('approved');
    expect(pub().pendingRelease).toMatchObject({ by: 'Official p1', rollbackPlan: ROLLBACK });
    // The production approver is distinct from the proposer.
    expect(recordApproval('civil.birth', 2, { kind: 'release-approval' }, official('p1'))).toMatchObject({ error: expect.stringMatching(/proposed the release/) });
    expect(recordApproval('civil.birth', 2, { kind: 'release-approval' }, official('p2'))).toMatchObject({ status: 'production' });
    // Each act is in the audit chain.
    const acts = listAudit().filter(e => e.action.startsWith('form.')).map(e => e.action);
    expect(acts).toEqual(expect.arrayContaining(['form.legal-review', 'form.authority', 'form.privacy', 'form.release-proposal', 'form.release-approval']));
  });

  it('accepts an approval only from a signed-in official who can sign at the institution, never the drafter', () => {
    draftV2();
    approveV2();
    const legal = (who: Official) => recordApproval('civil.birth', 2, { kind: 'legal-review', note: 'ok' }, who);
    expect(legal({ name: 'Somebody', scope: null })).toMatchObject({ error: expect.stringMatching(/signed-in official/) });
    expect(legal(official('rg'))).toMatchObject({ error: expect.stringMatching(/drafted this form/) });
    expect(legal(official('adm', 'administrator'))).toMatchObject({ error: expect.stringMatching(/can sign/) });
    expect(legal(official('off', 'officer'))).toMatchObject({ error: expect.stringMatching(/can sign/) });
    expect(legal(official('x', 'signatory', OTHER))).toMatchObject({ error: expect.stringMatching(/institution responsible/) });
    expect(legal(official('lr'))).not.toHaveProperty('error');
  });

  it('cannot publish without an approved law version', () => {
    // A law recorded but not confirmed by a second official does not resolve.
    const v = recordVersion({ instrument: { title: 'Births Act', type: 'act', jurisdiction: 'MDA', year: 2021, number: '9', issuingAuthority: 'National Assembly' }, dates: { inForce: '2021-01-01' }, provisions: [{ eId: 'sec_1', num: '1', text: 'Births are registered.' }] }, 'Legal officer A', 'la');
    if ('error' in v) throw new Error(v.error);
    draftV2({ citations: [{ instrument: v.instrument.id, eId: 'sec_1', version: v.version.id, digest: v.version.digest, on: '2026-01-01' }] });
    expect(gate('legal-basis')).toMatchObject({ passed: false });
    expect(recordApproval('civil.birth', 2, { kind: 'legal-review', note: 'ok' }, official('lr'))).toMatchObject({ error: expect.stringMatching(/does not resolve/) });
  });

  it('cannot publish without a verified competent authority', () => {
    draftV2();
    approveV2();
    setSovereign({ deployment: { authorities: { lawRegister: CIVIL } } }, 'Administrator');
    expect(gate('authority')).toMatchObject({ passed: false });
    expect(['blocked', 'contract_draft']).toContain(pub().status);
  });

  it('cannot publish without validation tests that pass', () => {
    draftV2({ tests: [] });
    expect(gate('schema')).toMatchObject({ passed: false, detail: expect.arrayContaining([expect.stringMatching(/no tests/)]) });
  });

  it('cannot publish without accessibility and localisation: every official language translated', () => {
    draftV2();
    approveV2();
    setSovereign({ languages: ['fr'] } as never, 'Administrator');
    expect(gate('accessibility')).toMatchObject({ passed: false, detail: [expect.stringMatching(/^fr: \d+ strings not translated/)] });
    reviewAll();
    expect(recordApproval('civil.birth', 2, { kind: 'release-proposal', rollbackPlan: ROLLBACK }, official('p1'))).toMatchObject({ error: expect.stringMatching(/Every other gate passes first/) });
  });

  it('asks for the rollback plan with the release', () => {
    draftV2();
    approveV2();
    reviewAll();
    expect(recordApproval('civil.birth', 2, { kind: 'release-proposal' }, official('p1'))).toMatchObject({ error: expect.stringMatching(/rollback plan/) });
  });

  it('voids an approval when the form changes after it', () => {
    draftV2();
    expect(recordApproval('civil.birth', 2, { kind: 'privacy', note: 'Classes checked' }, official('pv'))).not.toHaveProperty('error');
    expect(human('privacy')).toMatchObject({ kind: 'human', passed: true });
    expect(editDraft('civil.birth', 2, { title: 'Birth registration (revised)' }, 'Official ed', 'ed', registeredEffects())).not.toHaveProperty('error');
    expect(human('privacy')).toMatchObject({ passed: false, detail: [expect.stringMatching(/earlier text/)] });
  });

  it('ignores any status or approval written into a form or a package', () => {
    const claims = { ...asNationSets(REFERENCE_BIRTH), version: 2, reference: false, citations: citing(), state: 'approved', approvedBy: 'Nobody', approvedAt: '2026-01-01' };
    const d = draftPackage(claims as never, 'Official rg', 'rg', registeredEffects());
    expect(d).toMatchObject({ state: 'draft' });
    expect((d as CasePackage).approvedBy).toBeUndefined();
    const form = { ...getPackage('civil.birth', 2)!.form!, status: 'published', envelope: { contractVersion: '1.0.0' as const, legalBasis: [{ instrumentId: law.instrument, versionId: law.version, provision: 'sec_12', verificationStatus: 'approved' }] } };
    expect(editDraft('civil.birth', 2, { form }, 'Official ed', 'ed', registeredEffects())).not.toHaveProperty('error');
    // The digest a human approval binds to ignores what a form says about itself.
    const before = contractDigest(getPackage('civil.birth', 2)!);
    expect(contractDigest({ ...getPackage('civil.birth', 2)!, form: { ...form, status: 'draft' } })).toBe(before);
    expect(pub().status).toBe('contract_draft');
    expect(pub().human.filter(g => g.applies).every(g => !g.passed)).toBe(true);
  });

  it('refuses a status sent to the API: approvals are acts, never fields', async () => {
    draftV2();
    approveV2();
    const post = (body: unknown) => POST(new NextRequest('http://x/api/case-packages', { method: 'POST', body: JSON.stringify(body) }));
    for (const body of [
      { op: 'approval', key: 'civil.birth', version: 2, status: 'production' },
      { op: 'approval', key: 'civil.birth', version: 2, approval: { kind: 'release-approval', status: 'approved', by: 'Official p2' } },
      { op: 'approval', key: 'civil.birth', version: 2, approval: { kind: 'legal-review', verificationStatus: 'approved' } },
      { op: 'publish', key: 'civil.birth', version: 2 },
      { op: 'status', key: 'civil.birth', version: 2, status: 'production' },
    ]) {
      const r = await post(body);
      expect(r.status).toBeGreaterThanOrEqual(400);
    }
    const g = await GET(new NextRequest('http://x/api/case-packages?publication=civil.birth&version=2'));
    const j = await g.json();
    expect(j.publication.status).toBe('under_review');
    expect(j.envelope.legalBasis.every((l: { verificationStatus: string }) => l.verificationStatus === 'requires_approval')).toBe(true);
  });

  it('takes self-service submissions in production only on a form in production', async () => {
    draftV2();
    approveV2();
    vi.stubEnv('CIVICOS_MODE', 'production');
    expect(submissionRefusal(getPackage('civil.birth', 2)!)).toMatch(/not released for public use/);
    const citizen: Actor = { id: 'citizen:1', name: 'A citizen', scope: null };
    const r = await submitForm({ procedure: 'civil.birth', channel: 'self-service', fields: {} }, citizen);
    expect('error' in r && r.error).toMatch(/not released for public use/);
    vi.unstubAllEnvs();
    reviewAll();
    recordApproval('civil.birth', 2, { kind: 'release-proposal', rollbackPlan: ROLLBACK }, official('p1'));
    recordApproval('civil.birth', 2, { kind: 'release-approval' }, official('p2'));
    vi.stubEnv('CIVICOS_MODE', 'production');
    expect(submissionRefusal(getPackage('civil.birth', 2)!)).toBeNull();
  });
});
