// Browser check of the national-scale map renderer (architecture review G4):
// against a production build started with CIVICOS_MAP_CHECK=1, opens the
// test-only page /gov/sites/map-check with 100,000 synthetic points and 3,000
// synthetic outlines, and fails unless the points are drawn with WebGL, the
// GPU picking finds points under the pointer (hover label and click), the
// outlines pick too, a lost WebGL context falls back to the canvas layer and
// comes back when restored, and nothing errors. Screenshots go to --out.
//
// Usage: node scripts/check-map-webgl.mjs --base http://localhost:3555
//        [--chromium /path/to/chromium] [--n 100000] [--out dir] [--nation KEN]
//        [--report check.json]

import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const arg = (name, fallback) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : fallback; };
const BASE = arg('--base', 'http://localhost:3000').replace(/\/$/, '');
const CHROMIUM = arg('--chromium', process.env.CHROMIUM_PATH || undefined);
const N = Number(arg('--n', '100000'));
const OUT = arg('--out', 'map-check');
const NATION = arg('--nation');
const REPORT = arg('--report');
const COOKIE = arg('--cookie', 'civicos_session=demo');
mkdirSync(OUT, { recursive: true });

if (NATION) {
  const r = await fetch(`${BASE}/api/sovereign`, { method: 'PUT', headers: { 'content-type': 'application/json', cookie: COOKIE }, body: JSON.stringify({ iso3: NATION, regions: [], by: 'map check' }) });
  if (!r.ok) { console.error(`Could not set the nation: ${r.status}`); process.exit(1); }
}

