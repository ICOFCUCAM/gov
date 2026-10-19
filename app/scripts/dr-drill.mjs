#!/usr/bin/env node
// Disaster recovery drill (docs/DISASTER_RECOVERY.md §6; register 9.1).
//
// Backs up a running instance, starts a fresh one (or uses one already
// started), restores the backup there four-eyes, and compares the two:
// the restore's own check of every part against the backup, the audit chain
// (verified, ending at the backup's head plus the restore entry), the state
// fingerprint part by part, and a sample of records read through the API.
// Measures the time to recover (RTO) and reports the data the backup is
// behind (RPO) against the targets in the backup policy.
//
//   node scripts/dr-drill.mjs --source http://localhost:3711 --standby-port 3712
//   node scripts/dr-drill.mjs --source http://localhost:3711 --standby http://localhost:3712
//
// --standby-port N  start `next start -p N` here (a production build must exist)
//                   with this process's environment, CIVICOS_STATE=file (or
//                   --standby-state) and a fresh CIVICOS_STATE_DIR; the same
//                   key (CIVICOS_DATA_KEK or the key provider) and backup
//                   target (CIVICOS_BACKUP_*) as the source must be set, as a
//                   real standby has them. It is stopped at the end.
// --standby URL     a fresh instance already running (same key and target)
// --cookie a=b      sent with every request (default civicos_session=drill;
//                   under CIVICOS_AUTH=enforce give an administrator's
//                   civicos_official session, and --cookie2 a second official's)
// --json            print the report as JSON only
//
// Exit code 0 when the drill passed, 1 when a check failed, 2 on a usage error.

import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const arg = (name, dflt) => { const i = args.indexOf(name); return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : dflt; };
const SOURCE = arg('--source');
let STANDBY = arg('--standby');
const PORT = arg('--standby-port');
const COOKIE = arg('--cookie', 'civicos_session=drill');
const COOKIE2 = arg('--cookie2', COOKIE);
const JSON_ONLY = args.includes('--json');
if (!SOURCE || (!STANDBY && !PORT)) {
  console.error('usage: node scripts/dr-drill.mjs --source <url> (--standby <url> | --standby-port <port>) [--cookie a=b] [--cookie2 a=b] [--json]');
  process.exit(2);
}

const report = { startedAt: new Date().toISOString(), source: SOURCE, standby: STANDBY ?? `http://localhost:${PORT}`, steps: [], checks: [], ok: true };
const step = (name, data = {}) => { report.steps.push({ at: new Date().toISOString(), name, ...data }); if (!JSON_ONLY) console.log(`· ${name}${data.detail ? ` — ${data.detail}` : ''}`); };
const check = (name, pass, detail) => { report.checks.push({ name, pass, ...(detail ? { detail } : {}) }); if (!pass) report.ok = false; if (!JSON_ONLY) console.log(`  ${pass ? 'PASS' : 'FAIL'} ${name}${detail ? ` (${detail})` : ''}`); };

