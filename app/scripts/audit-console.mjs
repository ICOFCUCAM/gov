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
//   Reading    (plan step I10: an automated screen-reader order check, not a
//   order      session with a screen reader) on every console page: the
//              accessibility tree has one main landmark and one h1, the h1 is
//              the first heading in main, every navigation landmark is named,
//              and no heading level is skipped going down (WCAG 1.3.1, 2.4.6).
//              The tree's outline of landmarks and headings goes in the report.
//   Focus      on the component-state gallery (/gov/help/states), every
//              control reached by Tab shows a visible focus indicator (an
//              outline at least 2px wide or a ring; WCAG 2.4.7).
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
  // Government operating model: laws, procedures, registers, cases.
  { path: '/gov/work', skip: true },
  { path: '/gov/law', skip: true },
  { path: '/gov/law/procedures', skip: true },
  { path: '/gov/civil', skip: true },
  { path: '/gov/organisations', skip: true },
  { path: '/gov/immigration', skip: true },
  { path: '/wallet/applications', skip: false },
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
  { path: '/admin/messaging', skip: true },
  // Sign-in accounts, the identity provider and passkeys (also on /gov/me).
  { path: '/admin/officials', skip: true },
  // Platform operations, with backups and data restore.
  { path: '/platform', skip: true },
  // Plan step I10: the screens added since this list was written (I2–I13), on the same checks,
  // and the component-state gallery (every shared component in every state, on every ground).
  { path: '/gov/help/states', skip: true, focus: true },
  { path: '/gov/workspace', skip: true },
  { path: '/gov/institutions/departments', skip: true },
  { path: '/gov/institutions/administration', skip: true },
  { path: '/gov/treasury/budget', skip: true },
  { path: '/gov/treasury/procurement', skip: true },
  { path: '/gov/cabinet-office', skip: true },
  { path: '/gov/tax/services', skip: true },
  { path: '/gov/identity', skip: true },
  { path: '/gov/passports', skip: true },
  { path: '/gov/labour', skip: true },
  { path: '/gov/social-protection', skip: true },
  { path: '/gov/land', skip: true },
  { path: '/gov/building', skip: true },
  { path: '/gov/local-government', skip: true },
  { path: '/gov/transport', skip: true },
  { path: '/gov/oversight', skip: true },
  { path: '/gov/exchange/federation', skip: true },
  { path: '/gov/exchange/workflows', skip: true },
  { path: '/gov/exchange/states', skip: true },
  { path: '/gov/exchange/contract', skip: true },
  { path: '/gov/security/resilience', skip: true },
  { path: '/gov/services', skip: true },
  { path: '/gov/services/management', skip: true },
  { path: '/gov/records', skip: true },
  { path: '/gov/twin/indicators', skip: true },
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
  const list = Array.isArray(j) ? j : j?.releases ?? j?.chamber?.releases ?? j?.items ?? [];
  const id = j?.chamber?.nation?.installedReleaseId ?? list.find(x => x && typeof x.id === 'string')?.id;
  if (id) PAGES.push({ path: `/updates/${encodeURIComponent(id)}`, skip: true }, { path: `/updates/${encodeURIComponent(id)}/evidence`, skip: true });
} catch { /* no release list: the static pages still run */ }

const failures = [];
const warnings = [];
const outlines = {};
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
      // Reading order as a screen reader meets it: landmarks and headings from the accessibility tree.
      const tree = await page.locator('body').ariaSnapshot().catch(() => '');
      const items = tree.split('\n')
        // YAML quotes a whole line whose name holds a colon ("- 'heading \"A: b\" [level=3]'"): unquote it first.
        .map(l => l.replace(/^(\s*)- '(.*)'(:?)$/, (_, sp, body, colon) => `${sp}- ${body.replace(/''/g, "'")}${colon}`))
        // A name is double-quoted, or single-quoted (YAML) when it holds a colon or a quote.
        .map(l => /^(\s*)- (main|navigation|banner|contentinfo|complementary|region|heading)\b(?: "((?:[^"\\]|\\.)*)"| '((?:[^']|'')*)')?(?: \[level=(\d)\])?/.exec(l)).filter(Boolean)
        .map(m => ({ depth: m[1].length, role: m[2], name: m[3] ?? (m[4] ?? '').replace(/''/g, "'"), level: m[5] ? Number(m[5]) : undefined }));
      outlines[where] = items.map(i => `${' '.repeat(i.depth)}${i.role}${i.level ? ` ${i.level}` : ''}${i.name ? ` "${i.name.slice(0, 60)}"` : ''}`);
      const mainAt = items.findIndex(i => i.role === 'main');
      const h1s = items.filter(i => i.role === 'heading' && i.level === 1);
      const mains = items.filter(i => i.role === 'main').length;
      if (mains !== 1) fail('reading-order', where, `${mains} main landmarks`);
      if (h1s.length !== 1) fail('reading-order', where, `${h1s.length} level-1 headings${h1s.length ? `: ${h1s.map(h => `"${h.name.slice(0, 40)}"`).join(', ')}` : ''}`);
      if (items.some(i => i.role === 'navigation' && !i.name)) fail('reading-order', where, 'a navigation landmark has no name');
      const inMain = [];
      if (mainAt >= 0) for (const i of items.slice(mainAt + 1)) { if (i.depth <= items[mainAt].depth) break; inMain.push(i); }
      const heads = inMain.filter(i => i.role === 'heading');
      if (heads.length && heads[0].level !== 1) fail('reading-order', where, `the first heading in main is level ${heads[0].level} "${heads[0].name.slice(0, 40)}", not the page's h1`);
      for (let k = 1; k < heads.length; k++) {
        if (heads[k].level > heads[k - 1].level + 1) { fail('reading-order', where, `heading level skips from ${heads[k - 1].level} to ${heads[k].level} at "${heads[k].name.slice(0, 40)}"`); break; }
      }
    }

    if (p.focus) {
      // Every control reached by Tab shows where focus is.
      await page.evaluate(() => { const s = document.createElement('span'); s.tabIndex = -1; s.id = '__audit_focus'; document.body.prepend(s); s.focus(); });
      const seen = new Set();
      for (let k = 0; k < 400; k++) {
        await page.keyboard.press('Tab');
        const f = await page.evaluate(() => {
          const a = document.activeElement;
          if (!a || a === document.body) return null;
          const cs = getComputedStyle(a);
          const outline = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2;
          const ring = !!cs.boxShadow && cs.boxShadow !== 'none';
          const r = a.getBoundingClientRect();
          return { key: `${a.tagName}#${a.id}:${(a.getAttribute('aria-label') || a.textContent || '').trim().slice(0, 40)}@${Math.round(r.top + window.scrollY)},${Math.round(r.left)}`, ok: outline || ring, label: `${a.tagName.toLowerCase()} "${(a.getAttribute('aria-label') || a.textContent || '').trim().slice(0, 40)}"` };
        });
        if (!f || seen.has(f.key)) break;
        seen.add(f.key);
        if (!f.ok) fail('focus', where, `${f.label} shows no focus indicator`);
      }
      if (seen.size < 20) fail('focus', where, `only ${seen.size} controls reached by Tab`);
      await page.evaluate(() => document.getElementById('__audit_focus')?.remove());
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
if (REPORT) writeFileSync(REPORT, JSON.stringify({ base: BASE, at: new Date().toISOString(), pages: PAGES.map(p => p.path), failures, warnings, outlines }, null, 2));
console.log(failures.length ? `\n${failures.length} failure(s): ${JSON.stringify(byKind)}` : '\nNo failures.');
process.exit(failures.length ? 1 : 0);
