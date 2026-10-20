#!/usr/bin/env node
// Quality gate for the public websites (plan phase 6), run against a running
// server: `npm run build && npm start`, then `npm run audit:sites`.
//
//   Accessibility  axe-core (WCAG 2.0/2.1/2.2 A and AA rules) on every public
//                  site in every design it may use, on a desktop and a phone
//                  viewport, plus the shared public pages. Any WCAG violation
//                  fails; best-practice findings are reported as warnings.
//   Links          every link on those pages that stays on the platform must
//                  answer (no 4xx/5xx), and every #anchor must exist on the
//                  page it points to.
//   Budgets        page weight, script, fonts, requests and DOM size per site
//                  (scripts/public-site-budgets.json), and no request may leave
//                  the platform (no outside fonts, scripts or trackers).
//
// Options: --base <url> (default http://localhost:3000), --default-only (each
// site's own design only), --report <file> (JSON report), --chromium <path>.

import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { chromium } from 'playwright-core';

const require = createRequire(import.meta.url);
const arg = (name, fallback) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : fallback; };
const BASE = arg('--base', 'http://localhost:3000').replace(/\/$/, '');
const DEFAULT_ONLY = process.argv.includes('--default-only');
const REPORT = arg('--report');
const CHROMIUM = arg('--chromium', process.env.CHROMIUM_PATH || undefined);
const AXE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const BUDGETS = JSON.parse(readFileSync(new URL('./public-site-budgets.json', import.meta.url), 'utf8'));
const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const VIEWPORTS = [{ name: 'desktop', width: 1280, height: 900 }, { name: 'phone', width: 390, height: 844 }];
const SHARED = ['/government', '/sitemap', '/legal/privacy', '/legal/accessibility', '/legal/terms', '/health/laboratory', '/developers', '/public', '/search', '/search?q=permit', '/search?site=police&q=clearance', '/subscriptions?site=police&status=check', '/laws', '/verify', '/registers', '/registers?register=higher-education&q=northern', '/courts/cause-list'];

const getJson = async path => { const r = await fetch(BASE + path); if (!r.ok) throw new Error(`${path}: ${r.status}`); return r.json(); };

// ── Targets ──────────────────────────────────────────────────────────────
const sites = (await getJson('/api/public-sites')).sites.map(s => s.siteId);
const targets = [];
for (const id of sites) {
  const v = await getJson(`/api/public-sites/${id}/editorial`);
  for (const p of DEFAULT_ONLY ? [v.defaultPreset] : v.presets.map(x => x.id)) {
    targets.push({ path: `/${id}?preset=${p}`, site: id, isDefault: p === v.defaultPreset });
  }
}
for (const path of SHARED) targets.push({ path, site: null, isDefault: false });

const failures = [];
const warnings = [];
const fail = (kind, where, text) => failures.push({ kind, where, text });
const links = new Map(); // path (no hash) -> Set of anchors wanted
const measured = [];

const browser = await chromium.launch(CHROMIUM ? { executablePath: CHROMIUM } : {});
for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await ctx.newPage();
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(e.message));
  for (const t of targets) {
    const external = [];
    const onRequest = req => { const u = new URL(req.url()); if (/^https?:$/.test(u.protocol) && u.origin !== new URL(BASE).origin) external.push(u.href); };
    page.on('request', onRequest);
    pageErrors.length = 0;
    const res = await page.goto(BASE + t.path, { waitUntil: 'load', timeout: 120_000 });
    page.off('request', onRequest);
    const where = `${t.path} @${vp.name}`;
    if (!res || res.status() >= 400) { fail('page', where, `answered ${res?.status()}`); continue; }
    for (const e of pageErrors) fail('script', where, e.slice(0, 200));
    for (const u of new Set(external)) fail('external', where, `requests ${u} — public pages load nothing from outside the platform`);

    // Accessibility
    await page.addScriptTag({ content: AXE });
    const axe = await page.evaluate(async tags => window.axe.run(document, { runOnly: { type: 'tag', values: [...tags, 'best-practice'] } }), WCAG);
    for (const v of axe.violations) {
      const isWcag = v.tags.some(x => WCAG.includes(x));
      const detail = `${v.id} (${v.impact}): ${v.help} — ${v.nodes.slice(0, 3).map(n => `${n.target.join(' ')}${v.id === 'color-contrast' ? ` [${/contrast of [\d.]+ \([^)]*\)/.exec(n.failureSummary ?? '')?.[0] ?? ''}]` : ''}`).join(' | ')}${v.nodes.length > 3 ? ` (+${v.nodes.length - 3})` : ''}`;
      if (isWcag) fail('accessibility', where, detail); else warnings.push({ kind: 'best-practice', where, text: detail });
    }

    // Links: collect once, on the desktop pass.
    if (vp.name === 'desktop') {
      const hrefs = await page.$$eval('a[href]', as => as.map(a => a.getAttribute('href')));
      const here = new URL(BASE + t.path);
      for (const h of hrefs) {
        if (!h || /^(mailto:|tel:|javascript:)/.test(h)) continue;
        const u = new URL(h, here);
        if (u.origin !== here.origin) continue;
        if (u.pathname.startsWith('/api/')) continue;
        const key = u.pathname === here.pathname && h.startsWith('#') ? here.pathname + here.search : u.pathname;
        if (!links.has(key)) links.set(key, new Set());
        if (u.hash.length > 1) links.get(key).add(decodeURIComponent(u.hash.slice(1)));
      }
    }

  }
  await ctx.close();
}

