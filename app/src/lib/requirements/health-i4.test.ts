// The Health I4 requirements and dependency register (owner's direction of
// 21 October 2026, docs/forms-catalogue/DIRECTION-2026-10-21-HEALTH-INTEGRATION.md):
// docs/requirements/health-i4.json and its rendering docs/HEALTH_I4_DEPENDENCIES.md
// (app/scripts/requirements/health_i4.py). Every dependency cites rows of the
// requirements register, every I4 row is covered, evidence files exist, and a
// dependency claims "built and proven" only with an existing test file and a
// test of that name. Health is not claimed complete anywhere.
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { CATALOGUE_CONTRACTS } from '@/lib/forms/library/catalogue-contracts';
import { procedureLink } from '@/lib/forms/procedure-link';

const ROOT = join(process.cwd(), '..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');

type Status = 'not built' | 'partial' | 'built and proven';
interface TestRef { file: string; name: string }
interface Dependency {
  id: string; title: string; rows: string[]; exists: { what: string; files: string[] }[]; missing: string[]; owner: string; contracts: string[];
  access: string[]; provenance: string[]; tests: { existing: TestRef[]; planned: string[] }; gate: string; status: Status;
}
interface Register {
  health_complete: boolean; statuses: Status[]; dependencies: Dependency[];
  forms_without_procedure: { identity: string; batch: number; owner: string; stage: string; procedure_required: boolean; answered_by: string | null; link: string }[];
  adoption: { identity: string; procedure: string; stage: string }[];
  acceptance: { id: string; row: string; register_status: string; status: Status; tests: TestRef[] }[];
}
const REG = JSON.parse(read('docs/requirements/health-i4.json')) as Register;
const MD = read('docs/HEALTH_I4_DEPENDENCIES.md');
const ROWS = JSON.parse(read('docs/requirements/requirements.json')) as { id: string; step?: string }[];
const ROW_IDS = new Set(ROWS.map(r => r.id));

/** Why a test reference does not prove anything: its file is missing, or no test of that name is in it. */
function testProblem(t: TestRef): string | null {
  if (!t.file || !existsSync(join(ROOT, t.file))) return `${t.file}: no such test file`;
  const src = readFileSync(join(ROOT, t.file), 'utf8');
  const quoted = [`'${t.name.replace(/'/g, "\\'")}'`, `"${t.name}"`, `\`${t.name}\``];
  return quoted.some(q => src.includes(q)) ? null : `${t.file}: no test named "${t.name}"`;
}
/** Why a dependency's status is not supported: "built and proven" needs at least one existing, named test, and every test it lists as existing must exist. */
function proofProblems(d: Pick<Dependency, 'id' | 'status' | 'tests'>): string[] {
  const out = d.tests.existing.map(testProblem).filter((x): x is string => !!x);
  if (d.status === 'built and proven' && d.tests.existing.length === 0) out.push(`${d.id}: claims built and proven with no test`);
  return out;
}

