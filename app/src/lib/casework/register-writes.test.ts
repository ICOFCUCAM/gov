// No route, screen or library changes a case-governed register outside the
// case engine (acceptance hardening, independent-review item "decision guard
// coverage").
//
// The registers below change only through the effects their procedure module
// registers with the engine, so every change is a decision under an approved
// procedure, checked by the decision guards. This test reads the source and
// fails when:
//   - a register module gains an export nobody has classified as a read or a
//     change;
//   - any file other than the register's procedure module imports one of its
//     changing functions, unless it is a listed exception with its reason;
//   - a register's store key is used outside its own module;
//   - a register module is imported whole (`* as`) or re-exported;
//   - an effect is registered anywhere but a procedure module or the engine;
//   - a procedure module exports a function other than its installer (an
//     effect reachable without `act()`).
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, dirname, resolve } from 'node:path';

const SRC = resolve(__dirname, '../..');
const rel = (p: string) => relative(SRC, p).replace(/\\/g, '/');

type Register = {
  module: string;
  store: string;
  procedures: string;
  /** Exports that change the register. */
  changes: string[];
  /** Exports that only read it, or return a value without changing it. */
  reads: string[];
};

const REGISTERS: Register[] = [
  { module: 'lib/civil/register.ts', store: '__civicosCivil', procedures: 'lib/civil/procedures.ts',
    changes: ['resetCivil', 'registerEvent', 'attachDecision', 'amendPerson', 'adjudicate'],
    reads: ['findMatches', 'searchPersons', 'eventCounts', 'current', 'fold', 'getPerson', 'getEvent', 'eventOfCase', 'registerSize'] },
  { module: 'lib/organisations/register.ts', store: '__civicosOrganisations', procedures: 'lib/organisations/procedures.ts',
    changes: ['resetOrganisations', 'defineRegisterType', 'createOrganisation', 'amendOrganisation', 'setStanding', 'attachStandingDecision', 'attachCertificate', 'linkFacilities', 'expireStandings', 'organisationsDb', 'nextOrganisationNumber'],
    reads: ['registerTypes', 'getOrganisation', 'listOrganisations', 'checkNewOrganisation', 'publicOrganisation', 'checkStanding', 'ORG_KINDS', 'REFERENCE_TYPES', 'registerType', 'current'] },
  { module: 'lib/professions/register.ts', store: '__civicosProfessions', procedures: 'lib/professions/procedures.ts',
    changes: ['resetProfessions', 'defineProfession', 'registerProfessional', 'setProfessionalState', 'attachProfessionalDecision', 'attachProfessionalCertificate', 'lapseRegistrations'],
    reads: ['professions', 'checkQualifications', 'listProfessionals', 'publicProfessional', 'checkProfessional', 'professionCounts', 'PUBLIC_FIELDS', 'DEFAULT_PUBLIC_FIELDS', 'REFERENCE_PROFESSIONS', 'profession', 'getProfessional', 'professionalOfCase'] },
  { module: 'lib/tax/register.ts', store: '__civicosTax', procedures: 'lib/tax/procedures.ts',
    changes: ['resetTax', 'registerTaxpayer', 'fileReturn', 'recordAssessment', 'attachAssessmentDecision', 'varyAssessment', 'reconcileTaxPayments'],
    reads: ['account', 'taxCounts', 'getTaxpayer', 'findTaxpayers', 'getReturn', 'returnsOf', 'returnFor', 'getAssessment', 'assessmentsOf', 'assessmentOfCase'] },
  { module: 'lib/education/register.ts', store: '__civicosEducation', procedures: 'lib/education/procedures.ts',
    changes: ['resetEducation', 'recordInspection', 'recordAward', 'correctAward', 'revokeAward', 'attachAwardCertificate', 'recordReturn'],
    reads: ['verifyAward', 'educationCounts', 'INSPECTION_OUTCOMES', 'RETURN_METRICS', 'sameName', 'inspectionsOf', 'getAward', 'awardsOf', 'awardOfCase', 'returnsOf', 'allReturns', 'lineage'] },
  { module: 'lib/immigration/register.ts', store: '__civicosImmigration', procedures: 'lib/immigration/procedures.ts',
    changes: ['resetImmigration', 'recordGrant', 'changeGrant', 'attachGrantDecision', 'attachGrantCertificate', 'expireGrants'],
    reads: ['checkGrant', 'findGrants', 'statusOn', 'grantCounts', 'VISA_CATEGORIES', 'PERMIT_CATEGORIES', 'documentKeyOf', 'getGrant', 'grantOfCase'] },
  { module: 'lib/customs/register.ts', store: '__civicosCustoms', procedures: 'lib/customs/procedures.ts',
    changes: ['resetCustoms', 'lodgeDeclaration', 'amendGoods', 'chooseChannel', 'recordCustomsInspection', 'recordDuty', 'attachDutyDecision', 'releaseGoods', 'refuseRelease', 'attachReleaseDecision', 'reconcileCustomsPayments'],
    reads: ['parseGoods', 'releaseBlocker', 'customsCounts', 'CHANNELS', 'linesOf', 'getDeclaration', 'declarationOfCase', 'declarationsOf'] },
  { module: 'lib/health/register.ts', store: '__civicosHealth', procedures: 'lib/health/procedures.ts',
    changes: ['resetHealth', 'recordCapacity'],
    reads: ['CAPACITY_METRICS', 'capacityOf', 'allCapacity', 'healthCounts'] },
  { module: 'lib/courts/hearings.ts', store: '__civicosHearings', procedures: 'lib/courts/procedures.ts',
    changes: ['resetHearings', 'scheduleHearing', 'concludeHearing'],
    reads: ['causeList', 'hearingsOf'] },
];