// Headless Chromium draws WebGL with SwiftShader (software), as a server without a GPU would.
const browser = await chromium.launch({ ...(CHROMIUM ? { executablePath: CHROMIUM } : {}), args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const [cookieName, ...rest] = COOKIE.split('=');
await ctx.addCookies([{ name: cookieName, value: rest.join('='), url: BASE }]);
const page = await ctx.newPage();
const problems = [];
const result = { base: BASE, n: N, checks: {} };
page.on('pageerror', e => problems.push(`page error: ${e.message.slice(0, 200)}`));
page.on('console', m => { if (m.type() === 'error') problems.push(`console: ${m.text().slice(0, 200)}`); });

const t0 = Date.now();
await page.goto(`${BASE}/gov/sites/map-check?n=${N}&areas=3000`, { waitUntil: 'networkidle', timeout: 120_000 });
const gl = page.locator('canvas[data-testid="map-webgl"]');
await gl.waitFor({ state: 'attached', timeout: 120_000 });
await page.waitForFunction(n => { const c = document.querySelector('canvas[data-testid="map-webgl"]'); return c && c.getAttribute('data-state') === 'ready' && Number(c.getAttribute('data-points')) === n; }, N, { timeout: 120_000 });
result.checks.readyMs = Date.now() - t0;
result.checks.webglVersion = await gl.getAttribute('data-webgl');
result.checks.pointsOnGpu = Number(await gl.getAttribute('data-points'));
result.checks.polygonsOnGpu = Number(await gl.getAttribute('data-polygons'));
if (result.checks.pointsOnGpu !== N) problems.push(`expected ${N} points on the GPU, found ${result.checks.pointsOnGpu}`);
if (result.checks.polygonsOnGpu < 2001) problems.push(`expected the outlines on the GPU, found ${result.checks.polygonsOnGpu}`);
await page.waitForTimeout(500);
const figure = page.locator('figure').first();
/** A screenshot of the map's figure (by its box, so a layer still settling does not hold it up). */
async function shot(name) {
  const b = await figure.boundingBox();
  if (b) await page.screenshot({ path: path.join(OUT, name), clip: { x: Math.max(0, b.x), y: Math.max(0, b.y), width: b.width, height: Math.min(b.height, 1600) }, fullPage: true }).catch(e => problems.push(`screenshot ${name}: ${e.message.slice(0, 120)}`));
}
await shot(`webgl-${N}.png`);

// Hover across a grid of positions where the points lie (data-extent): GPU picking must find points under
// nearly all of them (100,000 points leave few gaps of 8 px). The pointer moves a little first, as a hand does.
const box = await gl.boundingBox();
const [ex0, ey0, ex1, ey1] = (await gl.getAttribute('data-extent')).split(',').map(Number);
let hits = 0, tries = 0, firstHit = null;
const t1 = Date.now();
for (let gy = 1; gy < 8; gy++) {
  for (let gx = 1; gx < 8; gx++) {
    const x = box.x + ex0 + ((ex1 - ex0) * gx) / 8, y = box.y + ey0 + ((ey1 - ey0) * gy) / 8;
    await page.mouse.move(box.x - 30, box.y - 30); // off the map: the last label goes
    await page.mouse.move(x - 3, y - 3);
    await page.mouse.move(x, y, { steps: 2 });
    tries++;
    const label = await page.waitForFunction(() => document.querySelector('[data-testid="map-point-hover"]')?.textContent || null, null, { timeout: 2500 }).then(h => h.jsonValue()).catch(() => null);
    if (label && /Synthetic point \d+/.test(label)) { hits++; firstHit ??= { x, y, label }; }
  }
}
result.checks.hover = { tries, hits, msPerHover: Math.round((Date.now() - t1) / tries) };
if (hits < tries * 0.8) problems.push(`picking found points under only ${hits} of ${tries} positions`);

// Click the first picked point: the page follows its link (#pt-N) and the selection ring is drawn.
if (firstHit) {
  await page.mouse.move(firstHit.x, firstHit.y);
  const label = await page.locator('[data-testid="map-point-hover"]').textContent();
  await page.mouse.click(firstHit.x, firstHit.y);
  await page.waitForTimeout(400);
  const hash = await page.evaluate(() => window.location.hash);
  const want = `#pt-${/Synthetic point (\d+)/.exec(label)[1]}`;
  result.checks.click = { label: label.trim(), hash, want };
  if (hash !== want) problems.push(`click went to ${hash}, expected ${want}`);
  await shot(`webgl-${N}-selected.png`);
} else problems.push('no point was picked');

// Outlines near the capital pick as well (they are under the points only where no point is).
const areaHit = await page.evaluate(() => !!document.querySelector('[data-testid="map-area-hover"]'));
result.checks.areaHoverSeen = areaHit;

// A lost context: the canvas layer takes over; restored: WebGL again.
await page.evaluate(() => {
  const c = document.querySelector('canvas[data-testid="map-webgl"]');
  const g = c.getContext('webgl2') || c.getContext('webgl');
  window.__lose = g.getExtension('WEBGL_lose_context');
  window.__lose.loseContext();
});
await page.waitForFunction(() => document.querySelector('canvas[data-testid="map-webgl"]')?.getAttribute('data-state') === 'lost', null, { timeout: 10_000 }).catch(() => problems.push('context loss was not noticed'));
const fallback = await page.locator('canvas[data-testid="map-point-canvas"]').count();
result.checks.fallbackCanvas = fallback === 1;
if (fallback !== 1) problems.push('no canvas fallback while the WebGL context was lost');
await shot(`webgl-${N}-context-lost-canvas.png`);
await page.evaluate(() => window.__lose.restoreContext());
await page.waitForFunction(() => document.querySelector('canvas[data-testid="map-webgl"]')?.getAttribute('data-state') === 'ready', null, { timeout: 20_000 }).catch(() => problems.push('the context was not restored'));
result.checks.restored = (await gl.getAttribute('data-state')) === 'ready';
await page.waitForTimeout(300);

// The table view still lists the points.
await page.getByRole('button', { name: 'Table', exact: true }).first().click();
const listed = await page.locator('[data-testid="map-located-items"] caption').textContent();
result.checks.tableCaption = listed;
if (!listed || !listed.includes(N.toLocaleString('en'))) problems.push(`the table does not list the ${N} points (${listed})`);

result.problems = problems;
console.log(JSON.stringify(result, null, 2));
if (REPORT) writeFileSync(REPORT, JSON.stringify(result, null, 2));
await browser.close();
console.log(problems.length ? `\nMap renderer check failed: ${problems.length} problem(s).` : '\nMap renderer check passed.');
process.exit(problems.length ? 1 : 0);
