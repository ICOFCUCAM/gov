import { describe, it, expect, beforeEach } from 'vitest';
import { importCases, addCase, withdrawImport, removeSampleCases, listImports, sampleCount, resetCaseImports, issueFeed, revokeFeed, feedForKey, receiveFeed, feedChanges, listFeeds } from './case-import';
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

describe('a ministry\'s connected case system', () => {
  beforeEach(() => { resetCaseImports(); items().splice(0, items().length); });

  it('issues a key shown once, accepts only that key for that ministry, and stops it when disconnected', () => {
    const r = issueFeed(M, 'Licensing system', 'PS');
    if ('error' in r) throw new Error(r.error);
    expect(r.key).toMatch(/^ccf_[0-9a-f]{8}_[0-9a-f]{40}$/);
    expect(JSON.stringify(listFeeds(M))).not.toContain(r.key.slice(13));
    expect(feedForKey(M, `Bearer ${r.key}`)?.id).toBe(r.feed.id);
    expect(feedForKey(M, `Bearer ${r.key.slice(0, -1)}${r.key.endsWith('0') ? '1' : '0'}`)).toBeNull();
    const other = listMinistries().find(m => m.id !== M)!.id;
    expect(feedForKey(other, `Bearer ${r.key}`)).toBeNull();
    expect(issueFeed(M, 'licensing SYSTEM', 'PS')).toEqual({ error: expect.stringMatching(/already has that name/) });
    revokeFeed(M, r.feed.id, 'PS');
    expect(feedForKey(M, `Bearer ${r.key}`)).toBeNull();
  });

  it('adds new cases, updates its own, refuses others\' and reads back what officials did', () => {
    const r = issueFeed(M, 'Licensing system', 'PS');
    if ('error' in r) throw new Error(r.error);
    addCase(M, { reference: 'HAND-1', subject: 'Typed in', received: '2026-10-01', by: 'Clerk' }, NOW);
    const send = (cases: unknown[]) => { const b = { cases }; const x = receiveFeed(r.feed, b, JSON.stringify(b), NOW); if ('error' in x) throw new Error(x.error); return x; };
    const first = send([
      { reference: 'LIC-1', subject: 'Pharmacy licence', received: '2026-10-02', priority: 'elevated' },
      { reference: 'LIC-2', subject: 'Clinic licence', received: '2026-10-03', state: 'escalated', region: region() },
      { reference: 'LIC-3', received: '2026-10-03' },
      { reference: 'HAND-1', subject: 'Overwrite', received: '2026-10-01' },
      { reference: 'LIC-4', subject: 'x', received: '2026-10-03', state: 'pending' },
    ]);
    expect(first).toMatchObject({ added: 2, updated: 0, unchanged: 0 });
    expect(first.refused.map(x => [x.index, x.reason.slice(0, 20)])).toEqual([[2, '"subject" is empty'], [3, 'this case was loaded'], [4, '"state" must be open']]);
    expect(items().find(i => i.ref === 'LIC-2')).toMatchObject({ state: 'escalated', source: 'feed', region: region() });

    const second = send([{ reference: 'LIC-1', state: 'closed', assignee: 'Dr. Wanjiru' }, { reference: 'LIC-2' }]);
    expect(second).toMatchObject({ added: 0, updated: 1, unchanged: 1, refused: [] });
    expect(items().find(i => i.ref === 'LIC-1')).toMatchObject({ state: 'cleared', assignee: 'Dr. Wanjiru', subject: 'Pharmacy licence' });

    const lic2 = items().find(i => i.ref === 'LIC-2')!;
    actOnQueueItem(M, lic2.id, 'assign', 'Officer A');
    const back = feedChanges(r.feed, '2026-01-01T00:00:00Z');
    if ('error' in back) throw new Error(back.error);
    expect(back.cases).toEqual([expect.objectContaining({ ref: 'LIC-2', state: 'assigned', assignee: 'Officer A' })]);
    expect(listFeeds(M)[0]).toMatchObject({ calls: 2, lastResult: { added: 0, updated: 1, unchanged: 1, refused: 0 } });
    expect(listAudit().filter(e => e.action === 'queue.feed.receive' && e.actor.startsWith('Case system: Licensing system'))).toHaveLength(2);
  });
});
