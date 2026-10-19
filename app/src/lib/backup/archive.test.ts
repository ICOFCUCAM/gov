// The encrypted backup archive: round trip, tamper detection, wrong key, and
// no plaintext mode.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { randomBytes } from 'node:crypto';
import { packArchive, openArchive, peekArchive, sha256, ARCHIVE_FORMAT, type Manifest } from './archive';

const KEK = randomBytes(32).toString('hex');
const meta = (id = 'BK-20261019120000-abcdef'): Omit<Manifest, 'format' | 'parts' | 'stateDigest'> => ({
  id, createdAt: '2026-10-19T12:00:00.000Z', createdBy: 'Registrar', reason: 'manual', mode: 'snapshot', adapter: 'memory',
  app: { release: '1.4.0', package: '0.1.0', node: process.version }, schema: { snapshotFormat: 1 },
  audit: { seq: 2, hash: 'h2', entries: 2 }, excluded: [], keptOnRestore: [],
});
const parts = () => [
  { name: 'store/__civicos', kind: 'store' as const, data: Buffer.from(JSON.stringify({ secret: 'citizen record 1', audit: [] })) },
  { name: 'store/__civicosSites', kind: 'store' as const, data: Buffer.from(JSON.stringify({ $map: [['health', { mode: 'link' }]] })) },
];

let saved: string | undefined;
beforeEach(() => { saved = process.env.CIVICOS_DATA_KEK; process.env.CIVICOS_DATA_KEK = KEK; });
afterEach(() => { if (saved === undefined) delete process.env.CIVICOS_DATA_KEK; else process.env.CIVICOS_DATA_KEK = saved; });

describe('backup archive', () => {
  it('seals every part and the manifest, and reads them back with their hashes checked', async () => {
    const { archive, manifest } = await packArchive(meta(), parts());
    expect(manifest.format).toBe(ARCHIVE_FORMAT);
    expect(manifest.parts.map(p => p.name)).toEqual(['store/__civicos', 'store/__civicosSites']);
    expect(manifest.parts[0]!.sha256).toBe(sha256(parts()[0]!.data));
    // Never plaintext at rest: neither the data nor the manifest's content is readable in the file.
    expect(archive.includes(Buffer.from('citizen record 1'))).toBe(false);
    expect(archive.includes(Buffer.from('Registrar'))).toBe(false);
    expect(peekArchive(archive)).toMatchObject({ id: meta().id, provider: 'env' });
    const opened = await openArchive(archive, meta().id);
    expect(opened.manifest.audit).toEqual({ seq: 2, hash: 'h2', entries: 2 });
    expect(opened.parts.get('store/__civicos')!.toString()).toContain('citizen record 1');
  });

  it('detects a changed byte anywhere in the sealed data', async () => {
    const { archive } = await packArchive(meta(), parts());
    for (const at of [archive.length - 1, archive.length - 40, Math.floor(archive.length * 0.8)]) {
      const bad = Buffer.from(archive);
      bad[at] = bad[at]! ^ 0x01;
      await expect(openArchive(bad)).rejects.toThrow(/does not open|damaged|outside/);
    }
  });

  it('refuses parts renamed or moved in the header', async () => {
    const { archive } = await packArchive(meta(), parts());
    const text = archive.toString('latin1');
    const renamed = Buffer.from(text.replace('store/__civicosSites', 'store/__civicosSitez'), 'latin1');
    await expect(openArchive(renamed)).rejects.toThrow();
    // A part from another backup does not open under this one's id.
    const other = await packArchive(meta('BK-20261019120001-abcdef'), parts());
    await expect(openArchive(other.archive, meta().id)).rejects.toThrow(/holds backup/);
  });

  it('does not open under another key', async () => {
    const { archive } = await packArchive(meta(), parts());
    process.env.CIVICOS_DATA_KEK = randomBytes(32).toString('hex');
    await expect(openArchive(archive)).rejects.toThrow(/key/);
  });

  it('opens during a key rotation (the earlier key as CIVICOS_DATA_KEK_PREVIOUS)', async () => {
    const { archive } = await packArchive(meta(), parts());
    process.env.CIVICOS_DATA_KEK_PREVIOUS = KEK;
    process.env.CIVICOS_DATA_KEK = randomBytes(32).toString('hex');
    try { expect((await openArchive(archive)).parts.size).toBe(2); } finally { delete process.env.CIVICOS_DATA_KEK_PREVIOUS; }
  });

  it('refuses to take a backup without a key: there is no plaintext mode', async () => {
    delete process.env.CIVICOS_DATA_KEK;
    await expect(packArchive(meta(), parts())).rejects.toThrow(/no key is configured/);
  });

  it('refuses what is not an archive', async () => {
    await expect(openArchive(Buffer.from('hello'))).rejects.toThrow(/Not a CivicOS backup/);
  });
});
