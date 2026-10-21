// Conformance of the form contract to the documents it answers
// (docs/FORMS_CONFORMANCE.md). Each test reads the document itself:
//
// - the specification's sixteen JSON form contracts
//   (docs/INSTITUTIONAL_ARCHITECTURE_SPEC.md): the copies the library loads
//   are the document's, and every field and attribute is carried at the same
//   strength or stronger, unless a documented deviation names it;
// - the field series (docs/forms-catalogue/FIELD-SERIES-PARTS-01-02.md,
//   -03-04.md): the sixteen field groups and the complete contracts are the
//   document's, loaded 1:1, every rule they name registered;
// - the supplement's shared envelope (contract_version 1.0.0): every
//   property is expressible on the contract.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { jsonBlocks } from './canonical';
import { SPEC_LIBRARY } from './library/definitions';
import { FIELD_GROUPS, CANONICAL_LIBRARY } from './library/catalogue';
import { SPEC_CLASSES, SPEC_VALIDATIONS, camel, type SpecFormJson } from './spec-import';
import { CLASS_RANK, fieldProblem, type ContractField, type PersonalDataClass } from './contract';
import { isRegisteredRule, RULE_REGISTRY } from './rules';
import { importEnvelopeContract, ENVELOPE_CLASSES, EXCLUDED_CONTRACTS, type EnvelopeContract } from './envelope';
import { REFERENCE_BIRTH } from '@/lib/civil/procedures';
import { scopeOf } from './scope';

const ROOT = join(process.cwd(), '..');
const doc = (p: string) => readFileSync(join(ROOT, p), 'utf8');
const here = (p: string) => join(process.cwd(), 'src', 'lib', 'forms', p);
const json = (p: string) => JSON.parse(readFileSync(here(p), 'utf8')) as Record<string, unknown>;
const flat = (fs: ContractField[]): ContractField[] => fs.flatMap(f => [f, ...(f.items ? flat(f.items as ContractField[]) : [])]);
const carries = (f: ContractField, id: string) => (Array.isArray(f.specField) ? f.specField.includes(id) : f.specField === id);

describe('the specification\'s sixteen form contracts', () => {
  const blocks = jsonBlocks(doc('docs/INSTITUTIONAL_ARCHITECTURE_SPEC.md')).filter((b): b is SpecFormJson => !!b && typeof b === 'object' && 'form_id' in b && 'fields' in b);
  const files = readdirSync(here('library/spec')).filter(f => f.endsWith('.json'));

  it('are all in the library, each the document\'s own text', () => {
    expect(files).toHaveLength(16);
    expect(SPEC_LIBRARY).toHaveLength(16);
    for (const f of files) {
      const mine = json(`library/spec/${f}`);
      const theirs = blocks.find(b => b.form_id === mine.form_id);
      expect(theirs, `${mine.form_id} is in the specification`).toBeDefined();
      expect(mine, String(mine.form_id)).toEqual(theirs);
    }
  });

  for (const lib of SPEC_LIBRARY) {
    it(`${lib.specId}: every field and attribute, no weaker`, () => {
      const spec = json(`library/spec/${files.find(f => json(`library/spec/${f}`).form_id === lib.specId)!}`) as unknown as SpecFormJson;
      const fields = flat(lib.fields);
      const deviated = (id: string) => lib.deviations.some(d => d.field === id || d.field === camel(id));
      // Form-level sections are kept as the form's policies, value for value.
      for (const section of ['rules', 'decision', 'controls'] as const) for (const [k, v] of Object.entries((spec as unknown as Record<string, Record<string, unknown>>)[section] ?? {})) {
        expect(lib.form.policies?.[`${section}.${k}`], `${section}.${k}`).toEqual(typeof v === 'boolean' ? v : String(v));
      }
      expect(lib.form.spec?.id).toBe(spec.form_id);
      for (const sf of spec.fields ?? []) {
        const mine = fields.filter(f => carries(f, sf.id));
        if (!mine.length) { expect(deviated(sf.id), `${sf.id} is carried or a documented deviation`).toBe(true); continue; }
        const lead = mine[0]!;
        if (sf.required && !deviated(sf.id)) expect(mine.some(f => f.required || (f.rules ?? []).some(r => r.rule === 'requiredWhen')), `${sf.id} stays required`).toBe(true);
        if (sf.personal_data_class) {
          const want = SPEC_CLASSES[sf.personal_data_class]?.cls ?? 'restricted';
          expect(CLASS_RANK[(lead.personalDataClass ?? 'administrative') as PersonalDataClass], `${sf.id} class ${sf.personal_data_class}`).toBeGreaterThanOrEqual(CLASS_RANK[want]);
        }
        if (sf.validation && SPEC_VALIDATIONS[sf.validation] && !deviated(sf.id)) {
          for (const r of SPEC_VALIDATIONS[sf.validation]!.rules) expect(mine.some(f => (f.rules ?? []).some(x => JSON.stringify(x) === JSON.stringify(r))), `${sf.id} keeps ${sf.validation}`).toBe(true);
        } else if (sf.validation && !deviated(sf.id)) {
          expect(mine.some(f => (f.rules ?? []).some(x => x.rule === 'profile' && x.profile === sf.validation)), `${sf.id} keeps ${sf.validation} as a configured check`).toBe(true);
        }
        if (sf.required_when) expect((lead.rules ?? []).some(r => r.rule === 'requiredWhen'), `${sf.id} required when`).toBe(true);
      }
      // Every field fits the contract.
      const keys = lib.fields.map(f => f.key), classes = lib.documents.map(d => d.class);
      for (const f of lib.fields) expect(fieldProblem(f, keys, classes), f.key).toBeNull();
    });
  }

  it('attaches to the reference procedure that exists, keeping the procedure\'s own fields', () => {
    const birth = SPEC_LIBRARY.find(f => f.specId === 'crvs.birth-registration')!;
    for (const sf of ['child_name', 'date_of_birth', 'place_of_birth', 'informant', 'evidence', 'declaration']) expect(flat(REFERENCE_BIRTH.fields).some(f => carries(f, sf)) || birth.deviations.some(d => d.field === sf), sf).toBe(true);
    for (const k of ['childGiven', 'childFamily', 'birthDate', 'motherFamily']) expect(REFERENCE_BIRTH.fields.some(f => f.key === k)).toBe(true);
  });
});

