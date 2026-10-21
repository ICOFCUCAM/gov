// Backups on a serverless host (Vercel, register 18.39): no lasting local
// directory, so the target must be S3; the scheduled job takes the backup,
// verifies it (read back from S3, decrypted, every part checked, dry-run
// restore) in the same run, writes nothing to the local disk, and a backup
// that does not verify fails the run. Against a stub object store on
// 127.0.0.1 (as s3.test.ts), never a simulated backup.
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { promises as fsp } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { targetFromEnv, useTarget } from './target';
import { resetBackups, listBackups } from '@/lib/data/backups';
import { resetCronRuns, cronOverview } from '@/lib/ops/cron-runs';
import { GET as cronGET } from '@/app/api/cron/backup/route';

const objects = new Map<string, Buffer>();
let corrupt = false;
let server: http.Server, endpoint: string;

const ENV = (): Record<string, string> => ({
  VERCEL: '1',
  CIVICOS_BACKUP_TARGET: 's3',
  CIVICOS_BACKUP_S3_ENDPOINT: endpoint,
  CIVICOS_BACKUP_S3_BUCKET: 'civicos-dr',
  CIVICOS_BACKUP_S3_ACCESS_KEY_ID: 'CIVICOSTESTKEY',
  CIVICOS_BACKUP_S3_SECRET_ACCESS_KEY: 'stub/secret+key',
  CIVICOS_BACKUP_S3_ALLOW_PRIVATE: 'on',
  CIVICOS_DATA_KEK: randomBytes(32).toString('hex'),
  CIVICOS_CRON_SECRET: 'cron-secret',
});
let saved: Record<string, string | undefined> = {};

beforeAll(async () => {
  server = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      const url = new URL(req.url!, 'http://x');
      const [, bucket, ...rest] = url.pathname.split('/');
      if (bucket !== 'civicos-dr') { res.writeHead(404).end(); return; }
      const key = rest.map(decodeURIComponent).join('/');
      if (req.method === 'PUT') { objects.set(key, Buffer.concat(chunks)); res.writeHead(200).end(); return; }
      if (req.method === 'DELETE') { objects.delete(key); res.writeHead(204).end(); return; }
      if (req.method === 'GET' && key) {
        const o = objects.get(key);
        if (!o) { res.writeHead(404).end(); return; }
        const out = corrupt && key.endsWith('.cvb') ? Buffer.concat([o.subarray(0, o.length - 1), Buffer.from([o[o.length - 1]! ^ 0xff])]) : o;
        res.writeHead(200, { 'content-type': 'application/octet-stream' }).end(out);
        return;
      }
      const prefix = url.searchParams.get('prefix') ?? '';
      const all = [...objects.keys()].filter(k => k.startsWith(prefix)).sort();
      res.writeHead(200, { 'content-type': 'application/xml' }).end(`<?xml version="1.0"?><ListBucketResult>${all.map(k => `<Contents><Key>${k}</Key><Size>${objects.get(k)!.length}</Size></Contents>`).join('')}<IsTruncated>false</IsTruncated></ListBucketResult>`);
    });
  });
  await new Promise<void>(r => server.listen(0, '127.0.0.1', r));
  endpoint = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => new Promise<void>(r => server.close(() => r())));

beforeEach(() => {
  objects.clear();
  corrupt = false;
  useTarget(null);
  resetBackups();
  resetCronRuns();
  const env = ENV();
  saved = Object.fromEntries(Object.keys(env).map(k => [k, process.env[k]]));
  Object.assign(process.env, env);
});
afterEach(() => {
  for (const [k, v] of Object.entries(saved)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  vi.restoreAllMocks();
  resetCronRuns();
});

const scheduled = () => cronGET(new Request('http://x/api/cron/backup', { headers: { authorization: 'Bearer cron-secret', 'x-civicos-scheduler': 'pg_cron' } }));

describe('backups on a serverless host', () => {
  it('refuses a local directory there, and takes S3', () => {
    expect(() => targetFromEnv({ VERCEL: '1' } as unknown as NodeJS.ProcessEnv)).toThrow(/serverless.*CIVICOS_BACKUP_TARGET=s3/);
    expect(() => targetFromEnv({ CIVICOS_SERVERLESS: 'on', CIVICOS_BACKUP_TARGET: 'dir', CIVICOS_BACKUP_DIR: '/tmp/x' } as unknown as NodeJS.ProcessEnv)).toThrow(/serverless/);
    expect(targetFromEnv({} as unknown as NodeJS.ProcessEnv).kind).toBe('dir'); // a long-running server keeps its directory default
    expect(targetFromEnv(process.env).kind).toBe('s3');
  });

  it('the scheduled job takes the backup, verifies it from S3 in the same run, and writes nothing to the local disk', async () => {
    const writes = [vi.spyOn(fsp, 'writeFile'), vi.spyOn(fsp, 'mkdir'), vi.spyOn(fsp, 'rename')];
    const res = await scheduled();
    const body = await res.json() as { ok: boolean; summary: { took?: string; verified?: boolean } };
    expect(res.status).toBe(200);
    expect(body).toMatchObject({ ok: true, summary: { verified: true } });
    const id = body.summary.took!;
    expect([...objects.keys()].sort()).toEqual([`civicos-backups/${id}.cvb`, `civicos-backups/${id}.json`]);
    const entry = (await listBackups()).find(b => b.id === id)!;
    expect(entry.verification).toMatchObject({ ok: true });
    for (const w of writes) expect(w).not.toHaveBeenCalled();
    const job = cronOverview().find(j => j.name === 'backup')!;
    expect(job.lastRun).toMatchObject({ outcome: 'ok', scheduler: 'pg_cron', runKey: expect.stringMatching(/^slot:.*:41Z$/) });
  });

  it('a backup that does not verify fails the run, which is then retried', async () => {
    corrupt = true;
    const res = await scheduled();
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ ok: false, error: expect.stringMatching(/did not verify/) });
    const job = cronOverview().find(j => j.name === 'backup')!;
    expect(job.lastRun).toMatchObject({ outcome: 'failed', status: 503 });
    expect(job.retry).toMatchObject({ failures: 1, exhausted: false });
  });
});
