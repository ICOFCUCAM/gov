// /api/platform/backups (review M-14): every backup listed is a real one at
// the backup target, encrypted and verified; the earlier shape (kind, state,
// location, encrypted, sizeBytes, createdAt) is kept; the platform's list of
// backups (mirror, console) follows the target.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import { mkdtempSync, readdirSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { useTarget, dirTarget } from '@/lib/backup/target';
import { listBackups as platformList } from '@/lib/data/store';
import { GET, POST } from './route';

let dir = '';
beforeAll(() => {
  process.env.CIVICOS_DATA_KEK = randomBytes(32).toString('hex');
  dir = mkdtempSync(path.join(os.tmpdir(), 'civicos-bk-route-'));
  useTarget(dirTarget(dir));
});
afterAll(() => { useTarget(null); delete process.env.CIVICOS_DATA_KEK; });

const post = (body: unknown) => new Request('http://x', { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body), headers: { 'content-type': 'application/json' } }) as never;

describe('/api/platform/backups', () => {
  it('shows no simulated backups: the list starts empty', async () => {
    expect(platformList()).toEqual([]);
    expect((await (await GET()).json()).backups).toEqual([]);
  });

  it('takes a real, verified backup in the earlier shape (kind accepted as before, invalid JSON tolerated)', async () => {
    const res = await POST(post({ kind: 'incremental', by: 'Admin Ada' }));
    expect(res.status).toBe(201);
    const { backup, note } = await res.json();
    expect(backup).toMatchObject({ kind: 'full', state: 'completed', encrypted: true, location: `dir://${backup.id}.cvb`, createdBy: 'Admin Ada' });
    expect(backup.sizeBytes).toBe(backup.sizeBytes | 0);
    expect(backup.verification.ok).toBe(true);
    expect(note).toMatch(/full/);
    expect(readdirSync(dir)).toContain(`${backup.id}.cvb`);
    expect((await POST(new Request('http://x', { method: 'POST', body: 'no' }) as never)).status).toBe(201);
    const list = (await (await GET()).json()).backups;
    expect(list).toHaveLength(2);
    // The platform's own list (mirror, console) is the same catalogue.
    expect(platformList().map(b => b.id).sort()).toEqual(list.map((b: { id: string }) => b.id).sort());
  });
});
