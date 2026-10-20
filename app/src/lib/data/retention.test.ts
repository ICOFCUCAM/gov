// Go-live review M-9 / M-13: bounded state from unauthenticated requests, and retention.
import { describe, it, expect, beforeEach } from 'vitest';
import { recordAudit, listAudit, listPermits, createPermit, decidePermit, queueFor, listMinistries } from './store';
import { addCase } from './case-import';
import { subscribe, unsubscribe, confirmSubscription, siteOutbox, subscriberCounts, sweepSubscriptions, attemptKeys, resetSiteSubscriptions, CONFIRM_DAYS } from './site-subscriptions';
import { resetMessaging, messagesWhere } from '@/lib/messaging/outbox';
import { resetOfficials, createAccount, checkPassword, sweepSignInFailures, failureKeys } from '@/lib/auth/officials';
import { recordAggregated, flushAggregated, resetAuditAggregate, AGGREGATE_WINDOW_MS, WRITTEN_PER_WINDOW, MAX_WINDOWS, openAggregates } from '@/lib/audit/aggregate';
import { proposeRetention, decideRetention, retentionRules, runRetention, resetRetention } from './retention';
// The first account needs the one-time setup code (lib/auth/setup-token.ts, review C-1).
const SETUP_TOKEN = 'test-setup-token-0123456789abcdef';
process.env.CIVICOS_SETUP_TOKEN = SETUP_TOKEN;

process.env.CIVICOS_SCRYPT_N = '16384';
const DAY = 86_400_000;
const tokenOf = (link: string) => new URL(link, 'http://x').searchParams.get('token')!;
const ok = <T,>(r: T | { error: string }): T => { if (r && typeof r === 'object' && 'error' in r) throw new Error((r as { error: string }).error); return r as T; };

describe('refusals from people not signed in are written in a bounded way', () => {
  beforeEach(() => { resetAuditAggregate(); resetOfficials(); resetSiteSubscriptions(); });

  it('writes the first few per subject and window, then one summary', () => {
    const before = listAudit().length;
    const t0 = Date.UTC(2026, 9, 1);
    for (let i = 0; i < 100; i++) recordAggregated('k', { actor: 'x', action: 'test.denied', resource: 'T:1', outcome: 'denied' }, t0 + i);
    expect(listAudit().length - before).toBe(WRITTEN_PER_WINDOW);
    expect(flushAggregated(t0 + AGGREGATE_WINDOW_MS)).toBe(1);
    expect(listAudit()[0]).toMatchObject({ action: 'test.denied', detail: expect.stringMatching(/^95 more like this/) });
    for (let i = 0; i < MAX_WINDOWS + 10; i++) recordAggregated(`w${i}`, { actor: 'x', action: 'test.denied', resource: 'T:2', outcome: 'denied' }, t0);
    expect(openAggregates()).toBeLessThanOrEqual(MAX_WINDOWS);
  });

  it('keeps failed sign-ins bounded: hashed keys, expiring, few audit entries', async () => {
    ok(await createAccount({ email: 'a@g.gov', name: 'A', office: 'O', password: 'correct horse battery', setupToken: SETUP_TOKEN }, null));
    const before = listAudit().length;
    const now = Date.now();
    // Unknown addresses are compared against a full-cost dummy hash, so a dozen is enough here.
    for (let i = 0; i < 12; i++) await checkPassword(`guess${i}@g.gov`, 'wrong password!!', now);
    expect(listAudit().length - before).toBeLessThanOrEqual(WRITTEN_PER_WINDOW);
    const keys = failureKeys();
    expect(keys.length).toBe(12);
    expect(keys.join(' ')).not.toContain('@');
    expect(sweepSignInFailures(now + 16 * 60_000)).toBe(12);
    expect(failureKeys()).toHaveLength(0);
  }, 120_000);

  it('writes subscription requests in a bounded way and prunes the attempt counters', () => {
    const before = listAudit().filter(e => e.action === 'site.subscribe').length;
    const t0 = Date.UTC(2026, 9, 2);
    for (let i = 0; i < 30; i++) subscribe('police', `x${i}@example.org`, { sender: `s${i}`, now: t0 + i });
    expect(listAudit().filter(e => e.action === 'site.subscribe').length - before).toBe(WRITTEN_PER_WINDOW);
    expect(attemptKeys()).toHaveLength(60);
    expect(attemptKeys().join(' ')).not.toMatch(/example\.org|:s1\b/);
    sweepSubscriptions(t0 + 11 * 60_000);
    expect(attemptKeys()).toHaveLength(0);
  });
});

