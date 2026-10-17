#!/usr/bin/env node
// Nation-conversion scanner.
//
// Walks every tracked file in the repository and finds content that ties the
// system to one particular nation: country and province names, currencies,
// phone and domain formats, office titles, legal references, languages, time
// zones and coordinates. Results are grouped by system layer so a conversion
// (by people or by an AI pipeline) knows exactly which files and literals to
// rewrite when a new nation subscribes.
//
// Usage (from app/):  node scripts/nation-scan.mjs [--json out.json] [--top N]
// Re-run after any change; the numbers in docs/NATION_CONVERSION_MANIFEST.md
// come from this script.

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const ROOT = execSync('git rev-parse --show-toplevel').toString().trim();
const GEO = path.join(ROOT, 'app/src/lib/geo');
const args = process.argv.slice(2);
const jsonOut = args.includes('--json') ? args[args.indexOf('--json') + 1] : null;
const TOP = args.includes('--top') ? Number(args[args.indexOf('--top') + 1]) : 15;

// ── Dictionaries drawn from the system's own geography ────────────────────
const countries = JSON.parse(readFileSync(path.join(GEO, 'countries.json'), 'utf8'));
const countryNames = countries.map(c => c.name).filter(n => n.length > 3);

// Province names are noisy (many are ordinary words), so keep distinctive ones.
const COMMON = new Set(('central eastern northern southern western north south east west capital coast coastal lakes lake upper lower ' +
  'middle river islands island mountain mountains plains valley highlands federal district national north-east north-west south-east ' +
  'south-west centre center region interior littoral border delta plateau savanes maritime greater new san santa saint st reading cascade aurora').split(' '));
const provinceNames = new Set();
for (const f of readdirSync(path.join(GEO, 'admin1'))) {
  if (!f.endsWith('.json')) continue;
  const d = JSON.parse(readFileSync(path.join(GEO, 'admin1', f), 'utf8'));
  for (const p of d.provinces ?? []) {
    const n = String(p.name ?? '').trim();
    if (n.length >= 6 && !COMMON.has(n.toLowerCase()) && !countryNames.includes(n) && /^[A-Z]/.test(n)) provinceNames.add(n);
  }
}

const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const wordUnion = list => new RegExp(`(?<![\\w-])(?:${[...list].sort((a, b) => b.length - a.length).map(esc).join('|')})(?![\\w-])`, 'g');

const CURRENCIES = 'USD EUR GBP KES UGX TZS RWF BIF ETB SOS NGN GHS XOF XAF ZAR NAD BWP ZMW MWK MZN AOA CDF EGP MAD DZD TND LYD SDG SSP ERN DJF MGA MUR SCR INR PKR BDT CNY JPY AED SAR QAR KWD BHD OMR SGD AUD CAD BRL MXN'.split(' ');

