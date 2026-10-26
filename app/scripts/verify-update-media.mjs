#!/usr/bin/env node
// Verify update media on the disconnected side (plan I9; acceptance P5-15;
// docs/INTEGRATION_REGISTER.md 24.14). No server and no network: Node's own
// crypto only.
//
//   node scripts/verify-update-media.mjs <media directory> --key <publisher public key PEM> [--key <another>] [--json]
//
// Reads media-manifest.intoto.json (the publisher's DSSE envelope over an
// in-toto statement of every file written to the media), checks its Ed25519
// signature over the DSSE pre-authentication encoding with the publisher keys
// given (the ones the nation's officials trusted, compared by fingerprint),
// computes the SHA-256 of every other file in the directory and compares them
// with the statement's subjects: none missing, none changed, none added.
// Prints the files with their SHA-256 (what the nation records with the
// contents-verified custody step, /api/releases/mirror) and exits 0 when the
// media verifies, 1 when it does not, 2 when it cannot be read.

import { createHash, createPublicKey, verify } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const MANIFEST = 'media-manifest.intoto.json';
const PAYLOAD_TYPE = 'application/vnd.in-toto+json';
const PREDICATE = 'https://civicos.example/attestations/update-media/v1';

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const keys = args.flatMap((a, i) => (a === '--key' && args[i + 1] ? [args[i + 1]] : []));
const dir = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--key');
if (!dir || !keys.length) {
  console.error('usage: node scripts/verify-update-media.mjs <media directory> --key <publisher public key PEM> [--json]');
  process.exit(2);
}

const keyIdOf = pem => {
  const der = createPublicKey(pem).export({ type: 'spki', format: 'der' });
  return `ed25519:${createHash('sha256').update(der).digest('hex').slice(0, 16)}`;
};
const pae = (type, body) => {
  const t = Buffer.from(type, 'utf8');
  return Buffer.concat([Buffer.from(`DSSEv1 ${t.length} `), t, Buffer.from(` ${body.length} `), body]);
};
function walk(d, out = []) {
  for (const n of readdirSync(d)) { const p = join(d, n); if (statSync(p).isDirectory()) walk(p, out); else out.push(p); }
  return out;
}

let envelope, trusted;
try {
  envelope = JSON.parse(readFileSync(join(resolve(dir), MANIFEST), 'utf8'));
  trusted = keys.map(k => { const pem = readFileSync(k, 'utf8'); return { pem, keyId: keyIdOf(pem) }; });
} catch (e) { console.error(`Cannot read the media or the keys: ${e.message}`); process.exit(2); }

const problems = [];
const files = walk(resolve(dir)).map(p => relative(resolve(dir), p).split('\\').join('/')).filter(n => n !== MANIFEST).sort()
  .map(filename => ({ filename, sha256: createHash('sha256').update(readFileSync(join(resolve(dir), filename))).digest('hex') }));

let statement = null, signedBy = null;
if (envelope?.payloadType !== PAYLOAD_TYPE || typeof envelope?.payload !== 'string' || !Array.isArray(envelope?.signatures)) problems.push('Not a DSSE envelope of an in-toto statement');
else {
  const body = Buffer.from(envelope.payload, 'base64');
  for (const s of envelope.signatures) {
    const k = trusted.find(t => t.keyId === s?.keyid);
    if (!k) continue;
    if (!verify(null, pae(envelope.payloadType, body), createPublicKey(k.pem), Buffer.from(String(s.sig), 'base64'))) { problems.push(`The signature by ${k.keyId} does not verify: the statement was changed or not signed by that key`); break; }
    signedBy = k.keyId;
    try { statement = JSON.parse(body.toString('utf8')); } catch { problems.push('The signed payload is not JSON'); }
    break;
  }
  if (!signedBy && !problems.length) problems.push(`No signature by a key given (signed by ${envelope.signatures.map(s => s?.keyid).join(', ')})`);
}
if (statement) {
  if (statement.predicateType !== PREDICATE) problems.push(`Not an update-media statement (${statement.predicateType})`);
  const want = new Map((statement.subject ?? []).map(s => [s.name, String(s.digest?.sha256 ?? '').toLowerCase()]));
  const got = new Map(files.map(f => [f.filename, f.sha256]));
  const missing = [...want.keys()].filter(n => !got.has(n));
  const changed = [...want.entries()].filter(([n, h]) => got.has(n) && got.get(n) !== h).map(([n]) => n);
  const extra = [...got.keys()].filter(n => !want.has(n));
  if (missing.length) problems.push(`Missing from the media: ${missing.join(', ')}`);
  if (changed.length) problems.push(`Changed (SHA-256 differs from the signed statement): ${changed.join(', ')}`);
  if (extra.length) problems.push(`Not in the signed statement: ${extra.join(', ')}`);
}

const report = { ok: problems.length === 0, media: statement?.predicate?.mediaId ?? null, nation: statement?.predicate?.nation ?? null, sealId: statement?.predicate?.sealId ?? null, signedBy, files, problems };
if (asJson) console.log(JSON.stringify(report, null, 2));
else {
  console.log(`${report.ok ? 'VERIFIED' : 'NOT VERIFIED'} — media ${report.media ?? '?'} (seal ${report.sealId ?? '?'}), signed by ${signedBy ?? 'no trusted key'}`);
  for (const f of files) console.log(`  ${f.sha256}  ${f.filename}`);
  for (const p of problems) console.log(`  ✗ ${p}`);
}
process.exit(report.ok ? 0 : 1);
