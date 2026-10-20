// scripts/self-host.mjs (docs/SELF_HOSTING.md): the settings it writes once
// and never replaces, the folders it makes, its arguments and its scheduler's
// clock. The end-to-end run (build, start, sign-in, backup, restart) is
// described in docs/SELF_HOSTING.md and run by hand.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { chmodSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { createPrivateKey } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import {
  parseArgs, ensureEnvFile, ensureDataDirs, parseEnvText, setupToken, printableEnv, mergeEnv, cronMatches, dueJobs,
  parseCron, internalUrl, exposed, msToNextMinute, nodeOk, ENV_FILE, SUBDIRS, SETUP_TOKEN_LENGTH, type SelfHostArgs,
} from '../../../scripts/self-host-lib.mjs';
import { parseKek } from '@/lib/crypto/envelope';
import { MIN_SETUP_TOKEN } from '@/lib/auth/setup-token';
import { authMode } from '@/lib/auth/mode';
import { sessionSecretProblem } from '@/lib/auth/officials';

const posix = process.platform !== 'win32';
let dir: string;
beforeEach(() => { dir = mkdtempSync(path.join(os.tmpdir(), 'civicos-selfhost-')); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

const args = (...a: string[]) => parseArgs(a) as SelfHostArgs;

describe('arguments', () => {
  it('defaults to starting on 127.0.0.1:3000 with ./civicos-data', () => {
    expect(args()).toMatchObject({ command: 'start', data: 'civicos-data', port: 3000, host: '127.0.0.1', build: true, printEnv: false });
  });

  it('reads subcommands and options, with or without =', () => {
    expect(args('backup', '--data', '/srv/civicos', '--port=3801')).toMatchObject({ command: 'backup', data: '/srv/civicos', port: 3801 });
    expect(args('status', '--data=/x')).toMatchObject({ command: 'status', data: '/x' });
    expect(args('--host', '0.0.0.0', '--url', 'https://civicos.example.gov/some/path')).toMatchObject({ host: '0.0.0.0', url: 'https://civicos.example.gov' });
    expect(args('--print-env', '--show-secrets', '--no-build')).toMatchObject({ printEnv: true, showSecrets: true, build: false });
    expect(args('-h').help).toBe(true);
  });

  it('refuses what it cannot use', () => {
    expect(parseArgs(['--port', '70000'])).toHaveProperty('error');
    expect(parseArgs(['--port', 'abc'])).toHaveProperty('error');
    expect(parseArgs(['--port'])).toHaveProperty('error');
    expect(parseArgs(['--data', '--port', '1'])).toHaveProperty('error');
    expect(parseArgs(['--url', 'ftp://x'])).toHaveProperty('error');
    expect(parseArgs(['--url', 'https://u:p@x'])).toHaveProperty('error');
    expect(parseArgs(['--url', 'not a url'])).toHaveProperty('error');
    expect(parseArgs(['--whatever'])).toHaveProperty('error');
  });

  it('knows which addresses answer the network, and how this computer reaches the server', () => {
    expect(exposed('127.0.0.1')).toBe(false);
    expect(exposed('localhost')).toBe(false);
    expect(exposed('::1')).toBe(false);
    expect(exposed('0.0.0.0')).toBe(true);
    expect(exposed('192.168.1.20')).toBe(true);
    expect(internalUrl('0.0.0.0', 3000)).toBe('http://127.0.0.1:3000');
    expect(internalUrl('127.0.0.1', 3801)).toBe('http://127.0.0.1:3801');
    expect(internalUrl('::', 3000)).toBe('http://[::1]:3000');
    expect(internalUrl('192.168.1.20', 80)).toBe('http://192.168.1.20:80');
  });

  it('needs Node 22 or newer', () => {
    expect(nodeOk('22.0.0')).toBe(true);
    expect(nodeOk('24.1.0')).toBe(true);
    expect(nodeOk('20.18.0')).toBe(false);
  });
});

describe('the data folder', () => {
  it('makes state, backups, tiles and anchors, owner-only', () => {
    const d = ensureDataDirs(path.join(dir, 'data'));
    for (const s of SUBDIRS) expect(existsSync(path.join(d, s))).toBe(true);
    if (posix) {
      expect(statSync(d).mode & 0o777).toBe(0o700);
      for (const s of SUBDIRS) expect(statSync(path.join(d, s)).mode & 0o777).toBe(0o700);
    }
  });
});

describe('the settings file', () => {
  const make = () => { const d = ensureDataDirs(path.join(dir, 'data')); return ensureEnvFile({ dataDir: d, url: 'http://localhost:3000' }); };

  it('is made once, owner-only, with every secret and local setting', () => {
    const r = make();
    expect(r.created).toBe(true);
    expect(r.file).toBe(path.join(dir, 'data', ENV_FILE));
    if (posix) expect(statSync(r.file).mode & 0o777).toBe(0o600);
    const env = Object.fromEntries(parseEnvText(readFileSync(r.file, 'utf8')));
    expect(env).toEqual(r.env);
    expect(env).toMatchObject({
      CIVICOS_MODE: 'production', CIVICOS_AUTH: 'enforce', CIVICOS_STATE: 'file', CIVICOS_BACKUP_TARGET: 'dir', CIVICOS_PUBLIC_URL: 'http://localhost:3000',
      CIVICOS_STATE_DIR: path.join(dir, 'data', 'state'), CIVICOS_BACKUP_DIR: path.join(dir, 'data', 'backups'),
      CIVICOS_TILES_DIR: path.join(dir, 'data', 'tiles'), CIVICOS_AUDIT_ANCHOR_FILE: path.join(dir, 'data', 'anchors', 'platform-audit-heads.jsonl'),
    });
    // The app accepts them as they are: sign-in enforced with a usable session secret.
    expect(authMode({ CIVICOS_AUTH: env.CIVICOS_AUTH, NODE_ENV: 'production' }).enforced).toBe(true);
    expect(sessionSecretProblem(env as NodeJS.ProcessEnv)).toBeNull();
  });

  it('writes keys in the formats the platform reads', () => {
    const { env } = make();
    // Session secret: 48 random bytes. Cron secret: 32.
    expect(Buffer.from(env.CIVICOS_SESSION_SECRET!, 'base64url')).toHaveLength(48);
    expect(Buffer.from(env.CIVICOS_CRON_SECRET!, 'base64url')).toHaveLength(32);
    // Data key: 32 bytes as one whole base64 value, which is always the key itself, never a file path.
    expect(env.CIVICOS_DATA_KEK).toMatch(/^[A-Za-z0-9+/]{43}=$/);
    expect(parseKek(env.CIVICOS_DATA_KEK)).toHaveLength(32);
    // Setup code: long enough for lib/auth/setup-token.ts, unambiguous characters.
    expect(env.CIVICOS_SETUP_TOKEN).toHaveLength(SETUP_TOKEN_LENGTH);
    expect(SETUP_TOKEN_LENGTH).toBeGreaterThanOrEqual(MIN_SETUP_TOKEN);
    expect(env.CIVICOS_SETUP_TOKEN).toMatch(/^[A-HJ-NP-Z2-9]+$/);
    // Signing keys: Ed25519 PEM on one line (\n), as lib/crypto/signing-key.ts reads them.
    for (const k of ['CIVICOS_AUDIT_KEY', 'CIVICOS_EXCHANGE_KEY', 'CIVICOS_TOKEN_KEY', 'CIVICOS_DECISION_KEY']) {
      expect(env[k]).toMatch(/^-----BEGIN PRIVATE KEY-----\\n.+\\n-----END PRIVATE KEY-----$/);
      expect(createPrivateKey(env[k]!.replace(/\\n/g, '\n')).asymmetricKeyType).toBe('ed25519');
    }
    expect(new Set([env.CIVICOS_AUDIT_KEY, env.CIVICOS_EXCHANGE_KEY, env.CIVICOS_TOKEN_KEY, env.CIVICOS_DECISION_KEY]).size).toBe(4);
  });

  it('a data key that starts with "/" is still read as the key', () => {
    const bytes = Buffer.alloc(32, 0); bytes[0] = 0xfc; // base64 "/A…"
    const r = ensureEnvFile({ dataDir: ensureDataDirs(path.join(dir, 'd2')), url: 'http://localhost:3000', rand: n => (n === 32 ? bytes : Buffer.alloc(n, 7)) });
    expect(r.env.CIVICOS_DATA_KEK!.startsWith('/')).toBe(true);
    expect(parseKek(r.env.CIVICOS_DATA_KEK)).toEqual(bytes);
  });

  it('never replaces a value: a second run keeps every secret, adds only what is missing', () => {
    const first = make();
    const before = readFileSync(first.file, 'utf8');
    const again = ensureEnvFile({ dataDir: path.join(dir, 'data'), url: 'http://localhost:4000' });
    expect(again.created).toBe(false);
    expect(again.added).toEqual([]);
    expect(again.env).toEqual(first.env);
    expect(readFileSync(first.file, 'utf8')).toBe(before);
    expect(again.conflicts).toEqual([{ key: 'CIVICOS_PUBLIC_URL', kept: 'http://localhost:3000', requested: 'http://localhost:4000' }]);

    // An operator's own edits stay; a removed setting is made again, nothing else changes.
    const edited = before.replace(/^CIVICOS_PUBLIC_URL=.*$/m, 'CIVICOS_PUBLIC_URL=https://civicos.example.gov').replace(/^CIVICOS_TILES_DIR=.*\n/m, '') + 'CIVICOS_LOG_LEVEL=warn\n';
    writeFileSync(first.file, edited);
    const third = ensureEnvFile({ dataDir: path.join(dir, 'data') });
    expect(third.added).toEqual(['CIVICOS_TILES_DIR']);
    expect(third.env).toMatchObject({ CIVICOS_PUBLIC_URL: 'https://civicos.example.gov', CIVICOS_LOG_LEVEL: 'warn', CIVICOS_DATA_KEK: first.env.CIVICOS_DATA_KEK, CIVICOS_SESSION_SECRET: first.env.CIVICOS_SESSION_SECRET });
    expect(Object.fromEntries(parseEnvText(readFileSync(first.file, 'utf8')))).toEqual(third.env);
  });

  it('makes a production installation unless --demo asks for a demonstration, and never changes it later', () => {
    expect(parseArgs([])).toMatchObject({ mode: undefined });
    expect(parseArgs(['--demo'])).toMatchObject({ mode: 'demo' });
    const demo = ensureEnvFile({ dataDir: ensureDataDirs(path.join(dir, 'demo')), url: 'http://localhost:3000', mode: 'demo' });
    expect(demo.env.CIVICOS_MODE).toBe('demo');
    const prod = make();
    expect(prod.env.CIVICOS_MODE).toBe('production');
    // A later --demo keeps the installation as it is and says so.
    const again = ensureEnvFile({ dataDir: path.join(dir, 'data'), mode: 'demo' });
    expect(again.env.CIVICOS_MODE).toBe('production');
    expect(again.conflicts).toContainEqual({ key: 'CIVICOS_MODE', kept: 'production', requested: 'demo' });
  });

  it('tightens the file to owner-only again', () => {
    const r = make();
    if (!posix) return;
    chmodSync(r.file, 0o644);
    ensureEnvFile({ dataDir: path.join(dir, 'data') });
    expect(statSync(r.file).mode & 0o777).toBe(0o600);
  });

  it('reads quoted values and comments, and expands nothing', () => {
    const m = parseEnvText('# c\nA=1\nexport B="two words"\nC=\'$HOME\'\n  \nD=x=y\nnot a line\n');
    expect(Object.fromEntries(m)).toEqual({ A: '1', B: 'two words', C: '$HOME', D: 'x=y' });
  });

  it('hides secrets when printed, unless asked', () => {
    const { env } = make();
    const shown = printableEnv(env);
    expect(shown).toContain('CIVICOS_STATE=file');
    expect(shown).not.toContain(env.CIVICOS_DATA_KEK!);
    expect(shown).not.toContain(env.CIVICOS_SETUP_TOKEN!);
    expect(shown).toMatch(/CIVICOS_SESSION_SECRET=<hidden: \d+ characters>/);
    expect(printableEnv(env, true)).toContain(env.CIVICOS_DATA_KEK!);
  });

  it('a variable set when starting wins over the file, and is reported', () => {
    const { env, overridden } = mergeEnv({ CIVICOS_STATE: 'file', CIVICOS_LOG_LEVEL: 'info' }, { CIVICOS_LOG_LEVEL: 'debug', PATH: '/bin' });
    expect(env).toMatchObject({ CIVICOS_STATE: 'file', CIVICOS_LOG_LEVEL: 'debug', PATH: '/bin' });
    expect(overridden).toEqual(['CIVICOS_LOG_LEVEL']);
  });

  it('setup codes are random', () => {
    expect(setupToken()).not.toBe(setupToken());
  });
});

describe('the scheduler clock (UTC)', () => {
  const at = (iso: string) => new Date(iso);

  it('matches every minute, steps, fixed minutes, lists and ranges', () => {
    expect(cronMatches('* * * * *', at('2026-10-19T10:17:00Z'))).toBe(true);
    expect(cronMatches('*/5 * * * *', at('2026-10-19T10:15:00Z'))).toBe(true);
    expect(cronMatches('*/5 * * * *', at('2026-10-19T10:17:00Z'))).toBe(false);
    expect(cronMatches('41 * * * *', at('2026-10-19T03:41:00Z'))).toBe(true);
    expect(cronMatches('41 * * * *', at('2026-10-19T03:42:00Z'))).toBe(false);
    expect(cronMatches('0,30 9-17 * * 1-5', at('2026-10-19T09:30:00Z'))).toBe(true); // a Monday
    expect(cronMatches('0,30 9-17 * * 1-5', at('2026-10-18T09:30:00Z'))).toBe(false); // a Sunday
    expect(cronMatches('0 0 1 * 0', at('2026-10-18T00:00:00Z'))).toBe(true); // day of month OR day of week
    expect(cronMatches('0 0 * * 7', at('2026-10-18T00:00:00Z'))).toBe(true); // 7 is Sunday too
    expect(cronMatches('10-20/5 * * * *', at('2026-10-19T10:15:00Z'))).toBe(true);
  });

  it('refuses schedules it does not understand', () => {
    expect(() => parseCron('* * * *')).toThrow();
    expect(() => parseCron('61 * * * *')).toThrow();
    expect(() => parseCron('@hourly * * * *')).toThrow();
  });

  it('picks the jobs due in a minute', () => {
    const jobs = [
      { name: 'a', schedule: '* * * * *', method: 'GET' as const, substrate: false },
      { name: 'b', schedule: '*/2 * * * *', method: 'GET' as const, substrate: false },
      { name: 'c', schedule: '0 * * * *', method: 'POST' as const, substrate: false },
    ];
    expect(dueJobs(jobs, at('2026-10-19T10:00:00Z')).map(j => j.name)).toEqual(['a', 'b', 'c']);
    expect(dueJobs(jobs, at('2026-10-19T10:01:00Z')).map(j => j.name)).toEqual(['a']);
    expect(msToNextMinute(Date.parse('2026-10-19T10:00:59.250Z'))).toBe(750);
  });
});
