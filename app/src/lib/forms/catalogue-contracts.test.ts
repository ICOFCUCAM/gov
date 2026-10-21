// Conformance of the catalogue contracts CivicOS wrote (batch 1, health
// regulation: HLT-FAC-001 … 010, HLT-LIC-001 … 014, HLT-PH-015; batch 2,
// medicines and medical devices regulation: HLT-MED-001 … 015, 017 … 020,
// 023, 024; batch 3, taxpayer registration and account: the 29
// taxpayer.* rows of Part 2 §2.6) to the documents they answer
// (docs/FORMS_CONFORMANCE.md §8, §9, §10). The test holds its
// own list of the catalogue lines each form must answer and reads the
// documents themselves: every piece of every line (each table cell, list item
// and sentence) is quoted verbatim by the contract and met by a field, a
// named deviation, a country decision, a step of the linked procedure, an
// exchange service, a policy of the form or a platform rule whose file
// exists. Then, for each form: every field typed and classed with registered
// rules only; nothing in the binding scope; nothing a law decides set; the
// same questions in all three channels; and a register status of contract
// draft, never approved.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CATALOGUE_CONTRACTS, BATCH_1, BATCH_2, BATCH_3, COMMON_ITEMS, type CatalogueLibraryForm } from './library/catalogue-contracts';
import { CANONICAL_LIBRARY } from './library/catalogue';
import SPEC_TAXPAYER from './library/spec/taxpayer-registration-v1.json';
import { SPEC_CLASSES } from './spec-import';
import { CLASS_RANK, DATA_CLASSES, FIELD_TYPES, fieldProblem, formProblem, type ContractField } from './contract';
import { isRegisteredRule, RULE_REGISTRY } from './rules';
import { scopeOf, formScope } from './scope';
import { formView } from './server';
import { libraryPublication } from './publication';
import { findLibraryForm } from './page-data';
import { ruleInForce } from '@/lib/law/rules';
import { HEALTH_PROCEDURES } from '@/lib/health/procedures';
import { PROFESSION_PROCEDURES } from '@/lib/professions/procedures';
import { TAX_PROCEDURES } from '@/lib/tax/procedures';
import { serviceDirectory } from '@/lib/exchange/services';
import { AUTHORITIES } from '@/lib/nation/deployment';
import { pagesOf } from '@/components/features/forms/answers';
import { FormRenderer } from '@/components/features/forms/FormRenderer';
import { PrintForm } from '@/components/features/forms/PrintForm';

const ROOT = join(process.cwd(), '..');
const SRC = {
  A: 'docs/forms-catalogue/FIELD-SERIES-PARTS-05-07.md',
  B: 'docs/forms-catalogue/FIELD-SERIES-PARTS-01-02.md',
  C: 'docs/forms-catalogue/SUPPLEMENT-PARTS-14-22-AND-CONTRACTS-05-13.md',
  D: 'docs/INSTITUTIONAL_ARCHITECTURE_SPEC.md',
} as const;
type Src = keyof typeof SRC;
const DOC = Object.fromEntries(Object.entries(SRC).map(([k, p]) => [k, readFileSync(join(ROOT, p), 'utf8').split('\n')])) as Record<Src, string[]>;
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

const IDS_1 = [...range(1, 10).map(n => `HLT-FAC-${String(n).padStart(3, '0')}`), ...range(1, 14).map(n => `HLT-LIC-${String(n).padStart(3, '0')}`), 'HLT-PH-015'];
// Batch 2: HLT-MED-016, 021 and 022 are excluded by the approved scope (docs/requirements/form-scope.json) and have no contract.
const IDS_2 = [...range(1, 15), ...range(17, 20), 23, 24].map(n => `HLT-MED-${String(n).padStart(3, '0')}`);
// Batch 3: every taxpayer.* row of the register but the business registration (its contract is the catalogue's own). Two rows share the
// catalogue ID taxpayer.registration.further_information (the service table, line 2543; the internal forms, line 2714): the second is …@P2.
const IDS_3 = [
  'taxpayer.registration.individual', 'taxpayer.registration.public_entity', 'taxpayer.registration.nonresident', 'taxpayer.registration.branch',
  'taxpayer.registration.amend', 'taxpayer.details.change', 'taxpayer.obligation.add', 'taxpayer.obligation.cancel', 'taxpayer.registration.transfer',
  'taxpayer.certificate.request', 'taxpayer.account.statement', 'taxpayer.registration.duplicate', 'taxpayer.registration.suspend_request',
  'taxpayer.registration.reactivate_request', 'taxpayer.registration.objection', 'taxpayer.registration.appeal', 'taxpayer.registration.withdraw',
  'taxpayer.registration.decision', 'taxpayer.registration.inspection', 'taxpayer.registration.further_information', 'taxpayer.registration.referral',
  'taxpayer.registration.assessment', 'taxpayer.registration.verification_record', 'taxpayer.registration.inspection_checklist',
  'taxpayer.registration.further_information@P2', 'taxpayer.registration.decision_record', 'taxpayer.registration.referral_record',
  'taxpayer.registration.appeal_assessment', 'taxpayer.registration.closure_record',
];
const IDS = [...IDS_1, ...IDS_2, ...IDS_3];
const batchOf = (id: string) => (id.startsWith('taxpayer.') ? 3 : id.startsWith('HLT-MED') ? 2 : 1);
const sourceOf = (id: string): Src => (batchOf(id) === 3 ? 'B' : 'A');

