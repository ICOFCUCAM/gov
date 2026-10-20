#!/usr/bin/env node
// CivicOS on one computer (docs/SELF_HOSTING.md): one command, no cloud,
// safe by default. Plain Node 22, no dependencies beyond the app's own.
//
//   node scripts/self-host.mjs [--data ./civicos-data] [--port 3000] [--host 127.0.0.1] [--url http://localhost:3000]
//   node scripts/self-host.mjs backup     take an encrypted, verified backup now
//   node scripts/self-host.mjs status     running? state, administrator, last backup, scheduled jobs
//   node scripts/self-host.mjs --print-env
//   (npm run self-host -- <the same arguments>)
//
// First run: makes the data folder (state/, backups/, tiles/, anchors/,
// owner-only), writes <data>/civicos.env once with fresh secrets (session
// secret, data key, cron secret, one-time setup code, signing keys) and the
// local settings (file state, local backups, sign-in enforced; values already
// there are never replaced), builds the app when no build exists, starts
// `next start` on 127.0.0.1, prints the setup code while no administrator
// exists, and runs the platform's scheduled jobs (scripts/cron-jobs.json, the
// list the Helm chart and pg_cron use) by calling /api/cron/* with the cron
// secret, since a single computer has no pg_cron or Kubernetes. Ctrl-C stops
// it cleanly. Nothing is restarted automatically: run it as a service for that.

import { spawn } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, writeFileSync, rmSync, statSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import {
  APP_DIR, ENV_FILE, RUN_FILE, SCHEDULER_FILE, USAGE, parseArgs, exposed, internalUrl, parseEnvText, ensureDataDirs,
  ensureEnvFile, printableEnv, mergeEnv, loadJobs, jobsFor, substrateConfigured, dueJobs, msToNextMinute, nodeOk,
  ownerOnly, restrict, MIN_NODE_MAJOR,
} from './self-host-lib.mjs';

const NEXT_BIN = path.join(APP_DIR, 'node_modules', 'next', 'dist', 'bin', 'next');
const BUILD_ID = path.join(APP_DIR, '.next', 'BUILD_ID');
const JOB_TIMEOUT_MS = 300_000;
const say = (s = '') => process.stdout.write(`${s}\n`);
const warn = s => process.stderr.write(`${s}\n`);
const tag = s => `[self-host] ${s}`;
const sleep = ms => new Promise(r => setTimeout(r, ms));

function fail(message, code = 1) {
  warn(tag(message));
  process.exit(code);
}

function alive(pid) {
  if (!pid) return false;
  try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; }
}

async function get(url, init = {}, timeoutMs = 5000) {
  const r = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  const text = await r.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* not JSON */ }
  return { status: r.status, ok: r.ok, json, text };
}

const readJson = f => { try { return JSON.parse(readFileSync(f, 'utf8')); } catch { return null; } };
const writePrivate = (f, data) => { writeFileSync(f, JSON.stringify(data, null, 2), { mode: 0o600 }); restrict(f, 0o600); };

/** The running self-host server for this data folder, if any. */
async function running(dataDir) {
  const run = readJson(path.join(dataDir, RUN_FILE));
  if (!run || !alive(run.pid) || !alive(run.serverPid)) return null;
  try { const h = await get(`${run.internal}/api/health?live`); if (h.ok) return run; } catch { /* not answering */ }
  return null;
}

function requireInstall() {
  if (!existsSync(NEXT_BIN)) fail(`The app's packages are not installed. In ${APP_DIR} run:\n    pnpm install --frozen-lockfile\n  (or: npm install), then start again.`);
}

