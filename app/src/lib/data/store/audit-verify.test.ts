// Go-live review M-8: the public chain check answers from a cached result,
// verifies only new entries on the request path, re-checks the whole chain
// off it, and /api/audit is paged.
import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { recordAudit, listAudit, verifyAuditChain, auditVerification, reverifyAuditChain, listAuditPage, resetAuditVerification, auditVerifyStats } from './audit';
import { resetRateLimits, POLICIES } from '@/lib/ops/rate-limit';
import { GET as verifyGet } from '@/app/api/audit/verify/route';
import { GET as auditGet } from '@/app/api/audit/route';

const g = globalThis as unknown as { __civicos?: { audit?: unknown[] } };

describe('verifying the audit chain for everyone', () => {
  beforeEach(() => { resetRateLimits(); resetAuditVerification(); });

  it('checks only the entries appended since the last answer', () => {
    for (let i = 0; i < 20; i++) recordAudit('tester', 'test.append', `T:${i}`, 'ok');
    const first = auditVerification();
    expect(first).toMatchObject({ ok: true, complete: true, checked: listAudit().length });
    const before = auditVerifyStats().hashed;
    recordAudit('tester', 'test.append', 'T:new', 'ok');
    recordAudit('tester', 'test.append', 'T:new2', 'ok');
    expect(auditVerification()).toMatchObject({ ok: true, checked: listAudit().length });
    expect(auditVerifyStats().hashed - before).toBe(2);
    // A third answer with nothing new hashes nothing.
    auditVerification();
    expect(auditVerifyStats().hashed - before).toBe(2);
  });

  it('finds a tampered new entry at once and an old one on the full re-check off the request path', async () => {
    for (let i = 0; i < 5; i++) recordAudit('tester', 'test.append', `U:${i}`, 'ok');
    expect(auditVerification().ok).toBe(true);
    const old = listAudit()[3]!;
    const detail = old.detail;
    old.detail = 'changed afterwards';
    try {
      // The cached answer has not looked again yet …
      expect(auditVerification().ok).toBe(true);
      // … the full re-check (chunked, yielding) does.
      await reverifyAuditChain();
      expect(auditVerification()).toMatchObject({ ok: false, brokenAtSeq: old.seq });
      expect(verifyAuditChain()).toMatchObject({ ok: false, brokenAtSeq: old.seq });
    } finally { old.detail = detail; resetAuditVerification(); }
    expect(auditVerification().ok).toBe(true);

    recordAudit('tester', 'test.append', 'U:last', 'ok');
    const last = listAudit()[0]!;
    const actor = last.actor;
    last.actor = 'someone else';
    try { expect(auditVerification()).toMatchObject({ ok: false, brokenAtSeq: last.seq }); } finally { last.actor = actor; resetAuditVerification(); }
  });

  it('starts over when the chain is replaced (a restore)', () => {
    recordAudit('tester', 'test.append', 'V:1', 'ok');
    expect(auditVerification().ok).toBe(true);
    const saved = g.__civicos!.audit!;
    g.__civicos!.audit = [...saved];
    try { expect(auditVerification()).toMatchObject({ ok: true, checked: saved.length }); } finally { g.__civicos!.audit = saved; }
  });

  it('answers the public route from the cache and limits it per address', async () => {
    recordAudit('tester', 'test.append', 'W:1', 'ok');
    const req = () => verifyGet(new NextRequest('http://localhost/api/audit/verify', { headers: { 'x-forwarded-for': '10.9.9.9' } }));
    const r = await req();
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ ok: true, complete: true, verifiedAt: expect.any(String) });
    let status = 200;
    for (let i = 0; i < POLICIES.publicRead.burst + 1 && status === 200; i++) status = (await req()).status;
    expect(status).toBe(429);
  });

  it('pages the chain, newest first', async () => {
    for (let i = 0; i < 30; i++) recordAudit('tester', 'test.page', `P:${i}`, 'ok');
    const all = listAudit();
    const p1 = listAuditPage({ limit: 10 });
    expect(p1.events.map(e => e.seq)).toEqual(all.slice(0, 10).map(e => e.seq));
    expect(p1.total).toBe(all.length);
    const p2 = listAuditPage({ limit: 10, before: p1.nextBefore });
    expect(p2.events.map(e => e.seq)).toEqual(all.slice(10, 20).map(e => e.seq));
    const res = await (await auditGet(new NextRequest('http://localhost/api/audit?limit=5'))).json();
    expect(res.events).toHaveLength(5);
    expect(res).toMatchObject({ total: all.length, nextBefore: all[4]!.seq });
    const dflt = await (await auditGet(new NextRequest('http://localhost/api/audit'))).json();
    expect(dflt.events.length).toBeLessThanOrEqual(200);
  });
});
