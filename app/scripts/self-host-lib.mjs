// The parts of scripts/self-host.mjs that decide things (arguments, the
// settings file, folders, schedules), kept apart from the part that starts
// processes so they can be tested (src/lib/ops/self-host.test.ts).
// Plain Node 22, no dependencies.

import { randomBytes, generateKeyPairSync } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync, appendFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const APP_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const ENV_FILE = 'civicos.env';
export const RUN_FILE = 'self-host.json';
export const SCHEDULER_FILE = 'scheduler.json';
export const SUBDIRS = ['state', 'backups', 'tiles', 'anchors'];
export const DEFAULT_PORT = 3000;
export const DEFAULT_HOST = '127.0.0.1';
export const MIN_NODE_MAJOR = 22;
/** The one-time setup code's length (lib/auth/setup-token.ts needs at least 24). */
export const SETUP_TOKEN_LENGTH = 32;
const SETUP_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O, 1/I: typed by people

/** Values that are secrets: masked by --print-env unless --show-secrets. */
export const SECRET_KEYS = new Set([
  'CIVICOS_SESSION_SECRET', 'CIVICOS_DATA_KEK', 'CIVICOS_DATA_KEK_PREVIOUS', 'CIVICOS_CRON_SECRET', 'CIVICOS_SETUP_TOKEN',
  'CIVICOS_AUDIT_KEY', 'CIVICOS_EXCHANGE_KEY', 'CIVICOS_TOKEN_KEY', 'CIVICOS_EXPORT_SECRET', 'CIVICOS_PUBLISHER_SECRET',
  'CIVICOS_PROVISIONING_SECRET', 'CIVICOS_METRICS_TOKEN', 'SUPABASE_SERVICE_ROLE_KEY', 'DATABASE_URL',
]);

export const USAGE = `CivicOS on one computer

  node scripts/self-host.mjs [options]          start CivicOS (first run: creates the data folder and its keys)
  node scripts/self-host.mjs backup [options]   take an encrypted, verified backup now
  node scripts/self-host.mjs status [options]   is it running, where is the state, when was the last backup
  node scripts/self-host.mjs --print-env        show the settings it runs with (secrets hidden)

  (npm run self-host -- <the same arguments>)

Options
  --data <folder>   where CivicOS keeps its data, keys and backups (default ./civicos-data)
  --port <number>   the port to answer on (default 3000)
  --host <address>  the address to answer on (default 127.0.0.1, this computer only;
                    0.0.0.0 answers the whole network: put a TLS reverse proxy in front)
  --url <address>   the address people type to reach it, first run only (default http://localhost:<port>)
  --demo            first run only: a demonstration installation (sample records and a
                    banner on every page) instead of a production one (no samples)
  --no-build        do not build when no build exists; stop instead
  --show-secrets    with --print-env, show the secret values too
  -h, --help        this text

Guide: docs/SELF_HOSTING.md`;

/** Read the command line. Returns the options, or { error } for something it cannot use. */
export function parseArgs(argv) {
  const o = { command: 'start', data: 'civicos-data', port: DEFAULT_PORT, host: DEFAULT_HOST, url: undefined, printEnv: false, showSecrets: false, build: true, help: false, mode: undefined };
  const set = { port: false, host: false };
  const rest = [...argv];
  const value = (name, inline) => {
    if (inline !== undefined) return inline;
    const v = rest.shift();
    if (v === undefined || v.startsWith('--')) throw new Error(`${name} needs a value`);
    return v;
  };
  try {
    while (rest.length) {
      const a = rest.shift();
      const eq = a.startsWith('--') ? a.indexOf('=') : -1;
      const flag = eq > 0 ? a.slice(0, eq) : a;
      const inline = eq > 0 ? a.slice(eq + 1) : undefined;
      switch (flag) {
        case 'start': case 'backup': case 'status': o.command = flag; break;
        case '--data': o.data = value(flag, inline); if (!o.data.trim()) throw new Error('--data needs a folder'); break;
        case '--port': {
          const v = value(flag, inline);
          const n = Number(v);
          if (!/^\d+$/.test(v) || n < 1 || n > 65535) throw new Error(`--port must be a number from 1 to 65535, not ${v}`);
          o.port = n; set.port = true; break;
        }
        case '--host': o.host = value(flag, inline).trim(); if (!o.host) throw new Error('--host needs an address'); set.host = true; break;
        case '--url': {
          const v = value(flag, inline).trim();
          let u;
          try { u = new URL(v); } catch { throw new Error(`--url must be an address like https://civicos.example.gov, not ${v}`); }
          if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('--url must start with http:// or https://');
          if (u.username || u.password) throw new Error('--url must not carry a user name or password');
          o.url = u.origin; break;
        }
        case '--print-env': o.printEnv = true; break;
        case '--show-secrets': o.showSecrets = true; break;
        case '--no-build': o.build = false; break;
        case '--demo': o.mode = 'demo'; break;
        case '-h': case '--help': case 'help': o.help = true; break;
        default: throw new Error(`Unknown argument ${a} (see --help)`);
      }
    }
  } catch (e) {
    return { error: e.message };
  }
  o.portSet = set.port; o.hostSet = set.host;
  return o;
}