/** Build when there is no build yet (or stop with what to do). */
async function ensureBuild(allowBuild) {
  requireInstall();
  if (existsSync(BUILD_ID)) return;
  if (!allowBuild) fail(`No build found (${BUILD_ID}). Build it first:  npm run build  (in ${APP_DIR})`);
  say(tag('No build found: building CivicOS now (npm run build). This takes several minutes the first time...'));
  // The build gets this process's environment only, never the secrets in civicos.env.
  const code = await new Promise(resolve => {
    const b = spawn(process.execPath, [NEXT_BIN, 'build'], { cwd: APP_DIR, stdio: 'inherit', env: { ...process.env, NODE_ENV: 'production' } });
    b.on('exit', c => resolve(c ?? 1));
    b.on('error', () => resolve(1));
  });
  if (code !== 0 || !existsSync(BUILD_ID)) fail(`The build failed (exit ${code}). Fix the error above, or run  npm run build  yourself, then start again.`);
}

/** Start `next start` with the settings; returns the child process. */
function startServer({ env, host, port, stdio = 'inherit' }) {
  return spawn(process.execPath, [NEXT_BIN, 'start', '-p', String(port), '-H', host], { cwd: APP_DIR, env, stdio });
}

async function waitReady(base, child, timeoutMs = 120_000) {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    if (child.exitCode !== null) return false;
    try { const h = await get(`${base}/api/health?live`, {}, 3000); if (h.ok) return true; } catch { /* starting */ }
    await sleep(500);
  }
  return false;
}

/** The environment the server runs with: settings file, then the extras that depend on this run. */
function serverEnv(fileEnv, { host, port }) {
  const { env, overridden } = mergeEnv(fileEnv);
  env.NODE_ENV = 'production';
  // The middleware asks the server who a session belongs to; on this computer that is the loopback address.
  if (!env.CIVICOS_INTERNAL_URL) env.CIVICOS_INTERNAL_URL = internalUrl(host, port);
  return { env, overridden };
}

function loadSettings(dataDir) {
  const file = path.join(dataDir, ENV_FILE);
  if (!existsSync(file)) return null;
  return { file, env: Object.fromEntries(parseEnvText(readFileSync(file, 'utf8'))) };
}

// ── start ────────────────────────────────────────────────────────────────