describe('the Health I4 requirements and dependency register', () => {
  it('lists each dependency with every part the owner asked for, and a status from the three', () => {
    expect(REG.statuses).toEqual(['not built', 'partial', 'built and proven']);
    expect(new Set(REG.dependencies.map(d => d.id)).size).toBe(REG.dependencies.length);
    for (const d of REG.dependencies) {
      expect(REG.statuses, d.id).toContain(d.status);
      for (const k of ['title', 'owner', 'gate'] as const) expect(d[k], `${d.id} ${k}`).toBeTruthy();
      for (const k of ['rows', 'exists', 'access', 'provenance'] as const) expect(d[k].length, `${d.id} ${k}`).toBeGreaterThan(0);
      expect(Array.isArray(d.missing) && Array.isArray(d.contracts) && Array.isArray(d.tests.planned)).toBe(true);
    }
    // The dependencies the owner named.
    const ids = REG.dependencies.map(d => d.id);
    for (const id of ['product-register', 'public-product-view', 'procedure-marketing-authorisation', 'procedure-variation', 'procedure-renewal', 'procedure-suspension-withdrawal',
      'procedure-recall', 'procedure-device-registration', 'register-types', 'exchange-product-status', 'exchange-hx-005', 'health-slots', 'forms-without-procedures',
      'batch-1-adoption', 'facility-register', 'public-health-statistics']) expect(ids, id).toContain(id);
  });

  it('cites only rows of the requirements register, and covers every row of plan step I4', () => {
    for (const d of REG.dependencies) for (const r of d.rows) expect(ROW_IDS.has(r), `${d.id}: ${r}`).toBe(true);
    for (const a of REG.acceptance) expect(ROW_IDS.has(a.row), a.id).toBe(true);
    const cited = new Set(REG.dependencies.flatMap(d => d.rows));
    expect(ROWS.filter(r => r.step === 'I4' && !cited.has(r.id)).map(r => r.id)).toEqual([]);
  });

  it('names evidence files that exist and contracts that are in the library, owned by a slot of the deployment profile', async () => {
    const { isAuthorityKey } = await import('@/lib/nation/deployment');
    const identities = new Set(CATALOGUE_CONTRACTS.map(f => f.identity));
    for (const d of REG.dependencies) {
      for (const e of d.exists) for (const f of e.files) expect(existsSync(join(ROOT, f)), `${d.id}: ${f}`).toBe(true);
      for (const c of d.contracts) expect(identities.has(c), `${d.id}: ${c}`).toBe(true);
      expect(isAuthorityKey(d.owner), d.id).toBe(true);
    }
  });

  it('fails a dependency that claims built and proven without an existing test file and test name', () => {
    for (const d of REG.dependencies) expect(proofProblems(d), d.id).toEqual([]);
    for (const a of REG.acceptance) for (const t of a.tests) expect(testProblem(t), a.id).toBeNull();
    // The check itself refuses an unsupported claim.
    expect(proofProblems({ id: 'x', status: 'built and proven', tests: { existing: [], planned: ['one day'] } })).toEqual(['x: claims built and proven with no test']);
    expect(proofProblems({ id: 'x', status: 'built and proven', tests: { existing: [{ file: 'app/src/lib/nowhere.test.ts', name: 'works' }], planned: [] } })[0]).toMatch(/no such test file/);
    expect(proofProblems({ id: 'x', status: 'partial', tests: { existing: [{ file: 'app/src/lib/requirements/health-i4.test.ts', name: ['no', 'such', 'test', 'name'].join(' ') }], planned: [] } })[0]).toMatch(/no test named/);
  });

  it('lists every contract with no procedure link and the stage it is intended for, and each reads missing until its procedure exists', () => {
    const health = CATALOGUE_CONTRACTS.filter(f => f.specId.startsWith('HLT-'));
    const none = health.filter(f => !f.procedure);
    expect(REG.forms_without_procedure.map(x => x.identity).sort()).toEqual(none.map(f => f.identity).sort());
    // Batch 2: 20 contracts are linked to the product procedures (Health I4); only HLT-MED-024 names none, answered by product.status.
    expect(REG.forms_without_procedure.filter(x => x.batch === 2).map(x => x.identity)).toEqual(['FIELD-SERIES-PARTS-05-07:HLT-MED-024@1']);
    expect(REG.forms_without_procedure.filter(x => x.batch === 1)).toHaveLength(12);
    for (const x of REG.forms_without_procedure) {
      const f = none.find(y => y.identity === x.identity)!;
      expect(x.stage, x.identity).toBe(f.awaits);
      expect(x.owner).toBe(f.owner);
      expect(x.procedure_required, x.identity).toBe(!f.deviations.some(d => d.id === 'no-case'));
      expect(procedureLink({ identity: f.identity, procedure: null, deviations: f.deviations }, { packages: [] }).state).toBe(x.link);
    }
    const linked = health.filter(f => f.procedure);
    expect(REG.adoption.map(x => `${x.identity} ${x.procedure} ${x.stage}`).sort()).toEqual(linked.map(f => `${f.identity} ${f.procedure!.key} ${f.procedure!.stage}`).sort());
  });

  it('keeps the acceptance rows for Health as the acceptance register states them', () => {
    const acc = read('docs/INSTITUTIONAL_ACCEPTANCE.md');
    for (const a of REG.acceptance) {
      const line = acc.split('\n').find(l => l.startsWith(`| ${a.id} |`))!;
      expect(line, a.id).toContain(`**${a.register_status}**`);
      expect(a.status).toBe(a.register_status === 'Proven' ? 'built and proven' : a.register_status === 'Partial' ? 'partial' : 'not built');
    }
  });

  it('is rendered on its page and never claims Health complete', () => {
    expect(REG.health_complete).toBe(false);
    const n = (s: Status) => REG.dependencies.filter(d => d.status === s).length;
    expect(MD).toContain(`**Summary:** ${REG.dependencies.length} dependencies: ${n('not built')} not built, ${n('partial')} partial, ${n('built and proven')} built and proven.`);
    for (const d of REG.dependencies) {
      expect(MD, d.id).toContain(`## \`${d.id}\`: ${d.title}`);
      expect(MD, d.id).toContain(`**Status: ${d.status}.**`);
    }
    for (const x of REG.forms_without_procedure) expect(MD, x.identity).toContain(`\`${x.identity}\``);
    expect(MD).toContain('**Health is not complete.**');
    for (const doc of ['docs/HEALTH_I4_DEPENDENCIES.md', 'docs/INSTITUTIONAL_ARCHITECTURE_PLAN.md', 'docs/INTEGRATION_REGISTER.md', 'docs/FORMS_CONFORMANCE.md', 'CLAUDE.md']) {
      expect(read(doc), doc).not.toMatch(/Health is (now )?(the )?(first )?complete/i);
    }
    // The plan's I4 row points here.
    expect(read('docs/INSTITUTIONAL_ARCHITECTURE_PLAN.md').split('\n').find(l => l.startsWith('| I4 |'))).toContain('docs/HEALTH_I4_DEPENDENCIES.md');
  });
});
