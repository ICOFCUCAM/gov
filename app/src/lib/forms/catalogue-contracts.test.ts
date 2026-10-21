// Conformance of the catalogue contracts CivicOS wrote (batch 1, health
// regulation: HLT-FAC-001 … 010, HLT-LIC-001 … 014, HLT-PH-015) to the
// documents they answer (docs/FORMS_CONFORMANCE.md §8). The test holds its
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
import { CATALOGUE_CONTRACTS, BATCH_1, COMMON_ITEMS, type CatalogueLibraryForm } from './library/catalogue-contracts';
import { DATA_CLASSES, FIELD_TYPES, fieldProblem, formProblem, type ContractField } from './contract';
import { isRegisteredRule, RULE_REGISTRY } from './rules';
import { scopeOf, formIds } from './scope';
import { formView } from './server';
import { libraryPublication } from './publication';
import { findLibraryForm } from './page-data';
import { ruleInForce } from '@/lib/law/rules';
import { HEALTH_PROCEDURES } from '@/lib/health/procedures';
import { PROFESSION_PROCEDURES } from '@/lib/professions/procedures';
import { serviceDirectory } from '@/lib/exchange/services';
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

const IDS = [...range(1, 10).map(n => `HLT-FAC-${String(n).padStart(3, '0')}`), ...range(1, 14).map(n => `HLT-LIC-${String(n).padStart(3, '0')}`), 'HLT-PH-015'];

// ── The catalogue text each form answers (held here, apart from the contracts) ──
// Every form: Part 6's common rules (clinical confidentiality, the access model, the common health schema, validation, configuration and
// acceptance gates), Part 1's universal rules, the three channels and minimisation, and the supplement's conventions and activation gates.
const COMMON: Partial<Record<Src, number[]>> = {
  A: [496, 498, 509, ...range(786, 794), 809, ...range(811, 825), 841, 850, 851, 855, 870, 873, 875, 876, 885, 886, 887],
  B: [...range(1699, 1710), 1756, ...range(1760, 1764), ...range(1769, 1774), ...range(1779, 1784), 1787, 1789, ...range(1792, 1799)],
  C: [...range(144, 156), ...range(2390, 2399)],
};
const FAMILY: Record<'FAC' | 'LIC' | 'PH', Partial<Record<Src, number[]>>> = {
  FAC: { A: [694, 723, 847, 866, 881, 894], D: [1323] },
  LIC: { A: [504, 694, 723, 847, 865, 881, 894], D: [1324, 1805] },
  PH: { A: [502, 601, 626, 633, 634, ...range(642, 647), 805, 807, 849, 859, 880, 892], D: [1328] },
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
};

/** The pieces of a line a contract must quote: table cells, list items and sentences. */
function pieces(line: string): string[] {
  let s = line.trim().replace(/^(- \[ \] |- |\d+\. )/, '');
  const parts = s.startsWith('|') ? s.replace(/^\||\|$/g, '').split('|').map(x => x.trim()) : s.split('\t');
  const out: string[] = [];
  for (const p of parts) for (const q of p.split(/(?<=[.!?])\s+(?=[A-Z"(])/)) { s = q.trim().replace(/,$/, '').trim(); if (s.length >= 2) out.push(s); }
  return out;
}

function linesFor(id: string): [Src, number][] {
  const fam = id.startsWith('HLT-FAC') ? FAMILY.FAC : id.startsWith('HLT-LIC') ? FAMILY.LIC : FAMILY.PH;
  const row = DOC.A.findIndex(l => l.startsWith(`${id}\t`)) + 1;
  const out: [Src, number][] = [];
  for (const set of [COMMON, fam, EXTRA[id] ?? {}, { A: [row] }]) for (const [k, ns] of Object.entries(set)) for (const n of ns ?? []) if (!out.some(([a, b]) => a === k && b === n)) out.push([k as Src, n]);
  return out;
}

const flat = (fs: ContractField[]): ContractField[] => fs.flatMap(f => [f, ...(f.items ? flat(f.items as ContractField[]) : [])]);
const PROCEDURES = [...HEALTH_PROCEDURES, ...PROFESSION_PROCEDURES];
const SERVICES = serviceDirectory().map(s => s.id);
const applicantKeys = (f: CatalogueLibraryForm) => f.fields.filter(x => (x.audience ?? 'applicant') === 'applicant').map(x => x.key);
/** No patient, clinical, treatment, diagnosis or individual health field: by key and by label. */
const CLINICAL = /patient|clinical|clinician|diagnos|prescri|dispens|treatment|medication|symptom|medical record|health condition|care plan/i;

describe('catalogue contracts, batch 1 (health regulation)', () => {
  it('holds exactly the 25 approved forms, one contract each, matched to the catalogue row it names', () => {
    expect(CATALOGUE_CONTRACTS.map(f => f.specId).sort()).toEqual([...IDS].sort());
    const files = readdirSync(join(process.cwd(), 'src/lib/forms/library/catalogue-contracts')).filter(f => f.endsWith('.json'));
    expect(files.sort()).toEqual(IDS.map(i => `${i}.json`).sort());
    for (const f of CATALOGUE_CONTRACTS) {
      expect(f.catalogue.source).toBe(SRC.A);
      expect(DOC.A[f.catalogue.line - 1]!.startsWith(`${f.specId}\t`), f.specId).toBe(true);
      expect(f.batch).toBe(1);
    }
    expect([...COMMON_ITEMS.applies_to].sort()).toEqual([...IDS].sort());
  });

  it('carries no status anywhere: the register status is derived, never written', () => {
    for (const c of BATCH_1) {
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
        expect(scopeOf(formIds(f.key, f.form), f.fields).status).toBe('allowed');
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
          // Allowed: a validation rule's own bounds (a length, a whole number from 0, coordinates), a field group's version, and the contract's versions and catalogue line.
          if (typeof v === 'number') { if (!/\.validation\.\d+\.params\b|^fields\.\d+\.version$|^form_version$|^procedure_package_version$|^catalogue\.(part|line)$/.test(at)) numbers.push(`${at}=${v}`); return; }
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
        expect(['healthRegulation', 'professionalRegulation']).toContain(f.owner);
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
});
