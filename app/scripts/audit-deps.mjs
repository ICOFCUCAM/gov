#!/usr/bin/env node
// Dependency audit for CI (architecture review R2): fails on any high or
// critical advisory in production dependencies, unless it is listed in
// scripts/audit-accepted.json with a reason and a review date that has not
// passed. Uses pnpm's audit (the lockfile is pnpm-lock.yaml).
//
//   node scripts/audit-deps.mjs            # audit (CI: `pnpm audit:deps`)
//   node scripts/audit-deps.mjs --json f   # also write the findings to f
//   node scripts/audit-deps.mjs --publish https://publisher.example   # also raise them as advisories

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const accepted = JSON.parse(fs.readFileSync(path.join(here, 'audit-accepted.json'), 'utf8')).accepted;
const LEVELS = new Set(['high', 'critical']);

let raw;
try {
  raw = execFileSync('pnpm', ['audit', '--prod', '--json'], { cwd: path.join(here, '..'), encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'inherit'] });
} catch (e) {
  // pnpm audit exits non-zero when it finds anything; the JSON is still on stdout.
  raw = e.stdout;
  if (!raw) { console.error('pnpm audit produced no output', e.message); process.exit(2); }
}
const report = JSON.parse(raw);
if (report.error) { console.error('pnpm audit failed:', report.error); process.exit(2); }

const today = new Date().toISOString().slice(0, 10);
const findings = Object.values(report.advisories ?? {}).filter(a => LEVELS.has(a.severity)).map(a => ({
  id: a.github_advisory_id, package: a.module_name, severity: a.severity, title: a.title,
  vulnerable: a.vulnerable_versions, patched: a.patched_versions, url: a.url,
}));

const failures = [];
for (const f of findings) {
  const ok = accepted.find(x => x.id === f.id);
  if (!ok) failures.push(`${f.severity.toUpperCase()} ${f.package} ${f.id}: ${f.title} (patched: ${f.patched}) ${f.url}`);
  else if (ok.reviewBy < today) failures.push(`${f.severity.toUpperCase()} ${f.package} ${f.id}: accepted until ${ok.reviewBy}, now overdue for review`);
  else console.log(`accepted  ${f.severity.padEnd(8)} ${f.package} ${f.id} (review by ${ok.reviewBy})`);
}
const stale = accepted.filter(x => !findings.some(f => f.id === x.id));
for (const s of stale) console.log(`resolved  ${s.id} no longer reported; remove it from scripts/audit-accepted.json`);

const out = process.argv.indexOf('--json');
if (out > 0 && process.argv[out + 1]) fs.writeFileSync(process.argv[out + 1], JSON.stringify({ findings, failures, accepted }, null, 2));

// --publish <base url>: send the findings to the Update Center so they become
// advisories with patch-time commitments (lib/data/advisories.ts). Uses the
// publisher bearer: CIVICOS_PUBLISHER_TOKEN (the value of the server's CIVICOS_PUBLISHER_SECRET).
const pub = process.argv.indexOf('--publish');
if (pub > 0 && process.argv[pub + 1]) {
  const token = process.env.CIVICOS_PUBLISHER_TOKEN || process.env.CIVICOS_PUBLISHER_SECRET;
  const version = JSON.parse(fs.readFileSync(path.join(here, '..', 'package.json'), 'utf8')).version;
  const r = await fetch(`${process.argv[pub + 1].replace(/\/$/, '')}/api/releases/publisher/advisories/dependencies`, {
    method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ findings, accepted, version, by: 'dependency audit (CI)' }),
  }).catch(e => ({ ok: false, status: 0, text: async () => String(e) }));
  console.log(r.ok ? `published to the advisory feed: ${await r.text()}` : `could not publish to the advisory feed (${r.status}): ${(await r.text()).slice(0, 200)}`);
}

if (failures.length) {
  console.error(`\n${failures.length} high or critical advisor${failures.length === 1 ? 'y' : 'ies'} in production dependencies:\n  ${failures.join('\n  ')}`);
  console.error('\nUpgrade the package, or record why it does not apply in scripts/audit-accepted.json (with a review date).');
  process.exit(1);
}
console.log(`\nNo unaccepted high or critical advisories in production dependencies (${findings.length} accepted).`);