// ── The catalogue text each form answers (held here, apart from the contracts) ──
// Every form: Part 1's universal rules, the three channels and minimisation, and the supplement's conventions and activation gates.
const COMMON: Partial<Record<Src, number[]>> = {
  B: [...range(1699, 1710), 1756, ...range(1760, 1764), ...range(1769, 1774), ...range(1779, 1784), 1787, 1789, ...range(1792, 1799)],
  C: [...range(144, 156), ...range(2390, 2399)],
};
// Every health form (batches 1 and 2): Part 6's common rules (clinical confidentiality, the access model, the common health schema,
// validation, configuration and acceptance gates).
const COMMON_HEALTH: Partial<Record<Src, number[]>> = {
  A: [496, 498, 509, ...range(786, 794), 809, ...range(811, 825), 841, 850, 851, 855, 870, 873, 875, 876, 885, 886, 887],
};
// Every tax form (batch 3): Part 2 §2.6's opening rules, the business contract's country decisions and the decision-record rule,
// country.tax.registration and the retention record of §2.8 with its versioning rule, the §2.9 gates that apply to registration; the
// specification's tax authority mandate (§5.1), its registration department (§5.2) and the decision controls on amendments, access and the
// twin (§5.5).
const TAX: Partial<Record<Src, number[]>> = {
  B: [2517, 2519, ...range(2700, 2704), 2730, 3219, 3225, 3226, 3231, 3236, 3251, 3256, 3261, 3266, 3271],
  D: [376, 378, 380, 387, 509, 510, 511],
};
const FAMILY: Record<'FAC' | 'LIC' | 'PH' | 'MED', Partial<Record<Src, number[]>>> = {
  FAC: { A: [694, 723, 847, 866, 881, 894], D: [1323] },
  LIC: { A: [504, 694, 723, 847, 865, 881, 894], D: [1324, 1805] },
  PH: { A: [502, 601, 626, 633, 634, ...range(642, 647), 805, 807, 849, 859, 880, 892], D: [1328] },
  // Part 6 §1 (the medicines regulator), §5 and §5.2's closing rule, the regulatory-authority validation, CFG-MED-001 … 003, the
  // regulatory-integrity gate, deliverable 4; the specification's sector-regulator controls (its §9: it has no medicines archetype).
  MED: { A: [505, 649, 688, 847, 862, 863, 864, 881, 893], D: [3237] },
};
// Batch 3: the families of taxpayer forms and the lines each answers.
const TAX_REG: Partial<Record<Src, number[]>> = { D: [386, 403, 501] };
const TAX_AMEND: Partial<Record<Src, number[]>> = { D: [404] };
const TAX_DISPUTE: Partial<Record<Src, number[]>> = { B: [...range(3062, 3070), 3076, 3078, 3223], D: [392, 410, 508] };
const TAX_INSPECT: Partial<Record<Src, number[]>> = { B: [3191, 3194, 3195, 2896, 3043, 3222], D: [397] };
const TAX_DECIDE: Partial<Record<Src, number[]>> = { B: [3191, ...range(2725, 2729), 3193, ...range(3198, 3201)], D: [507] };
const TAX_REQUEST: Partial<Record<Src, number[]>> = { B: [3191, 3196, 3197] };
const TAX_REFER: Partial<Record<Src, number[]>> = { B: [3191, 3202, 3203] };
/** Officers' forms answer the universal control of internal records (§2.7); the internal forms also their opening line. */
const TAX_OFFICER = ['decision', 'decision_record', 'inspection', 'inspection_checklist', 'further_information', 'further_information@P2', 'referral', 'referral_record', 'assessment', 'verification_record', 'appeal_assessment', 'closure_record'].map(x => `taxpayer.registration.${x}`);
const TAX_INTERNAL = ['assessment', 'verification_record', 'inspection_checklist', 'further_information@P2', 'decision_record', 'referral_record', 'appeal_assessment', 'closure_record'].map(x => `taxpayer.registration.${x}`);
const TAX_FAMILY: Record<string, Partial<Record<Src, number[]>>[]> = {
  ...Object.fromEntries(['individual', 'public_entity', 'nonresident', 'branch'].map(x => [`taxpayer.registration.${x}`, [TAX_REG]])),
  ...Object.fromEntries(['taxpayer.registration.amend', 'taxpayer.details.change', 'taxpayer.obligation.cancel', 'taxpayer.registration.transfer', 'taxpayer.registration.suspend_request', 'taxpayer.registration.reactivate_request'].map(x => [x, [TAX_AMEND]])),
  'taxpayer.obligation.add': [TAX_AMEND, { B: [3246] }],
  'taxpayer.registration.objection': [TAX_DISPUTE],
  'taxpayer.registration.appeal': [TAX_DISPUTE, { B: [3074] }],
  'taxpayer.registration.inspection': [TAX_INSPECT],
  'taxpayer.registration.inspection_checklist': [TAX_INSPECT],
  'taxpayer.registration.decision': [TAX_DECIDE],
  'taxpayer.registration.decision_record': [TAX_DECIDE],
  'taxpayer.registration.further_information': [TAX_REQUEST],
  'taxpayer.registration.further_information@P2': [TAX_REQUEST, { B: [2723] }],
  'taxpayer.registration.referral': [TAX_REFER],
  'taxpayer.registration.referral_record': [TAX_REFER],
  'taxpayer.certificate.request': [{ D: [403] }],
  'taxpayer.registration.duplicate': [{ D: [403] }],
  'taxpayer.account.statement': [{ B: [3241], D: [386, 408, 414] }],
  'taxpayer.registration.assessment': [{ B: [...range(2720, 2724), 3191, 3193, 3194], D: [397] }],
  'taxpayer.registration.verification_record': [{ B: [3191, 3194] }],
  'taxpayer.registration.appeal_assessment': [{ B: [3191, 3193, 3062, 3063, 3070, 3076, 3078, 3223], D: [392, 410, 508] }],
  'taxpayer.registration.closure_record': [{ B: [3191, 3204] }],
};

const EXTRA: Record<string, Partial<Record<Src, number[]>>> = {
  'HLT-FAC-001': { D: [1334, 1335, ...range(1350, 1356), ...range(1359, 1362)], C: range(1559, 1564) },
  'HLT-FAC-002': { D: [...range(1334, 1341), ...range(1350, 1356), ...range(1359, 1362)], C: range(1559, 1564) },
  'HLT-FAC-003': { D: [1325, 1336, 1337], C: range(1570, 1574) },
  'HLT-FAC-004': { D: [1325], C: [1574] },
  'HLT-FAC-005': { D: [1338] },
  'HLT-FAC-006': { C: [1563] },
  'HLT-FAC-007': { D: [1341] },
  'HLT-FAC-008': { D: [1339, 1340], A: [800] },
  'HLT-FAC-009': { A: [508], D: [1841] },
  'HLT-FAC-010': { D: [1341], A: [807, 884] },
  'HLT-LIC-001': { D: [1809, ...range(1825, 1830), ...range(1833, 1836)] },
  'HLT-LIC-002': { D: [1810, 1811, 1834] },
  'HLT-LIC-003': { D: [1812, 1813, 1814], A: [800] },
  'HLT-LIC-004': { D: [1816] },
  'HLT-LIC-007': { D: [1841] },
  'HLT-LIC-008': { A: [508], D: [1836, 1841] },
  'HLT-LIC-009': { D: [1836] },
  'HLT-LIC-010': { D: [1836], A: [800] },
  'HLT-LIC-011': { D: [1813, 1836], A: [800] },
  'HLT-LIC-012': { D: [1816], A: [800] },
  'HLT-LIC-013': { D: [1816] },
  'HLT-LIC-014': { D: [1815, 1841], A: [807, 884] },
  // Batch 2: Part 6 §5.2 (the regulated product record), §5.3 (safety and recall), HX-005, the exchange rule and gate; the supplement's
  // Stage B HLT-MED-004 (a different, excluded form); the specification's supply-item register and sector-regulator workflow, records and appeals.
  'HLT-MED-001': { A: range(677, 682) },
  'HLT-MED-002': { A: [682] },
  'HLT-MED-003': { A: [683], D: [3231] },
  'HLT-MED-004': { C: [1494] },
  'HLT-MED-006': { A: [684, 686, 687], D: [3233, 3234] },
  'HLT-MED-007': { A: [684] },
  'HLT-MED-008': { A: [685] },
  'HLT-MED-009': { A: [685, 686], D: range(3228, 3235) },
  'HLT-MED-010': { A: [681] },
  'HLT-MED-011': { A: [681], D: [3231] },
  'HLT-MED-012': { D: [3235] },
  'HLT-MED-013': { D: [1326] },
  'HLT-MED-014': { D: [1326] },
  'HLT-MED-015': { A: [690, 692] },
  'HLT-MED-017': { A: [685, 690, 692, 801, 807, 884], D: [1326] },
  'HLT-MED-018': { A: [690], D: [1326, 3235] },
  'HLT-MED-019': { A: range(677, 681) },
  'HLT-MED-020': { A: [690, 692] },
  'HLT-MED-023': { D: [2830, 3211, 3224, 3234] },
  'HLT-MED-024': { A: [684, 687, 807, 884] },
};