// Budgets: each site's own design as a first-time visitor gets it (fresh browser, nothing cached).
for (const t of targets.filter(x => x.isDefault)) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE + t.path, { waitUntil: 'load', timeout: 120_000 });
  await page.evaluate(() => document.fonts.ready);
  const m = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const res = performance.getEntriesByType('resource');
    const sum = f => res.filter(f).reduce((s, r) => s + (r.encodedBodySize || r.transferSize || 0), 0);
    return {
      htmlKB: (nav?.encodedBodySize ?? 0) / 1024,
      scriptKB: sum(r => r.initiatorType === 'script' || /\.js(\?|$)/.test(r.name)) / 1024,
      fontKB: sum(r => /\.woff2?(\?|$)/.test(r.name)) / 1024,
      totalKB: ((nav?.encodedBodySize ?? 0) + sum(() => true)) / 1024,
      requests: res.length + 1,
      domNodes: document.getElementsByTagName('*').length,
    };
  });
  await ctx.close();
  const budget = { ...BUDGETS.default, ...(BUDGETS.sites?.[t.site] ?? {}) };
  measured.push({ site: t.site, ...Object.fromEntries(Object.entries(m).map(([k, v]) => [k, Math.round(v * 10) / 10])) });
  for (const [k, max] of Object.entries(budget)) {
    if (k in m && m[k] > max) fail('budget', t.path, `${k} ${m[k].toFixed(1)} is over the budget of ${max}`);
  }
}
await browser.close();

// Links: every internal page answers, every anchor exists there.
for (const [path, anchors] of links) {
  const r = await fetch(BASE + path, { redirect: 'follow' });
  if (r.status >= 400) { fail('link', path, `answers ${r.status}`); continue; }
  if (anchors.size === 0) continue;
  const html = await r.text();
  for (const a of anchors) {
    if (!new RegExp(`id="${a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`).test(html)) fail('anchor', `${path}#${a}`, 'no element with this id on the page');
  }
}

// ── Report ───────────────────────────────────────────────────────────────
const byKind = failures.reduce((m, f) => ({ ...m, [f.kind]: (m[f.kind] ?? 0) + 1 }), {});
console.log(`Public sites audit: ${targets.length} pages × ${VIEWPORTS.length} viewports, ${links.size} linked pages checked.`);
console.table(measured);
for (const f of failures.slice(0, 80)) console.log(`FAIL ${f.kind.padEnd(13)} ${f.where}  ${f.text}`);
if (failures.length > 80) console.log(`… and ${failures.length - 80} more`);
for (const w of warnings.slice(0, 20)) console.log(`warn ${w.kind.padEnd(13)} ${w.where}  ${w.text}`);
if (REPORT) writeFileSync(REPORT, JSON.stringify({ base: BASE, at: new Date().toISOString(), targets: targets.length, failures, warnings, measured }, null, 2));
console.log(failures.length ? `\n${failures.length} failure(s): ${JSON.stringify(byKind)}` : '\nNo failures.');
process.exit(failures.length ? 1 : 0);