async function start(o, dataDir) {
  ensureDataDirs(dataDir);
  const r = ensureEnvFile({ dataDir, url: o.url ?? `http://localhost:${o.port}`, mode: o.mode });
  if (r.created) {
    say(tag(`Created the settings file ${r.file}${process.platform === 'win32' ? '' : ' (readable by this account only)'}.`));
    say(tag('It holds the data key CIVICOS_DATA_KEK. Keep a safe copy of that file (or at least that key) away'));
    say(tag('from this computer: without the key, encrypted data and every backup are lost for good.'));
  } else {
    say(tag(`Using the settings in ${r.file}${r.added.length ? ` (added: ${r.added.join(', ')})` : ''}.`));
  }
  if (process.platform === 'win32') {
    say(tag('Windows: file permissions are not changed by this script. Limit the data folder to the account that runs CivicOS:'));
    say(`    icacls "${dataDir}" /inheritance:r /grant:r "%USERNAME%:(OI)(CI)F"`);
  } else if (!ownerOnly(r.file)) {
    warn(tag(`Warning: ${r.file} can be read by other accounts; it should be mode 600.`));
  }
  // Only an explicit --url is a request; the default (from --port) just fills a missing setting.
  for (const c of r.conflicts) {
    if (c.key === 'CIVICOS_PUBLIC_URL' && o.url) warn(tag(`${c.key} stays ${c.kept} (from ${ENV_FILE}); --url only applies on the first run. Edit the file to change it.`));
    if (c.key === 'CIVICOS_MODE') warn(tag(`${c.key} stays ${c.kept} (from ${ENV_FILE}); --demo only applies on the first run. Edit the file to change it.`));
  }

  const prev = readJson(path.join(dataDir, RUN_FILE));
  if (prev && alive(prev.pid) && prev.pid !== process.pid) fail(`CivicOS is already running for ${dataDir} (process ${prev.pid}, ${prev.internal}). Stop it first.`);

  await ensureBuild(o.build);

  const { env, overridden } = serverEnv(r.env, o);
  for (const k of overridden) warn(tag(`${k} is set in this shell and replaces the value in ${ENV_FILE}.`));
  if (exposed(o.host)) {
    warn(tag(`Warning: answering on ${o.host}, so other computers on the network can reach CivicOS over plain HTTP.`));
    warn(tag('Passwords and sessions then cross the network unencrypted. Put a TLS reverse proxy (e.g. Caddy, docs/SELF_HOSTING.md) in front'));
    warn(tag('and keep --host 127.0.0.1, or use this only on a network you control.'));
  }

  const child = startServer({ env, host: o.host, port: o.port });
  const run = { pid: process.pid, serverPid: child.pid, host: o.host, port: o.port, internal: env.CIVICOS_INTERNAL_URL, publicUrl: env.CIVICOS_PUBLIC_URL, startedAt: new Date().toISOString() };
  const runFile = path.join(dataDir, RUN_FILE);
  writePrivate(runFile, run);

  let stopping = false;
  let timer = null;
  const cleanup = () => { try { if (readJson(runFile)?.pid === process.pid) rmSync(runFile); } catch { /* gone */ } };

  child.on('exit', (code, signal) => {
    if (timer) clearTimeout(timer);
    cleanup();
    if (stopping) { say(tag('CivicOS stopped.')); process.exit(0); }
    warn(tag(`CivicOS stopped unexpectedly (${signal ?? `exit ${code}`}). It is not restarted automatically;`));
    warn(tag('start it again, or run it as a service that restarts it (docs/SELF_HOSTING.md).'));
    process.exit(code || 1);
  });

  // Ctrl-C reaches the server too (same terminal), so only other signals are passed on; if the server
  // has not stopped after a while it is asked again, then ended.
  const stop = sig => {
    if (stopping) return;
    stopping = true;
    if (timer) clearTimeout(timer);
    say(tag(`Stopping CivicOS (${sig}); the state is saved before it exits...`));
    if (sig !== 'SIGINT' && process.platform !== 'win32') child.kill('SIGTERM');
    setTimeout(() => { if (child.exitCode === null) child.kill('SIGTERM'); }, sig === 'SIGINT' ? 10_000 : 15_000).unref();
    setTimeout(() => { if (child.exitCode === null) { warn(tag('The server did not stop; ending it.')); child.kill('SIGKILL'); } }, 30_000).unref();
  };
  for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(sig, () => stop(sig));
  process.on('exit', cleanup);

  if (!(await waitReady(run.internal, child))) {
    if (child.exitCode === null) { stopping = true; child.kill('SIGTERM'); }
    fail('CivicOS did not start within two minutes; see the messages above.');
  }

  const who = await get(`${run.internal}/api/auth/official`).catch(() => null);
  say('');
  say(tag(`CivicOS is running: ${run.publicUrl}${run.publicUrl !== `http://localhost:${o.port}` ? `  (on this computer: http://localhost:${o.port})` : ''}`));
  say(tag(`Data: ${dataDir}  ·  state: ${env.CIVICOS_STATE}  ·  backups: ${env.CIVICOS_BACKUP_DIR ?? env.CIVICOS_BACKUP_TARGET}`));
  if (who?.json && who.json.accounts === false) {
    const token = env.CIVICOS_SETUP_TOKEN;
    say('');
    say('================ CIVICOS FIRST ADMINISTRATOR ================');
    say('No administrator exists yet. Open');
    say(`    ${run.publicUrl}/sign-in`);
    say('The page shows "Create the first official account". Fill it in with this one-time setup code:');
    say('');
    say(token ? `    ${token}` : '    (CIVICOS_SETUP_TOKEN is not set: use the CIVICOS SETUP CODE the server wrote above)');
    say('');
    say('It works once. Keep it private until you have used it.');
    say('=============================================================');
    say('');
  }

  // ── The scheduled jobs ──
  const all = loadJobs();
  const jobs = jobsFor(all, env);
  const skipped = all.length - jobs.length;
  say(tag(`Scheduled jobs: ${jobs.length} run here (UTC schedules from scripts/cron-jobs.json)${skipped ? `; ${skipped} need the Supabase substrate and are skipped` : ''}.`));
  say(tag('Each job\'s first run and any failure are shown here; every run is recorded in ' + path.join(dataDir, SCHEDULER_FILE) + '.'));
  say(tag('Press Ctrl-C to stop.'));
  const schedFile = path.join(dataDir, SCHEDULER_FILE);
  const record = readJson(schedFile)?.jobs ?? {};
  const busy = new Set();
  const shown = new Set();
  const saveRecord = () => { try { writePrivate(schedFile, { updatedAt: new Date().toISOString(), substrate: substrateConfigured(env), jobs: record }); } catch { /* next time */ } };

  const runJob = async job => {
    if (busy.has(job.name)) return; // never overlaps itself (like the chart's concurrencyPolicy: Forbid)
    busy.add(job.name);
    const t0 = Date.now();
    let status = 0, error;
    try {
      const res = await get(`${run.internal}/api/cron/${job.name}`, {
        method: job.method,
        headers: { authorization: `Bearer ${env.CIVICOS_CRON_SECRET}`, 'content-type': 'application/json' },
        body: job.method === 'POST' ? '{}' : undefined,
      }, JOB_TIMEOUT_MS);
      status = res.status;
      if (!res.ok) error = (res.json?.error ?? res.text).toString().slice(0, 300);
    } catch (e) { error = String(e?.message ?? e); }
    busy.delete(job.name);
    const ms = Date.now() - t0;
    const before = record[job.name];
    const ok = !error;
    record[job.name] = { lastAt: new Date(t0).toISOString(), status, ok, ms, ...(ok ? { lastOkAt: new Date(t0).toISOString() } : { error, lastOkAt: before?.lastOkAt }), runs: (before?.runs ?? 0) + 1, failures: (before?.failures ?? 0) + (ok ? 0 : 1) };
    saveRecord();
    if (!ok) warn(tag(`job ${job.name} failed: ${status || 'no answer'} ${error}`));
    else if (!shown.has(job.name)) say(tag(`job ${job.name}: ${status} in ${ms} ms (first run; later successful runs are recorded, not shown)`));
    else if (before && !before.ok) say(tag(`job ${job.name} works again: ${status} in ${ms} ms`));
    shown.add(job.name);
  };

  const tick = () => {
    if (stopping) return;
    const at = new Date(Date.now() + 500); // the minute just begun
    for (const job of dueJobs(jobs, at)) void runJob(job);
    timer = setTimeout(tick, msToNextMinute());
  };
  timer = setTimeout(tick, msToNextMinute());
}

// ── backup ───────────────────────────────────────────────────────────────

const freePort = () => new Promise((resolve, reject) => {
  const s = net.createServer();
  s.once('error', reject);
  s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); });
});

