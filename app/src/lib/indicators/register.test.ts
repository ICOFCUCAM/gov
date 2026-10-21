// The indicator register (plan step I3): definitions drafted by one official
// and approved by another, every version kept, reference drafts never approved
// by shipping, no target value, permissions from lib/auth/roles.ts.
import { describe, it, expect, beforeEach } from 'vitest';
import { listDefinitions, getDefinition, draftVersion, approveVersion, withdrawApproval, versionFor, resetIndicators, REFERENCE_AUTHOR, type IndicatorActor } from './register';
import { REFERENCE_DEFINITIONS } from './reference';
import { METHODS } from './methods';
import { setSovereign, listMinistries } from '@/lib/data/store';

let INST = '', OTHER = '';
const who = (id: string, role: 'officer' | 'signatory' | 'administrator' | 'auditor' = 'officer', institution: string | undefined = INST): IndicatorActor =>
  ({ name: `Official ${id}`, id, scope: { role, ...(institution ? { institution } : {}) } });

describe('indicator register', () => {
  beforeEach(() => {
    resetIndicators();
    [INST, OTHER] = listMinistries().map(m => m.id) as [string, string];
    setSovereign({ regions: ['North', 'South'], deployment: { authorities: { civilRegistration: INST, judiciary: '' } } }, 'test');
  });

  it('ships the reference definitions as unapproved drafts with every contract field and no target', () => {
    const defs = listDefinitions();
    expect(defs.map(d => d.id).sort()).toEqual(REFERENCE_DEFINITIONS.map(r => r.id).sort());
    for (const d of defs) {
      expect(d.approvals).toEqual([]);
      expect(d.versions).toHaveLength(1);
      const v = d.versions[0]!;
      expect(v).toMatchObject({ n: 1, by: REFERENCE_AUTHOR, reference: true });
      const t = v.terms;
      // numerator, denominator where a share, period, coverage, method version, disclosure rule, qualifications
      expect(t.numerator.length).toBeGreaterThan(5);
      if (t.unit === '%') expect(t.denominator).toBeTruthy();
      expect(t.period).toBe('month');
      expect(t.coverage.length).toBeGreaterThan(20);
      expect(METHODS.some(m => m.id === t.method.id && m.version === t.method.version && m.unit === t.unit)).toBe(true);
      expect(['small-cells', 'not-personal']).toContain(t.disclosure.kind);
      expect(t.qualifications.length).toBeGreaterThan(0);
      expect(t.source.registerId && t.source.recordType).toBeTruthy();
      expect(JSON.stringify(t)).not.toMatch(/"target|"expected|"goal/i);
      expect(versionFor(d, INST).status).toBe('draft');
    }
  });

  it('refuses to approve a reference draft as shipped: an institution drafts its own version first', () => {
    expect(approveVersion('civil.births_registered', 1, who('s', 'signatory'))).toMatchObject({ error: expect.stringMatching(/reference draft/) });
  });

  it('drafts by one official, approves by a different one who can sign there, and keeps every version', () => {
    expect(draftVersion({ id: 'civil.births_registered', terms: {}, reason: '' }, who('a'))).toMatchObject({ error: expect.stringMatching(/why/) });
    const d = draftVersion({ id: 'civil.births_registered', terms: { limitations: ['Our own note'] }, reason: 'Adopted for our register' }, who('a'));
    if ('error' in d) throw new Error(d.error);
    expect(d.versions.map(v => v.n)).toEqual([1, 2]);
    expect(d.versions[1]!.terms.limitations).toEqual(['Our own note']);
    // the drafter cannot approve, an officer cannot, a whole-government administrator cannot, another institution cannot
    expect(approveVersion(d.id, 2, who('a', 'signatory'))).toMatchObject({ error: expect.stringMatching(/second, different official|different official/) });
    expect(approveVersion(d.id, 2, who('o', 'officer'))).toMatchObject({ error: expect.stringMatching(/can sign/) });
    expect(approveVersion(d.id, 2, who('adm', 'administrator', undefined))).toHaveProperty('error');
    expect(approveVersion(d.id, 2, who('x', 'signatory', OTHER))).toMatchObject({ error: expect.stringMatching(/institution whose figures/) });
    const ok = approveVersion(d.id, 2, who('b', 'signatory'));
    if ('error' in ok) throw new Error(ok.error);
    expect(ok.approvals).toEqual([expect.objectContaining({ version: 2, institution: INST, by: 'Official b' })]);
    expect(versionFor(ok, INST)).toMatchObject({ status: 'approved', version: { n: 2 } });
    // a newer draft waits; the approved version stays in force until approved
    const v3 = draftVersion({ id: d.id, terms: { title: 'Births registered (v3)' }, reason: 'Retitled' }, who('c'));
    if ('error' in v3) throw new Error(v3.error);
    expect(versionFor(v3, INST)).toMatchObject({ status: 'approved', version: { n: 2 }, newerDraft: 3 });
    // withdrawn, kept
    const w = withdrawApproval(d.id, who('b', 'signatory'), 'Method under review');
    if ('error' in w) throw new Error(w.error);
    expect(w.approvals[0]!.withdrawn).toMatchObject({ reason: 'Method under review' });
    expect(versionFor(w, INST).status).toBe('draft');
    expect(getDefinition(d.id)!.versions).toHaveLength(3);
  });

  it('refuses a target, an unknown method, a share without denominator and a missing disclosure rule', () => {
    expect(draftVersion({ id: 'casework.cases_opened', terms: { target: 95 }, reason: 'x' }, who('a'))).toMatchObject({ error: expect.stringMatching(/target/) });
    expect(draftVersion({ id: 'casework.cases_opened', terms: { method: { id: 'made.up', version: 1 } }, reason: 'x' }, who('a'))).toMatchObject({ error: expect.stringMatching(/No computation/) });
    expect(draftVersion({ id: 'casework.decided_on_time', terms: { denominator: '' }, reason: 'x' }, who('a'))).toMatchObject({ error: expect.stringMatching(/denominator/) });
    expect(draftVersion({ id: 'casework.cases_opened', terms: { disclosure: { kind: 'not-personal', reason: 'no' } }, reason: 'x' }, who('a'))).toMatchObject({ error: expect.stringMatching(/disclosure/) });
    expect(draftVersion({ id: 'casework.cases_opened', terms: { method: { id: 'cases.opened', version: 1, params: { colour: 'red' } } }, reason: 'x' }, who('a'))).toMatchObject({ error: expect.stringMatching(/no parameter/) });
  });

  it('keeps drafting to the owning institution and auditors out', () => {
    expect(draftVersion({ id: 'civil.births_registered', terms: {}, reason: 'x' }, who('x', 'officer', OTHER))).toMatchObject({ error: expect.stringMatching(/drafted by officials/) });
    expect(draftVersion({ id: 'civil.births_registered', terms: {}, reason: 'x' }, who('au', 'auditor'))).toMatchObject({ error: expect.stringMatching(/Auditors/) });
    // a definition each institution keeps: its own officials approve it for their institution
    const d = draftVersion({ id: 'casework.cases_opened', terms: {}, reason: 'Adopted' }, who('a', 'officer', OTHER));
    if ('error' in d) throw new Error(d.error);
    const ok = approveVersion(d.id, 2, who('b', 'signatory', OTHER));
    expect(ok).toMatchObject({ approvals: [expect.objectContaining({ institution: OTHER })] });
    expect(versionFor(getDefinition(d.id)!, INST).status).toBe('draft');
  });

  it('a new definition names its owner and a slot left empty is refused at approval', () => {
    const d = draftVersion({ id: 'courts.filings_new', owner: { slot: 'judiciary' }, terms: { ...getDefinition('courts.filings_received')!.versions[0]!.terms }, reason: 'New' }, who('n', 'officer', undefined));
    expect(d).toMatchObject({ error: expect.stringMatching(/No institution is named/) });
  });
});
