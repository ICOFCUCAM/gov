// Console smoke tests (architecture review R17): the pages officials rely on
// most, opened in a real browser against a running build, on a desktop and a
// phone. Fails on any uncaught page error, any Content-Security-Policy violation, a page without its heading, a map
// page without its map, horizontal scrolling on the phone, or a console API
// the page calls answering 5xx.
//
// Usage: node scripts/smoke-console.mjs --base http://localhost:3000
//        [--chromium /path/to/chromium] [--report smoke.json]
// The run signs in as the demo session (a server started with
// CIVICOS_AUTH=open, or next dev; a production build enforces sign-in by
// default, go-live review L-2) unless --cookie name=value is given for an
// enforce-mode server. --nation KEN
// installs a nation first (never on a real installation).

import { writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const arg = (name, fallback) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : fallback; };
const BASE = arg('--base', 'http://localhost:3000').replace(/\/$/, '');
const CHROMIUM = arg('--chromium', process.env.CHROMIUM_PATH || undefined);
const REPORT = arg('--report');
const COOKIE = arg('--cookie', 'civicos_session=demo');
// A fresh server has no nation and so no map: --nation ISO3 sets one first (test servers only).
const NATION = arg('--nation');

/** Each page: its address, whether it shows a map, and text it must contain. */
const PAGES = [
  { path: '/gov/twin', map: false, text: /national data|twin/i },
  { path: '/gov/sites', map: true, text: /sites/i },
  { path: '/gov/sites/boundaries', map: false, text: /boundaries/i },
  { path: '/gov/sites/parcels', map: false, text: /land parcels/i },
  { path: '/gov/situation-room', map: true, text: /situation/i },
  { path: '/gov/regional', map: true, text: /region/i },
  { path: '/gov/geopolitical', map: false, text: /world|foreign/i },
  { path: '/audit', map: false, text: /audit/i },
  { path: '/command', map: false, text: /command|sovereign/i },
  // Plan phase 4: the shared workspace shell and the offices of state.
  { path: '/gov/workspace', map: false, text: /my authority/i },
  { path: '/gov/configuration/offices', map: false, text: /offices of state/i },
  { path: '/gov/configuration/constitution', map: false, text: /constitutional profile/i },
  { path: '/gov/legislature', map: false, text: /bills and votes/i },
  // Plan phase 6: transitions and emergencies.
  { path: '/gov/configuration/transitions', map: false, text: /record a legal event/i },
];
const VIEWPORTS = [{ name: 'desktop', width: 1440, height: 900 }, { name: 'phone', width: 390, height: 844 }];

const [cookieName, ...rest] = COOKIE.split('=');
if (NATION) {
  const r = await fetch(`${BASE}/api/sovereign`, { method: 'PUT', headers: { 'content-type': 'application/json', cookie: COOKIE }, body: JSON.stringify({ iso3: NATION, regions: [], by: 'smoke test' }) });
  if (!r.ok) { console.error(`Could not set the nation: ${r.status}`); process.exit(1); }
}
const browser = await chromium.launch(CHROMIUM ? { executablePath: CHROMIUM } : {});
const results = [];
let failed = 0;
for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  await ctx.addCookies([{ name: cookieName, value: rest.join('='), url: BASE }]);
  for (const p of PAGES) {
    const page = await ctx.newPage();
    const problems = [];
    page.on('pageerror', e => problems.push(`page error: ${e.message.slice(0, 160)}`));
    page.on('console', m => { if (m.type() === 'error' && /Content Security Policy/i.test(m.text())) problems.push(`CSP: ${m.text().slice(0, 160)}`); });
    page.on('response', r => { if (r.url().startsWith(`${BASE}/api/`) && r.status() >= 500) problems.push(`${r.status()} from ${r.url().slice(BASE.length)}`); });
    const t0 = Date.now();
    const res = await page.goto(BASE + p.path, { waitUntil: 'networkidle', timeout: 60_000 }).catch(e => { problems.push(`navigation: ${e.message.slice(0, 120)}`); return null; });
    if (res && res.status() >= 400) problems.push(`status ${res.status()}`);
    await page.waitForTimeout(1500);
    const body = await page.locator('body').innerText().catch(() => '');
    if (!p.text.test(body)) problems.push(`missing text ${p.text}`);
    if (!(await page.locator('h1').count())) problems.push('no h1');
    if (p.map && !(await page.locator('svg[aria-roledescription="map"], figure svg, canvas').count())) problems.push('no map drawn');
    if (vp.name === 'phone') {
      const sw = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (sw > 2) problems.push(`scrolls sideways by ${sw}px`);
    }
    results.push({ viewport: vp.name, path: p.path, ms: Date.now() - t0, problems });
    if (problems.length) failed++;
    console.log(`${problems.length ? 'FAIL' : 'ok  '} ${vp.name.padEnd(7)} ${p.path}${problems.length ? ` — ${problems.join('; ')}` : ''}`);
    await page.close();
  }
  await ctx.close();
}
await browser.close();
if (REPORT) writeFileSync(REPORT, JSON.stringify({ base: BASE, results }, null, 2));
console.log(failed ? `\n${failed} page check(s) failed.` : '\nAll console smoke checks passed.');
process.exit(failed ? 1 : 0);