describe('the field series: canonical field groups and complete contracts', () => {
  const blocks = [...jsonBlocks(doc('docs/forms-catalogue/FIELD-SERIES-PARTS-01-02.md')), ...jsonBlocks(doc('docs/forms-catalogue/FIELD-SERIES-PARTS-03-04.md'))] as Record<string, unknown>[];

  it('loads the sixteen field groups exactly, by id and version, each the document\'s text', () => {
    const files = readdirSync(here('library/canonical/groups'));
    expect(files).toHaveLength(16);
    expect(FIELD_GROUPS).toHaveLength(16);
    for (const f of files) {
      const mine = json(`library/canonical/groups/${f}`);
      expect(blocks.find(b => b.group_id === mine.group_id && b.version === mine.version), String(mine.group_id)).toEqual(mine);
      const g = FIELD_GROUPS.find(x => x.id === mine.group_id)!;
      const src = (mine.fields ?? []) as { id: string; required?: boolean; personal_data_class: string; validation?: { rule: string }[] }[];
      expect(g.fields.map(x => x.key)).toEqual(src.map(x => x.id));
      for (const [i, sf] of src.entries()) {
        const f = g.fields[i]!;
        expect(!!f.required, sf.id).toBe(!!sf.required);
        expect(CLASS_RANK[f.personalDataClass!], sf.id).toBeGreaterThanOrEqual(CLASS_RANK[(sf.personal_data_class in CLASS_RANK ? sf.personal_data_class : 'restricted') as PersonalDataClass]);
        for (const v of sf.validation ?? []) expect((f.rules ?? []).some(r => r.rule === 'registered' && r.name === v.rule), `${sf.id} ${v.rule}`).toBe(true);
      }
      expect(g.notes.filter(n => n.kind === 'problem'), String(mine.group_id)).toEqual([]);
    }
  });

  it('loads the complete contracts of Parts 2 and 3 as library drafts, field for field', () => {
    const files = readdirSync(here('library/canonical/forms'));
    expect(CANONICAL_LIBRARY).toHaveLength(files.length);
    for (const f of files) {
      const mine = json(`library/canonical/forms/${f}`);
      expect(blocks.find(b => b.form_id === mine.form_id && b.schema_version === mine.schema_version), String(mine.form_id)).toEqual(mine);
      const lib = CANONICAL_LIBRARY.find(x => x.specId === mine.form_id)!;
      for (const sf of mine.fields as { id: string; required?: boolean }[]) {
        const field = lib.fields.find(x => x.key === sf.id);
        expect(field, `${mine.form_id} ${sf.id}`).toBeDefined();
        if (sf.required) expect(field!.required, sf.id).toBe(true);
      }
      expect(lib.form.status ?? 'draft').toBe('draft');
    }
  });

  it('registers every rule the documents name; any other name fails closed', () => {
    const names = new Set<string>();
    const walk = (v: unknown) => { if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === 'object') { const o = v as Record<string, unknown>; if (Array.isArray(o.validation)) for (const r of o.validation as { rule?: string }[]) if (r?.rule) names.add(r.rule); Object.values(o).forEach(walk); } };
    walk(blocks);
    expect(names.size).toBeGreaterThan(50);
    for (const n of names) expect(isRegisteredRule(n), n).toBe(true);
    const f: ContractField = { key: 'x', label: 'X', type: 'text', rules: [{ rule: 'registered', name: 'made_up_rule' }] };
    expect(fieldProblem(f, ['x'], [])).toMatch(/made_up_rule|registered/);
  });
});

