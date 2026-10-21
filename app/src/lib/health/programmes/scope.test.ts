// The binding scope for public health (owner's direction 2026-10-21 §1;
// docs/requirements/form-scope.json; CLAUDE.md Health): approved aggregate
// statistics and programme administration only. No individual case, contact,
// laboratory or vaccination record can be drafted as a procedure or form, and
// none can be stored in the programme register: every value there has a fixed
// shape and an unknown key is refused, not kept.
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { registeredEffects } from '@/lib/casework/engine';
import { draftPackage, resetPackages } from '@/lib/casework/packages';
import { setSovereign, listMinistries } from '@/lib/data/store';
import { scopeOf, formScope } from '@/lib/forms/scope';
import { CATALOGUE_CONTRACTS } from '@/lib/forms/library/catalogue-contracts';
import { PROGRAMME_PROCEDURES } from './procedures';
import { resetProgrammes, checkEntries, checkTerms, recordProgrammeReturn, listProgrammes, establishProgramme } from './register';

const SCOPE = (JSON.parse(readFileSync(join(process.cwd(), '..', 'docs', 'requirements', 'form-scope.json'), 'utf8')) as { forms: { id: string; scope: string }[] }).forms;
/** The individual public-health forms the approved scope excludes: cases, laboratory notifications, contacts, exposures, outbreaks, interventions on persons, vaccination records and reports, corrections, closures and disclosures. */
const INDIVIDUAL = ['HLT-PH-001', 'HLT-PH-002', 'HLT-PH-003', 'HLT-PH-004', 'HLT-PH-005', 'HLT-PH-006', 'HLT-PH-007', 'HLT-PH-008', 'HLT-PH-009', 'HLT-PH-010', 'HLT-PH-012', 'HLT-PH-013', 'HLT-PH-016', 'HLT-PH-017', 'HLT-PH-018'];

describe('public-health scope: no individual case, contact, laboratory or vaccination record', () => {
  beforeEach(() => {
    resetPackages(); resetProgrammes();
    setSovereign({ regions: ['North', 'South'], deployment: { authorities: { publicHealth: listMinistries()[0]!.id } } }, 'Administrator');
  });

  it('keeps the binding scope: every individual public-health form excluded, only the aggregate and programme forms allowed', () => {
    for (const id of INDIVIDUAL) {
      expect(SCOPE.find(f => f.id === id)?.scope, id).toBe('excluded');
      expect(scopeOf([id], []).status, id).toBe('excluded');
    }
    for (const id of ['HLT-PH-011', 'HLT-PH-014', 'HLT-PH-015']) {
      expect(SCOPE.find(f => f.id === id)?.scope, id).toBe('allowed');
      const f = CATALOGUE_CONTRACTS.find(x => x.specId === id)!;
      expect(formScope(f.key, f.form, f.fields).status, id).toBe('allowed');
    }
    expect(CATALOGUE_CONTRACTS.filter(f => INDIVIDUAL.includes(f.specId))).toEqual([]);
  });

  it.each([
    ['a catalogue ID of an individual form', { form: { version: '1.0', catalogueIds: ['HLT-PH-012'], catalogueSource: 'docs/forms-catalogue/FIELD-SERIES-PARTS-05-07.md' } }],
    ['a vaccinee', { fields: [{ key: 'vaccineeName', label: 'Name', type: 'text' }] }],
    ['a vaccination record', { fields: [{ key: 'vaccinationRecord', label: 'Record', type: 'text' }] }],
    ['a traced contact', { fields: [{ key: 'tracedContact', label: 'Contact', type: 'text' }] }],
    ['a specimen', { fields: [{ key: 'specimenId', label: 'Specimen', type: 'text' }] }],
    ['a laboratory result', { fields: [{ key: 'laboratoryResult', label: 'Result', type: 'text' }] }],
    ['a patient', { fields: [{ key: 'patientId', label: 'Patient', type: 'text' }] }],
  ])('refuses to draft a public-health procedure naming %s', (_what, extra) => {
    const ref = PROGRAMME_PROCEDURES.find(p => p.key === 'public-health.programme-return')!;
    const pkg = { ...ref, version: 2, ...('form' in extra ? { form: extra.form } : {}), ...('fields' in extra ? { fields: [...ref.fields, ...extra.fields] } : {}) };
    expect(draftPackage(pkg as never, 'Author', 'author', registeredEffects())).toMatchObject({ error: expect.stringMatching(/Outside the approved scope/) });
  });

  it('ships procedures with no person, party, contact or personal field, and drafts them within scope', () => {
    for (const p of PROGRAMME_PROCEDURES) {
      const all = p.fields.flatMap(f => [f, ...((f.items ?? []) as typeof p.fields)]);
      expect(all.filter(f => ['person', 'party', 'contact'].includes(f.type) || f.personalDataClass === 'personal' || f.personalDataClass === 'special').map(f => f.key), p.key).toEqual([]);
      expect(formScope(p.key, p.form, p.fields).status, p.key).toBe('allowed');
      expect(draftPackage(p, 'Author', 'author', registeredEffects()), p.key).not.toHaveProperty('error');
    }
  });

  it('stores nothing about a person: an unknown key in a count is refused, the terms keep only their own fields', () => {
    expect(checkEntries('PHP-1999-000001', [{ indicator: 'a', basis: 'reported', quality: 'counted', value: 1 }])).toMatchObject({ error: expect.stringMatching(/No programme/) });
    const terms = checkTerms({ title: 'Programme', coverageDefinition: 'Units', reportingPeriod: 'year', indicators: 'doses.administered', areas: ['North'], ...({ vaccinee: 'A Person', dateOfBirth: '2020-01-01' } as object) });
    expect(terms).not.toHaveProperty('error');
    expect(JSON.stringify(terms)).not.toMatch(/A Person|2020-01-01|vaccinee|dateOfBirth/);
    expect(Object.keys(terms).sort()).toEqual(['areas', 'coverage', 'eligibility', 'indicators', 'reportingPeriod', 'supplyItems', 'title']);
    // An established programme's return refuses any count carrying something other than an aggregate's fields.
    const p = establishProgramme(terms as Exclude<typeof terms, { error: string }>, 'Established', 'case-0', 'Officer');
    if ('error' in p) throw new Error(p.error);
    for (const extra of [{ personName: 'A Person' }, { dateOfBirth: '2020-01-01' }, { vaccinee: 'A Person' }, { specimen: 'S-1' }]) {
      expect(checkEntries(p.number, [{ indicator: 'doses.administered', basis: 'reported', quality: 'counted', value: 1, ...extra }]), JSON.stringify(extra)).toMatchObject({ error: expect.stringMatching(/not part of an aggregate count/) });
      expect(recordProgrammeReturn({ programme: p.number, reporter: 'ORG-1', area: 'North', period: { from: '2026-01-01', to: '2026-03-31' }, entries: [{ indicator: 'doses.administered', basis: 'reported', quality: 'counted', value: 1, ...extra }], complete: true }, 'case-1', 'Officer')).toHaveProperty('error');
    }
    expect(JSON.stringify(listProgrammes())).not.toMatch(/A Person|2020-01-01|S-1/);
  });
});
