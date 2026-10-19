import { describe, it, expect } from 'vitest';
import { GET } from './route';
import { actOnQueueItem, listMinistries } from '@/lib/data/store';

describe('GET /api/work', () => {
  it('lists open work across active institutions with consistent counts', async () => {
    const d = await (await GET()).json();
    expect(d.queue.length).toBeGreaterThan(0);
    expect(d.counts.decisions).toBe(d.queue.length + d.permits.length);
    expect(d.counts.overdue).toBe(d.queue.filter((q: { overdue: boolean }) => q.overdue).length);
    expect(d.counts.incidents).toBe(d.ministryIncidents.length + d.incidents.length);
    const active = new Set(listMinistries().filter(m => m.status === 'active').map(m => m.id));
    expect(d.queue.every((q: { ministryId: string; state: string }) => active.has(q.ministryId) && q.state !== 'cleared')).toBe(true);
  });

  it('drops an item once it is cleared', async () => {
    const before = await (await GET()).json();
    const q = before.queue[0];
    actOnQueueItem(q.ministryId, q.id, 'clear', 'Test official');
    const after = await (await GET()).json();
    expect(after.queue.some((x: { id: string; ministryId: string }) => x.id === q.id && x.ministryId === q.ministryId)).toBe(false);
  });
});