/** Whether an address answers other computers (anything but loopback). */
export function exposed(host) {
  const h = host.toLowerCase().replace(/^\[|\]$/g, '');
  return !(h === 'localhost' || h === '::1' || /^127\./.test(h));
}

/** The address this computer reaches the server on (the scheduler, the middleware's own check). */
export function internalUrl(host, port) {
  const h = host.replace(/^\[|\]$/g, '');
  if (h === '0.0.0.0' || h === 'localhost') return `http://127.0.0.1:${port}`;
  if (h === '::' || h === '::0') return `http://[::1]:${port}`;
  return h.includes(':') ? `http://[${h}]:${port}` : `http://${h}:${port}`;
}

// ── The settings file ────────────────────────────────────────────────────

/** KEY=VALUE lines; # comments and blank lines ignored; one pair of surrounding quotes removed. Nothing is expanded. */
export function parseEnvText(text) {
  const out = new Map();
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const m = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!m) continue;
    let v = m[2];
    if (v.length >= 2 && ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))) v = v.slice(1, -1);
    out.set(m[1], v);
  }
  return out;
}

const pemOneLine = pem => pem.trim().replace(/\r?\n/g, '\\n');

/** A one-time setup code: SETUP_TOKEN_LENGTH characters people can type (no 0/O, 1/I). */
export function setupToken(rand = randomBytes) {
  // 256 is a multiple of the alphabet's 32 characters, so every character is equally likely.
  return Array.from(rand(SETUP_TOKEN_LENGTH), b => SETUP_ALPHABET[b % SETUP_ALPHABET.length]).join('');
}

/**
 * Every setting a first run writes, in order, with the comment above it. Each
 * value is made only when asked for (`make`), so an existing value is never
 * regenerated.
 */
export function settingsFor({ dataDir, url, mode = 'production', rand = randomBytes, keyPair = () => generateKeyPairSync('ed25519') }) {
  const d = path.resolve(dataDir);
  const signing = () => pemOneLine(keyPair().privateKey.export({ type: 'pkcs8', format: 'pem' }).toString());
  return [
    { key: 'CIVICOS_MODE', make: () => mode, note: 'What this installation is (lib/ops/mode.ts): production (a real government, no sample records), training or demo.' },
    { key: 'CIVICOS_AUTH', make: () => 'enforce', note: 'Sign-in is required for everything but the public pages (lib/auth/mode.ts).' },
    { key: 'CIVICOS_SESSION_SECRET', make: () => rand(48).toString('base64url'), note: 'Signs officials\' sessions. Changing it signs everyone out.' },
    { key: 'CIVICOS_DATA_KEK', make: () => rand(32).toString('base64'), note: 'THE DATA KEY. Encrypts backups and sealed secrets. Keep a safe copy away from this computer:\n# without it the backups and encrypted data cannot be read by anyone. (A whole base64 key is always read as the key, never as a file path.)' },
    { key: 'CIVICOS_CRON_SECRET', make: () => rand(32).toString('base64url'), note: 'Opens /api/cron/* only; the self-host scheduler sends it.' },
    { key: 'CIVICOS_SETUP_TOKEN', make: () => setupToken(rand), note: 'One-time code for the first administrator (typed on /sign-in). It works once; afterwards it is refused.' },
    { key: 'CIVICOS_AUDIT_KEY', make: signing, note: 'Signs the audit chain\'s heads (Ed25519).' },
    { key: 'CIVICOS_EXCHANGE_KEY', make: signing, note: 'Signs records exchanged with other installations (Ed25519).' },
    { key: 'CIVICOS_TOKEN_KEY', make: signing, note: 'Signs access tokens for connected systems (Ed25519).' },
    { key: 'CIVICOS_DECISION_KEY', make: signing, note: 'Seals legal decisions and certificates (Ed25519); keep a safe copy: certificates are checked against it.' },
    { key: 'CIVICOS_STATE', make: () => 'file', note: 'Where the platform keeps its state: files in CIVICOS_STATE_DIR.' },
    { key: 'CIVICOS_STATE_DIR', make: () => path.join(d, 'state') },
    { key: 'CIVICOS_BACKUP_TARGET', make: () => 'dir', note: 'Backups (encrypted with the data key) go to this folder. Copy it somewhere else regularly.' },
    { key: 'CIVICOS_BACKUP_DIR', make: () => path.join(d, 'backups') },
    { key: 'CIVICOS_TILES_DIR', make: () => path.join(d, 'tiles') },
    { key: 'CIVICOS_AUDIT_ANCHOR_FILE', make: () => path.join(d, 'anchors', 'platform-audit-heads.jsonl') },
    { key: 'CIVICOS_PUBLIC_URL', make: () => url, note: 'The address people type to reach CivicOS (passkeys and sign-in links are bound to it).' },
  ];
}