/**
 * Changes made outside a procedure, each for a stated reason. None of them
 * decides a person's or an organisation's standing: they define the
 * structure an authority keeps, apply an end date already decided, settle
 * receipts against bills, or record aggregate returns.
 */
const EXCEPTIONS: { file: string; fn: string; why: string }[] = [
  { file: 'app/api/organisations/types/route.ts', fn: 'defineRegisterType', why: 'defines a register type (administrators, audited); records no organisation' },
  { file: 'app/api/professions/types/route.ts', fn: 'defineProfession', why: 'defines a profession and its regulator (administrators, audited); records no person' },
  { file: 'app/api/cron/case-deadlines/route.ts', fn: 'expireStandings', why: 'applies the validity end date a decision already set' },
  { file: 'app/api/cron/case-deadlines/route.ts', fn: 'lapseRegistrations', why: 'applies the validity end date a decision already set' },
  { file: 'app/api/cron/case-deadlines/route.ts', fn: 'expireGrants', why: 'applies the validity end date a decision already set' },
  { file: 'app/api/cron/case-deadlines/route.ts', fn: 'reconcileTaxPayments', why: 'settles receipts against bills once each; changes no assessment' },
  { file: 'app/api/cron/case-deadlines/route.ts', fn: 'reconcileCustomsPayments', why: 'settles receipts against bills once each; changes no duty or release' },
  { file: 'app/api/education/route.ts', fn: 'recordReturn', why: 'an institution\'s aggregate return (counts only); no record of a person' },
  { file: 'app/api/health-regulation/route.ts', fn: 'recordCapacity', why: 'a facility\'s aggregate capacity return (counts only); no record of a person' },
  { file: 'lib/organisations/import.ts', fn: 'organisationsDb', why: 'the checked load of an existing register: proposed by one official of the keeping authority, confirmed by a different one, under the approved mapping in production' },
  { file: 'lib/organisations/import.ts', fn: 'nextOrganisationNumber', why: 'numbers the organisations a confirmed load enters' },
];

/** Files that may register an effect with the engine. */
const EFFECT_REGISTRARS = /^lib\/([a-z]+\/procedures\.ts|casework\/(engine|referral|types)\.ts)$/;

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) { if (name !== 'node_modules') walk(p, out); }
    else if (/\.(ts|tsx|mts)$/.test(name) && !/\.(test|spec)\.tsx?$/.test(name) && !name.endsWith('.d.ts')) out.push(p);
  }
  return out;
}
const FILES = walk(SRC).map(p => ({ path: rel(p), text: readFileSync(p, 'utf8') }));

/** The module a specifier names, as a path under src (null when it is a package). */
function target(from: string, spec: string): string | null {
  let p: string;
  if (spec.startsWith('@/')) p = spec.slice(2);
  else if (spec.startsWith('.')) p = rel(resolve(SRC, dirname(from), spec));
  else return null;
  return p.replace(/\.(ts|tsx)$/, '');
}
type Import = { from: string; names: string[]; whole: boolean };
function importsOf(file: { path: string; text: string }): Import[] {
  const out: Import[] = [];
  const named = /(?:import|export)\s+(?:type\s+)?\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g;
  for (const m of file.text.matchAll(named)) {
    const t = target(file.path, m[2]!);
    if (t) out.push({ from: t, names: m[1]!.split(',').map(s => s.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0]!.trim()).filter(Boolean), whole: false });
  }
  const whole = /(?:import|export)\s+\*\s*(?:as\s+\w+\s*)?from\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g;
  for (const m of file.text.matchAll(whole)) {
    const t = target(file.path, (m[1] ?? m[2])!);
    if (t) out.push({ from: t, names: [], whole: true });
  }
  return out;
}

