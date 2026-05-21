import { describe, it, expect, vi, beforeEach } from 'vitest';

const listMock = vi.fn();
const createMock = vi.fn();
vi.mock('@/lib/data/store', () => ({
  listBackups: () => listMock(),
  createBackup: (kind: string) => createMock(kind),
}));

import { GET, POST } from './route';

beforeEach(() => {
  listMock.mockReset();
  createMock.mockReset();
});

describe('GET /api/platform/backups', () => {
  it('returns the backup list', async () => {
    listMock.mockReturnValue([{ id: 'b-1', kind: 'full' }]);
    const res = GET();
    const json = await res.json();
    expect(json.backups).toHaveLength(1);
  });
});

describe('POST /api/platform/backups', () => {
  it('defaults to full when kind is omitted', async () => {
    createMock.mockReturnValue({ id: 'b-new', kind: 'full' });
    const res = await POST(new Request('http://x', {
      method: 'POST', body: JSON.stringify({}),
      headers: { 'content-type': 'application/json' },
    }) as never);
    expect(res.status).toBe(201);
    expect(createMock).toHaveBeenCalledWith('full');
  });

  it('honours incremental when requested', async () => {
    createMock.mockReturnValue({ id: 'b-new', kind: 'incremental' });
    await POST(new Request('http://x', {
      method: 'POST', body: JSON.stringify({ kind: 'incremental' }),
      headers: { 'content-type': 'application/json' },
    }) as never);
    expect(createMock).toHaveBeenCalledWith('incremental');
  });

  it('coerces unknown kinds to full', async () => {
    createMock.mockReturnValue({ id: 'b-new' });
    await POST(new Request('http://x', {
      method: 'POST', body: JSON.stringify({ kind: 'rogue' }),
      headers: { 'content-type': 'application/json' },
    }) as never);
    expect(createMock).toHaveBeenCalledWith('full');
  });

  it('tolerates invalid JSON', async () => {
    createMock.mockReturnValue({ id: 'b-new' });
    const res = await POST(new Request('http://x', { method: 'POST', body: 'no' }) as never);
    expect(res.status).toBe(201);
    expect(createMock).toHaveBeenCalledWith('full');
  });
});
