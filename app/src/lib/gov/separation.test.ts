// Separation of powers, observed (plan phase 4; audit G): every check is
// read from a configuration fact with a link to its record; nothing is
// generated, so the same configuration always gives the same answer, and a
// production screen shows observed checks or "Not connected", never a number.
import { describe, it, expect, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { separationChecks, type SeparationFacts } from './separation';
import { separationFacts } from '@/lib/nation/separation-facts';
import { createMinistry } from '@/lib/data/store/ministries';
import { setSovereign } from '@/lib/data/store/sovereign';
import { recordTermsDuringSetup } from '@/lib/data/store/institutions';
import { db } from '@/lib/data/store/state';

const healthy: SeparationFacts = {
  branches: [
    { key: 'executive', name: 'Executive', institutions: [{ id: 'cab', name: 'Cabinet Office' }] },
    { key: 'legislature', name: 'Legislature', institutions: [{ id: 'parl', name: 'Parliament' }] },
    { key: 'judiciary', name: 'Judiciary', institutions: [{ id: 'court', name: 'Supreme Court' }] },
  ],
  judicial: [{ id: 'court', name: 'Supreme Court' }],
  independent: [{ id: 'court', name: 'Supreme Court', ownAdministrators: 1 }, { id: 'parl', name: 'Parliament', ownAdministrators: 2 }],
  outsideHolders: [],
  dataProtection: { id: 'dpa', name: 'Data Protection Commission' },
  retention: { oversightConfirmers: 2, adoptedWithoutOversight: 0 },
  directivesToIndependent: [],
};

afterEach(() => { vi.unstubAllEnvs(); setSovereign({ deployment: { authorities: {} } }, 'test'); db.setup = null; });

describe('separation-of-powers checks', () => {
  it('holds when every fact holds; each check is observed and links to the record that decides it', () => {
    const r = separationChecks(healthy);
    expect(r.intact).toBe(true);
    expect(r.checks.every(c => c.kind === 'observed' && c.href.startsWith('/'))).toBe(true);
    expect(r.checks.map(c => c.key)).toEqual(expect.arrayContaining([
      'branch:executive', 'branch:legislature', 'branch:judiciary', 'judiciary-isolated', 'no-outside-holder',
      'own-administrators', 'data-protection', 'retention-oversight', 'no-directive-to-independent',
    ]));
    // Deterministic: the same configuration gives the same answer (no time, no seed).
    expect(separationChecks(healthy)).toEqual(r);
  });

  it('names each fact that does not hold', () => {
    const r = separationChecks({
      ...healthy,
      branches: [...healthy.branches, { key: 'electoral', name: 'Electoral', institutions: [] }],
      judicial: [],
      independent: [{ id: 'parl', name: 'Parliament', ownAdministrators: 0 }],
      outsideHolders: [{ office: 'Speaker', institution: 'Parliament', holder: 'Exec Admin' }],
      dataProtection: undefined,
      retention: { oversightConfirmers: 0, adoptedWithoutOversight: 1 },
      directivesToIndependent: [{ ref: 'EO-1', target: 'Parliament' }],
    });
    expect(r.intact).toBe(false);
    const bad = Object.fromEntries(r.checks.filter(c => !c.ok).map(c => [c.key, c.detail]));
    expect(Object.keys(bad).sort()).toEqual(['branch:electoral', 'data-protection', 'judiciary-isolated', 'no-directive-to-independent', 'no-outside-holder', 'own-administrators', 'retention-oversight'].sort());
    expect(bad['own-administrators']).toMatch(/Parliament/);
    expect(bad['no-directive-to-independent']).toMatch(/EO-1 → Parliament/);
  });

  it('reads the facts from the configuration in a production installation', () => {
    vi.stubEnv('CIVICOS_MODE', 'production');
    const court = createMinistry({ archetype: 'GENERIC', name: 'High Court', slug: `court-${Math.random().toString(36).slice(2, 7)}` });
    if ('error' in court) throw new Error(court.error);
    recordTermsDuringSetup(court.id, { standing: 'judiciary', branch: 'judiciary' }, 'Admin');
    const f = separationFacts();
    expect(f.judicial.map(j => j.id)).toContain(court.id);
    expect(f.branches.find(b => b.key === 'judiciary')!.institutions.map(i => i.id)).toContain(court.id);
    expect(f.independent.find(i => i.id === court.id)).toMatchObject({ ownAdministrators: 0 });
    const r = separationChecks(f);
    expect(r.checks.find(c => c.key === 'judiciary-isolated')!.ok).toBe(true);
    expect(r.checks.find(c => c.key === 'own-administrators')!.ok).toBe(false);
    expect(r.checks.find(c => c.key === 'data-protection')!.ok).toBe(false);
    setSovereign({ deployment: { authorities: { dataProtection: court.id } } }, 'test');
    expect(separationFacts().dataProtection).toMatchObject({ id: court.id });
  });

  it('shows generated branch percentages only where samples are allowed, marked; the separation cell is observed', () => {
    const page = readFileSync(join(__dirname, '..', '..', 'app', '(command)', 'command', 'page.tsx'), 'utf8');
    expect(page).not.toMatch(/separationIntegrity/);
    expect(page).toMatch(/if \(gen\.show\) \{\s*const r = branchReadiness/);
    expect(page).toMatch(/useSeparation\(\)/);
    const branches = readFileSync(join(__dirname, 'branches.ts'), 'utf8');
    expect(branches).not.toMatch(/export function separationIntegrity/);
  });
});
