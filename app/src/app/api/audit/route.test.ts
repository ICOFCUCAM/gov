import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import type { Scope } from '@/lib/auth/roles';

const pageMock = vi.fn();
vi.mock('@/lib/data/store', () => ({
  listAuditPage: (q: unknown) => pageMock(q),
  authorityFor: (k: string) => (k === 'dataProtection' ? 'dpa' : undefined),
}));
// The signed-in official; readRefusal() applies the route's rule to them as lib/auth/official.ts does
// (its access-log write is tested in lib/records/refusal-log.test.ts).
let scope: (Scope & { id: string; name: string; label: string }) | null = null;
vi.mock('@/lib/auth/official', () => ({
  caseScope: async () => scope,
  readRefusal: async (rule: (s: Scope) => string | null) => { const why = scope ? rule(scope) : null; return why ? NextResponse.json({ error: why }, { status: 403 }) : null; },
}));

import { GET } from './route';
import { listAccess, resetAccessLog } from '@/lib/records/access-log';
import { resetSearchLog } from '@/lib/records/access-search';

const as = (role: Scope['role'], institution?: string) => { scope = { id: `local:${role}-${institution ?? 'gov'}`, name: role!, label: `${role} official`, role, ...(institution ? { institution } : {}) }; };

beforeEach(() => { pageMock.mockReset(); resetAccessLog(); resetSearchLog(); scope = null; });

describe('GET /api/audit', () => {
  it('returns one page of the audit event list', async () => {
    pageMock.mockReturnValue({ events: [{ id: 'e-1', action: 'sign' }], total: 1 });
    const res = await GET(new NextRequest('http://localhost/api/audit'));
    const json = await res.json();
    expect(json.events).toHaveLength(1);
    expect(json.events[0].action).toBe('sign');
    expect(pageMock).toHaveBeenCalledWith({ before: undefined, limit: undefined });
  });

  it('passes the cursor and page size on', async () => {
    pageMock.mockReturnValue({ events: [], total: 0 });
    const json = await (await GET(new NextRequest('http://localhost/api/audit?before=120&limit=50'))).json();
    expect(json.events).toEqual([]);
    expect(pageMock).toHaveBeenCalledWith({ before: 120, limit: 50 });
  });

  it('is read by auditors and the data-protection authority, not by administrators or other officials (step I0.1)', async () => {
    pageMock.mockReturnValue({ events: [], total: 0 });
    as('auditor');
    expect((await GET(new NextRequest('http://localhost/api/audit'))).status).toBe(200);
    as('officer', 'dpa');
    expect((await GET(new NextRequest('http://localhost/api/audit'))).status).toBe(200);
    for (const [role, inst] of [['administrator', undefined], ['administrator', 'min-health'], ['signatory', undefined], ['officer', 'min-health']] as const) {
      as(role, inst);
      const res = await GET(new NextRequest('http://localhost/api/audit'));
      expect(res.status).toBe(403);
      expect((await res.json()).error).toMatch(/auditors and by the data-protection authority/);
    }
    expect(pageMock).toHaveBeenCalledTimes(2);
  });

  it('writes each read to the access log as a search with the count, a re-read of the same page once a minute', async () => {
    pageMock.mockReturnValue({ events: [{ id: 'e-1', actor: 'Amina Example', action: 'sign' }, { id: 'e-2', actor: 'B', action: 'x' }], total: 2 });
    as('auditor');
    await GET(new NextRequest('http://localhost/api/audit?limit=50'));
    await GET(new NextRequest('http://localhost/api/audit?limit=50'));
    await GET(new NextRequest('http://localhost/api/audit?limit=50&before=10'));
    const log = listAccess({ register: 'audit' });
    expect(log).toHaveLength(2);
    expect(log.every(e => e.v === 2 && e.action === 'search' && e.result === 'allowed' && e.by.id === 'local:auditor-gov')).toBe(true);
    expect(log.map(e => e.record.query).sort()).toEqual(['limit=50 → 2', 'limit=50&before=10 → 2']);
    expect(JSON.stringify(log)).not.toContain('Amina');
  });
});