describe('retention of personal data', () => {
  beforeEach(() => { resetSiteSubscriptions(); resetRetention(); resetAuditAggregate(); resetMessaging(); });

  it('leaves nothing in the outbox for an address that unsubscribes (dead letters too), and keeps others', () => {
    subscribe('trade', 'b@example.org', { sender: '1' });
    confirmSubscription(tokenOf(siteOutbox('trade')[0]!.link));
    subscribe('trade', 'keep@example.org', { sender: '2' });
    subscribe('police', 'b@example.org', { sender: '3' });
    // A message that could not be delivered still holds the address for a while (a dead letter).
    const dead = messagesWhere(m => m.to === 'b@example.org' && m.ref?.siteId === 'trade')[0]!;
    const link = dead.link!;
    dead.status = 'dead';
    dead.finishedAt = new Date().toISOString();
    expect(unsubscribe(tokenOf(link))).toEqual({ siteId: 'trade' });
    expect(JSON.stringify(siteOutbox('trade'))).not.toContain('b@example.org');
    expect(siteOutbox('trade').some(m => m.to === 'keep@example.org')).toBe(true);
    expect(siteOutbox('police').some(m => m.to === 'b@example.org')).toBe(true);
  });

  it('removes unconfirmed requests (and their messages) after the link expires', () => {
    const t0 = Date.UTC(2026, 9, 3);
    subscribe('energy', 'pending@example.org', { sender: '1', now: t0 });
    subscribe('energy', 'confirmed@example.org', { sender: '2', now: t0 });
    confirmSubscription(tokenOf(siteOutbox('energy').find(m => m.to === 'confirmed@example.org')!.link), t0);
    expect(sweepSubscriptions(t0 + (CONFIRM_DAYS - 1) * DAY)).toBe(0);
    expect(sweepSubscriptions(t0 + (CONFIRM_DAYS + 1) * DAY)).toBe(1);
    expect(subscriberCounts('energy')).toMatchObject({ pending: 0, confirmed: 1 });
    expect(JSON.stringify(siteOutbox('energy'))).not.toContain('pending@example.org');
    expect(JSON.stringify(siteOutbox('energy'))).toContain('confirmed@example.org');
  });

  it('keeps permits and cases unless two administrators confirm a rule, then anonymises or deletes', () => {
    expect(retentionRules()).toEqual({ permits: { action: 'keep' }, cases: { action: 'keep' }, documents: { action: 'keep' }, 'access-log': { action: 'keep' } });
    const p = createPermit({ type: 'building', title: 'Extension for Jane Doe', applicantName: 'Jane Doe', municipality: 'X', fields: { phone: '123' } } as never);
    ok(decidePermit(p.id, { decision: 'approve', officerName: 'Officer' }));
    const later = Date.now() + 400 * DAY;
    runRetention(later);
    expect(listPermits().find(x => x.id === p.id)!.applicantName).toBe('Jane Doe');

    expect(proposeRetention({ category: 'permits', action: 'anonymise', days: 10 }, 'Admin A')).toEqual({ error: expect.stringMatching(/reason/) });
    expect(proposeRetention({ category: 'permits', action: 'anonymise', days: 10, reason: 'r' }, 'Admin A')).toEqual({ error: expect.stringMatching(/days/) });
    expect(proposeRetention({ category: 'permits', action: 'anonymise', days: 365, reason: 'r' }, 'Admin A')).toEqual({ error: expect.stringMatching(/legal basis/) });
    const c = ok(proposeRetention({ category: 'permits', action: 'anonymise', days: 365, basis: 'Records Act s.12', reason: 'Schedule adopted' }, 'Admin A'));
    expect(decideRetention(c.id, 'confirm', 'Admin A')).toEqual({ error: expect.stringMatching(/different administrator/) });
    runRetention(later);
    expect(listPermits().find(x => x.id === p.id)!.applicantName).toBe('Jane Doe');
    ok(decideRetention(c.id, 'confirm', 'Admin B'));
    expect(retentionRules().permits).toMatchObject({ action: 'anonymise', days: 365, confirmedBy: 'Admin B' });
    const run = runRetention(later);
    expect(run.permits.anonymised).toBeGreaterThanOrEqual(1);
    const after = listPermits().find(x => x.id === p.id)!;
    expect(after).toMatchObject({ fields: {}, anonymisedAt: expect.any(String) });
    expect(JSON.stringify(after)).not.toContain('Jane Doe');
    expect(listAudit().find(e => e.action === 'retention.sweep')!.detail).not.toContain('Jane');

    const m = listMinistries().find(x => x.status === 'active')!.id;
    const real = ok(addCase(m, { reference: `RET-${Date.now()}`, subject: 'Complaint by John Roe', received: '2026-01-02', by: 'Officer' }));
    const q = queueFor(m);
    if ('error' in q) throw new Error(q.error);
    const item = q.items.find(i => i.id === real.id)!;
    item.state = 'cleared';
    item.actedAt = new Date(Date.now() - 100 * DAY).toISOString();
    const samples = q.items.filter(i => !i.source || i.source === 'sample').length;
    ok(decideRetention(ok(proposeRetention({ category: 'cases', action: 'delete', days: 30, basis: 'Records Act s.14', reason: 'Schedule' }, 'Admin A')).id, 'confirm', 'Admin B'));
    expect(runRetention().cases.deleted).toBeGreaterThanOrEqual(1);
    const q2 = queueFor(m);
    if ('error' in q2) throw new Error(q2.error);
    expect(q2.items.some(i => i.id === real.id)).toBe(false);
    expect(q2.items.filter(i => !i.source || i.source === 'sample').length).toBe(samples);
    // Back to keep applies at once.
    ok(proposeRetention({ category: 'cases', action: 'keep', reason: 'Paused' }, 'Admin A'));
    expect(retentionRules().cases.action).toBe('keep');
    recordAudit('x', 'noop', 'X', 'ok');
  });
});

