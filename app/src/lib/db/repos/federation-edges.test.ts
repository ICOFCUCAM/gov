import { describe, it, expect, vi, beforeEach } from 'vitest';

const publicClientMock = vi.fn();
vi.mock('@/lib/db/client', () => ({
  publicClient: () => publicClientMock(),
  substrateAvailable: () => publicClientMock() != null,
}));

import { listFederationEdges, recentCascadeEvents } from './events';

beforeEach(() => publicClientMock.mockReset());

describe('listFederationEdges', () => {
  it('returns [] when the substrate is unavailable', async () => {
    publicClientMock.mockReturnValue(null);
    expect(await listFederationEdges()).toEqual([]);
  });

  it('maps rows to camelCase, coerces weight, and forwards the archetype', async () => {
    const rpc = vi.fn(async () => ({
      data: [{ source_archetype: 'HEALTH', target_archetype: 'GENERIC', relation: 'Emergency response', direction: 'provides', weight: '1' }],
      error: null,
    }));
    publicClientMock.mockReturnValue({ rpc });
    const out = await listFederationEdges('HEALTH');
    expect(rpc).toHaveBeenCalledWith('civicos_list_federation_edges', { p_source_archetype: 'HEALTH' });
    expect(out[0]).toEqual({ sourceArchetype: 'HEALTH', targetArchetype: 'GENERIC', relation: 'Emergency response', direction: 'provides', weight: 1 });
  });

  it('passes null when no archetype given', async () => {
    const rpc = vi.fn(async () => ({ data: [], error: null }));
    publicClientMock.mockReturnValue({ rpc });
    await listFederationEdges();
    expect(rpc).toHaveBeenCalledWith('civicos_list_federation_edges', { p_source_archetype: null });
  });
});

describe('recentCascadeEvents', () => {
  it('queries federation events filtered to escalation.cascade with the limit', async () => {
    const limit = vi.fn(async () => ({ data: [{ id: 'e1', type: 'escalation.cascade', source: 'escalation:x', target: 'MIN-T', channel: 'escalation', payload: {}, at_ms: 1 }], error: null }));
    const order = vi.fn(() => ({ limit }));
    const eq = vi.fn(() => ({ order, eq }));
    const select = vi.fn(() => ({ eq, order }));
    const from = vi.fn(() => ({ select }));
    publicClientMock.mockReturnValue({ from });
    const out = await recentCascadeEvents(20);
    expect(from).toHaveBeenCalledWith('civicos_federation_events');
    expect(eq).toHaveBeenCalledWith('type', 'escalation.cascade');
    expect(out).toHaveLength(1);
    expect(out[0]!.target).toBe('MIN-T');
  });
});
