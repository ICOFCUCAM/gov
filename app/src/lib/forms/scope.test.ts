// The binding scope of forms (owner's direction of 21 October 2026 §1):
// excluded forms are never drafted; forms held for a legal review are not
// published until an authorised official records one.
import { describe, it, expect, beforeEach } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { asNationSets, setNationDays } from '@/lib/casework/testkit';
import { setSovereign, listMinistries } from '@/lib/data/store';
import { recordVersion, confirmVersion, resetLaw } from '@/lib/law/register';
import { installReferenceProcedures, REFERENCE_BIRTH } from '@/lib/civil/procedures';
import { draftPackage, editDraft, getPackage, resetPackages } from '@/lib/casework/packages';
import { registeredEffects } from '@/lib/casework/engine';
import { scopeOf, EXCLUDED_FORMS, LEGAL_REVIEW_FORMS } from './scope';
import { EXCLUDED_CONTRACTS } from './envelope';
import { publicationOf, recordApproval, resetPublication } from './publication';
import { SPEC_LIBRARY } from './library/definitions';
import { CANONICAL_LIBRARY } from './library/catalogue';

describe('scope of forms', () => {
  it('excludes patient, clinical and named-student forms by id and by field', () => {
    for (const id of ['HLT-PAT-001', 'HLT-ENC-002', 'HLT-REF-003', 'HLT-MED-004', 'HLT-CARE-008', 'EDU-STD-001', 'EDU-ENR-003', 'EDU-ATT-004', 'EDU-RES-005']) expect(scopeOf([id], []).status).toBe('excluded');
    for (const key of ['patient_id', 'patientId', 'clinical_assessment', 'diagnosis', 'student_id', 'learnerName', 'result_value', 'care_plan']) expect(scopeOf(['x'], [{ key }])).toMatchObject({ status: 'excluded', matched: key });
    // Nested questions count too.
    expect(scopeOf(['x'], [{ key: 'people', items: [{ key: 'patient_number' }] }]).status).toBe('excluded');
  });

  it('holds suspect-identifying referrals, prison admission, intelligence and voter registration for a legal review', () => {
    for (const id of ['JUS-PRO-006', 'JUS-COR-008', 'SEC-INT-006', 'SEC-OVS-007', 'ELE-REG-004']) expect(scopeOf([id], []).status).toBe('legal_review');
    for (const key of ['suspect_name', 'prisonerNumber', 'voter_roll_entry', 'intelligence_source']) expect(scopeOf(['x'], [{ key }]).status).toBe('legal_review');
  });

  it('leaves the allowed forms alone: facility licensing, school registration, a birth informant, an outpatient service', () => {
    expect(scopeOf(['civil.birth'], [{ key: 'informantName' }, { key: 'motherGiven' }]).status).toBe('allowed');
    expect(scopeOf(['HLT-FAC-002'], [{ key: 'services_offered' }, { key: 'outpatient_capacity' }]).status).toBe('allowed');
    for (const f of SPEC_LIBRARY) expect(scopeOf([f.key, f.specId], f.fields), f.specId).toMatchObject({ status: 'allowed' });
    for (const f of CANONICAL_LIBRARY) expect(scopeOf([f.specId], f.fields), f.specId).toMatchObject({ status: 'allowed' });
  });

  it('is one list: the envelope importer and the requirements register read the same', () => {
    expect(EXCLUDED_CONTRACTS).toEqual({ ...EXCLUDED_FORMS, ...LEGAL_REVIEW_FORMS });
    // Once the register agent's file lands, the two must agree.
    const file = join(process.cwd(), '..', 'docs', 'requirements', 'form-scope.json');
    if (existsSync(file)) {
      const j = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
      const ids = (v: unknown): string[] => (Array.isArray(v) ? v.map(x => (typeof x === 'string' ? x : String((x as { id?: string; form_id?: string }).id ?? (x as { form_id?: string }).form_id))) : v && typeof v === 'object' ? Object.keys(v) : []);
      const excluded = ids(j.excluded ?? j.excluded_pending_scope_review), review = ids(j.legal_review ?? j.requires_legal_review);
      expect(new Set(excluded)).toEqual(new Set(Object.keys(EXCLUDED_FORMS)));
      expect(new Set(review)).toEqual(new Set(Object.keys(LEGAL_REVIEW_FORMS)));
    }
  });
});