/** The pieces of a line a contract must quote: table cells, list items and sentences. */
function pieces(line: string): string[] {
  let s = line.trim().replace(/^(- \[ \] |- |\d+\. )/, '');
  const parts = s.startsWith('|') ? s.replace(/^\||\|$/g, '').split('|').map(x => x.trim()) : s.split('\t');
  const out: string[] = [];
  for (const p of parts) for (const q of p.split(/(?<=[.!?])\s+(?=[A-Z"(])/)) { s = q.trim().replace(/,$/, '').trim(); if (s.length >= 2) out.push(s); }
  return out;
}

/** The register row's line: the first line naming the catalogue ID in its document or, for an ID the catalogue repeats, the line the row records. */
const ROW_LINE: Record<string, number> = { 'taxpayer.registration.further_information@P2': 2714 };
const catalogueIdOf = (id: string) => id.split('@')[0]!;
function rowLine(id: string): number {
  if (ROW_LINE[id]) return ROW_LINE[id]!;
  const cid = catalogueIdOf(id);
  return DOC[sourceOf(id)].findIndex(l => l.startsWith(`${cid}\t`) || l.startsWith(`- ${cid} — `)) + 1;
}

function linesFor(id: string): [Src, number][] {
  const sets = batchOf(id) === 3
    ? [COMMON, TAX, ...(TAX_FAMILY[id] ?? []), TAX_OFFICER.includes(id) ? { B: [3205] } : {}, TAX_INTERNAL.includes(id) ? { B: [2710] } : {}, { B: [rowLine(id)] }]
    : [COMMON, COMMON_HEALTH, id.startsWith('HLT-FAC') ? FAMILY.FAC : id.startsWith('HLT-LIC') ? FAMILY.LIC : id.startsWith('HLT-MED') ? FAMILY.MED : FAMILY.PH, EXTRA[id] ?? {}, { A: [rowLine(id)] }];
  const out: [Src, number][] = [];
  for (const set of sets) for (const [k, ns] of Object.entries(set)) for (const n of ns ?? []) if (!out.some(([a, b]) => a === k && b === n)) out.push([k as Src, n]);
  return out;
}

const flat = (fs: ContractField[]): ContractField[] => fs.flatMap(f => [f, ...(f.items ? flat(f.items as ContractField[]) : [])]);
const PROCEDURES = [...HEALTH_PROCEDURES, ...PROFESSION_PROCEDURES, ...TAX_PROCEDURES];
const SERVICES = serviceDirectory().map(s => s.id);
const applicantKeys = (f: CatalogueLibraryForm) => f.fields.filter(x => (x.audience ?? 'applicant') === 'applicant').map(x => x.key);
/** No patient, clinical, treatment, diagnosis or individual health field: by key and by label. */
const CLINICAL = /patient|clinical|clinician|diagnos|prescri|dispens|treatment|medication|symptom|medical record|health condition|care plan/i;

describe('catalogue contracts, batches 1 (health regulation), 2 (medicines and medical devices regulation) and 3 (taxpayer registration and account)', () => {
  it('holds exactly the 25 + 21 + 29 approved forms, one contract each, matched to the catalogue row it names', () => {
    expect(IDS_1.length).toBe(25);
    expect(IDS_2.length).toBe(21);
    expect(IDS_3.length).toBe(29);
    expect(CATALOGUE_CONTRACTS.map(f => f.specId).sort()).toEqual([...IDS].sort());
    const files = readdirSync(join(process.cwd(), 'src/lib/forms/library/catalogue-contracts')).filter(f => f.endsWith('.json'));
    expect(files.sort()).toEqual(IDS.map(i => `${i}.json`).sort());
    for (const f of CATALOGUE_CONTRACTS) {
      expect(f.catalogue.source).toBe(SRC[sourceOf(f.specId)]);
      expect(f.catalogue.id).toBe(catalogueIdOf(f.specId));
      expect(f.catalogue.line, f.specId).toBe(rowLine(f.specId));
      const row = DOC[sourceOf(f.specId)][f.catalogue.line - 1]!;
      expect(row.startsWith(`${f.catalogue.id}\t`) || row.startsWith(`- ${f.catalogue.id} — `), f.specId).toBe(true);
      expect(f.batch).toBe(batchOf(f.specId));
      expect(f.catalogue.batch).toBe(f.batch);
    }
    expect([...COMMON_ITEMS.applies_to].sort()).toEqual([...IDS].sort());
  });

  it('carries no status anywhere: the register status is derived, never written', () => {
    for (const c of [...BATCH_1, ...BATCH_2, ...BATCH_3]) {
      expect('status' in c, c.form_id).toBe(false);
      expect(JSON.stringify(c)).not.toMatch(/"(status|state|approved|approved_by|production)"\s*:/);
    }
    for (const f of CATALOGUE_CONTRACTS) expect(f.form.status).toBeUndefined();
  });

  for (const id of IDS) {
    describe(id, () => {
      const f = CATALOGUE_CONTRACTS.find(x => x.specId === id)!;
      const keys = flat(f.fields).map(x => x.key);
      const top = f.fields.map(x => x.key);

      it('answers every piece of its catalogue text: quoted verbatim, met by the contract or a named deviation', () => {
        const missing: string[] = [];
        for (const [src, n] of linesFor(id)) {
          const line = DOC[src][n - 1]!;
          const items = f.items.filter(i => i.source === SRC[src] && i.line === n);
          for (const p of pieces(line)) if (!items.some(i => i.quotes.some(q => q.includes(p)))) missing.push(`${src}${n}: ${p.slice(0, 80)}`);
          for (const i of items) for (const q of i.quotes) expect(line, `${src}${n}`).toContain(q);
        }
        expect(missing).toEqual([]);
        const procs = f.procedure ? [f.procedure.key, ...(f.procedure.also ?? [])].map(k => PROCEDURES.find(p => p.key === k)!) : [];
        for (const i of f.items) {
          const m = i.met_by;
          const where = `${i.source.split('/').pop()} ${i.line}`;
          expect(Object.keys(m).length, where).toBeGreaterThan(0);
          for (const k of m.fields ?? []) expect(top, `${where}: field ${k}`).toContain(k);
          if (m.deviation) expect(f.deviations.map(d => d.id), `${where}: deviation`).toContain(m.deviation);
          if (m.platform) expect(existsSync(join(ROOT, m.platform.file)), `${where}: ${m.platform.file}`).toBe(true);
          if (m.country_decision) expect((f.form.countryDecisions ?? []).some(c => c.includes(m.country_decision!)), `${where}: ${m.country_decision}`).toBe(true);
          if (m.procedure) expect(procs.some(p => p.actions.some(a => a.key === m.procedure)), `${where}: step ${m.procedure}`).toBe(true);
          if (m.exchange) expect(SERVICES, `${where}: ${m.exchange}`).toContain(m.exchange);
          if (m.policy) expect(f.form.policies?.[m.policy], `${where}: ${m.policy}`).toBeDefined();
        }
        // Every deviation names the binding rule that requires it.
        for (const d of f.deviations) expect(d.rule.length, d.id).toBeGreaterThan(10);
      });

      it('types and classes every field, with registered rules only, and fits the contract', () => {
        const classes = DATA_CLASSES.map(c => c.key) as string[];
        const docClasses = f.documents.map(d => d.class);
        for (const x of flat(f.fields)) {
          expect(FIELD_TYPES as string[], x.key).toContain(x.type);
          expect(classes, x.key).toContain(x.personalDataClass);
          for (const r of x.rules ?? []) if (r.rule === 'registered') expect(isRegisteredRule(r.name), `${x.key} ${r.name}`).toBe(true);
        }
        for (const x of f.fields) expect(fieldProblem(x, top, docClasses), x.key).toBeNull();
        expect(formProblem(f.form, f.fields, f.documents, 'restricted')).toBeNull();
        expect(f.notes.filter(n => n.kind === 'problem' || n.kind === 'not-expressed')).toEqual([]);
        expect(new Set(top).size).toBe(top.length);
      });

      it('stays inside the approved scope: no patient, clinical or individual health field', () => {
        expect(formScope(f.key, f.form, f.fields).status).toBe('allowed');
        for (const x of flat(f.fields)) {
          expect(x.key, x.key).not.toMatch(CLINICAL);
          expect(x.label, x.key).not.toMatch(CLINICAL);
        }
        // A free-text field that may describe a concern about care is restricted.
        for (const x of f.fields) if (x.type === 'longtext' && /concern|complaint|grounds|allegation|matters|description/.test(x.key)) expect(x.personalDataClass, x.key).toBe('restricted');
      });

      it('sets nothing a law decides: fees from an approved rule, day counts, periods and thresholds named and unset', () => {
        for (const v of f.nationValues) {
          expect(Object.keys(v).sort(), v.key).toEqual(['decision', 'key', 'kind', 'source']);
          if (v.source === 'rule') expect(ruleInForce(v.key), v.key).toBeUndefined();
        }
        // Money is only ever calculated by an approved rule; nobody types a fee.
        for (const x of flat(f.fields).filter(y => y.type === 'money')) {
          expect(x.audience, x.key).toBe('system');
          expect((x.rules ?? []).some(r => r.rule === 'registered' && r.name === 'derived_from_approved_rule'), x.key).toBe(true);
        }
        if (flat(f.fields).some(y => y.type === 'money')) expect(f.nationValues.some(v => v.kind === 'fee'), 'a fee is named as the nation\'s').toBe(true);
        // No number in the contract outside a validation rule's own bounds and the contract's bookkeeping.
        const c = f.json as unknown as Record<string, unknown>;
        const numbers: string[] = [];
        const walk = (v: unknown, at: string) => {
          // Allowed: a validation rule's own bounds (a length, a whole number from 0, coordinates), a field group's version, and the contract's versions, catalogue line and batch.
          if (typeof v === 'number') { if (!/\.validation\.\d+\.params\b|^fields\.\d+\.version$|^form_version$|^procedure_package_version$|^catalogue\.(part|line|batch)$/.test(at)) numbers.push(`${at}=${v}`); return; }
          if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${at}.${i}`));
          else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) if (!(at === 'library' && k === 'catalogue_items')) walk(x, at ? `${at}.${k}` : k);
        };
        walk(c, '');
        expect(numbers).toEqual([]);
        // The linked procedures ship their day counts unset.
        for (const k of f.procedure ? [f.procedure.key, ...(f.procedure.also ?? [])] : []) {
          const p = PROCEDURES.find(x => x.key === k)!;
          for (const d of p.deadlines) expect(d.days, `${k} ${d.key}`).toBeUndefined();
          expect(p.appeal?.days, `${k} appeal`).toBeUndefined();
        }
        // Rules the nation must configure are binding: recorded as not performed until then, and a publication blocker.
        for (const x of flat(f.fields)) for (const r of x.rules ?? []) if (r.rule === 'registered' && /_from_rule$|_from_policy$|_from_programme$|^configured_profile$/.test(r.name)) expect(RULE_REGISTRY[r.name]!.scope, r.name).toBe('binding');
      });

      it('renders the same questions in all three channels', () => {
        const view = formView({ ...f, version: 1, state: 'draft', library: true });
        const want = applicantKeys(f);
        expect(want.length).toBeGreaterThan(0);
        const selfService = pagesOf(view.fields.filter(x => (x.audience ?? 'applicant') === 'applicant')).flatMap(p => p.fields.map(x => x.key));
        expect([...selfService].sort()).toEqual([...want].sort());
        const assisted = renderToStaticMarkup(React.createElement(FormRenderer, { view, channel: 'assisted', preview: true }));
        const paper = renderToStaticMarkup(React.createElement(FormRenderer, { view, channel: 'paper', preview: true }));
        const printed = renderToStaticMarkup(React.createElement(PrintForm, { view }));
        for (const k of want) {
          const x = view.fields.find(y => y.key === k)!;
          expect(printed, `print ${k}`).toContain(`id="field-${k}"`);
          if (!x.showWhen) {
            expect(assisted, `assisted ${k}`).toContain(`field-${k}`);
            expect(paper, `paper ${k}`).toContain(`field-${k}`);
            continue;
          }
          // A conditional question is asked once its condition holds, in every channel.
          const other = view.fields.find(y => y.key === x.showWhen!.field)!;
          const eq = x.showWhen.equals!;
          const v = other.type === 'boolean' ? eq === 'true' : other.multiple ? [eq] : eq;
          for (const channel of ['assisted', 'paper'] as const) {
            const html = renderToStaticMarkup(React.createElement(FormRenderer, { view, channel, preview: true, initial: { [other.key]: v } }));
            expect(html, `${channel} ${k} when ${other.key} is ${eq}`).toContain(`field-${k}`);
          }
        }
        // Officials' and the platform's own fields are never asked of whoever completes the form, in any channel.
        for (const x of f.fields.filter(y => y.audience === 'officer' || y.audience === 'system')) {
          expect(printed, x.key).not.toContain(`id="field-${x.key}"`);
          expect(assisted, x.key).not.toContain(`id="field-${x.key}"`);
        }
      });

      it('reads as a contract draft in the publication gates, never approved', () => {
        const lib = findLibraryForm(f.specId)!;
        expect(lib.def.key).toBe(f.key);
        const pub = libraryPublication(f, lib.waitsFor);
        expect(['contract_draft', 'blocked']).toContain(pub.status);
        expect(pub.status).toBe('contract_draft');
        expect(pub.human.filter(g => g.applies && g.passed)).toEqual([]);
        expect(pub.automatic.find(g => g.id === 'schema')!.passed).toBe(false);
        expect(pub.blockers.length).toBeGreaterThan(0);
      });

      it('belongs to its reference procedure where one exists, else names the stage it waits for', () => {
        if (f.procedure) {
          const p = PROCEDURES.find(x => x.key === f.procedure!.key);
          expect(p, f.procedure.key).toBeDefined();
          expect(p!.stages.map(s => s.key)).toContain(f.procedure.stage);
          if (f.procedure.action) expect(p!.actions.map(a => a.key)).toContain(f.procedure.action);
          if (f.procedure.document) expect(p!.documents.map(d => d.class)).toContain(f.procedure.document);
          for (const k of f.procedure.also ?? []) expect(PROCEDURES.some(x => x.key === k), k).toBe(true);
          expect(p!.owner).toBe(f.owner);
          expect(f.json.procedure_package_id).toBe(f.procedure.key);
        } else {
          expect(f.awaits ?? '', 'the stage it is intended for').toMatch(/not built|no case is opened/);
          if (f.exchange) expect(SERVICES).toContain(f.exchange);
        }
        // Authority from the deployment profile, never a ministry by name.
        expect(batchOf(id) === 3 ? ['tax'] : ['healthRegulation', 'professionalRegulation']).toContain(f.owner);
        expect(JSON.stringify(f.json)).not.toMatch(/Ministry of/);
      });
    });
  }

  it('keeps a complainant\'s identity and the complaint restricted, and conduct records to the regulator', () => {
    for (const id of ['HLT-FAC-009', 'HLT-LIC-008']) {
      const f = CATALOGUE_CONTRACTS.find(x => x.specId === id)!;
      const person = f.fields.filter(x => /^(raised_by|complainant)\./.test(x.key));
      expect(person.length).toBeGreaterThanOrEqual(4);
      for (const x of person) expect(x.personalDataClass, x.key).toBe('restricted');
      for (const x of f.fields.filter(y => /^(concern|complaint)\.(description|category|when|risk_now|evidence)$/.test(y.key))) expect(x.personalDataClass, x.key).toBe('restricted');
    }
    for (const id of ['HLT-LIC-009', 'HLT-LIC-010', 'HLT-LIC-011', 'HLT-LIC-012', 'HLT-FAC-008']) {
      const f = CATALOGUE_CONTRACTS.find(x => x.specId === id)!;
      for (const x of f.fields.filter(y => ['longtext', 'group', 'document'].includes(y.type))) expect(x.personalDataClass, `${id} ${x.key}`).toBe('restricted');
    }
    // The public register shows only what the profession's disclosure profile allows: a person reference is never public.
    const reg = CATALOGUE_CONTRACTS.find(x => x.specId === 'HLT-LIC-001')!;
    expect(reg.fields.find(x => x.key === 'applicant.person')!.personalDataClass).toBe('personal');
    expect(reg.fields.find(x => x.key === 'registration.matters_details')!.personalDataClass).toBe('restricted');
  });

  it('keeps the public-health return to counts: no person, by area and period, small cells protected by the nation\'s threshold', () => {
    const f = CATALOGUE_CONTRACTS.find(x => x.specId === 'HLT-PH-015')!;
    const counts = f.fields.find(x => x.key === 'return.counts')!;
    expect(counts.type).toBe('group');
    expect(counts.items!.map(i => i.key)).toEqual(['indicator', 'breakdown', 'count', 'status']);
    expect(flat(f.fields).filter(x => ['party', 'person', 'contact'].includes(x.type)).map(x => x.key)).toEqual([]);
    expect(f.fields.find(x => x.key === 'return.area')!.valuesSourceId).toBe('civicos.nation.regions');
    expect(f.fields.find(x => x.key === 'return.period')!.type).toBe('dateRange');
    expect((f.fields.find(x => x.key === 'return.suppression')!.rules ?? []).some(r => r.rule === 'registered' && r.name === 'small_cell_suppression_from_policy')).toBe(true);
    expect(f.nationValues.find(v => v.kind === 'threshold')).toMatchObject({ source: 'setting' });
  });

  // ── Batch 2: medicines and medical devices regulation ──
  const med = (id: string) => CATALOGUE_CONTRACTS.find(x => x.specId === id)!;
  const words = (k: string) => k.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase().split(/[^a-z0-9]+/);

  it('writes no contract for the excluded forms, and keeps the two HLT-MED-004s apart', () => {
    for (const id of ['HLT-MED-016', 'HLT-MED-021', 'HLT-MED-022']) {
      expect(CATALOGUE_CONTRACTS.find(x => x.specId === id), id).toBeUndefined();
      expect(scopeOf([id], []).status, id).toBe('excluded');
    }
    // The supplement's Stage B HLT-MED-004 (a dispensing record) stays excluded by its bare ID; the field series' HLT-MED-004 is read against Part 6.
    expect(scopeOf(['HLT-MED-004'], []).status).toBe('excluded');
    const f = med('HLT-MED-004');
    expect(f.form.catalogueSource).toBe(SRC.A);
    expect(formScope(f.key, f.form, f.fields).status).toBe('allowed');
    expect(f.deviations.map(d => d.id)).toContain('stage-b-id');
    // A form that names the supplement as its source is excluded under that ID.
    expect(formScope(f.key, { ...f.form, catalogueSource: SRC.C }, f.fields).status).toBe('excluded');
  });

  it('keeps the safety and incident reports to the product: no person reported on, no structured clinical field, the concern restricted with a hint', () => {
    for (const id of ['HLT-MED-015', 'HLT-MED-020']) {
      const f = med(id);
      expect(formScope(f.key, f.form, f.fields).status, id).toBe('allowed');
      // The only person is the reporter (optional, restricted): no party or person question, no field about anyone else.
      expect(flat(f.fields).filter(x => ['party', 'person'].includes(x.type)).map(x => x.key), id).toEqual([]);
      for (const x of flat(f.fields)) {
        expect(words(x.key).filter(w => ['reaction', 'outcome', 'harm', 'injury', 'death', 'age', 'sex', 'gender', 'birth', 'weight', 'dose', 'hospital', 'condition', 'history'].includes(w)), `${id} ${x.key}`).toEqual([]);
        if (/^reporter\.(name|contact|anonymous)$/.test(x.key)) expect(x.personalDataClass, x.key).toBe('restricted');
      }
      const text = f.fields.find(x => x.key === (id === 'HLT-MED-015' ? 'report.concern' : 'incident.description'))!;
      expect(text.type).toBe('longtext');
      expect(text.personalDataClass).toBe('restricted');
      expect(text.hint).toMatch(/Do not give anyone's name, identity or medical details/);
      expect(f.fields.find(x => /\.(category)$/.test(x.key))!.personalDataClass).toBe('restricted');
      const dev = f.deviations.find(d => d.id === 'product-level-only')!;
      expect(dev.rule).toMatch(/no patient or clinical field anywhere/);
      expect(dev.rule).toMatch(/HLT-MED-016/);
      expect(f.deviations.map(d => d.id)).toContain('no-ai-finding');
    }
  });

  it('authorises controlled medicines for an organisation, a product and a quantity, never a named patient', () => {
    const f = med('HLT-MED-014');
    expect(f.fields.find(x => x.key === 'controlled.organisation')!.type).toBe('registryReference');
    const lines = f.fields.find(x => x.key === 'controlled.lines')!;
    expect(lines.items!.map(i => i.key)).toEqual(['product', 'substance', 'strengthForm', 'quantity']);
    expect((lines.rules ?? []).some(r => r.rule === 'registered' && r.name === 'controlled_quantity_limit_from_rule')).toBe(true);
    // No person is named but whoever acts for the organisation (core.representation).
    expect(flat(f.fields).filter(x => ['party', 'person'].includes(x.type)).map(x => x.key)).toEqual(['representation.actor']);
    // The one person reference is the responsible professional, on the professional register.
    expect(flat(f.fields).filter(x => x.personalDataClass === 'personal' && !x.group).map(x => [x.key, x.register])).toEqual([['controlled.responsible_professional', 'professional']]);
    expect(f.deviations.map(d => d.id)).toContain('no-named-person');
    expect(f.nationValues.find(v => v.kind === 'threshold')).toMatchObject({ key: 'medicines.controlled.quantity-limits', source: 'setting' });
  });

  it('ships no classification, power or period: each list the law decides is the nation\'s, named, with its standard', () => {
    // Lists that are a classification or a power never ship values; each such field names the decision (and, for a classification, the standard).
    const NATION_LISTS = ['medicines.country.application_kinds', 'medicines.country.product_categories', 'medicines.country.dosage_forms', 'medicines.country.routes', 'medicines.country.atc_codes',
      'medicines.country.supply_categories', 'medicines.country.dossier_formats', 'medicines.country.authorisation_outcomes', 'medicines.country.public_product_fields', 'medicines.country.variation_categories',
      'medicines.country.enforcement_measures', 'medicines.country.good_practice_standards', 'medicines.country.deficiency_grades', 'medicines.country.entry_points', 'medicines.country.controlled_schedules',
      'medicines.country.recall_classes', 'medicines.country.device_risk_classes', 'medicines.country.device_nomenclature', 'medicines.country.review_routes'];
    const STANDARDS: Record<string, RegExp> = {
      'medicines.country.dosage_forms': /EDQM Standard Terms/, 'medicines.country.routes': /EDQM Standard Terms/, 'medicines.country.atc_codes': /WHO ATC/,
      'medicines.country.device_risk_classes': /IMDRF/, 'medicines.country.device_nomenclature': /GMDN/, 'medicines.country.good_practice_standards': /WHO|PIC\/S/,
      'medicines.country.controlled_schedules': /Single Convention/, 'medicines.country.dossier_formats': /Common Technical Document/,
    };
    const seen = new Set<string>();
    for (const id of IDS_2) {
      const f = med(id);
      for (const name of NATION_LISTS) expect(f.form.lists?.[name], `${id} ships ${name}`).toBeUndefined();
      for (const x of flat(f.fields)) {
        if (!x.valuesSourceId || !NATION_LISTS.includes(x.valuesSourceId)) continue;
        seen.add(x.valuesSourceId);
        expect(x.countryDecision ?? '', `${id} ${x.key}`).toMatch(/none ship|CFG-|law/i);
        if (STANDARDS[x.valuesSourceId]) expect(x.countryDecision ?? '', `${id} ${x.key}`).toMatch(STANDARDS[x.valuesSourceId]!);
        if ((x.rules ?? []).some(r => r.rule === 'registered' && r.name === 'classification_value_from_configured_standard')) expect(x.countryDecision ?? '', x.key).toMatch(/Expected source:/);
      }
      // Fees, periods, timelines and deadlines are named as the nation's and none is set.
      for (const v of f.nationValues) expect(['fee', 'days', 'period', 'threshold'], `${id} ${v.key}`).toContain(v.kind);
    }
    expect([...seen].sort()).toEqual([...NATION_LISTS].sort());
    // The recall class is set by the regulator from the nation's classes; the recall's deadlines are a binding rule.
    const recall = med('HLT-MED-017');
    expect(recall.fields.find(x => x.key === 'recall.class_set')!.audience).toBe('officer');
    expect(recall.fields.find(x => x.key === 'recall.deadlines')!.rules!.some(r => r.rule === 'registered' && r.name === 'recall_timeline_from_rule')).toBe(true);
    expect(med('HLT-MED-006').fields.find(x => x.key === 'decision.expiry')!.rules!.some(r => r.rule === 'registered' && r.name === 'authorisation_validity_from_rule')).toBe(true);
  });

  it('takes authority from the deployment profile: the health regulator slot stands for the medicines regulator until one exists', () => {
    expect(AUTHORITIES.some(a => /medicine/i.test(`${a.key} ${a.label}`))).toBe(false);
    for (const id of IDS_2) {
      const f = med(id);
      expect(f.owner, id).toBe('healthRegulation');
      expect(f.authorityNote ?? '', id).toMatch(/no medicines-regulator slot/);
      expect(f.deviations.map(d => d.id), id).toContain('medicines-authority-slot');
      expect(f.procedure, id).toBeNull();
    }
  });

  it('keeps dossier content with the regulator and the public product check to what may be published', () => {
    for (const [id, key] of [['HLT-MED-001', 'application.dossier'], ['HLT-MED-002', 'dossier.files'], ['HLT-MED-002', 'dossier.parts'], ['HLT-MED-001', 'product.composition'], ['HLT-MED-003', 'assessment.findings'], ['HLT-MED-010', 'site.master_file'], ['HLT-MED-019', 'device.technical_documentation']] as const) {
      expect(med(id).fields.find(x => x.key === key)!.personalDataClass, `${id} ${key}`).toBe('restricted');
    }
    // Only names are public in the applications; everything else is published only as the product's public information classification allows.
    for (const id of ['HLT-MED-001', 'HLT-MED-019']) expect(flat(med(id).fields).filter(x => x.personalDataClass === 'public').map(x => x.key), id).toEqual([id === 'HLT-MED-001' ? 'product.name' : 'device.name']);
    const check = med('HLT-MED-024');
    for (const x of flat(check.fields)) expect(['public', 'administrative'], x.key).toContain(x.personalDataClass);
    expect(check.fields.find(x => x.key === 'check.answer')!).toMatchObject({ personalDataClass: 'public', audience: 'officer' });
    expect(check.form.policies?.['answer.public_fields']).toMatch(/public information classification/);
    expect(med('HLT-MED-006').fields.find(x => x.key === 'decision.public_disclosure')!.valuesSourceId).toBe('medicines.country.public_product_fields');
  });

  // ── Batch 3: taxpayer registration and account ──
  const tax = (id: string) => CATALOGUE_CONTRACTS.find(x => x.specId === id)!;
  const REG3 = ['individual', 'public_entity', 'nonresident', 'branch'].map(x => `taxpayer.registration.${x}`);
  const ownFields = (f: CatalogueLibraryForm) => flat(f.fields).filter(x => !x.group);

  it('keeps the two taxpayer.registration.further_information rows apart: two contracts, two lines, two form IDs', () => {
    const a = tax('taxpayer.registration.further_information'), b = tax('taxpayer.registration.further_information@P2');
    expect(a.catalogue.id).toBe(b.catalogue.id);
    expect([a.catalogue.line, b.catalogue.line]).toEqual([2543, 2714]);
    expect(a.key).not.toBe(b.key);
    expect(findLibraryForm('taxpayer.registration.further_information@P2')!.def.key).toBe(b.key);
    for (const f of [a, b]) expect(f.deviations.map(d => d.id)).toContain('two-rows');
    // The service-table request is what the applicant receives; the internal one records why and links the request it issued.
    expect(a.fields.map(x => x.key)).toEqual(expect.arrayContaining(['request.respond_by', 'request.law', 'request.clock_stops']));
    expect(b.fields.map(x => x.key)).toEqual(expect.arrayContaining(['request.basis', 'request.missing_items', 'request.notice_ref']));
    expect(b.fields.find(x => x.key === 'request.items')!.items!.map(i => i.key)).toEqual(['itemRef', 'reason', 'responseDueRuleRef']);
  });

  it('holds every taxpayer field under tax secrecy: restricted, confidentiality tax, read only under canReadTax()', () => {
    for (const id of IDS_3) {
      const f = tax(id);
      for (const x of ownFields(f)) {
        expect(x.personalDataClass, `${id} ${x.key}`).toBe('restricted');
        expect(x.confidentiality, `${id} ${x.key}`).toBe('tax');
      }
      // Only the declaration and the fee are field groups: they record the act of declaring and the fee, never taxpayer data.
      expect([...new Set(flat(f.fields).filter(x => x.group).map(x => x.group!.id))].every(g => ['core.declaration_signature', 'core.payment'].includes(g)), id).toBe(true);
      expect(f.form.policies?.['access.read_rule'], id).toMatch(/canReadTax\(\)/);
      expect(f.form.policies?.['access.others'], id).toMatch(/taxpayer\.status/);
      expect(f.deviations.map(d => d.id), id).toEqual(expect.arrayContaining(['tax-secrecy-class', 'no-tax-values']));
    }
    // Never weaker than the specification's taxpayer registration form.
    const strictest = Math.max(...SPEC_TAXPAYER.fields.map(x => CLASS_RANK[SPEC_CLASSES[x.personal_data_class]!.cls]));
    expect(CLASS_RANK.restricted).toBeGreaterThanOrEqual(strictest);
  });

  it('types in no rate, threshold, trigger, deadline or fee: each is a binding rule and a named nation value; tax lists ship empty with their standard', () => {
    const NATION_LISTS: Record<string, RegExp | null> = {
      'tax.country.approved_taxpayer_types': null, 'tax.country.approved.tax_obligations': /IMF GFSM 2014/, 'tax.country.approved.business_activity_codes': /ISIC/,
      'tax.country.approved.establishment_kinds': /OECD or UN Model Tax Convention/, 'tax.country.approved.public_entity_registration_bases': null,
      'tax.country.approved.nonresident_registration_bases': null, 'tax.country.approved.cancellation_grounds': null, 'tax.country.approved.suspension_grounds': null,
      'tax.country.tax_offices': null, 'tax.country.approved.dispute_remedies': null, 'tax.country.approved.dispute_routes': null, 'tax.country.specialist_units': null,
      'tax.country.approved.lookup_purposes': null, 'tax.registration.required_items': null,
    };
    const seen = new Set<string>();
    for (const id of IDS_3) {
      const f = tax(id);
      for (const name of Object.keys(NATION_LISTS)) expect(f.form.lists?.[name], `${id} ships ${name}`).toBeUndefined();
      for (const x of flat(f.fields)) {
        if (!x.valuesSourceId || !(x.valuesSourceId in NATION_LISTS)) continue;
        seen.add(x.valuesSourceId);
        expect(x.countryDecision ?? '', `${id} ${x.key}`).toMatch(/country\.tax\.|none ship/);
        const std = NATION_LISTS[x.valuesSourceId];
        if (std) expect(x.countryDecision ?? '', `${id} ${x.key}`).toMatch(std);
      }
      for (const v of f.nationValues) {
        expect(['fee', 'days', 'period', 'threshold'], `${id} ${v.key}`).toContain(v.kind);
        expect(v.key, id).toMatch(/^tax\./);
      }
      // A requested obligation is checked against the nation's threshold and trigger rule, unset.
      for (const k of ['taxpayer.obligations_requested', 'obligation.requested']) {
        const x = f.fields.find(y => y.key === k);
        if (x) expect((x.rules ?? []).some(r => r.rule === 'registered' && r.name === 'registration_obligation_from_rule'), `${id} ${k}`).toBe(true);
      }
      if (f.fields.some(x => x.key === 'taxpayer.obligations_requested' || x.key === 'obligation.requested')) expect(f.nationValues.some(v => v.key === 'tax.registration.threshold' && v.source === 'rule'), id).toBe(true);
    }
    expect([...seen].sort()).toEqual(Object.keys(NATION_LISTS).sort());
    // Fees only through core.payment, for certificates.
    for (const id of IDS_3) expect(flat(tax(id).fields).filter(x => x.type === 'money').map(x => x.key), id).toEqual(['taxpayer.certificate.request', 'taxpayer.registration.duplicate'].includes(id) ? ['payment.calculated_amount'] : []);
    // Dispute periods are counted by the approved rule from the event date, never a number of days.
    for (const id of ['taxpayer.registration.objection', 'taxpayer.registration.appeal', 'taxpayer.registration.appeal_assessment']) {
      const f = tax(id);
      expect(flat(f.fields).some(x => (x.rules ?? []).some(r => r.rule === 'registered' && r.name === 'dispute_period_from_rule')), id).toBe(true);
      expect(f.nationValues.some(v => /^tax\.disputes\./.test(v.key) && v.source === 'rule'), id).toBe(true);
    }
  });

  it('identifies taxpayers only through the registers: an organisation, an institution or a person, and the TIN only from the tax register', () => {
    const reg = (id: string, key: string) => tax(id).fields.find(x => x.key === key)!;
    expect(reg('taxpayer.registration.branch', 'taxpayer.organisation')).toMatchObject({ type: 'registryReference', register: 'organisation' });
    expect(reg('taxpayer.registration.nonresident', 'taxpayer.organisation')).toMatchObject({ type: 'registryReference', register: 'organisation' });
    expect(reg('taxpayer.registration.public_entity', 'taxpayer.public_entity')).toMatchObject({ type: 'registryReference', register: 'institution' });
    expect(reg('taxpayer.registration.individual', 'taxpayer.person')).toMatchObject({ type: 'registryReference', register: 'person' });
    // The applicant is never asked to type a taxpayer identification number: the register gives it when the registration is decided.
    for (const id of [...REG3, 'taxpayer.registration.decision']) {
      const t = flat(tax(id).fields).find(x => /\.tin$/.test(x.key))!;
      expect(t.audience, id).toBe('officer');
      expect(tax(id).deviations.map(d => d.id), id).toContain('tin-assigned');
    }
    // Later forms point to the taxpayer's account in the tax register.
    for (const id of IDS_3) for (const x of tax(id).fields.filter(y => y.key.endsWith('.taxpayer'))) expect(x, `${id} ${x.key}`).toMatchObject({ type: 'registryReference', register: 'taxpayer' });
    // No organisation or person is entered as a second identity: names come from the register, except a person or non-resident's legal name.
    for (const id of IDS_3) expect(flat(tax(id).fields).filter(x => x.type === 'party').map(x => x.key).every(k => /representative|responsible_official/.test(k)), id).toBe(true);
  });

  it('stays consistent with the catalogue\'s business registration contract and the specification\'s form', () => {
    const business = CANONICAL_LIBRARY.find(x => x.specId === 'taxpayer.registration.business')!;
    for (const id of REG3) {
      const f = tax(id);
      const keys = flat(f.fields).map(x => x.key);
      const notAsked = (f.deviations.find(d => d.id === 'business-fields')?.field ?? '').split(', ').filter(Boolean);
      for (const b of business.fields) {
        if (b.key === 'taxpayer.declaration') { expect(keys, id).toContain('declaration.confirmed'); continue; }
        expect(keys.includes(b.key) || notAsked.includes(b.key), `${id}: ${b.key}`).toBe(true);
        const mine = f.fields.find(x => x.key === b.key);
        if (mine && b.valuesSourceId && b.type === mine.type) expect(mine.valuesSourceId, `${id}: ${b.key}`).toBe(b.valuesSourceId);
      }
      for (const k of notAsked) expect(keys, `${id}: ${k} is said not to be asked`).not.toContain(k);
      // Every field of the specification's form is mapped to a field here, or said not to be asked.
      const map = f.deviations.find(d => d.id === 'spec-form')!.what;
      for (const s of SPEC_TAXPAYER.fields) expect(map, `${id}: ${s.id}`).toContain(s.id);
      for (const [, to] of map.matchAll(/→ ([a-z_]+(?:\.[a-z_]+)*)/g)) expect(keys, `${id}: → ${to}`).toContain(to!);
    }
  });

  it('links each form to the reference tax procedure where it exists, else names the stage it waits for', () => {
    const linked: Record<string, [string, string, string?]> = {
      'taxpayer.registration.individual': ['tax.registration', 'submitted'], 'taxpayer.registration.public_entity': ['tax.registration', 'submitted'],
      'taxpayer.registration.nonresident': ['tax.registration', 'submitted'], 'taxpayer.registration.branch': ['tax.registration', 'submitted'],
      'taxpayer.registration.inspection': ['tax.registration', 'verification', 'verify'], 'taxpayer.registration.inspection_checklist': ['tax.registration', 'verification', 'verify'],
      'taxpayer.registration.verification_record': ['tax.registration', 'verification', 'verify'], 'taxpayer.registration.assessment': ['tax.registration', 'verification', 'propose'],
      'taxpayer.registration.decision': ['tax.registration', 'pending-approval', 'register'], 'taxpayer.registration.decision_record': ['tax.registration', 'pending-approval', 'register'],
    };
    for (const id of IDS_3) {
      const f = tax(id);
      if (linked[id]) {
        const [key, stage, action] = linked[id]!;
        expect(f.procedure, id).toMatchObject({ key, stage, ...(action ? { action } : {}) });
      } else {
        expect(f.procedure, id).toBeNull();
        expect(f.awaits ?? '', id).toMatch(/not built/);
      }
      expect(f.authorityNote ?? '', id).toMatch(/authorityFor\('tax'\)/);
    }
    // No procedure was invented: the tax procedures are the three references.
    expect(TAX_PROCEDURES.map(p => p.key)).toEqual(['tax.registration', 'tax.return', 'tax.objection']);
    expect(AUTHORITIES.some(a => a.key === 'tax')).toBe(true);
  });

  it('keeps certificates and statements to what the register and the exchange answer', () => {
    for (const id of ['taxpayer.certificate.request', 'taxpayer.registration.duplicate']) {
      const f = tax(id);
      expect(f.exchange, id).toBe('taxpayer.status');
      expect(f.form.policies?.['certificate.content'], id).toMatch(/Only what the taxpayer\.status exchange service returns/);
      expect(f.deviations.map(d => d.id), id).toContain('status-only');
      expect(flat(f.fields).filter(x => !x.group).map(x => x.key).filter(k => /balance|amount|arrears|return|assessment|compliance/.test(k)), id).toEqual([]);
    }
    const st = tax('taxpayer.account.statement');
    expect(st.deviations.map(d => d.id)).toContain('statement-from-ledger');
    expect(flat(st.fields).filter(x => ['money', 'number'].includes(x.type)).map(x => x.key)).toEqual([]);
  });

  it('records an officer\'s findings with reasons, never a score; disputes reviewed by an official not disqualified', () => {
    for (const id of ['taxpayer.registration.inspection', 'taxpayer.registration.inspection_checklist', 'taxpayer.registration.assessment']) {
      const f = tax(id);
      expect(flat(f.fields).map(x => x.key).filter(k => /score|risk|rating|probability/i.test(k)), id).toEqual([]);
      expect(f.deviations.map(d => d.id), id).toContain('no-score');
    }
    for (const id of ['taxpayer.registration.inspection', 'taxpayer.registration.inspection_checklist']) {
      const obs = tax(id).fields.find(x => x.key === 'inspection.observations')!;
      expect(obs).toMatchObject({ type: 'longtext', required: true });
      expect(tax(id).deviations.map(d => d.id), id).toContain('observations-only');
    }
    for (const id of ['taxpayer.registration.objection', 'taxpayer.registration.appeal']) {
      const g = tax(id).fields.find(x => x.key.endsWith('.grounds'))!;
      const len = (g.rules ?? []).find(r => r.rule === 'registered' && r.name === 'length');
      expect(len && 'params' in len ? len.params : undefined, id).toEqual({ min: 20, max: 10000 });
    }
    expect(tax('taxpayer.registration.appeal_assessment').fields.find(x => x.key === 'appeal_assessment.not_disqualified')!.rules!.some(r => r.rule === 'registered' && r.name === 'must_be_true')).toBe(true);
  });
});
