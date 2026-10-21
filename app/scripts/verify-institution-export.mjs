#!/usr/bin/env node
// Verify an institution's portable export offline (Health I4
// standalone-and-pilot; spec Part 5 L 9; docs/DISASTER_RECOVERY.md §8).
//
//   CIVICOS_DATA_KEK=<the key custody's key> node scripts/verify-institution-export.mjs <export.cvx> [--json]
//
// No CivicOS server runs and nothing is reached over the network: the
// platform's own code (src/lib/portability/verify.ts, with the audit-chain,
// access-log, seal and trust-list checks it uses) is loaded from this
// checkout through Vite's module loader (no port is opened) and run on the
// file. The export is sealed through key custody like a backup, so the
// verifier needs the same key: CIVICOS_DATA_KEK (or CIVICOS_KEY_PROVIDER with
// the provider's settings). Exit code 0 when every check holds, 1 when one
// does not, 2 when the file cannot be read.

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createViteServer } from 'vitest/node';

const APP = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const file = args.find(a => !a.startsWith('--'));
const asJson = args.includes('--json');
if (!file) {
  console.error('usage: CIVICOS_DATA_KEK=… node scripts/verify-institution-export.mjs <export.cvx> [--json]');
  process.exit(2);
}
let archive;
try { archive = readFileSync(resolve(file)); } catch (e) { console.error(`Cannot read ${file}: ${e.message}`); process.exit(2); }

const loader = await createViteServer({
  root: APP, configFile: false, logLevel: 'error', appType: 'custom',
  resolve: { alias: { '@': resolve(APP, 'src') } },
  server: { middlewareMode: true, hmr: false, watch: null },
  optimizeDeps: { noDiscovery: true, include: [] },
  esbuild: { jsx: 'automatic' },
});
let report;
try {
  const { verifyInstitutionExport } = await loader.ssrLoadModule('/src/lib/portability/verify.ts');
  report = await verifyInstitutionExport(archive);
} finally {
  await loader.close();
}

if (asJson) console.log(JSON.stringify(report, null, 2));
else {
  console.log(`Institution export ${report.export}`);
  console.log(`  institution: ${report.institution.name} (${report.institution.id})`);
  console.log(`  taken: ${report.createdAt} in a ${report.installation} installation`);
  console.log(`  counts: ${Object.entries(report.counts).map(([k, n]) => `${k} ${n}`).join(', ')}`);
  for (const c of report.checks) console.log(`  ✓ ${c}`);
  for (const d of report.decisions) console.log(`  ${d.ok ? '✓' : '✗'} decision ${d.id}: key ${d.key}, sealed ${d.sealedAt} (time from the ${d.timeFrom === 'audit-chain' ? 'audit chain' : 'record'})${d.problem ? ` — ${d.problem}` : ''}`);
  for (const n of report.notes) console.log(`  · ${n}`);
  for (const p of report.problems) console.log(`  ✗ ${p}`);
  console.log(report.ok ? 'VERIFIED: every check holds.' : 'NOT VERIFIED.');
}
process.exit(report.ok ? 0 : 1);