describe('retention of documents and the access log', () => {
  it('disposes of old documents (never held ones) and shortens the access log once a second administrator confirms', async () => {
    const { vi } = await import('vitest');
    vi.stubEnv('CIVICOS_DATA_KEK', Buffer.alloc(32, 5).toString('base64'));
    const { resetRetention, proposeRetention, decideRetention, runRetention } = await import('./retention');
    const { addDocument, holdDocument, getDocument, resetDocuments } = await import('@/lib/records/documents');
    const { recordAccess, listAccess, resetAccessLog } = await import('@/lib/records/access-log');
    resetRetention(); resetDocuments(); resetAccessLog();
    const pdf = new Uint8Array(Buffer.from('%PDF-1.7\nx\n%%EOF'));
    const old = addDocument({ class: 'form', title: 'Old', institution: 'i', belongsTo: { kind: 'case', id: 'c' }, bytes: pdf }, 'A', new Date('2015-01-01')) as { id: string };
    const held = addDocument({ class: 'form', title: 'Held', institution: 'i', belongsTo: { kind: 'case', id: 'c' }, bytes: pdf }, 'A', new Date('2015-01-01')) as { id: string };
    const fresh = addDocument({ class: 'form', title: 'New', institution: 'i', belongsTo: { kind: 'case', id: 'c' }, bytes: pdf }, 'A') as { id: string };
    holdDocument(held.id, 'Court case', 'A');
    recordAccess({ by: { name: 'X' }, record: { register: 'cases', id: '1' }, action: 'view', result: 'allowed' }, new Date('2015-01-01'));
    recordAccess({ by: { name: 'X' }, record: { register: 'cases', id: '2' }, action: 'view', result: 'allowed' });
    expect(proposeRetention({ category: 'documents', action: 'anonymise', days: 365, basis: 'Records schedule 4', reason: 'r' }, 'Admin A')).toHaveProperty('error');
    for (const category of ['documents', 'access-log']) {
      const p = proposeRetention({ category, action: 'delete', days: 3650, basis: 'Records schedule 4', reason: 'Schedule adopted' }, 'Admin A');
      if ('error' in p) throw new Error(p.error);
      expect(decideRetention(p.id, 'confirm', 'Admin A')).toHaveProperty('error');
      decideRetention(p.id, 'confirm', 'Admin B');
    }
    const run = runRetention();
    expect(run.documents).toEqual({ disposed: 1, held: 1 });
    expect(run.accessLog).toEqual({ removed: 1 });
    expect(getDocument(old.id)?.disposed).toBeTruthy();
    expect(getDocument(held.id)?.disposed).toBeUndefined();
    expect(getDocument(fresh.id)?.disposed).toBeUndefined();
    expect(listAccess()).toHaveLength(1);
    vi.unstubAllEnvs();
  });
});