/** Restrict a file or folder to its owner where the system supports it (not on Windows: use the folder's ACLs there). */
export function restrict(p, mode, platform = process.platform) {
  if (platform === 'win32') return false;
  chmodSync(p, mode);
  return true;
}

/** Owner-only check (POSIX): no rights for group or others. */
export const ownerOnly = (p, platform = process.platform) => platform === 'win32' || (statSync(p).mode & 0o077) === 0;

/** The data folder and its sub-folders, owner-only. Returns the absolute path. */
export function ensureDataDirs(dataDir, platform = process.platform) {
  const d = path.resolve(dataDir);
  mkdirSync(d, { recursive: true, mode: 0o700 });
  restrict(d, 0o700, platform);
  for (const s of SUBDIRS) {
    const p = path.join(d, s);
    mkdirSync(p, { recursive: true, mode: 0o700 });
    restrict(p, 0o700, platform);
  }
  return d;
}

/**
 * Make sure <data>/civicos.env holds every setting: values already there are
 * never changed; missing ones are made and appended. The file is owner-only
 * (0600) on POSIX. `url` is used only when CIVICOS_PUBLIC_URL is missing.
 * Returns the file, which keys were added, the settings now in force, and the
 * ones where a requested value differs from the file's (`conflicts`).
 */
export function ensureEnvFile({ dataDir, url, mode, rand, keyPair, platform = process.platform, now = new Date() }) {
  const d = path.resolve(dataDir);
  const file = path.join(d, ENV_FILE);
  const existed = existsSync(file);
  const current = existed ? parseEnvText(readFileSync(file, 'utf8')) : new Map();
  const added = [];
  let text = '';
  for (const s of settingsFor({ dataDir: d, url, mode, rand, keyPair })) {
    if (current.has(s.key) && current.get(s.key) !== '') continue;
    const v = s.make();
    current.set(s.key, v);
    added.push(s.key);
    text += `${s.note ? `\n# ${s.note}\n` : ''}${s.key}=${v}\n`;
  }
  const conflicts = [];
  if (url && current.get('CIVICOS_PUBLIC_URL') !== url && !added.includes('CIVICOS_PUBLIC_URL')) conflicts.push({ key: 'CIVICOS_PUBLIC_URL', kept: current.get('CIVICOS_PUBLIC_URL'), requested: url });
  if (mode && current.get('CIVICOS_MODE') !== mode && !added.includes('CIVICOS_MODE')) conflicts.push({ key: 'CIVICOS_MODE', kept: current.get('CIVICOS_MODE'), requested: mode });
  if (!existed) {
    const head = `# CivicOS self-host settings, made by scripts/self-host.mjs on ${now.toISOString()}.\n`
      + `# Private: only the account that runs CivicOS may read this file.\n`
      + `# Values here are never replaced by the script; edit them yourself when needed.\n`;
    writeFileSync(file, head + text, { mode: 0o600 });
  } else if (text) {
    appendFileSync(file, `\n# Added by scripts/self-host.mjs on ${now.toISOString()}.\n${text}`, { mode: 0o600 });
  }
  restrict(file, 0o600, platform);
  return { file, created: !existed, added, conflicts, env: Object.fromEntries(current) };
}

