import { describe, it, expect, vi, beforeEach } from 'vitest';

const publicClientMock = vi.fn();
vi.mock('@/lib/db/client', () => ({ publicClient: () => publicClientMock(), substrateAvailable: () => publicClientMock() != null }));

import { workItemFlowTrend } from './work-items';

beforeEach(() => publicClientMock.mockReset());

describe('workItemFlowTrend', () => {
  it('returns [] when unavailable', async () => { publicClientMock.mockReturnValue(null); expect(await workItemFlowTrend()).toEqual([]); });
  it('maps rows and forwards params', async () => {
    const rpc = vi.fn(async () => ({ data: [{ week_start: '2026-05-11', closed: 3, median_cycle_hours: '4.0' }], error: null }));
    publicClientMock.mockReturnValue({ rpc });
    const out = await workItemFlowTrend({ workflowId: 'wf', weeks: 12 });
    expect(rpc).toHaveBeenCalledWith('civicos_work_item_flow_trend', { p_workflow_id: 'wf', p_charter_id: null, p_weeks: 12 });
    expect(out[0]).toEqual({ weekStart: '2026-05-11', closed: 3, medianCycleHours: 4 });
  });
  it('returns [] on error', async () => { publicClientMock.mockReturnValue({ rpc: async () => ({ data: null, error: { message: 'x' } }) }); expect(await workItemFlowTrend()).toEqual([]); });
});
