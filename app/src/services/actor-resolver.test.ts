import { describe, it, expect, vi, beforeEach } from 'vitest';

const snapshotMock = vi.fn();

vi.mock('@/services/identity', () => ({
  currentActorSnapshot: () => snapshotMock(),
}));

import { resolvedActor, enrichActorString } from './actor-resolver';

beforeEach(() => {
  snapshotMock.mockReset();
});

describe('resolvedActor', () => {
  it('returns null when nobody is signed in', () => {
    snapshotMock.mockReturnValue(null);
    expect(resolvedActor()).toBeNull();
  });

  it('passes through id / name / kind / role from the snapshot', () => {
    snapshotMock.mockReturnValue({ id: 'a-1', name: 'Amina', kind: 'officer', role: 'noc-officer', charterId: 'MIN-X' });
    expect(resolvedActor()).toEqual({ id: 'a-1', name: 'Amina', kind: 'officer', role: 'noc-officer' });
  });
});

describe('enrichActorString', () => {
  it('returns the input verbatim when nobody is signed in', () => {
    snapshotMock.mockReturnValue(null);
    expect(enrichActorString('Anon')).toBe('Anon');
  });

  it('appends the canonical identity tag in the documented shape', () => {
    snapshotMock.mockReturnValue({ id: 'a-1', name: 'Amina', kind: 'officer', role: null });
    expect(enrichActorString('Amina')).toBe('Amina [officer:a-1]');
  });

  it('prefers the caller-supplied label when it differs from the actor name', () => {
    snapshotMock.mockReturnValue({ id: 'a-1', name: 'Amina', kind: 'officer', role: null });
    expect(enrichActorString('Custom Label')).toBe('Custom Label [officer:a-1]');
  });

  it('marks citizen actors with the citizen kind', () => {
    snapshotMock.mockReturnValue({ id: 'c-1', name: 'Citizen', kind: 'citizen', role: null });
    expect(enrichActorString('Citizen')).toBe('Citizen [citizen:c-1]');
  });
});
