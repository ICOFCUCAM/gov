// Step I0.1 (docs/reviews/2026-10-institutional-baseline-audit.md §3.2): the
// backup manifest records the installation mode, and a production installation
// refuses to restore a backup taken by a demonstration or training one.
import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import { mkdtempSync, readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { useTarget, dirTarget } from '@/lib/backup/target';
import { openArchive } from '@/lib/backup/archive';
import { createBackup, requestRestore, restorePreview, installationRefusal, resetBackups } from './backups';
import { listAudit } from './store';

let dir = '';
const KEK = randomBytes(32).toString('hex');
const ok = <T,>(r: T): Exclude<T, { error: string }> => { if (r && typeof r === 'object' && 'error' in r) throw new Error((r as { error: string }).error); return r as Exclude<T, { error: string }>; };

beforeEach(() => {
  dir = mkdtempSync(path.join(os.tmpdir(), 'civicos-backups-mode-'));
  useTarget(dirTarget(dir));
  resetBackups();
  vi.stubEnv('CIVICOS_DATA_KEK', KEK);
});
afterEach(() => vi.unstubAllEnvs());
afterAll(() => useTarget(null));

describe('installation mode on backups', () => {
  it('records the installation mode in the sealed manifest and the catalogue', async () => {
    vi.stubEnv('CIVICOS_MODE', 'training');
    const b = ok(await createBackup({ by: 'Admin Ada' }));
    expect(b.installation).toBe('training');
    const opened = await openArchive(readFileSync(path.join(dir, `${b.id}.cvb`)), b.id);
    expect(opened.manifest.installation).toBe('training');
  });

  it('refuses a demo backup in a production installation, at preview, proposal and confirmation', async () => {
    vi.stubEnv('CIVICOS_MODE', 'demo');
    const b = ok(await createBackup({ by: 'Admin Ada' }));
    vi.stubEnv('CIVICOS_MODE', 'production');
    expect(await restorePreview(b.id)).toMatchObject({ status: 409, error: expect.stringMatching(/demonstration installation/) });
    const r = await requestRestore(b.id, { by: 'Admin Ada', acknowledgeLoss: true });
    expect(r).toMatchObject({ status: 409, error: expect.stringMatching(/never enter a production installation/) });
    expect(listAudit()[0]).toMatchObject({ action: 'backup.restore.propose', outcome: 'denied' });
  });

  it('a production backup may be proposed for restore in production; a demo installation takes any backup', async () => {
    vi.stubEnv('CIVICOS_MODE', 'production');
    const b = ok(await createBackup({ by: 'Admin Ada' }));
    const p = ok(await requestRestore(b.id, { by: 'Admin Ada', acknowledgeLoss: true }));
    expect(p).toMatchObject({ pending: true, proposal: { warning: { installation: 'production' } } });
    vi.stubEnv('CIVICOS_MODE', 'demo');
    const d = ok(await createBackup({ by: 'Admin Ada' }));
    expect(ok(await restorePreview(d.id)).warning.installation).toBe('demo');
  });

  it('a backup from before the mode was recorded is unknown: allowed', () => {
    expect(installationRefusal(undefined, 'production')).toBeNull();
    expect(installationRefusal('production', 'production')).toBeNull();
    expect(installationRefusal('training', 'production')).toMatch(/training installation/);
    expect(installationRefusal('demo', 'training')).toBeNull();
  });
});
