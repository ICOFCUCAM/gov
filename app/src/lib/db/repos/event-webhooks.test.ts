import { describe, it, expect, vi, beforeEach } from 'vitest';

const publicClientMock = vi.fn();
vi.mock('@/lib/db/client', () => ({
  publicClient: () => publicClientMock(),
  substrateAvailable: () => publicClientMock() != null,
}));

import {
  listEventWebhooksRows, registerEventWebhookRow, listWebhookDeliveriesRows,
  rotateEventWebhookSecretRow, eventWebhooksHealth, federationChannelCatalog,
} from './events';

beforeEach(() => publicClientMock.mockReset());

describe('listEventWebhooksRows', () => {
  it('returns [] when the substrate is unavailable', async () => {
    publicClientMock.mockReturnValue(null);
    expect(await listEventWebhooksRows()).toEqual([]);
  });

  it('maps the secret-free RPC rows into camelCase', async () => {
    publicClientMock.mockReturnValue({
      rpc: async () => ({
        data: [{
          id: 'w1', channel: 'constitutional', url: 'https://h.test', description: 'd',
          active: true, cursor_at_ms: 1200, last_delivered_at: '2026-05-21T00:00:00Z',
          delivered_count: 7, failures: 0, last_error: null,
          paused_reason: null, created_at: '2026-05-20T00:00:00Z',
        }],
        error: null,
      }),
    });
    const out = await listEventWebhooksRows();
    expect(out).toHaveLength(1);
    expect(out[0]!.cursorAtMs).toBe(1200);
    expect(out[0]!.deliveredCount).toBe(7);
    expect(out[0]!.active).toBe(true);
    expect(out[0]!.pausedReason).toBeNull();
    // No secret field is surfaced.
    expect((out[0] as unknown as Record<string, unknown>).secret).toBeUndefined();
  });

  it('surfaces a tripped circuit breaker reason on a deactivated row', async () => {
    publicClientMock.mockReturnValue({
      rpc: async () => ({
        data: [{
          id: 'w2', channel: 'metric', url: 'https://dead.test', description: null,
          active: false, cursor_at_ms: 0, last_delivered_at: null,
          delivered_count: 0, failures: 10, last_error: 'connection refused',
          paused_reason: 'circuit-open: 10 consecutive delivery failures',
          created_at: '2026-05-20T00:00:00Z',
        }],
        error: null,
      }),
    });
    const out = await listEventWebhooksRows();
    expect(out[0]!.active).toBe(false);
    expect(out[0]!.pausedReason).toBe('circuit-open: 10 consecutive delivery failures');
  });

  it('returns [] when the RPC errors (e.g. insufficient privilege)', async () => {
    publicClientMock.mockReturnValue({
      rpc: async () => ({ data: null, error: { message: 'insufficient_privilege' } }),
    });
    expect(await listEventWebhooksRows()).toEqual([]);
  });
});

describe('registerEventWebhookRow', () => {
  it('returns null when the substrate is unavailable', async () => {
    publicClientMock.mockReturnValue(null);
    expect(await registerEventWebhookRow({ channel: 'c', url: 'u', secret: 'sssssssss' })).toBeNull();
  });

  it('passes parameters through and returns the new id', async () => {
    const rpc = vi.fn(async () => ({ data: 'new-uuid', error: null }));
    publicClientMock.mockReturnValue({ rpc });
    const id = await registerEventWebhookRow({
      channel: 'constitutional', url: 'https://h.test', secret: 'topsecret', description: 'd',
    });
    expect(id).toBe('new-uuid');
    expect(rpc).toHaveBeenCalledWith('civicos_register_event_webhook', expect.objectContaining({
      p_channel: 'constitutional', p_url: 'https://h.test', p_secret: 'topsecret', p_description: 'd',
    }));
  });

  it('returns null on RPC error', async () => {
    publicClientMock.mockReturnValue({
      rpc: async () => ({ data: null, error: { message: 'denied' } }),
    });
    expect(await registerEventWebhookRow({ channel: 'c', url: 'u', secret: 'sssssssss' })).toBeNull();
  });
});

