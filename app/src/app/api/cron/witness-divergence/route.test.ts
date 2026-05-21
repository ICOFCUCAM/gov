import { describe, it, expect, vi, beforeEach } from 'vitest';

const serverClientMock = vi.fn();
vi.mock('@/lib/db/client', () => ({
  serverClient: () => serverClientMock(),
}));

import { GET } from './route';

function chainable(result: { data: unknown; error: unknown }): Record<string, unknown> {
  const self: Record<string, unknown> = {};
  for (const m of ['select','order','limit','eq','is','in','or']) {
    self[m] = () => self;
  }
  self.then = (resolve: (r: typeof result) => void) => { resolve(result); return self; };
  return self;
}

beforeEach(() => {
  serverClientMock.mockReset();
  delete process.env.CIVICOS_CRON_SECRET;
});

describe('GET /api/cron/witness-divergence', () => {
  it('returns 401 without the secret', async () => {
    const res = await GET(new Request('http://x?token=x'));
    expect(res.status).toBe(401);
  });

  it('returns 503 when the substrate is not configured', async () => {
    process.env.CIVICOS_CRON_SECRET = 'correct';
    serverClientMock.mockReturnValue(null);
    const res = await GET(new Request('http://x?token=correct'));
    expect(res.status).toBe(503);
  });

  it('returns ok:true and no alarms when every witness agrees with live chain', async () => {
    process.env.CIVICOS_CRON_SECRET = 'correct';
    const rpc = vi.fn(async () => ({ data: null, error: null }));
    serverClientMock.mockReturnValue({
      from: (view: string) => {
        if (view === 'civicos_audit_witnesses') {
          // First call: scope list. Second call: attestations for the seq.
          // Distinguish by whether .eq was called.
          let usedEq = false;
          const self: Record<string, unknown> = {
            select: () => self,
            limit: () => Promise.resolve({ data: [{ scope: 'X' }], error: null }),
            eq: () => { usedEq = true; return self; },
            order: () => self,
            then: (resolve: (r: { data: unknown; error: unknown }) => void) => {
              resolve({ data: usedEq ? [{ observed_hash: 'h', witness_label: 'l' }] : [{ scope: 'X' }], error: null });
              return self;
            },
          };
          return self;
        }
        if (view === 'civicos_audit_entries') {
          return chainable({ data: [{ seq: 5, hash: 'h' }], error: null });
        }
        return chainable({ data: [], error: null });
      },
      rpc,
    });
    const res = await GET(new Request('http://x?token=correct'));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.alarmed).toBe(0);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('records an escalation + federation event when a divergent attestation exists', async () => {
    process.env.CIVICOS_CRON_SECRET = 'correct';
    const rpc = vi.fn(async () => ({ data: null, error: null }));
    serverClientMock.mockReturnValue({
      from: (view: string) => {
        if (view === 'civicos_audit_witnesses') {
          let phase: 'scopes' | 'attestations' = 'scopes';
          const self: Record<string, unknown> = {
            select: () => self,
            limit: () => Promise.resolve({ data: phase === 'scopes' ? [{ scope: 'X' }] : [], error: null }),
            eq: (col: string) => {
              if (col === 'observed_seq') phase = 'attestations';
              return self;
            },
            order: () => self,
            then: (resolve: (r: { data: unknown; error: unknown }) => void) => {
              const data = phase === 'scopes'
                ? [{ scope: 'X' }]
                : [{ observed_hash: 'ROGUE', witness_label: 'auditor-1' }];
              resolve({ data, error: null });
              return self;
            },
          };
          return self;
        }
        if (view === 'civicos_audit_entries') {
          return chainable({ data: [{ seq: 7, hash: 'truth' }], error: null });
        }
        if (view === 'civicos_escalations') {
          return chainable({ data: [], error: null }); // no existing escalation
        }
        return chainable({ data: [], error: null });
      },
      rpc,
    });
    const res = await GET(new Request('http://x?token=correct'));
    const json = await res.json();
    expect(json.alarmed).toBe(1);
    expect(json.ok).toBe(false);
    expect(rpc).toHaveBeenCalledWith('civicos_record_escalation', expect.objectContaining({
      p_severity: 'major',
      p_reason: 'witness-divergence:X@7',
      p_triggered_by_actor: 'witness-divergence-watch',
    }));
    expect(rpc).toHaveBeenCalledWith('civicos_publish_event', expect.objectContaining({
      p_type: 'audit.divergence',
      p_channel: 'constitutional',
    }));
  });

  it('does not record a second escalation when one is already open for the same reason', async () => {
    process.env.CIVICOS_CRON_SECRET = 'correct';
    const rpc = vi.fn(async () => ({ data: null, error: null }));
    serverClientMock.mockReturnValue({
      from: (view: string) => {
        if (view === 'civicos_audit_witnesses') {
          let phase: 'scopes' | 'attestations' = 'scopes';
          const self: Record<string, unknown> = {
            select: () => self,
            limit: () => Promise.resolve({ data: phase === 'scopes' ? [{ scope: 'X' }] : [], error: null }),
            eq: (col: string) => {
              if (col === 'observed_seq') phase = 'attestations';
              return self;
            },
            order: () => self,
            then: (resolve: (r: { data: unknown; error: unknown }) => void) => {
              const data = phase === 'scopes'
                ? [{ scope: 'X' }]
                : [{ observed_hash: 'ROGUE', witness_label: 'a' }];
              resolve({ data, error: null });
              return self;
            },
          };
          return self;
        }
        if (view === 'civicos_audit_entries') {
          return chainable({ data: [{ seq: 7, hash: 'truth' }], error: null });
        }
        if (view === 'civicos_escalations') {
          return chainable({ data: [{ id: 'e-existing' }], error: null });
        }
        return chainable({ data: [], error: null });
      },
      rpc,
    });
    const res = await GET(new Request('http://x?token=correct'));
    expect(res.status).toBe(200);
    // No RPC fired because the escalation already exists.
    expect(rpc).not.toHaveBeenCalled();
  });
});
