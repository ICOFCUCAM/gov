#!/usr/bin/env node
// Accessibility gate for the console (go-live review M-10, M-11, L-8), run
// against a running server: `npm run build && npm start`, then
// `npm run audit:console`.
//
//   axe-core   WCAG 2.0/2.1/2.2 A and AA rules on the console and entry pages
//              the go-live review checked, plus the Update Center, the
//              publisher and site editor, and onboarding, on a desktop and a
//              phone viewport. Any WCAG violation fails; best-practice
//              findings are reported as warnings.
//   Skip link  on every page with a console shell, the first Tab stop is a
//              link to `#main` (or the shell's own target) and that target
//              exists once (WCAG 2.4.1).
//
// Options: --base <url> (default http://localhost:3000), --report <file>
// (JSON report), --chromium <path>, --cookie name=value (default the demo
// session; give the signed session for an enforce-mode server), --nation
// ISO3 (installs a nation first, as smoke-console does; test servers only).
// Same approach as scripts/audit-public-sites.mjs.

import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { chromium } from 'playwright-core';

const require = createRequire(import.meta.url);
const arg = (name, fallback) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : fallback; };
const BASE = arg('--base', 'http://localhost:3000').replace(/\/$/, '');
const REPORT = arg('--report');
const CHROMIUM = arg('--chromium', process.env.CHROMIUM_PATH || undefined);
const COOKIE = arg('--cookie', 'civicos_session=demo');
const NATION = arg('--nation');
const AXE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const VIEWPORTS = [{ name: 'desktop', width: 1440, height: 900 }, { name: 'phone', width: 390, height: 844 }];

/** Each page, and whether it sits in a console shell that must offer a skip link first. */
const PAGES = [
  // The go-live review's run (docs/REVIEW_2026_10_GO_LIVE.md, "Accessibility run").
  { path: '/', skip: false },
  { path: '/command', skip: false },
  { path: '/sign-in', skip: false },
  { path: '/gov/home', skip: true },
  { path: '/gov/twin', skip: true },
  { path: '/gov/sites', skip: true },
  { path: '/gov/sites/parcels', skip: true },
  { path: '/gov/sites/boundaries', skip: true },
  { path: '/gov/work/cases', skip: true },
  { path: '/gov/intake', skip: true },
  { path: '/gov/coordination', skip: true },
  { path: '/gov/configuration', skip: true },
  { path: '/gov/me', skip: true },
  { path: '/audit', skip: true },
  { path: '/ops', skip: true },
  { path: '/wallet', skip: false },
  { path: '/ministries/min-health/operations', skip: false },
  // Onboarding.
  { path: '/welcome', skip: true },
  { path: '/setup', skip: true },
  // Update Center.
  { path: '/updates', skip: true },
  { path: '/updates/settings', skip: true },
  { path: '/updates/security', skip: true },
  { path: '/updates/hosting', skip: true },
  { path: '/updates/assurance', skip: true },
  { path: '/updates/status', skip: true },
  { path: '/updates/support', skip: true },
  { path: '/updates/contract', skip: true },
  { path: '/updates/mirror', skip: true },
  { path: '/updates/requests', skip: true },
  // Publisher and administration.
  { path: '/admin/releases', skip: true },
  { path: '/admin/sites', skip: true },
];

const [cookieName, ...cookieRest] = COOKIE.split('=');
if (NATION) {
  const r = await fetch(`${BASE}/api/sovereign`, { method: 'PUT', headers: { 'content-type': 'application/json', cookie: COOKIE }, body: JSON.stringify({ iso3: NATION, regions: [], by: 'console audit' }) });
  if (!r.ok) { console.error(`Could not set the nation: ${r.status}`); process.exit(1); }
}
// A release page and its evidence pack, when the server has a release to show.
try {
  const r = await fetch(`${BASE}/api/releases`, { headers: { cookie: COOKIE } });
  const j = r.ok ? await r.json() : null;
  const list = Array.isArray(j) ? j : j?.releases ?? j?.items ?? [];
  const id = list.find(x => x && typeof x.id === 'string')?.id;
  if (id) PAGES.push({ path: `/updates/${encodeURIComponent(id)}`, skip: true }, { path: `/updates/${encodeURIComponent(id)}/evidence`, skip: true });
} catch { /* no release list: the static pages still run */ }

