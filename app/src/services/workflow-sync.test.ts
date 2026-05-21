import { describe, it, expect, vi, beforeEach } from 'vitest';

const substrateAvailableMock = vi.fn(() => true);
const syncMock = vi.fn();

vi.mock('@/lib/db/repos/work-items', () => ({
  substrateAvailable: () => substrateAvailableMock(),
  syncWorkflowDefinitionRow: (...args: unknown[]) => syncMock(...args),
}));

vi.mock('@/lib/gov/runtime-workflow', () => ({
  WORKFLOWS: {
    'wf-a': { label: 'Workflow A', kind: 'approval', stages: ['draft', 'done'], terminal: ['done'], transitions: { draft: { approve: 'done' } } },
    'wf-b': { label: 'Workflow B', kind: 'case', stages: ['open', 'closed'], terminal: ['closed'], transitions: { open: { resolve: 'closed' } } },
  },
}));

import { syncAllWorkflows, __resetWorkflowSync } from './workflow-sync';

beforeEach(() => {
  __resetWorkflowSync();
  substrateAvailableMock.mockReset();
  substrateAvailableMock.mockReturnValue(true);
  syncMock.mockReset();
});

describe('syncAllWorkflows', () => {
  it('returns 0 when the substrate is unavailable', async () => {
    substrateAvailableMock.mockReturnValue(false);
    expect(await syncAllWorkflows()).toBe(0);
    expect(syncMock).not.toHaveBeenCalled();
  });

  it('persists every documented workflow and counts the accepted rows', async () => {
    syncMock.mockResolvedValue({ workflow_id: 'x' });
    expect(await syncAllWorkflows()).toBe(2);
    expect(syncMock).toHaveBeenCalledTimes(2);
  });

  it('counts only the workflows the substrate accepted', async () => {
    syncMock.mockResolvedValueOnce({ workflow_id: 'wf-a' });
    syncMock.mockResolvedValueOnce(null);
    expect(await syncAllWorkflows()).toBe(1);
  });

  it('is a one-shot — subsequent calls short-circuit without re-syncing', async () => {
    syncMock.mockResolvedValue({ workflow_id: 'x' });
    await syncAllWorkflows();
    const callsAfterFirst = syncMock.mock.calls.length;
    await syncAllWorkflows();
    expect(syncMock.mock.calls.length).toBe(callsAfterFirst);
  });

  it('coalesces concurrent callers into one in-flight sync', async () => {
    let resolveFirst: ((row: { workflow_id: string } | null) => void) | null = null;
    syncMock.mockImplementationOnce(() => new Promise(r => { resolveFirst = r as never; }));
    syncMock.mockImplementation(async () => ({ workflow_id: 'wf-b' }));
    const a = syncAllWorkflows();
    const b = syncAllWorkflows();
    resolveFirst!({ workflow_id: 'wf-a' });
    const [ra, rb] = await Promise.all([a, b]);
    expect(ra).toBe(rb);
    // Only one in-flight cycle iterated the WORKFLOWS map.
    expect(syncMock).toHaveBeenCalledTimes(2);
  });
});
