// Where backups are kept (register 3.7, 9.1). The target is also the
// catalogue: every backup is two objects, the encrypted archive
// `<id>.cvb` and a plain description `<id>.json` (who, when, why, size,
// the archive's SHA-256, the audit chain head, the release, the last
// verification — never any of the state itself). A standby instance with
// the same target and key lists and restores the same backups.
//
// CIVICOS_BACKUP_TARGET:
//   dir (default)  CIVICOS_BACKUP_DIR (default <cwd>/.civicos-backups), files
//                  written atomically, mode 0600
//   s3             S3-compatible object storage (./s3.ts)

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { secretFrom } from '@/lib/keys/remote';
import { S3Client } from './s3';

export interface BackupTarget {
  kind: 'dir' | 's3';
  /** For status pages (no credentials). */
  where: string;
  put(name: string, data: Buffer): Promise<void>;
  get(name: string): Promise<Buffer | null>;
  remove(name: string): Promise<void>;
  /** Object names. */
  list(): Promise<string[]>;
}

const NAME = /^[A-Za-z0-9._-]+$/;
const checkName = (n: string) => { if (!NAME.test(n) || n.startsWith('.')) throw new Error(`Not a backup object name: ${n}`); return n; };

export function dirTarget(dir: string): BackupTarget {
  return {
    kind: 'dir',
    where: dir,
    async put(name, data) {
      await fs.mkdir(dir, { recursive: true, mode: 0o700 });
      const file = path.join(dir, checkName(name));
      const tmp = path.join(dir, `.${name}.${randomUUID().slice(0, 8)}.tmp`);
      await fs.writeFile(tmp, data, { mode: 0o600 });
      await fs.rename(tmp, file);
    },
    async get(name) {
      try { return await fs.readFile(path.join(dir, checkName(name))); } catch (e) { if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null; throw e; }
    },
    async remove(name) { await fs.unlink(path.join(dir, checkName(name))).catch(e => { if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e; }); },
    async list() { return (await fs.readdir(dir).catch(() => [] as string[])).filter(n => NAME.test(n) && !n.startsWith('.')); },
  };
}

export function s3Target(client: S3Client): BackupTarget {
  return {
    kind: 's3',
    where: `${client.cfg.endpoint.origin}/${client.cfg.bucket}/${client.cfg.prefix}`,
    put: (name, data) => client.put(checkName(name), data, name.endsWith('.json') ? 'application/json' : 'application/octet-stream'),
    get: name => client.get(checkName(name)),
    remove: name => client.delete(checkName(name)),
    async list() { return (await client.list()).map(o => o.key).filter(k => NAME.test(k)); },
  };
}

const on = (v: string | undefined, dflt: boolean) => (v === undefined || v.trim() === '' ? dflt : /^(1|on|true|yes)$/i.test(v.trim()));

/** The target configured in the environment. Throws with what is missing. */
export function targetFromEnv(env: NodeJS.ProcessEnv = process.env): BackupTarget {
  const g = globalThis as unknown as { __backupTargetOverride?: BackupTarget };
  if (g.__backupTargetOverride) return g.__backupTargetOverride;
  const kind = (env.CIVICOS_BACKUP_TARGET ?? 'dir').trim().toLowerCase();
  if (kind === 's3') {
    const raw = env.CIVICOS_BACKUP_S3_ENDPOINT?.trim();
    if (!raw) throw new Error('CIVICOS_BACKUP_TARGET=s3 needs CIVICOS_BACKUP_S3_ENDPOINT');
    const bucket = env.CIVICOS_BACKUP_S3_BUCKET?.trim();
    if (!bucket) throw new Error('CIVICOS_BACKUP_TARGET=s3 needs CIVICOS_BACKUP_S3_BUCKET');
    const accessKeyId = secretFrom(env, 'CIVICOS_BACKUP_S3_ACCESS_KEY_ID');
    const secretAccessKey = secretFrom(env, 'CIVICOS_BACKUP_S3_SECRET_ACCESS_KEY');
    if (!accessKeyId || !secretAccessKey) throw new Error('CIVICOS_BACKUP_TARGET=s3 needs CIVICOS_BACKUP_S3_ACCESS_KEY_ID and CIVICOS_BACKUP_S3_SECRET_ACCESS_KEY');
    const sessionToken = secretFrom(env, 'CIVICOS_BACKUP_S3_SESSION_TOKEN');
    let prefix = env.CIVICOS_BACKUP_S3_PREFIX?.trim() ?? 'civicos-backups/';
    if (prefix && !prefix.endsWith('/')) prefix += '/';
    return s3Target(new S3Client({
      endpoint: new URL(raw), bucket, region: env.CIVICOS_BACKUP_S3_REGION?.trim() || 'us-east-1', prefix,
      credentials: { accessKeyId, secretAccessKey, ...(sessionToken ? { sessionToken } : {}) },
      pathStyle: on(env.CIVICOS_BACKUP_S3_PATH_STYLE, true), allowPrivate: on(env.CIVICOS_BACKUP_S3_ALLOW_PRIVATE, false),
    }));
  }
  if (kind !== 'dir') throw new Error(`CIVICOS_BACKUP_TARGET must be dir or s3, not ${kind}`);
  return dirTarget(env.CIVICOS_BACKUP_DIR?.trim() || path.join(process.cwd(), '.civicos-backups'));
}

/** Use another target (tests). */
export function useTarget(t: BackupTarget | null): void {
  (globalThis as unknown as { __backupTargetOverride?: BackupTarget }).__backupTargetOverride = t ?? undefined;
}