describe('case-governed registers change only through the case engine', () => {
  it('classifies every export of every register module as a read or a change', () => {
    for (const r of REGISTERS) {
      const text = readFileSync(join(SRC, r.module), 'utf8');
      const exported = [
        ...[...text.matchAll(/^export\s+(?:async\s+)?(?:function\s*\*?|const|let)\s+([A-Za-z_$][\w$]*)/gm)].map(m => m[1]!),
        ...[...text.matchAll(/^export\s*\{([^}]*)\}\s*;?\s*$/gm)].flatMap(m => m[1]!.split(',').map(x => x.trim().split(/\s+as\s+/).at(-1)!.trim()).filter(Boolean)),
      ];
      const known = new Set([...r.changes, ...r.reads]);
      expect(exported.filter(e => !known.has(e)), `${r.module}: classify each new export as a read or a change in register-writes.test.ts`).toEqual([]);
      expect([...known].filter(k => !exported.includes(k)), `${r.module}: listed but no longer exported`).toEqual([]);
    }
  });

  it('lets only the procedure module (and the listed exceptions) import a changing function', () => {
    const bad: string[] = [];
    for (const f of FILES) {
      for (const imp of importsOf(f)) {
        const r = REGISTERS.find(x => x.module.replace(/\.ts$/, '') === imp.from);
        if (!r || f.path === r.module) continue;
        if (imp.whole) { bad.push(`${f.path}: imports ${r.module} whole; import named reads instead`); continue; }
        for (const n of imp.names) {
          if (!r.changes.includes(n)) continue;
          if (f.path === r.procedures) continue;
          if (EXCEPTIONS.some(e => e.file === f.path && e.fn === n)) continue;
          bad.push(`${f.path}: imports ${n} from ${r.module}; change the register through a procedure (act()), not directly`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it('keeps each register store inside its own module', () => {
    const bad: string[] = [];
    for (const r of REGISTERS) {
      const re = new RegExp(`\\b${r.store}\\b`);
      for (const f of FILES) if (re.test(f.text) && f.path !== r.module && f.path !== 'lib/data/register-owners.ts') bad.push(`${f.path} uses ${r.store}`);
    }
    expect(bad).toEqual([]);
  });

  it('registers effects only from procedure modules and the engine, and procedure modules export no effect', () => {
    const registrars = FILES.filter(f => /\bregisterEffect\s*\(/.test(f.text)).map(f => f.path);
    expect(registrars.filter(p => !EFFECT_REGISTRARS.test(p))).toEqual([]);
    for (const f of FILES.filter(x => /^lib\/[a-z]+\/procedures\.ts$/.test(x.path))) {
      const fns = [...f.text.matchAll(/^export\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/gm)].map(m => m[1]!);
      // An installer drafts the reference packages; registerOfCase only reads which register a case concerns.
      expect(fns.filter(n => !/^install[A-Z]\w*Procedures$/.test(n) && n !== 'registerOfCase' && n !== 'sectorProcedures'), f.path).toEqual([]);
    }
  });

  it('keeps every exception still in use, so the list does not outlive the code', () => {
    for (const e of EXCEPTIONS) {
      const f = FILES.find(x => x.path === e.file);
      expect(f, e.file).toBeTruthy();
      expect(new RegExp(`\\b${e.fn}\\b`).test(f!.text), `${e.file} no longer uses ${e.fn}`).toBe(true);
    }
  });

  it('catches a route that imports a changing function', () => {
    const route = { path: 'app/api/example/route.ts', text: "import { setStanding, getOrganisation } from '@/lib/organisations/register';" };
    const imp = importsOf(route)[0]!;
    expect(imp).toMatchObject({ from: 'lib/organisations/register', names: ['setStanding', 'getOrganisation'] });
    const r = REGISTERS.find(x => x.module === 'lib/organisations/register.ts')!;
    expect(imp.names.filter(n => r.changes.includes(n))).toEqual(['setStanding']);
    expect(importsOf({ path: 'lib/x/y.ts', text: "const m = await import('../civil/register');" })[0]).toMatchObject({ from: 'lib/civil/register', whole: true });
  });
});
