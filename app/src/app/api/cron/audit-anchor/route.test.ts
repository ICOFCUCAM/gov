import { describe, it, expect, vi, beforeEach } from 'vitest';

const serverClientMock = vi.fn();
vi.mock('@/lib/db/client', () => ({
  serverClient: () => serverClientMock(),
}));

import { GET } from './route';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { recordAudit, auditHead, verifyAuditChain } from '@/lib/data/store';
import { lastSignedHead } from '@/lib/audit/sign';
import { verifyAnchorFile } from '@/lib/audit/anchor';

beforeEach(() => {
  serverClientMock.mockReset();
  delete process.env.CIVICOS_CRON_SECRET;
});

describe('GET /api/cron/audit-anchor', () => {
  it('returns 401 without the secret', async () => {
    const res = await GET(new Request('http://x?token=x'));
    expect(res.status).toBe(401);
  });

  it('anchors the platform head alone when the substrate is not configured', async () => {
    process.env.CIVICOS_CRON_SECRET = 'correct';
    serverClientMock.mockReturnValue(null);
    recordAudit('Director', 'test.anchor', 'T:1', 'ok');
    const res = await GET(new Request('http://x?token=correct'));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.substrate).toBe('not configured');
    expect(json.platform).toMatchObject({ head_seq: auditHead()!.seq, head_hash: auditHead()!.hash, key_id: expect.stringMatching(/^ed25519:/) });
    expect(lastSignedHead()!.seq).toBe(auditHead()!.seq);
  });

  it('writes the signed platform head to an append-only anchor file outside the state', async () => {
    process.env.CIVICOS_CRON_SECRET = 'correct';
    const dir = mkdtempSync(join(tmpdir(), 'anchor-'));
    process.env.CIVICOS_AUDIT_ANCHOR_FILE = join(dir, 'heads.jsonl');
    serverClientMock.mockReturnValue(null);
    try {
      recordAudit('Director', 'test.anchor', 'T:2', 'ok');
      await GET(new Request('http://x?token=correct'));
      recordAudit('Director', 'test.anchor', 'T:3', 'ok');
      const json = await (await GET(new Request('http://x?token=correct'))).json();
      expect(json.platform.anchored_to).toEqual(['file']);
      const lines = readFileSync(join(dir, 'heads.jsonl'), 'utf8').trim().split('\n').map(l => JSON.parse(l));
      expect(lines).toHaveLength(2);
      expect(lines[1]).toMatchObject({ kind: 'civicos-audit-anchor-v1', seq: auditHead()!.seq, hash: auditHead()!.hash });
      expect(verifyAnchorFile(join(dir, 'heads.jsonl'))).toEqual({ ok: true, lines: 2 });
      expect(verifyAuditChain().signed?.head).toMatchObject({ seq: auditHead()!.seq, anchoredTo: ['file'] });
    } finally {
      delete process.env.CIVICOS_AUDIT_ANCHOR_FILE;
    }
  });

  it('returns 500 when the scopes query errors', async () => {
    process.env.CIVICOS_CRON_SECRET = 'correct';
    serverClientMock.mockReturnValue({
      from: () => ({
        select: () => ({
          order: () => ({ limit: () => Promise.resolve({ data: null, error: { message: 'denied' } }) }),
        }),
      }),
      rpc: vi.fn(),
    });
    const res = await GET(new Request('http://x?token=correct'));
    expect(res.status).toBe(500);
  });

  it('broadcasts an audit.anchor event for every scope with a head entry', async () => {
    process.env.CIVICOS_CRON_SECRET = 'correct';
    const rpc = vi.fn(async () => ({ data: null, error: null }));
    serverClientMock.mockReturnValue({
      from: (view: string) => {
        if (view === 'civicos_audit_entries') {
          return {
            select: () => {
              const order = () => ({
                limit: () => Promise.resolve({
                  data: [{ scope: 'A' }, { scope: 'B' }, { scope: 'A' }],
                  error: null,
                }),
              });
              const eq = () => ({
                order: () => ({
                  limit: () => Promise.resolve({ data: [{ seq: 5, hash: 'h' }], error: null }),
                }),
              });
              return { order, eq };
            },
          };
        }
        return {};
      },
      rpc,
    });
    const res = await GET(new Request('http://x?token=correct'));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.scopes_swept).toBe(2);
    expect(json.scopes_anchored).toBe(2);
    // The two substrate scopes and the platform chain's signed head.
    expect(rpc).toHaveBeenCalledTimes(3);
    expect(rpc).toHaveBeenCalledWith('civicos_publish_event', expect.objectContaining({
      p_type: 'audit.anchor', p_source: 'platform', p_payload: expect.objectContaining({ scope: 'platform', signature: expect.any(String) }),
    }));
    expect(json.platform.anchored_to).toContain('substrate');
    expect(rpc).toHaveBeenCalledWith('civicos_publish_event', expect.objectContaining({
      p_type: 'audit.anchor', p_channel: 'constitutional', p_source: 'substrate',
    }));
  });

  it('marks scopes with no head entry as not anchored, without an RPC call', async () => {
    process.env.CIVICOS_CRON_SECRET = 'correct';
    const rpc = vi.fn(async () => ({ data: null, error: null }));
    serverClientMock.mockReturnValue({
      from: (view: string) => {
        if (view === 'civicos_audit_entries') {
          return {
            select: () => ({
              order: () => ({ limit: () => Promise.resolve({ data: [{ scope: 'EMPTY' }], error: null }) }),
              eq: () => ({ order: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }) }),
            }),
          };
        }
        return {};
      },
      rpc,
    });
    const res = await GET(new Request('http://x?token=correct'));
    const json = await res.json();
    expect(json.scopes_anchored).toBe(0);
    // Only the platform head is published; the empty scope makes no call.
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it('honours the scopes query-param cap', async () => {
    process.env.CIVICOS_CRON_SECRET = 'correct';
    serverClientMock.mockReturnValue({
      from: () => ({
        select: () => ({
          order: () => ({ limit: () => Promise.resolve({
            data: Array.from({ length: 50 }, (_, i) => ({ scope: `S-${i}` })),
            error: null,
          }) }),
          eq: () => ({ order: () => ({ limit: () => Promise.resolve({ data: [{ seq: 1, hash: 'h' }], error: null }) }) }),
        }),
      }),
      rpc: async () => ({ data: null, error: null }),
    });
    const res = await GET(new Request('http://x?token=correct&scopes=10'));
    const json = await res.json();
    expect(json.scopes_swept).toBe(10);
  });
});