describe('the shared envelope standard (contract_version 1.0.0)', () => {
  const text = doc('docs/forms-catalogue/SUPPLEMENT-PARTS-14-22-AND-CONTRACTS-05-13.md');
  const blocks = jsonBlocks(text) as Record<string, unknown>[];
  const example = blocks.find(b => b.contract_version === '1.0.0') as unknown as EnvelopeContract & Record<string, unknown>;

  it('expresses every property of the envelope on the contract', () => {
    const { definition, notes } = importEnvelopeContract(example);
    const e = definition.form.envelope!;
    expect(e).toMatchObject({
      contractVersion: '1.0.0', title: 'Employment Registration', domain: 'labour_employment', formType: 'application', countryProfile: '${COUNTRY_PROFILE}',
      owningInstitutionId: '${AUTHORIZED_INSTITUTION_ID}', competentAuthorityRuleId: '${APPROVED_AUTHORITY_RULE_ID}',
      legalBasis: [{ instrumentId: '${LAW_ID}', versionId: '${LAW_VERSION_ID}', provision: '${SECTION_OR_ARTICLE}', verificationStatus: 'requires_approval' }],
      applicability: { citizen: true, resident: true, business: false, government_official: false },
      workflow: { workflowId: 'LAB-EMP-REGISTRATION', initialState: 'draft', submissionState: 'submitted', decisionRequired: true, separationOfDuties: true },
      decision: { decisionTypes: ['approved', 'rejected', 'returned_for_information'], mustRecordReason: true, legalBasisRequired: true, appealRouteRuleId: '${COUNTRY_APPEAL_RULE}' },
      privacy: { purposeCode: 'EMPLOYMENT_ADMINISTRATION', retentionRuleId: '${APPROVED_RETENTION_RULE}', restrictedAccessAudit: true },
      audit: { recordCreation: true, fieldChangeHistory: true, decisionHistory: true, evidenceHashes: true },
      accessibility: { target: 'WCAG_2_2_AA', plainLanguage: true, keyboardOperable: true },
    });
    expect(definition.form.spec).toMatchObject({ id: 'LAB-EMP-001', version: '1.0.0' });
    const f = definition.fields[0]!;
    expect(f).toMatchObject({ key: 'employer_id', label: 'Employer', type: 'registryReference', register: 'organisation', required: true, personalDataClass: ENVELOPE_CLASSES.confidential, valueSource: 'verified_source', valuesSourceId: 'BUSINESS_REGISTER', hint: 'Select the registered employer.', ui: { widget: 'entity_lookup', order: 1 } });
    expect(f.rules).toEqual(expect.arrayContaining([{ rule: 'registered', name: 'REF-EXISTS' }, { rule: 'registered', name: 'REF-ACTIVE' }, { rule: 'existingRecord', active: true }]));
    expect(notes.filter(n => n.kind === 'problem')).toEqual([]);
  });

  it('never takes a claimed verification status: the legal basis waits for a recorded review', () => {
    const claimed = { ...example, legal_basis: [{ instrument_id: 'L', version_id: 'V', provision: 'S', verification_status: 'approved' }] };
    expect(importEnvelopeContract(claimed).definition.form.envelope!.legalBasis![0]!.verificationStatus).toBe('requires_approval');
  });

  it('registers every rule id the supplement names', () => {
    const ids = [...text.matchAll(/"validation_rule_ids":\s*\[([^\]]*)\]/g)].flatMap(m => [...m[1]!.matchAll(/"([^"]+)"/g)].map(x => x[1]!));
    expect(ids.length).toBeGreaterThan(5);
    for (const id of ids) expect(isRegisteredRule(id), id).toBe(true);
    expect(RULE_REGISTRY['SEPARATION-OF-DUTIES']!.scope).toBe('client');
  });

  it('reads every domain block, and lists the contracts the scope keeps out', () => {
    const domains = blocks.filter(b => typeof b.domain === 'string' && Array.isArray(b.contracts));
    expect(domains.length).toBeGreaterThanOrEqual(18);
    const ids = domains.flatMap(d => (d.contracts as { form_id: string }[]).map(c => c.form_id));
    for (const id of Object.keys(EXCLUDED_CONTRACTS)) expect(text, id).toContain(id);
    // Every contract whose id or fields fall in the excluded or legal-review scope is held, by its id or by its fields' words.
    const held = domains.flatMap(d => (d.contracts as EnvelopeContract[]).filter(c => scopeOf([c.form_id], c.fields.map(f => ({ key: f.field_id ?? f.key }))).status !== 'allowed').map(c => c.form_id));
    for (const id of ids.filter(i => EXCLUDED_CONTRACTS[i])) expect(held, id).toContain(id);
    expect(held).toEqual(expect.arrayContaining(['HLT-PAT-001', 'EDU-STD-001', 'JUS-PRO-006']));
    // Mapped, not loaded as a batch (owner's direction: no batch of contracts before the verified gap report): each maps without an unregistered rule.
    for (const d of domains) for (const c of d.contracts as EnvelopeContract[]) {
      if (EXCLUDED_CONTRACTS[c.form_id]) continue;
      const r = importEnvelopeContract(c as EnvelopeContract & Record<string, unknown>, d.domain as string);
      expect(r.notes.filter(n => n.kind === 'problem' && /not registered/.test(n.note)), c.form_id).toEqual([]);
    }
  });
});