describe('scope in drafting and publication', () => {
  let CIVIL = '';
  let citation = { instrument: '', eId: 'sec_12', version: '', digest: '', on: '2026-01-01' };
  beforeEach(() => {
    for (const r of [resetLaw, resetPackages, resetPublication]) r();
    CIVIL = listMinistries()[0]!.id;
    setSovereign({ languages: [], deployment: { authorities: { civilRegistration: CIVIL, lawRegister: CIVIL } } } as never, 'Administrator');
    const v = recordVersion({ instrument: { title: 'Civil Registration Act', type: 'act', jurisdiction: 'MDA', year: 2020, number: '7', issuingAuthority: 'National Assembly' }, dates: { inForce: '2020-06-01' }, provisions: [{ eId: 'sec_12', num: '12', text: 'Every birth shall be registered by the Registrar.' }] }, 'Legal officer A', 'la');
    if ('error' in v) throw new Error(v.error);
    confirmVersion(v.instrument.id, v.version.id, 'Legal officer B', 'lb');
    citation = { ...citation, instrument: v.instrument.id, version: v.version.id, digest: v.version.digest };
    installReferenceProcedures('Administrator');
    setNationDays();
  });
  const draft = (extra: Record<string, unknown>) => draftPackage({ ...asNationSets(REFERENCE_BIRTH), version: 2, reference: false, citations: [citation], ...extra } as never, 'Official rg', 'rg', registeredEffects());

  it('refuses to draft a form in the excluded scope, by field or by catalogue id, and to edit one into it', () => {
    expect(draft({ fields: [...REFERENCE_BIRTH.fields, { key: 'patientId', label: 'Patient number', type: 'text' }] })).toMatchObject({ error: expect.stringMatching(/Outside the approved scope.*patientId/) });
    expect(draft({ form: { ...REFERENCE_BIRTH.form!, catalogueIds: ['EDU-STD-001'] } })).toMatchObject({ error: expect.stringMatching(/Outside the approved scope.*student/) });
    expect(draft({})).not.toHaveProperty('error');
    expect(editDraft('civil.birth', 2, { fields: [...getPackage('civil.birth', 2)!.fields, { key: 'clinicalNotes', label: 'Notes', type: 'longtext' }] }, 'Official ed', 'ed', registeredEffects())).toMatchObject({ error: expect.stringMatching(/Outside the approved scope/) });
  });

  it('blocks a form held for legal review until an authorised official records the review, citing the law', () => {
    expect(draft({ form: { ...REFERENCE_BIRTH.form!, catalogueIds: ['ELE-REG-004'] } })).not.toHaveProperty('error');
    const gate = () => publicationOf(getPackage('civil.birth', 2)!).human.find(g => g.id === 'scope-review')!;
    expect(gate()).toMatchObject({ applies: true, passed: false, kind: 'human' });
    const signer = (id: string) => ({ id, name: `Official ${id}`, scope: { id, role: 'signatory' as const, institution: CIVIL } });
    expect(recordApproval('civil.birth', 2, { kind: 'scope-review', note: 'Reviewed' }, { name: 'Developer', scope: null })).toMatchObject({ error: expect.stringMatching(/signed-in/) });
    expect(recordApproval('civil.birth', 2, { kind: 'scope-review', note: 'Reviewed' }, signer('rg'))).toMatchObject({ error: expect.stringMatching(/drafted/) });
    expect(recordApproval('civil.birth', 2, { kind: 'scope-review', note: 'Reviewed' }, signer('lr'))).toMatchObject({ error: expect.stringMatching(/Cite the law/) });
    expect(recordApproval('civil.birth', 2, { kind: 'scope-review', note: 'Reviewed under the act', citation: { instrument: citation.instrument, eId: 'sec_12' } }, signer('lr'))).not.toHaveProperty('error');
    expect(gate()).toMatchObject({ passed: true, act: { by: 'Official lr' } });
  });
});
