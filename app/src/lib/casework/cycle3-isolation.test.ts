// Cycle 3 cross-agency isolation (owner's directive, non-negotiable 9): each
// new domain's procedures are worked only by the institution the deployment
// profile names for it. Officials of another institution, administrators,
// whole-government officials and auditors cannot open or act on its cases,
// and each domain's read rule refuses everyone else.
import { describe, it, expect, beforeEach } from 'vitest';
import { openCase, resetCases, registeredEffects, type Actor } from './engine';
import { draftPackage, approvePackage, resetPackages } from './packages';
import { TAX_PROCEDURES, EDUCATION_PROCEDURES, PROFESSION_PROCEDURES, HEALTH_PROCEDURES, CUSTOMS_PROCEDURES } from './modules';
import { setSovereign, listMinistries } from '@/lib/data/store';
import { canReadTax, canReadEducation, canReadCustoms, canReadProfessionals, canReadImmigration, type OfficialRole } from '@/lib/auth/roles';

const DOMAINS = [
  { name: 'tax', authority: 'tax', packages: TAX_PROCEDURES },
  { name: 'education', authority: 'education', packages: EDUCATION_PROCEDURES },
  { name: 'professions', authority: 'professionalRegulation', packages: PROFESSION_PROCEDURES },
  { name: 'health', authority: 'healthRegulation', packages: HEALTH_PROCEDURES },
  { name: 'customs', authority: 'customs', packages: CUSTOMS_PROCEDURES },
] as const;

let INST: Record<string, string> = {};
const actor = (role: OfficialRole, institution?: string): Actor => ({ id: `${role}-${institution ?? 'all'}`, name: `${role} ${institution ?? 'whole government'}`, scope: { id: `${role}-${institution ?? 'all'}`, role, ...(institution ? { institution } : {}) } });

describe('cycle 3 domains are isolated from each other', () => {
  beforeEach(() => {
    resetCases(); resetPackages();
    const ids = listMinistries().map(m => m.id);
    INST = Object.fromEntries(DOMAINS.map((d, i) => [d.authority, ids[i]!]));
    setSovereign({ deployment: { authorities: INST } }, 'Administrator');
    for (const d of DOMAINS) for (const p of d.packages) {
      const r = draftPackage(p, 'Author', 'author', registeredEffects());
      if ('error' in r) throw new Error(`${p.key}: ${r.error}`);
      const a = approvePackage(p.key, 1, 'Approver', 'approver', '2026-01-01', registeredEffects(), new Date('2026-01-01'));
      if ('error' in a) throw new Error(`${p.key}: ${a.error}`);
    }
  });

  for (const d of DOMAINS) {
    it(`${d.name}: only its own institution opens its cases`, () => {
      const own = INST[d.authority]!;
      const others = DOMAINS.filter(x => x.authority !== d.authority).map(x => INST[x.authority]!);
      for (const p of d.packages) {
        expect(openCase({ procedure: p.key, fields: {} }, actor('signatory', own)), `${p.key} by its owner`).not.toMatchObject({ error: expect.stringMatching(/institution responsible|worked only/) });
        for (const o of others) expect(openCase({ procedure: p.key, fields: {} }, actor('signatory', o)), `${p.key} by ${o}`).toHaveProperty('error');
        expect(openCase({ procedure: p.key, fields: {} }, actor('administrator')), `${p.key} by an administrator`).toHaveProperty('error');
        expect(openCase({ procedure: p.key, fields: {} }, actor('signatory')), `${p.key} by the whole government`).toHaveProperty('error');
        expect(openCase({ procedure: p.key, fields: {} }, actor('auditor', own)), `${p.key} by an auditor`).toHaveProperty('error');
      }
    });
  }

  it('each domain\'s records are read only by its authority, or by auditors who give a purpose', () => {
    const rules: [string, (s: { role?: OfficialRole; institution?: string }, purpose?: string) => string | null][] = [
      ['tax', (s, p) => canReadTax(s, INST.tax, p)],
      ['education', (s, p) => canReadEducation(s, INST.education, p)],
      ['customs', (s, p) => canReadCustoms(s, INST.customs, p)],
      ['professionalRegulation', (s, p) => canReadProfessionals(s, s.institution === INST.professionalRegulation ? ['nurse'] : [], p)],
    ];
    for (const [authority, rule] of rules) {
      expect(rule({ role: 'officer', institution: INST[authority] })).toBeNull();
      for (const other of Object.entries(INST).filter(([k]) => k !== authority)) expect(rule({ role: 'signatory', institution: other[1] }), `${authority} read by ${other[0]}`).not.toBeNull();
      expect(rule({ role: 'administrator' })).not.toBeNull();
      expect(rule({ role: 'auditor', institution: INST[authority] })).not.toBeNull();
      expect(rule({ role: 'auditor', institution: INST[authority] }, 'Annual audit')).toBeNull();
    }
    // Immigration stays closed to the new domains too.
    expect(canReadImmigration({ role: 'signatory', institution: INST.customs }, undefined)).not.toBeNull();
  });
});