const SIGNALS = {
  country: { label: 'Country names', re: wordUnion(countryNames) },
  province: { label: 'Province / region names', re: wordUnion(provinceNames) },
  currency: { label: 'Currency codes & money amounts', re: new RegExp(`['"\`](?:${CURRENCIES.join('|')})['"\`]|\\b(?:${CURRENCIES.join('|')}) \\d|(?:KSh|USh|TSh|GH₵|₦|₹|€|£)\\s?\\d|\\$\\d[\\d,]*(?:\\.\\d+)?\\s?(?:[MBKT]|bn|m)\\b|\\$\\d{1,3}(?:,\\d{3})+`, 'g') },
  emergency: { label: 'Emergency numbers', re: /\b(?:Emergency|emergency|call|Call|dial|Dial)\b\D{0,12}\b(?:112|999|911|000|119|110)\b/g },
  place: { label: 'Place names (… County/District/Region/City …)', re: /\b[A-Z][a-z]+(?: [A-Z][a-z]+)? (?:County|District|Region|Province|State|City|Municipality|Ward|Constituency|Corridor|Hospital|Pharmacy|Clinic|Court|Police Station|Market|Registry)\b/g },
  regionList: { label: 'Hardcoded region lists', re: /\b(?:REGIONS|MUNI|MUNICIPALITIES|COUNTIES|PROVINCES|DISTRICTS|STATES|CITIES|regions|counties|provinces|districts|municipalities)\s*(?::\s*[\w<>[\]]+\s*)?=\s*\[/g },
  person: { label: 'Personal names in records', re: /\b(?:Dr|Mr|Mrs|Ms|Hon|Prof|Rev|Sgt|Cpl|Insp|Justice|Pharmacist|Officer|Nurse)\.? [A-Z]\. ?[A-Z][a-z]{2,}\b|['"`][A-Z]\. [A-Z][a-z]{3,}\b|(?:displayName|holder|officer|citizen|signedBy|by)\s*:\s*['"`][A-Z][a-z]+ (?:[A-Z][a-z]+ )?[A-Z][a-z]{3,}['"`]/g },
  rail: { label: 'Payment rails', re: /\b(?:M-Pesa|MPesa|MTN MoMo|Airtel Money|Orange Money|EcoCash|Wave|Paystack|Flutterwave|UPI|PIX|SPEI)\b/g },
  phone: { label: 'Phone numbers & dialling codes', re: /\+\d{1,3}[\s-]?\(?\d{2,4}\)?[\s-]?\d{3}/g },
  domain: { label: 'Government domains', re: /\b[\w-]+\.(?:go|gov|gouv|gob|govt)\.[a-z]{2}\b/g },
  title: { label: 'Office titles', re: /\b(?:President|Vice[- ]President|Prime Minister|Chancellor|Governor|Senator|Chief Justice|Speaker of|Cabinet Secretary|Attorney[- ]General|Inspector[- ]General|Auditor[- ]General|Head of State|Head of Government|Monarch|King|Queen|Emir|Sultan)\b/g },
  ministry: { label: 'Institution names', re: /\b(?:Ministry|Department|Office|Commission|Authority|Bureau|Agency) of (?:the )?[A-Z][\w&'-]+(?: (?:and|&) [A-Z][\w-]+)?/g },
  legal: { label: 'Legal references', re: /\b(?:Article|Art\.|Section|Sec\.|Chapter|Schedule)\s?\d+[A-Za-z]?\b|\b[A-Z][\w ]{2,40} Act(?:,)? (?:of )?\d{4}\b|\bConstitution of (?:the )?[A-Z][\w ]+/g },
  language: { label: 'Language names', re: /\b(?:Kiswahili|Swahili|Yor[uù]b[aá]|Hausa|Igbo|Amharic|Luganda|Zulu|Xhosa|Afrikaans|Somali|Oromo|Tigrinya|Wolof|Lingala|Kinyarwanda|Kirundi|Shona|Sesotho|Setswana)\b/g },
  timezone: { label: 'Time zones', re: /\b(?:Africa|Europe|Asia|America|Australia|Pacific|Atlantic|Indian)\/[A-Z][A-Za-z_]+|\bUTC\s?[+−-]\s?\d{1,2}\b|\b(?:EAT|WAT|CAT|SAST|GMT[+-]\d)\b/g },
  coords: { label: 'Coordinates', re: /\[\s*-?\d{1,3}\.\d{2,}\s*,\s*-?\d{1,2}\.\d{2,}\s*\]|\b(?:lat|lng|lon|latitude|longitude)\s*:\s*-?\d{1,3}\.\d+/g },
};

// What a hit means for a conversion:
//  replace  – nation-specific content, rewritten for every new nation
//  shape    – constitutional shape (offices, institutions): rewritten only when
//             the new nation's form of state differs (e.g. monarchy, unicameral)
//  language – wording rewritten only when the official language differs
const KIND = {
  country: 'replace', province: 'replace', place: 'replace', regionList: 'replace', person: 'replace',
  currency: 'replace', emergency: 'replace', rail: 'replace', phone: 'replace', domain: 'replace', timezone: 'replace', coords: 'replace',
  legal: 'shape', title: 'shape', ministry: 'shape', language: 'language',
};

// ── Layers (first match wins) ─────────────────────────────────────────────
const LAYERS = [
  ['geo-data', 'Map data (per-country geography)', p => p.startsWith('app/src/lib/geo/') && p.endsWith('.json')],
  ['tests', 'Tests & fixtures', p => /\.(test|spec)\.[tj]sx?$/.test(p) || p.startsWith('app/supabase/tests/')],
  ['maps', 'Map logic & map components', p => p.startsWith('app/src/lib/geo/') || /Map\w*\.tsx$|\/map\//i.test(p)],
  ['constitution', 'Constitution & governance engines', p => p.startsWith('app/src/lib/gov/')],
  ['identity', 'Sovereign identity, branding & onboarding', p => /sovereign-identity|components\/features\/(cover|onboarding)|CoverGate|\(cover\)|\(onboarding\)/.test(p)],
  ['institutions', 'Institution registry & archetypes', p => p.startsWith('app/src/lib/institution/')],
  ['seed', 'Seed data & in-memory store', p => p.startsWith('app/src/lib/data/')],
  ['apps', 'Institution applications (ministries, presidency, police …)', p => p.startsWith('app/src/apps/')],
  ['pages', 'Pages & public websites', p => p.startsWith('app/src/app/') && !p.startsWith('app/src/app/api/')],
  ['api', 'API routes', p => p.startsWith('app/src/app/api/')],
  ['components', 'Shared UI & feature components', p => p.startsWith('app/src/components/')],
  ['platform-lib', 'Platform libraries & services', p => p.startsWith('app/src/')],
  ['database', 'Database (Supabase migrations, cron)', p => p.startsWith('app/supabase/')],
  ['backend', 'Backend service (civic-api)', p => p.startsWith('services/')],
  ['infra', 'Infrastructure (helm, terraform, k8s)', p => p.startsWith('infra/')],
  ['prototypes', 'Static prototypes', p => p.startsWith('platform/')],
  ['doctrine', 'Doctrine & documentation', p => p.endsWith('.md')],
  ['other', 'Other', () => true],
];

const files = execSync('git ls-files', { cwd: ROOT }).toString().split('\n').filter(Boolean)
  .filter(f => !/(^|\/)(package-lock\.json|pnpm-lock\.yaml|route-lock\.json)$/.test(f) && !/\.(png|jpe?g|webp|ico|svg|woff2?)$/.test(f))
  .filter(f => f !== 'app/scripts/nation-scan.mjs' && !f.endsWith('NATION_CONVERSION_MANIFEST.md'));

const layers = Object.fromEntries(LAYERS.map(([k, label]) => [k, { label, files: 0, lines: 0, filesWithSignals: 0, hits: 0, byKind: { replace: 0, shape: 0, language: 0 }, filesByKind: { replace: 0, shape: 0, language: 0 }, bySignal: {}, top: [] }]));
const perFile = [];

for (const f of files) {
  let text;
  try { text = readFileSync(path.join(ROOT, f), 'utf8'); } catch { continue; }
  const layer = LAYERS.find(([, , test]) => test(f))[0];
  const L = layers[layer];
  L.files++; L.lines += text.split('\n').length;
  if (layer === 'geo-data') continue; // reference data: replaced by selecting a country, not by editing
  const counts = {}; let total = 0; const samples = {};
  // Font stacks name 'Georgia' etc.; ignore styling lines for country matching.
  const noStyle = text.split('\n').filter(l => !/font|serif|typeface/i.test(l)).join('\n');
  for (const [k, { re }] of Object.entries(SIGNALS)) {
    const m = (k === 'country' ? noStyle : text).match(re);
    if (m && m.length) { counts[k] = m.length; total += m.length; samples[k] = [...new Set(m)].slice(0, 4); }
  }
  if (total) {
    L.filesWithSignals++; L.hits += total;
    for (const [k, n] of Object.entries(counts)) { L.bySignal[k] = (L.bySignal[k] ?? 0) + n; L.byKind[KIND[k]] += n; }
    for (const kd of new Set(Object.keys(counts).map(k => KIND[k]))) L.filesByKind[kd]++;
    perFile.push({ file: f, layer, total, counts, samples });
  }
}

for (const L of Object.values(layers)) L.top = [];
for (const r of perFile.sort((a, b) => b.total - a.total)) {
  const L = layers[r.layer];
  if (L.top.length < TOP) L.top.push({ file: r.file, total: r.total, counts: r.counts, samples: r.samples });
}

const totals = {
  files: files.length,
  lines: Object.values(layers).reduce((s, l) => s + l.lines, 0),
  filesWithSignals: perFile.length,
  hits: perFile.reduce((s, r) => s + r.total, 0),
  byKind: Object.fromEntries(['replace', 'shape', 'language'].map(kd => [kd, Object.values(layers).reduce((s, l) => s + l.byKind[kd], 0)])),
  filesByKind: Object.fromEntries(['replace', 'shape', 'language'].map(kd => [kd, perFile.filter(r => Object.keys(r.counts).some(k => KIND[k] === kd)).length])),
  bySignal: Object.fromEntries(Object.keys(SIGNALS).map(k => [k, perFile.reduce((s, r) => s + (r.counts[k] ?? 0), 0)])),
  geo: { countries: countries.length, admin1Files: readdirSync(path.join(GEO, 'admin1')).filter(f => f.endsWith('.json')).length, outlineFiles: readdirSync(path.join(GEO, 'outline')).length, provinceDictionary: provinceNames.size },
};

const report = { generatedAt: new Date().toISOString(), signals: Object.fromEntries(Object.entries(SIGNALS).map(([k, v]) => [k, v.label])), totals, layers, files: perFile };
if (jsonOut) writeFileSync(jsonOut, JSON.stringify(report, null, 2));

const pad = (s, n) => String(s).padEnd(n);
console.log(`Scanned ${totals.files} files · ${totals.lines.toLocaleString()} lines · ${totals.filesWithSignals} files carry national literals · ${totals.hits.toLocaleString()} literal hits\n`);
console.log(pad('Layer', 60) + pad('Files', 7) + pad('w/ hits', 9) + pad('Hits', 7) + pad('replace', 14) + pad('shape', 14) + 'language');
for (const [k, L] of Object.entries(layers)) if (L.files) console.log(pad(`${L.label} [${k}]`, 60) + pad(L.files, 7) + pad(L.filesWithSignals, 9) + pad(L.hits, 7) + pad(`${L.byKind.replace} (${L.filesByKind.replace}f)`, 14) + pad(`${L.byKind.shape} (${L.filesByKind.shape}f)`, 14) + `${L.byKind.language} (${L.filesByKind.language}f)`);
console.log(`\nBy kind: replace ${totals.byKind.replace} hits in ${totals.filesByKind.replace} files · shape ${totals.byKind.shape} in ${totals.filesByKind.shape} files · language ${totals.byKind.language} in ${totals.filesByKind.language} files`);
console.log('\nBy signal:'); for (const [k, n] of Object.entries(totals.bySignal)) console.log(`  ${pad(SIGNALS[k].label, 34)} ${n}`);