/** The settings for --print-env: KEY=VALUE lines, secrets masked unless shown. */
export function printableEnv(env, showSecrets = false) {
  return Object.entries(env).map(([k, v]) => `${k}=${!showSecrets && SECRET_KEYS.has(k) && v ? `<hidden: ${v.length} characters>` : v}`).join('\n');
}

/**
 * The environment the server runs with: this process's environment, then the
 * file's settings for anything not already set (a variable set when starting
 * wins, as with Docker and systemd). Returns it and the names the process overrode.
 */
export function mergeEnv(fileEnv, processEnv = process.env) {
  const env = { ...processEnv };
  const overridden = [];
  for (const [k, v] of Object.entries(fileEnv)) {
    if (processEnv[k] !== undefined && processEnv[k] !== '') { if (processEnv[k] !== v) overridden.push(k); continue; }
    env[k] = v;
  }
  return { env, overridden };
}

// ── Schedules ────────────────────────────────────────────────────────────

/** The platform's scheduled jobs (scripts/cron-jobs.json). */
export function loadJobs(appDir = APP_DIR) {
  return JSON.parse(readFileSync(path.join(appDir, 'scripts', 'cron-jobs.json'), 'utf8')).jobs;
}

/** Whether the Supabase substrate is configured (the substrate-only jobs need it). */
export const substrateConfigured = env => !!(env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);

/** The jobs this installation runs: without the substrate, the substrate-only ones are left out. */
export const jobsFor = (jobs, env) => jobs.filter(j => !j.substrate || substrateConfigured(env));

const RANGES = [[0, 59], [0, 23], [1, 31], [1, 12], [0, 7]];

/** One cron field as the set of values it allows. Throws on what it does not understand. */
function field(text, [lo, hi]) {
  const out = new Set();
  for (const part of text.split(',')) {
    const m = /^(\*|(\d+)(?:-(\d+))?)(?:\/(\d+))?$/.exec(part);
    if (!m) throw new Error(`not a cron field: ${text}`);
    const step = m[4] ? Number(m[4]) : 1;
    let a = lo, b = hi;
    if (m[1] !== '*') { a = Number(m[2]); b = m[3] !== undefined ? Number(m[3]) : (m[4] ? hi : a); }
    if (a < lo || b > hi || a > b || step < 1) throw new Error(`cron field out of range: ${text}`);
    for (let v = a; v <= b; v += step) out.add(v);
  }
  return out;
}

/** Parse a 5-field cron expression (minute hour day-of-month month day-of-week; lists, ranges, steps). */
export function parseCron(expr) {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) throw new Error(`a cron schedule has 5 fields: ${expr}`);
  const [min, hour, dom, mon, dow] = parts.map((p, i) => field(p, RANGES[i]));
  if (dow.has(7)) dow.add(0);
  return { min, hour, dom, mon, dow, domAny: parts[2] === '*', dowAny: parts[4] === '*' };
}

/** Whether the schedule falls on this minute (UTC, as Kubernetes and pg_cron run them by default). */
export function cronMatches(expr, at) {
  const c = typeof expr === 'string' ? parseCron(expr) : expr;
  if (!c.min.has(at.getUTCMinutes()) || !c.hour.has(at.getUTCHours()) || !c.mon.has(at.getUTCMonth() + 1)) return false;
  const d = c.dom.has(at.getUTCDate()), w = c.dow.has(at.getUTCDay());
  // Standard cron: when both day fields are restricted, either may match.
  if (c.domAny && c.dowAny) return true;
  if (c.domAny) return w;
  if (c.dowAny) return d;
  return d || w;
}

/** The jobs due in the minute of `at`. */
export const dueJobs = (jobs, at) => jobs.filter(j => cronMatches(j.schedule, at));

/** Milliseconds until the start of the next minute. */
export const msToNextMinute = (now = Date.now()) => 60_000 - (now % 60_000);

/** Whether a Node version is new enough. */
export function nodeOk(version = process.versions.node) {
  return Number(version.split('.')[0]) >= MIN_NODE_MAJOR;
}