async function call(base, method, p, body, cookie = COOKIE) {
  const r = await fetch(new URL(p, base), { method, headers: { 'content-type': 'application/json', cookie }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  const text = await r.text();
  let json; try { json = JSON.parse(text); } catch { json = { raw: text.slice(0, 300) }; }
  return { status: r.status, json };
}
const must = (r, what, ok = [200, 201, 202]) => { if (!ok.includes(r.status)) throw new Error(`${what}: ${r.status} ${JSON.stringify(r.json).slice(0, 400)}`); return r.json; };
const waitFor = async (base, ms) => {
  const until = Date.now() + ms;
  for (;;) {
    try { const r = await fetch(new URL('/api/health?live', base)); if (r.ok) return; } catch { /* starting */ }
    if (Date.now() > until) throw new Error(`${base} did not start within ${ms / 1000} s`);
    await new Promise(r => setTimeout(r, 500));
  }
};

let child;
async function main() {
  const t0 = Date.now();
  // 1. The source: its state now, then a backup (verified at once).
  const before = must(await call(SOURCE, 'GET', '/api/platform/backups/state'), 'source state');
  step('source fingerprint', { detail: `${before.parts.length} parts, audit head ${before.audit.seq}, mode ${before.mode}` });
  const sample = async base => ({
    sovereign: (({ name, motto, iso3, currency }) => ({ name, motto, iso3, currency }))((await call(base, 'GET', '/api/sovereign')).json.sovereign ?? {}),
    ministries: ((await call(base, 'GET', '/api/org/ministries')).json.ministries ?? []).map(m => m.id).sort(),
    releases: ((await call(base, 'GET', '/api/platform/releases')).json.releases ?? []).map(r => `${r.version}:${r.channel}`).sort(),
    facilities: ((await call(base, 'GET', '/api/facilities')).json.facilities ?? []).length,
  });
  const sampleBefore = await sample(SOURCE);
  const tb = Date.now();
  const created = must(await call(SOURCE, 'POST', '/api/platform/backups', { by: 'DR drill (administrator)' }), 'backup on the source');
  const backup = created.backup;
  step('backup taken on the source', { detail: `${backup.id}, ${backup.sizeBytes} bytes, ${Date.now() - tb} ms, verified=${backup.verification?.ok}`, backup: backup.id });
  check('the backup verified on the source (read back, decrypted, dry-run restore)', backup.verification?.ok === true, backup.verification?.problem);
  check('the backup holds the source\'s audit chain head at the time', backup.audit.seq === before.audit.seq && backup.audit.hash === before.audit.hash, `backup ${backup.audit.seq}, source ${before.audit.seq}`);

  // 2. The standby: a fresh instance with the same key and backup target.
  const ts = Date.now();
  if (!STANDBY) {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'civicos-dr-standby-'));
    const appDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
    const env = { ...process.env, PORT, CIVICOS_STATE: arg('--standby-state', 'file'), CIVICOS_STATE_DIR: dir, CIVICOS_STATE_LEASE_WAIT_MS: '0' };
    child = spawn(path.join(appDir, 'node_modules', '.bin', 'next'), ['start', '-p', PORT], { cwd: appDir, env, stdio: ['ignore', 'ignore', 'pipe'] });
    child.stderr.on('data', d => { report.standbyErrors = `${report.standbyErrors ?? ''}${d}`.slice(-2000); });
    STANDBY = `http://localhost:${PORT}`;
    report.standby = STANDBY;
    await waitFor(STANDBY, 90_000);
    step('fresh standby started', { detail: `${STANDBY}, state in ${dir}, pid ${child.pid}, ${Date.now() - ts} ms` });
  } else {
    await waitFor(STANDBY, 30_000);
    step('fresh standby reachable', { detail: STANDBY });
  }
  const fresh = must(await call(STANDBY, 'GET', '/api/platform/backups/state'), 'standby state');
  check('the standby starts with another state than the source', fresh.stateDigest !== before.stateDigest);

  // 3. The standby finds the backup at the shared target, verifies it, restores it four-eyes.
  const tr = Date.now();
  const listed = must(await call(STANDBY, 'GET', '/api/platform/backups'), 'standby catalogue');
  check('the standby lists the backup from the shared target', listed.backups.some(b => b.id === backup.id), `${listed.backups.length} backups listed`);
  const verified = must(await call(STANDBY, 'POST', `/api/platform/backups/${backup.id}/verify`, { by: 'DR drill (administrator)' }), 'verify on the standby', [200, 409]);
  check('the backup verifies on the standby with its key (dry-run restore into a scratch store)', verified.backup?.verification?.ok === true, verified.backup?.verification?.problem);
  const proposed = await call(STANDBY, 'POST', `/api/platform/backups/${backup.id}/restore`, { by: 'DR drill (administrator)', acknowledgeLoss: true, reason: 'Disaster recovery drill' });
  check('the first official\'s restore is only a proposal (four-eyes)', proposed.status === 202 && proposed.json.pending === true, proposed.json.error);
  const same = await call(STANDBY, 'POST', `/api/platform/backups/${backup.id}/restore`, { by: 'DR drill (administrator)', acknowledgeLoss: true });
  check('the same official cannot confirm it', same.status === 409);
  const done = must(await call(STANDBY, 'POST', `/api/platform/backups/${backup.id}/restore`, { by: 'DR drill (second official)', acknowledgeLoss: true }, COOKIE2), 'restore on the standby');
  const rto = Date.now() - ts;
  step('restored on the standby', { detail: `safety copy ${done.restore.safetyBackupId}, ${Date.now() - tr} ms to verify and restore` });
  check('every restored part matches the backup', done.restore.check.differing.length === 0, done.restore.check.differing.join(', ') || `${done.restore.check.compared} parts compared`);

  // 4. Compare.
  const after = must(await call(STANDBY, 'GET', '/api/platform/backups/state'), 'standby state after');
  check('the standby\'s audit chain verifies', after.chain.ok === true, `${after.chain.checked} entries`);
  check('the standby\'s chain is the backup\'s chain plus the restore record', after.audit.seq >= backup.audit.seq + 1, `standby head ${after.audit.seq}, backup head ${backup.audit.seq}`);
  const was = new Map(before.parts.map(p => [p.name, p.sha256]));
  // Expected to differ: the audit chain (the restore record), the record counters, the stores a restore keeps (the backup records, the Update Center's install records).
  const EXPECTED = new Set(['store/__civicos', 'table/audit_entry', 'table/record_doc', 'table/record_counter', 'store/__civicosUpdates', 'store/__civicosBackups']);
  const differ = after.parts.filter(p => was.has(p.name) && was.get(p.name) !== p.sha256).map(p => p.name);
  const missing = before.parts.filter(p => !after.parts.some(q => q.name === p.name)).map(p => p.name);
  const unexpected = differ.filter(n => !EXPECTED.has(n));
  check('every other store is identical to the source at backup time', unexpected.length === 0, unexpected.length ? `differ: ${unexpected.join(', ')}` : `${after.parts.length - differ.length} identical, ${differ.length} expected to differ (${differ.join(', ') || 'none'})`);
  check('no store of the source is missing on the standby', missing.length === 0, missing.join(', '));
  const sampleAfter = await sample(STANDBY);
  for (const k of Object.keys(sampleBefore)) check(`sample: ${k} equal on source and standby`, JSON.stringify(sampleBefore[k]) === JSON.stringify(sampleAfter[k]), typeof sampleBefore[k] === 'number' ? String(sampleBefore[k]) : undefined);

  // 5. Targets.
  const status = listed.status;
  report.rto = { measuredSeconds: Math.round(rto / 1000), targetMinutes: status?.policy?.rtoMinutes ?? null, met: status ? rto <= status.policy.rtoMinutes * 60_000 : null };
  report.rpo = { backupAgeSecondsAtRestore: Math.round((Date.parse(done.restore.at) - Date.parse(backup.createdAt)) / 1000), targetMinutes: status?.policy?.rpoMinutes ?? null, sourceRpo: status?.rpo ?? null };
  check('recovery time within the RTO target', report.rto.met !== false, `${report.rto.measuredSeconds} s against ${report.rto.targetMinutes} min`);
  report.totalMs = Date.now() - t0;
}

main()
  .catch(e => { report.ok = false; report.error = e.message; if (!JSON_ONLY) console.error(`drill failed: ${e.message}`); })
  .finally(() => {
    if (child) child.kill('SIGTERM');
    report.finishedAt = new Date().toISOString();
    if (JSON_ONLY) console.log(JSON.stringify(report, null, 2));
    else console.log(`\nDR drill ${report.ok ? 'PASSED' : 'FAILED'}: ${report.checks.filter(c => c.pass).length}/${report.checks.length} checks · RTO ${report.rto?.measuredSeconds ?? '?'} s · ${report.totalMs ?? '?'} ms in all`);
    process.exitCode = report.ok ? 0 : 1;
  });
