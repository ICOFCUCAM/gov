import { describe, it, expect, beforeEach } from 'vitest';
import { importCases, addCase, withdrawImport, removeSampleCases, listImports, sampleCount, resetCaseImports } from './case-import';
import { queueFor, actOnQueueItem, listAudit, queueRegions, listMinistries } from './store';

const M = listMinistries().find(m => m.status === 'active')!.id;
const items = () => { const q = queueFor(M); if ('error' in q) throw new Error(q.error); return q.items; };
const region = () => queueRegions()[1]!;
const NOW = Date.parse('2026-10-18T12:00:00Z');

describe('loading an institution\'s real cases', () => {
  beforeEach(() => { resetCaseImports(); items().splice(0, items().length); removeSampleCases(M, 'reset'); });

  it('checks a file first and refuses unreadable rows with their reasons, changing nothing', () => {
    const csv = [
      'Case Number;Title;Date received;County;Priority;Notes',
      `AG-1;"Seed subsidy; appeal";2026-10-01;${region()};urgent;"says ""urgent"""`,
      `AG-2;Land survey;2026-10-17T08:30;;;`,
      `AG-1;Duplicate;2026-10-02;;;`,
      `AG-3;;2026-10-02;;;`,
      `AG-4;Future;2027-01-01;;;`,
      `AG-5;Bad region;2026-10-02;Atlantis;;`,
      `AG-6;Bad priority;2026-10-02;;whenever;`,
      `AG-7;Bad date;14/10/2026;;;`,
    ].join('\n');
    const before = items().length;
    const r = importCases(M, { csv, dryRun: true }, NOW);
    if ('error' in r) throw new Error(r.error);
    expect(r.accepted).toBe(2);
    expect(r.refused.map(x => [x.row, x.reference])).toEqual([[4, 'AG-1'], [5, 'AG-3'], [6, 'AG-4'], [7, 'AG-5'], [8, 'AG-6'], [9, 'AG-7']]);
    expect(r.refused[3]!.reason).toMatch(/not one of the nation's regions/);
    expect(items().length).toBe(before);
  });

  it('loads cases that age from when they were received, audited with the file hash', () => {
    const csv = `reference,subject,received,priority,assignee\nAG-10,Seed subsidy appeal,2026-10-01,urgent,\nAG-11,Land survey,2026-10-17T08:30:00Z,,J. Otieno`;
    const r = importCases(M, { csv, fileName: 'cases.csv', by: 'Permanent Secretary' }, NOW);
    if ('error' in r) throw new Error(r.error);
    expect(r.import).toMatchObject({ accepted: 2, refused: 0, fileName: 'cases.csv', by: 'Permanent Secretary' });
    expect(r.import!.sha256).toMatch(/^[0-9a-f]{64}$/);
    const a = items().find(i => i.ref === 'AG-10')!;
    expect(a).toMatchObject({ source: 'imported', priority: 'urgent', state: 'open', receivedAt: '2026-10-01T00:00:00.000Z' });
    expect(items().find(i => i.ref === 'AG-11')).toMatchObject({ state: 'assigned', assignee: 'J. Otieno' });
    expect(a.ageHours).toBeGreaterThan(24 * 10);
    expect(listAudit().some(e => e.action === 'queue.import' && (e.detail ?? '').includes('cases.csv'))).toBe(true);
    expect(importCases(M, { csv, by: 'PS' }, NOW)).toEqual({ error: 'No row could be loaded; see the reasons' });
  });

  it('removes the example cases only when asked, and a withdrawal keeps cases already acted on', () => {
    const q = queueFor(M); if ('error' in q) throw new Error(q.error);
    q.items.push({ id: 'S-1', ref: 'APP-1', subject: 'Example', region: '', ageHours: 5, priority: 'routine', state: 'open', source: 'sample' });
    expect(sampleCount(M)).toBe(1);
    const r = importCases(M, { csv: 'reference,subject,received\nAG-20,A,2026-10-01\nAG-21,B,2026-10-02', by: 'PS', removeSamples: true }, NOW);
    if ('error' in r) throw new Error(r.error);
    expect(r.import!.removedSamples).toBe(1);
    expect(sampleCount(M)).toBe(0);
    const acted = items().find(i => i.ref === 'AG-20')!;
    actOnQueueItem(M, acted.id, 'escalate', 'PS');
    const w = withdrawImport(M, r.import!.id, 'PS');
    if ('error' in w) throw new Error(w.error);
    expect(w.withdrawn).toBe(1);
    expect(items().map(i => i.ref)).toEqual(['AG-20']);
    expect(withdrawImport(M, r.import!.id, 'PS')).toEqual({ error: 'This load was already withdrawn' });
    expect(listImports(M)).toHaveLength(1);
  });

  it('adds one typed-in case under the same rules', () => {
    expect(addCase(M, { reference: 'AG-30', subject: 'Walk-in complaint', received: '2026-10-18', by: 'Clerk' }, NOW)).toMatchObject({ source: 'entered', state: 'open' });
    expect(addCase(M, { reference: 'AG-30', subject: 'Again', received: '2026-10-18', by: 'Clerk' }, NOW)).toEqual({ error: expect.stringMatching(/already in the queue/) });
    expect(addCase(M, { reference: 'AG-31', subject: 'x', received: '2026-10-18' }, NOW)).toEqual({ error: expect.stringMatching(/Name the official/) });
  });

  it('asks for the required columns by name', () => {
    expect(importCases(M, { csv: 'ref,notes\nA,b', dryRun: true }, NOW)).toEqual({ error: expect.stringMatching(/columns subject, received/) });
  });
});
