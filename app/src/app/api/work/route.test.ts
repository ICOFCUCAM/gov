import { describe, it, expect } from 'vitest';
import { GET } from './route';
import { actOnQueueItem, listMinistries } from '@/lib/data/store';

describe('GET /api/work', () => {
  it('lists open work across active institutions with consistent counts', async () => {
    const d = await (await GET()).json();
    expect(d.queue.length).toBeGreaterThan(0);
    expect(d.counts.decisions).toBe(d.queue.length + d.permits.length + d.cases.length);
    expect(d.counts.overdue).toBe([...d.queue, ...d.cases].filter((q: { overdue: boolean }) => q.overdue).length);
    expect(d.counts.incidents).toBe(d.ministryIncidents.length + d.incidents.length);
    const active = new Set(listMinistries().filter(m => m.status === 'active').map(m => m.id));
    expect(d.queue.every((q: { ministryId: string; state: string }) => active.has(q.ministryId) && q.state !== 'cleared')).toBe(true);
  });

  it('drops an item once it is cleared', async () => {
    const before = await (await GET()).json();
    const q = before.queue[0];
    actOnQueueItem(q.ministryId, q.id, 'clear', 'Test official');
    const after = await (await GET()).json();
    expect(after.queue.some((x: { id: string; ministryId: string }) => x.id === q.id && x.ministryId === q.ministryId)).toBe(false);
  });
});

describe('GET /api/work: cases under procedures', () => {
  it('lists open cases without personal fields, with their procedure and next deadline', async () => {
    const { setSovereign } = await import('@/lib/data/store');
    const { resetLaw } = await import('@/lib/law/register');
    const { resetPackages } = await import('@/lib/casework/packages');
    const { resetCases, openCase } = await import('@/lib/casework/engine');
    const { loadDemonstration } = await import('@/lib/casework/demo');
    resetLaw(); resetPackages(); resetCases();
    const civil = listMinistries()[0]!.id;
    setSovereign({ regions: ['North'], deployment: { authorities: { civilRegistration: civil } } }, 'Administrator');
    expect(loadDemonstration('Administrator')).not.toHaveProperty('error');
    const c = openCase({ procedure: 'civil.death', fields: { deceasedRegistration: 'BR-1', deathDate: '2026-10-01', region: 'North' } }, { name: 'Registrar', scope: null });
    if ('error' in c) throw new Error(c.error);
    const d = await (await GET()).json();
    const w = d.cases.find((x: { id: string }) => x.id === c.id);
    expect(w).toMatchObject({ ref: c.ref, procedure: 'Death registration', ministryId: civil, pendingApproval: false });
    expect(JSON.stringify(w)).not.toContain('2026-10-01');
  });
});
