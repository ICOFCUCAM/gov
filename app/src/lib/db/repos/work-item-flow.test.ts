import { describe, it, expect, vi, beforeEach } from 'vitest';

const publicClientMock = vi.fn();
vi.mock('@/lib/db/client', () => ({
  publicClient: () => publicClientMock(),
  substrateAvailable: () => publicClientMock() != null,
}));

import {
  workItemFlowStats, workItemStageDistribution, officerWorkload,
  claimWorkItemRow, releaseWorkItemRow, setWorkItemPriorityRow,
} from './work-items';

beforeEach(() => publicClientMock.mockReset());

describe('setWorkItemPriorityRow', () => {
  it('returns null when the substrate is unavailable', async () => {
    publicClientMock.mockReturnValue(null);
    expect(await setWorkItemPriorityRow('WI-1', 'urgent')).toBeNull();
  });

  it('calls the RPC with ref + priority and returns the updated row', async () => {
    const rpc = vi.fn(async () => ({ data: { id: 'wi1', ref: 'WI-1', priority: 'urgent' }, error: null }));
    publicClientMock.mockReturnValue({ rpc });
    const out = await setWorkItemPriorityRow('WI-1', 'urgent');
    expect(rpc).toHaveBeenCalledWith('civicos_set_work_item_priority', { p_ref: 'WI-1', p_priority: 'urgent' });
    expect(out!.priority).toBe('urgent');
  });

  it('returns null on RPC error', async () => {
    publicClientMock.mockReturnValue({ rpc: async () => ({ data: null, error: { message: 'insufficient_privilege' } }) });
    expect(await setWorkItemPriorityRow('WI-1', 'critical')).toBeNull();
  });
});

describe('releaseWorkItemRow', () => {
  it('returns null when the substrate is unavailable', async () => {
    publicClientMock.mockReturnValue(null);
    expect(await releaseWorkItemRow('WI-1')).toBeNull();
  });

  it('calls the RPC with the ref and returns the updated row', async () => {
    const rpc = vi.fn(async () => ({ data: { id: 'wi1', ref: 'WI-1', assignee_name: null }, error: null }));
    publicClientMock.mockReturnValue({ rpc });
    const out = await releaseWorkItemRow('WI-1');
    expect(rpc).toHaveBeenCalledWith('civicos_release_work_item', { p_ref: 'WI-1' });
    expect(out!.assignee_name).toBeNull();
  });

  it('returns null on RPC error (e.g. not the assignee)', async () => {
    publicClientMock.mockReturnValue({ rpc: async () => ({ data: null, error: { message: 'insufficient_privilege' } }) });
    expect(await releaseWorkItemRow('WI-1')).toBeNull();
  });
});

describe('claimWorkItemRow', () => {
  it('returns null when the substrate is unavailable', async () => {
    publicClientMock.mockReturnValue(null);
    expect(await claimWorkItemRow('WI-1')).toBeNull();
  });

  it('calls the RPC with the ref and returns the updated row', async () => {
    const rpc = vi.fn(async () => ({ data: { id: 'wi1', ref: 'WI-1', assignee_name: 'Alice' }, error: null }));
    publicClientMock.mockReturnValue({ rpc });
    const out = await claimWorkItemRow('WI-1');
    expect(rpc).toHaveBeenCalledWith('civicos_claim_work_item', { p_ref: 'WI-1' });
    expect(out!.assignee_name).toBe('Alice');
  });

  it('unwraps a single-element array result', async () => {
    publicClientMock.mockReturnValue({ rpc: async () => ({ data: [{ id: 'wi1', ref: 'WI-1' }], error: null }) });
    const out = await claimWorkItemRow('WI-1');
    expect(out!.ref).toBe('WI-1');
  });

  it('returns null on RPC error (e.g. not a linked officer)', async () => {
    publicClientMock.mockReturnValue({ rpc: async () => ({ data: null, error: { message: 'insufficient_privilege' } }) });
    expect(await claimWorkItemRow('WI-1')).toBeNull();
  });
});

describe('officerWorkload', () => {
  it('returns [] when the substrate is unavailable', async () => {
    publicClientMock.mockReturnValue(null);
    expect(await officerWorkload()).toEqual([]);
  });

  it('maps rows incl. the unassigned bucket and forwards the charter', async () => {
    const rpc = vi.fn(async () => ({
      data: [
        { assignee_id: 'a1', assignee_name: 'Alice', open_items: 2, high_priority: 1, oldest_open_hours: '40.0', median_open_hours: '25.0' },
        { assignee_id: null, assignee_name: '(unassigned)', open_items: 1, high_priority: 1, oldest_open_hours: '5.0', median_open_hours: '5.0' },
      ],
      error: null,
    }));
    publicClientMock.mockReturnValue({ rpc });
    const out = await officerWorkload({ charterId: 'MIN-X' });
    expect(rpc).toHaveBeenCalledWith('civicos_officer_workload', { p_charter_id: 'MIN-X' });
    expect(out[0]).toEqual({
      assigneeId: 'a1', assigneeName: 'Alice', openItems: 2, highPriority: 1,
      oldestOpenHours: 40, medianOpenHours: 25,
    });
    expect(out[1]!.assigneeId).toBeNull();
  });

  it('returns [] on RPC error', async () => {
    publicClientMock.mockReturnValue({ rpc: async () => ({ data: null, error: { message: 'boom' } }) });
    expect(await officerWorkload()).toEqual([]);
  });
});

describe('workItemStageDistribution', () => {
  it('returns [] when the substrate is unavailable', async () => {
    publicClientMock.mockReturnValue(null);
    expect(await workItemStageDistribution('wf')).toEqual([]);
  });

  it('maps rows and forwards the workflow id', async () => {
    const rpc = vi.fn(async () => ({
      data: [
        { stage: 'review', open_items: 2, oldest_hours: '20.0', median_age_hours: '12.5' },
        { stage: 'intake', open_items: 1, oldest_hours: '2.0', median_age_hours: '2.0' },
      ],
      error: null,
    }));
    publicClientMock.mockReturnValue({ rpc });
    const out = await workItemStageDistribution('permit.v1');
    expect(rpc).toHaveBeenCalledWith('civicos_work_item_stage_distribution', { p_workflow_id: 'permit.v1' });
    expect(out[0]).toEqual({ stage: 'review', openItems: 2, oldestHours: 20, medianAgeHours: 12.5 });
  });

  it('returns [] on RPC error', async () => {
    publicClientMock.mockReturnValue({ rpc: async () => ({ data: null, error: { message: 'boom' } }) });
    expect(await workItemStageDistribution('wf')).toEqual([]);
  });
});

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