async function backup(o, dataDir) {
  const settings = loadSettings(dataDir);
  if (!settings) fail(`No settings in ${dataDir} yet: start CivicOS once first (node scripts/self-host.mjs${o.data !== 'civicos-data' ? ` --data ${o.data}` : ''}).`);
  let run = await running(dataDir);
  let temp = null;
  let env;
  if (run) {
    env = serverEnv(settings.env, run).env;
    say(tag(`CivicOS is running (process ${run.serverPid}); asking it for a backup now...`));
  } else {
    const prev = readJson(path.join(dataDir, RUN_FILE));
    if (prev && alive(prev.pid)) fail(`CivicOS is starting or stopping for ${dataDir} (process ${prev.pid}); try again in a minute.`);
    await ensureBuild(o.build);
    const port = await freePort();
    ({ env } = serverEnv(settings.env, { host: '127.0.0.1', port }));
    env.CIVICOS_STATE_INTERVAL_MS = '1000';
    say(tag('CivicOS is not running: starting it briefly on this computer only to take the backup...'));
    let output = '';
    temp = startServer({ env, host: '127.0.0.1', port, stdio: ['ignore', 'pipe', 'pipe'] });
    temp.stdout.on('data', d => { output += d; });
    temp.stderr.on('data', d => { output += d; });
    run = { serverPid: temp.pid, internal: env.CIVICOS_INTERNAL_URL, temporary: true };
    writePrivate(path.join(dataDir, RUN_FILE), { pid: process.pid, serverPid: temp.pid, internal: run.internal, temporary: true, startedAt: new Date().toISOString() });
    if (!(await waitReady(run.internal, temp))) {
      temp.kill('SIGTERM');
      rmSync(path.join(dataDir, RUN_FILE), { force: true });
      fail(`CivicOS could not be started for the backup:\n${output.slice(-3000)}`);
    }
  }
  let res;
  try {
    res = await get(`${run.internal}/api/cron/backup?now`, { headers: { authorization: `Bearer ${env.CIVICOS_CRON_SECRET}` } }, 600_000);
  } catch (e) { res = { ok: false, status: 0, json: { error: String(e?.message ?? e) } }; }
  if (temp) {
    await sleep(2500); // the audit entry for the backup is saved (every second on this brief run)
    temp.kill('SIGTERM');
    await new Promise(r => { if (temp.exitCode !== null) r(); else { temp.once('exit', r); setTimeout(() => { temp.kill('SIGKILL'); r(); }, 20_000).unref(); } });
    rmSync(path.join(dataDir, RUN_FILE), { force: true });
  }
  const s = res.json?.summary;
  if (!res.ok || !s?.took) fail(`The backup failed: ${s?.error ?? res.json?.error ?? `HTTP ${res.status}`}`);
  const dir = env.CIVICOS_BACKUP_TARGET === 's3' ? null : env.CIVICOS_BACKUP_DIR;
  const file = dir ? path.join(dir, `${s.took}.cvb`) : null;
  const size = file && existsSync(file) ? statSync(file).size : null;
  say(tag(`Backup ${s.took} taken${s.verified ? ' and verified (read back, decrypted, every part checked, dry-run restore)' : ', but NOT verified: see status in Platform → Backups'}.`));
  if (file) say(tag(`File: ${file}${size !== null ? ` (${size} bytes, encrypted with CIVICOS_DATA_KEK)` : ''}`));
  if (s.pruned?.length) say(tag(`Older backups removed by the retention policy: ${s.pruned.join(', ')}`));
  say(tag('Copy the backups folder to another place (USB disk, another computer) regularly, and keep the data key separately.'));
  process.exit(s.verified ? 0 : 1);
}

