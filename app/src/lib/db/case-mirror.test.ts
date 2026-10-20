import { describe, it, expect } from 'vitest';
import { setSovereign, listMinistries } from '@/lib/data/store';
import { resetLaw } from '@/lib/law/register';
import { resetPackages } from '@/lib/casework/packages';
import { resetCases, openCase } from '@/lib/casework/engine';
import { loadDemonstration } from '@/lib/casework/demo';
import { caseMirrorRow } from './mirror';

// The substrate keeps a case's progress, never its content (step 12, design §2.2).
describe('case mirror row', () => {
  it('carries the procedure, owner, stage and next deadline, and no field or party', () => {
    resetLaw(); resetPackages(); resetCases();
    const civil = listMinistries()[0]!.id;
    setSovereign({ regions: ['North'], deployment: { authorities: { civilRegistration: civil } } }, 'Administrator');
    expect(loadDemonstration('Administrator')).not.toHaveProperty('error');
    const c = openCase({ procedure: 'civil.death', fields: { deceasedRegistration: 'BR-77', deathDate: '2026-10-01', region: 'North' }, subject: [{ kind: 'person', name: 'Ada Example' }] }, { name: 'Registrar', scope: null });
    if ('error' in c) throw new Error(c.error);
    const row = caseMirrorRow(c.id)!;
    expect(row).toMatchObject({ id: c.id, ref: c.ref, procedure_key: 'civil.death', owner_institution: civil, stage: c.stage, pending_approval: false, closed_at: null });
    expect(typeof row.next_due).toBe('string');
    const text = JSON.stringify(row);
    for (const secret of ['BR-77', '2026-10-01', 'Ada Example']) expect(text).not.toContain(secret);
    expect(caseMirrorRow('nope')).toBeNull();
  });
});
