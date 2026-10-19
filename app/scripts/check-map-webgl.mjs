// Browser check of the national-scale map renderer (architecture review G4):
// against a production build started with CIVICOS_MAP_CHECK=1, opens the
// test-only page /gov/sites/map-check with 100,000 synthetic points and 3,000
// synthetic outlines, and fails unless the points are drawn with WebGL, the
// GPU picking finds points under the pointer (hover label and click), the
// outlines pick too, a lost WebGL context falls back to the canvas layer and
// comes back when restored, and nothing errors. Then clustering at low zoom
// (?cluster=1), on the WebGL layer and on the canvas layer with reduced
// motion: every point clustered or drawn alone, hover names a cluster, click
// and Enter zoom in, "Whole map" zooms out. Screenshots go to --out.
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

// Clustering at low zoom (lib/map/cluster.ts), on the WebGL layer and on the canvas layer (with reduced
// motion): every point is in a cluster or drawn alone, a cluster names itself on hover, activating it by
// click or keyboard zooms the map in (fewer points clustered), and "Whole map" zooms back out.
const clusterState = async p => p.evaluate(() => {
  const s = document.querySelector('[data-testid="map-clusters"]');
  return s ? { clusters: Number(s.getAttribute('data-clusters')), clustered: Number(s.getAttribute('data-clustered')), singles: Number(s.getAttribute('data-singles')), zoom: Number(s.getAttribute('data-zoom')) } : null;
});
async function checkClusters(name, p, query, layer) {
  const out = {};
  const tc = Date.now();
  await p.goto(`${BASE}/gov/sites/map-check?n=${N}&areas=0&cluster=1${query}`, { waitUntil: 'networkidle', timeout: 120_000 });
  await p.waitForSelector('[data-testid="map-clusters"]', { timeout: 120_000 });
  if (layer === 'webgl') await p.waitForFunction(() => document.querySelector('canvas[data-testid="map-webgl"]')?.getAttribute('data-state') === 'ready', null, { timeout: 120_000 });
  else await p.waitForSelector('canvas[data-testid="map-point-canvas"]', { timeout: 120_000 });
  out.readyMs = Date.now() - tc;
  const s0 = await clusterState(p);
  out.whole = s0;
  if (!s0 || s0.clusters < 1) { problems.push(`${name}: no clusters at the whole-map view`); return out; }
  if (s0.clustered + s0.singles !== N) problems.push(`${name}: ${s0.clustered} clustered + ${s0.singles} alone is not ${N}`);
  if (layer === 'webgl') {
    const onGpu = Number(await p.locator('canvas[data-testid="map-webgl"]').getAttribute('data-points'));
    out.pointsOnGpu = onGpu;
    if (onGpu !== s0.singles) problems.push(`${name}: the GPU draws ${onGpu} points, expected the ${s0.singles} not clustered`);
  }
  const fig = p.locator('figure').first();
  const snap = async file => { const b = await fig.boundingBox(); if (b) await p.screenshot({ path: path.join(OUT, file), clip: { x: Math.max(0, b.x), y: Math.max(0, b.y), width: b.width, height: Math.min(b.height, 1600) }, fullPage: true }).catch(e => problems.push(`screenshot ${file}: ${e.message.slice(0, 120)}`)); };
  await snap(`clusters-${layer}-whole.png`);
  // The largest cluster: its name on hover, then a click zooms to it.
  const biggest = await p.evaluate(() => {
    const els = [...document.querySelectorAll('[data-testid="map-cluster"]')];
    let best = 0;
    els.forEach((e, i) => { if (Number(e.getAttribute('data-count')) > Number(els[best].getAttribute('data-count'))) best = i; });
    return best;
  });
  const mark = p.locator('[data-testid="map-cluster"]').nth(biggest);
  await mark.hover();
  out.hoverLabel = await p.waitForFunction(() => document.querySelector('[data-testid="map-cluster-hover"]')?.textContent || null, null, { timeout: 3000 }).then(h => h.jsonValue()).catch(() => null);
  if (!out.hoverLabel || !/close together/.test(out.hoverLabel)) problems.push(`${name}: hovering a cluster did not name it (${out.hoverLabel})`);
  out.ariaLabel = await mark.getAttribute('aria-label');
  if (!out.ariaLabel || !/Zoom in/.test(out.ariaLabel)) problems.push(`${name}: a cluster has no accessible name`);
  await mark.click();
  await p.waitForFunction(z => Number(document.querySelector('[data-testid="map-clusters"]')?.getAttribute('data-zoom')) > z, s0.zoom, { timeout: 5000 }).catch(() => problems.push(`${name}: clicking a cluster did not zoom in`));
  await p.waitForTimeout(600);
  const s1 = await clusterState(p);
  out.afterClick = s1;
  if (s1 && s1.clustered + s1.singles !== N) problems.push(`${name}: after zooming, ${s1.clustered} + ${s1.singles} is not ${N}`);
  if (s1 && s1.singles <= s0.singles) problems.push(`${name}: zooming in did not split clusters (${s0.singles} → ${s1.singles} drawn alone)`);
  await snap(`clusters-${layer}-zoomed.png`);
  // Keyboard: the first cluster takes focus, Enter zooms deeper.
  const focusable = p.locator('[data-testid="map-cluster"][tabindex="0"]');
  if (await focusable.count()) {
    await focusable.first().focus();
    await p.keyboard.press('Enter');
    await p.waitForFunction(z => Number(document.querySelector('[data-testid="map-clusters"]')?.getAttribute('data-zoom')) > z, s1?.zoom ?? 1, { timeout: 5000 }).catch(() => problems.push(`${name}: Enter on a cluster did not zoom in`));
    out.afterEnter = await clusterState(p);
  } else out.afterEnter = 'no cluster left to focus';
  // Back to the whole map.
  await p.locator('[data-testid="map-zoom-out"]').click();
  await p.waitForFunction(() => Number(document.querySelector('[data-testid="map-clusters"]')?.getAttribute('data-zoom')) === 1, null, { timeout: 5000 }).catch(() => problems.push(`${name}: "Whole map" did not zoom back out`));
  out.back = await clusterState(p);
  if (layer === 'webgl' && (await p.locator('canvas[data-testid="map-webgl"]').getAttribute('data-state')) !== 'ready') problems.push(`${name}: the WebGL layer is not ready after zooming`);
  return out;
}
result.checks.clustersWebgl = await checkClusters('clusters (WebGL)', page, '', 'webgl');
const reducedCtx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
await reducedCtx.addCookies([{ name: cookieName, value: rest.join('='), url: BASE }]);
const reducedPage = await reducedCtx.newPage();
reducedPage.on('pageerror', e => problems.push(`page error (reduced motion): ${e.message.slice(0, 200)}`));
reducedPage.on('console', m => { if (m.type() === 'error') problems.push(`console (reduced motion): ${m.text().slice(0, 200)}`); });
result.checks.clustersCanvasReducedMotion = await checkClusters('clusters (canvas, reduced motion)', reducedPage, '&webglAbove=1000000', 'canvas');
await reducedCtx.close();

result.problems = problems;
console.log(JSON.stringify(result, null, 2));
if (REPORT) writeFileSync(REPORT, JSON.stringify(result, null, 2));
await browser.close();
console.log(problems.length ? `\nMap renderer check failed: ${problems.length} problem(s).` : '\nMap renderer check passed.');
process.exit(problems.length ? 1 : 0);
