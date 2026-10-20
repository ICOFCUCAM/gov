import { describe, it, expect, beforeEach } from 'vitest';
import { proposeRetention, decideRetention, runRetention, resetRetention } from './retention';
import { openCase, act, getCase, hold, resetCases, registeredEffects } from '@/lib/casework/engine';
import { draftPackage, approvePackage, resetPackages } from '@/lib/casework/packages';
import { setSovereign, listMinistries } from '@/lib/data/store';

describe('retention of cases under procedures', () => {
  beforeEach(() => { resetRetention(); resetCases(); resetPackages(); });

  it('anonymises closed cases after the confirmed period, never deletes them, and spares legal holds', async () => {
    expect(proposeRetention({ category: 'procedure-cases', action: 'delete', days: 365, basis: 'x', reason: 'y' }, 'Admin A')).toMatchObject({ error: expect.stringMatching(/never deleted/) });
    const owner = listMinistries()[0]!.id;
    setSovereign({ deployment: { authorities: { businessRegister: owner } } }, 'test');
    const pkg = { key: 'test.simple', version: 1, owner: 'businessRegister', title: 'Simple', refPrefix: 'SMP', citations: [], fields: [{ key: 'name', label: 'Name', type: 'text' as const, personal: true }], documents: [], stages: [{ key: 'open', label: 'Open' }, { key: 'done', label: 'Done', terminal: true }], actions: [{ key: 'finish', label: 'Finish', from: ['open'], to: 'done', needs: { role: 'officer' as const } }], deadlines: [], notifications: [], retention: 'standard', sensitivity: 'normal' as const, tests: [{ name: 't', steps: [{ action: 'finish', expect: 'done' }] }] };
    const d = draftPackage(pkg, 'A', 'a', registeredEffects());
    if ('error' in d) throw new Error(d.error);
    approvePackage(d.key, d.version, 'B', 'b', '2025-01-01', registeredEffects(), new Date('2025-01-01'));
    const make = async (name: string) => {
      const c = openCase({ procedure: pkg.key, fields: { name }, subject: [{ kind: 'person', name }] }, { name: 'Clerk', scope: null }, new Date('2025-01-01'));
      if ('error' in c) throw new Error(c.error);
      const r = await act(c.id, { action: 'finish' }, { name: 'Clerk', scope: null }, new Date('2025-01-02'));
      if ('error' in r) throw new Error(r.error);
      return c.id;
    };
    const a = await make('Private Person');
    const b = await make('Held Person');
    hold(b, 'Litigation', { name: 'Records officer', scope: null });
    const p = proposeRetention({ category: 'procedure-cases', action: 'anonymise', days: 365, basis: 'Records schedule 4.2', reason: 'Two years is enough' }, 'Admin A') as { id: string };
    decideRetention(p.id, 'confirm', 'Admin B');
    const run = runRetention(Date.parse('2026-10-20'));
    expect(run.procedureCases).toEqual({ anonymised: 1 });
    expect(getCase(a)).toMatchObject({ fields: { name: '' }, subject: [{ name: '(removed under the retention rule)' }], anonymisedAt: expect.any(String) });
    expect(getCase(b)!.subject[0]!.name).toBe('Held Person');
  });
});

describe('shortening the access log', () => {
  beforeEach(() => resetRetention());
  it('needs the oversight side after the two administrators', async () => {
    const { confirmByOversight, retentionRules } = await import('./retention');
    const p = proposeRetention({ category: 'access-log', action: 'delete', days: 3650, basis: 'Records schedule 9', reason: 'Ten years' }, 'Admin A') as { id: string };
    expect(decideRetention(p.id, 'confirm', 'Admin B')).toMatchObject({ state: 'awaiting-oversight' });
    expect(retentionRules()['access-log']).toEqual({ action: 'keep' });
    expect(confirmByOversight(p.id, 'Admin B')).toHaveProperty('error');
    expect(confirmByOversight(p.id, 'Data protection officer')).toMatchObject({ state: 'confirmed' });
    expect(retentionRules()['access-log']).toMatchObject({ action: 'delete', days: 3650 });
  });
});