// ── status ───────────────────────────────────────────────────────────────

function lastBackup(dir) {
  if (!dir || !existsSync(dir)) return null;
  const entries = readdirSync(dir).filter(n => /^BK-\d{14}-[0-9a-f]{6}\.json$/.test(n)).map(n => readJson(path.join(dir, n))).filter(Boolean);
  entries.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  return { count: entries.length, newest: entries[0] ?? null };
}

async function status(o, dataDir) {
  const settings = loadSettings(dataDir);
  if (!settings) { say(`CivicOS is not set up in ${dataDir} yet. Start it with: node scripts/self-host.mjs${o.data !== 'civicos-data' ? ` --data ${o.data}` : ''}`); process.exit(1); }
  const env = mergeEnv(settings.env).env;
  say(`Data folder:   ${dataDir}`);
  say(`Settings:      ${settings.file}${process.platform !== 'win32' ? (ownerOnly(settings.file) ? ' (owner only)' : '  WARNING: readable by other accounts (should be mode 600)') : ''}`);
  say(`State:         ${env.CIVICOS_STATE ?? 'memory'}${env.CIVICOS_STATE === 'file' ? ` in ${env.CIVICOS_STATE_DIR}` : ''}`);
  say(`Installation:  ${env.CIVICOS_MODE ?? 'not set (runs as production)'}`);
  say(`Sign-in:       ${env.CIVICOS_AUTH === 'enforce' ? 'required' : env.CIVICOS_AUTH ?? 'production default (required)'}`);
  const run = await running(dataDir);
  let code = 0;
  if (run) {
    say(`Running:       yes, process ${run.serverPid}${run.temporary ? ' (briefly, for a backup)' : ''}, ${run.internal}${run.startedAt ? `, since ${run.startedAt}` : ''}`);
    const h = await get(`${run.internal}/api/health`).catch(() => null);
    const p = h?.json?.persistence;
    if (h?.json) {
      say(`Health:        ${h.json.status}${p ? `  ·  state ${p.mode}, ${p.role}${p.lastSaved ? `, saved ${p.lastSaved}` : ''}${p.error ? `, PROBLEM: ${p.error}` : ''}` : ''}`);
      say(`Audit chain:   ${h.json.audit?.entries ?? '?'} entries, ${h.json.audit?.intact ? 'intact' : 'NOT INTACT'}`);
      if (h.json.status === 'down') code = 1;
    }
    const who = await get(`${run.internal}/api/auth/official`).catch(() => null);
    if (who?.json) say(`Administrator: ${who.json.accounts ? 'exists' : 'not yet: sign in at /sign-in with the setup code (CIVICOS_SETUP_TOKEN in the settings file)'}`);
  } else {
    say('Running:       no');
    code = 1;
  }
  const b = lastBackup(env.CIVICOS_BACKUP_TARGET === 's3' ? null : env.CIVICOS_BACKUP_DIR);
  if (env.CIVICOS_BACKUP_TARGET === 's3') say('Last backup:   kept in S3; see Platform → Backups');
  else if (!b?.newest) say(`Last backup:   none yet in ${env.CIVICOS_BACKUP_DIR} (take one: node scripts/self-host.mjs backup)`);
  else {
    const n = b.newest;
    say(`Last backup:   ${n.id}, ${n.createdAt}, ${n.reason}, ${n.verification ? (n.verification.ok ? 'verified' : `verification FAILED: ${n.verification.problem ?? ''}`) : 'not verified'} (${b.count} in ${env.CIVICOS_BACKUP_DIR})`);
  }
  const sched = readJson(path.join(dataDir, SCHEDULER_FILE));
  if (sched?.jobs) {
    const list = Object.entries(sched.jobs);
    const failing = list.filter(([, j]) => !j.ok);
    say(`Scheduled jobs: ${list.length} have run, last record ${sched.updatedAt}${failing.length ? `; failing: ${failing.map(([n, j]) => `${n} (${j.status || 'no answer'})`).join(', ')}` : '; none failing'}`);
  }
  process.exit(code);
}

// ── main ─────────────────────────────────────────────────────────────────

async function main() {
  const o = parseArgs(process.argv.slice(2));
  if (o.error) { warn(o.error); warn(''); warn(USAGE); process.exit(2); }
  if (o.help) { say(USAGE); return; }
  if (!nodeOk()) fail(`CivicOS needs Node.js ${MIN_NODE_MAJOR} or newer; this is ${process.version}. Install Node ${MIN_NODE_MAJOR} LTS from nodejs.org.`);
  const dataDir = path.resolve(process.cwd(), o.data);
  if (o.printEnv) {
    const s = loadSettings(dataDir);
    if (!s) fail(`No settings in ${dataDir} yet: start CivicOS once first.`);
    say(`# ${s.file}${o.showSecrets ? '' : ' (secrets hidden; --show-secrets to show them)'}`);
    say(printableEnv(s.env, o.showSecrets));
    return;
  }
  if (o.command === 'backup') return backup(o, dataDir);
  if (o.command === 'status') return status(o, dataDir);
  return start(o, dataDir);
}

main().catch(e => fail(e?.stack ?? String(e)));
