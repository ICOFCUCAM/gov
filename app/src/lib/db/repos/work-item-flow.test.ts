import { describe, it, expect, vi, beforeEach } from 'vitest';

const publicClientMock = vi.fn();
vi.mock('@/lib/db/client', () => ({
  publicClient: () => publicClientMock(),
  substrateAvailable: () => publicClientMock() != null,
}));

import { workItemFlowStats } from './work-items';

beforeEach(() => publicClientMock.mockReset());

describe('workItemFlowStats', () => {
  it('returns [] when the substrate is unavailable', async () => {
    publicClientMock.mockReturnValue(null);
    expect(await workItemFlowStats()).toEqual([]);
  });

  it('maps rows to camelCase, coercing numeric strings + nulls, and forwards options', async () => {
    const rpc = vi.fn(async () => ({
      data: [{
        workflow_id: 'permit.v1', opened: 4, closed: 3, open: 1,
        median_cycle_hours: '4.0', p90_cycle_hours: '9.2', oldest_open_hours: '50.0',
      }, {
        workflow_id: 'license.v1', opened: 1, closed: 0, open: 1,
        median_cycle_hours: null, p90_cycle_hours: null, oldest_open_hours: '12.0',
      }],
      error: null,
    }));
    publicClientMock.mockReturnValue({ rpc });
    const out = await workItemFlowStats({ workflowId: 'permit.v1', charterId: 'MIN-X', days: 90 });
    expect(rpc).toHaveBeenCalledWith('civicos_work_item_flow_stats', {
      p_workflow_id: 'permit.v1', p_charter_id: 'MIN-X', p_days: 90,
    });
    expect(out[0]).toEqual({
      workflowId: 'permit.v1', opened: 4, closed: 3, open: 1,
      medianCycleHours: 4, p90CycleHours: 9.2, oldestOpenHours: 50,
    });
    expect(out[1]!.medianCycleHours).toBeNull();
    expect(out[1]!.oldestOpenHours).toBe(12);
  });

  it('returns [] on RPC error', async () => {
    publicClientMock.mockReturnValue({ rpc: async () => ({ data: null, error: { message: 'boom' } }) });
    expect(await workItemFlowStats()).toEqual([]);
  });
});