const failures = [];
const warnings = [];
const fail = (kind, where, text) => failures.push({ kind, where, text });

const browser = await chromium.launch(CHROMIUM ? { executablePath: CHROMIUM } : {});
for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, reducedMotion: 'reduce' });
  await ctx.addCookies([{ name: cookieName, value: cookieRest.join('='), url: BASE }]);
  for (const p of PAGES) {
    const page = await ctx.newPage();
    const where = `${p.path} @${vp.name}`;
    const res = await page.goto(BASE + p.path, { waitUntil: 'networkidle', timeout: 120_000 }).catch(e => { fail('page', where, e.message.slice(0, 160)); return null; });
    if (!res) { await page.close(); continue; }
    if (res.status() >= 400) { fail('page', where, `answered ${res.status()}`); await page.close(); continue; }
    // Let client data and the cover's opening settle (reduced motion skips it).
    await page.waitForTimeout(1500);

    await page.addScriptTag({ content: AXE });
    const axe = await page.evaluate(async tags => window.axe.run(document, { runOnly: { type: 'tag', values: [...tags, 'best-practice'] } }), WCAG);
    for (const v of axe.violations) {
      const isWcag = v.tags.some(x => WCAG.includes(x));
      const detail = `${v.id} (${v.impact}, ${v.nodes.length} node${v.nodes.length === 1 ? '' : 's'}): ${v.help} — ${v.nodes.slice(0, 3).map(n => `${n.target.join(' ')}${v.id === 'color-contrast' ? ` [${/contrast of [\d.]+ \([^)]*\)/.exec(n.failureSummary ?? '')?.[0] ?? ''}]` : ''}`).join(' | ')}${v.nodes.length > 3 ? ` (+${v.nodes.length - 3})` : ''}`;
      if (isWcag) fail('accessibility', where, detail); else warnings.push({ kind: 'best-practice', where, text: detail });
    }

    if (p.skip) {
      // Start the Tab sequence at the top of the document, as a fresh visit does.
      await page.evaluate(() => {
        const s = document.createElement('span');
        s.tabIndex = -1; s.id = '__audit_start';
        document.body.prepend(s); s.focus();
      });
      await page.keyboard.press('Tab');
      const first = await page.evaluate(() => {
        document.getElementById('__audit_start')?.remove();
        const a = document.activeElement;
        const href = a?.getAttribute?.('href') ?? '';
        const id = href.startsWith('#') ? href.slice(1) : '';
        return { tag: a?.tagName ?? '', href, text: (a?.textContent ?? '').trim().slice(0, 60), targets: id ? document.querySelectorAll(`[id="${CSS.escape(id)}"]`).length : 0 };
      });
      if (first.tag !== 'A' || !first.href.startsWith('#')) fail('skip-link', where, `first Tab stop is ${first.tag || 'nothing'} "${first.text}", not a skip link`);
      else if (first.targets !== 1) fail('skip-link', where, `skip link ${first.href} has ${first.targets} targets`);
    }
    await page.close();
  }
  await ctx.close();
}
await browser.close();

const byKind = failures.reduce((m, f) => ({ ...m, [f.kind]: (m[f.kind] ?? 0) + 1 }), {});
console.log(`Console accessibility audit: ${PAGES.length} pages × ${VIEWPORTS.length} viewports.`);
for (const f of failures.slice(0, 120)) console.log(`FAIL ${f.kind.padEnd(13)} ${f.where}  ${f.text}`);
if (failures.length > 120) console.log(`… and ${failures.length - 120} more`);
for (const w of warnings.slice(0, 30)) console.log(`warn ${w.kind.padEnd(13)} ${w.where}  ${w.text}`);
if (warnings.length > 30) console.log(`… and ${warnings.length - 30} more warnings`);
if (REPORT) writeFileSync(REPORT, JSON.stringify({ base: BASE, at: new Date().toISOString(), pages: PAGES.map(p => p.path), failures, warnings }, null, 2));
console.log(failures.length ? `\n${failures.length} failure(s): ${JSON.stringify(byKind)}` : '\nNo failures.');
process.exit(failures.length ? 1 : 0);