describe('listWebhookDeliveriesRows', () => {
  it('returns [] when the substrate is unavailable', async () => {
    publicClientMock.mockReturnValue(null);
    expect(await listWebhookDeliveriesRows('w1')).toEqual([]);
  });

  it('maps run summaries into camelCase and passes the limit through', async () => {
    const rpc = vi.fn(async () => ({
      data: [{
        id: 'd1', channel: 'metric', delivered: 3, ok: true, detail: null,
        cursor_before: 100, cursor_after: 400, attempted_at: '2026-05-21T00:00:00Z',
      }],
      error: null,
    }));
    publicClientMock.mockReturnValue({ rpc });
    const out = await listWebhookDeliveriesRows('w1', 5);
    expect(out).toHaveLength(1);
    expect(out[0]!.delivered).toBe(3);
    expect(out[0]!.cursorBefore).toBe(100);
    expect(out[0]!.cursorAfter).toBe(400);
    expect(rpc).toHaveBeenCalledWith('civicos_list_webhook_deliveries', { p_webhook_id: 'w1', p_limit: 5 });
  });

  it('returns [] on RPC error', async () => {
    publicClientMock.mockReturnValue({
      rpc: async () => ({ data: null, error: { message: 'insufficient_privilege' } }),
    });
    expect(await listWebhookDeliveriesRows('w1')).toEqual([]);
  });
});

describe('rotateEventWebhookSecretRow', () => {
  it('returns false when the substrate is unavailable', async () => {
    publicClientMock.mockReturnValue(null);
    expect(await rotateEventWebhookSecretRow('w1', 'newsecret1')).toBe(false);
  });

  it('passes the id + new secret and returns true on success', async () => {
    const rpc = vi.fn(async () => ({ data: true, error: null }));
    publicClientMock.mockReturnValue({ rpc });
    expect(await rotateEventWebhookSecretRow('w1', 'newsecret1')).toBe(true);
    expect(rpc).toHaveBeenCalledWith('civicos_rotate_event_webhook_secret', {
      p_id: 'w1', p_new_secret: 'newsecret1',
    });
  });

  it('returns false on RPC error (e.g. insufficient privilege)', async () => {
    publicClientMock.mockReturnValue({
      rpc: async () => ({ data: null, error: { message: 'insufficient_privilege' } }),
    });
    expect(await rotateEventWebhookSecretRow('w1', 'newsecret1')).toBe(false);
  });
});

describe('eventWebhooksHealth', () => {
  it('returns null when the substrate is unavailable', async () => {
    publicClientMock.mockReturnValue(null);
    expect(await eventWebhooksHealth()).toBeNull();
  });

  it('maps the summary row into camelCase', async () => {
    publicClientMock.mockReturnValue({
      rpc: async () => ({
        data: [{ total: 7, active: 4, paused: 1, circuit_open: 2, total_delivered: 1200, total_failures: 9 }],
        error: null,
      }),
    });
    const out = await eventWebhooksHealth();
    expect(out).toEqual({
      total: 7, active: 4, paused: 1, circuitOpen: 2, totalDelivered: 1200, totalFailures: 9,
    });
  });

  it('returns null on RPC error', async () => {
    publicClientMock.mockReturnValue({
      rpc: async () => ({ data: null, error: { message: 'denied' } }),
    });
    expect(await eventWebhooksHealth()).toBeNull();
  });
});

describe('federationChannelCatalog', () => {
  it('returns [] when the substrate is unavailable', async () => {
    publicClientMock.mockReturnValue(null);
    expect(await federationChannelCatalog()).toEqual([]);
  });

  it('maps rows and forwards the window', async () => {
    const rpc = vi.fn(async () => ({
      data: [{ channel: 'escalation', type: 'institution.escalation', events: 3, last_at: '2026-05-21T00:00:00Z' }],
      error: null,
    }));
    publicClientMock.mockReturnValue({ rpc });
    const out = await federationChannelCatalog(30);
    expect(rpc).toHaveBeenCalledWith('civicos_federation_channel_catalog', { p_days: 30 });
    expect(out[0]).toEqual({ channel: 'escalation', type: 'institution.escalation', events: 3, lastAt: '2026-05-21T00:00:00Z' });
  });

  it('returns [] on RPC error', async () => {
    publicClientMock.mockReturnValue({ rpc: async () => ({ data: null, error: { message: 'boom' } }) });
    expect(await federationChannelCatalog()).toEqual([]);
  });
});
