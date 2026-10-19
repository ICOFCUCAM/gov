// Forward mode (src/common/forward.ts): writes go to the platform route that
// owns the record, with the caller's own credentials, and the platform's
// answer comes back in civic-api's shape. A stub platform stands in for the
// Next.js app.
import 'reflect-metadata';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, type IncomingMessage, type Server } from 'node:http';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { Body, Controller, Delete, Get, Module, Param, Post } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, NestFactory } from '@nestjs/core';
import type { INestApplication } from '@nestjs/common';
import { FORWARD_ROUTES, UNMAPPED, forwardWrite, matchForward, type ForwardLookup } from '../src/common/forward';
import { FORWARD_LOOKUP, MirrorGuard } from '../src/common/read-only-mirror.guard';
import { HttpExceptionFilter } from '../src/common/http-exception.filter';

// ── A stub platform ─────────────────────────────────────────────────────────
interface Seen { method: string; url: string; headers: IncomingMessage['headers']; body: unknown }
const seen: Seen[] = [];
let reply: (s: Seen) => { status: number; body: unknown; delayMs?: number; raw?: string } = () => ({ status: 200, body: {} });
let platform: Server;
let platformUrl = '';

const ministry = { id: 'min-health', slug: 'health', name: 'Ministry of Health and Care', archetype: 'HEALTH', status: 'active', createdAt: '2026-01-01T00:00:00.000Z',
  departments: [{ id: 'dep-health-1', name: 'Hospitals' }, { id: 'DEP-9', name: 'Public Health' }], modules: [{ moduleKey: 'hospitals', enabled: true }] };
const permit = { id: 'PM-1', type: 'market-stall', title: 'Stall 4', applicantName: 'A. Mensah', municipality: 'Capital District', status: 'approved', submittedAt: '2026-02-01T00:00:00.000Z',
  fields: {}, contestable: true, timeline: [{ status: 'submitted', at: '2026-02-01T00:00:00.000Z' }, { status: 'approved', at: '2026-02-02T00:00:00.000Z', officerName: 'J. Doe' }] };

before(async () => {
  platform = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      const text = Buffer.concat(chunks).toString('utf8');
      const s: Seen = { method: req.method!, url: req.url!, headers: req.headers, body: text ? JSON.parse(text) : undefined };
      seen.push(s);
      const r = reply(s);
      setTimeout(() => {
        res.statusCode = r.status;
        res.setHeader('content-type', 'application/json');
        res.end(r.raw ?? JSON.stringify(r.body));
      }, r.delayMs ?? 0);
    });
  });
  await new Promise<void>(ok => platform.listen(0, '127.0.0.1', ok));
  platformUrl = `http://127.0.0.1:${(platform.address() as AddressInfo).port}`;
});
after(() => new Promise<void>(ok => platform.close(() => ok())));

// ── civic-api, with controllers that would write if they ran ────────────────
let writes = 0;
@Controller('org')
class OrgLike {
  @Get('ministries') list() { return [{ id: 'mirrored' }]; }
  @Post('ministries/:id/rename') rename(@Param('id') _id: string, @Body() _b: unknown) { writes++; return { wrote: true }; }
  @Delete('ministries/:id/departments/:deptId') removeDept() { writes++; return { wrote: true }; }
}
@Controller('permits')
class PermitsLike {
  @Post() create() { writes++; return { wrote: true }; }
  @Post(':id/decide') decide() { writes++; return { wrote: true }; }
}
@Controller('identity')
class IdentityLike {
  @Post('citizens') upsert() { writes++; return { wrote: true }; }
}
const lookup: ForwardLookup = {
  citizen: async id => (id === 'cit-1' ? { displayName: 'A. Mensah', municipality: 'Capital District' } : null),
  platformTenant: async () => 'home',
};
@Module({
  controllers: [OrgLike, PermitsLike, IdentityLike],
  providers: [
    { provide: FORWARD_LOOKUP, useValue: lookup },
    { provide: APP_GUARD, useClass: MirrorGuard },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
class ForwardTestModule {}

async function withCivicApi(fn: (base: string, app: INestApplication) => Promise<void>, env: Record<string, string> = {}): Promise<void> {
  const saved = { ...process.env };
  Object.assign(process.env, { CIVICOS_PLATFORM_URL: platformUrl, CIVIC_API_MODE: 'forward', CIVICOS_PLATFORM_TIMEOUT_MS: '2000', ...env });
  const app = await NestFactory.create(ForwardTestModule, { logger: false });
  app.setGlobalPrefix('api');
  await app.listen(0, '127.0.0.1');
  try { await fn(await app.getUrl(), app); } finally {
    await app.close();
    for (const k of Object.keys(process.env)) if (!(k in saved)) delete process.env[k];
    Object.assign(process.env, saved);
  }
}

const post = (base: string, path: string, body: unknown, headers: Record<string, string> = {}, method = 'POST') =>
  fetch(`${base}${path}`, { method, headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });

test('a write goes to the owning platform route with the caller\'s own credentials, unchanged, and nothing else', async () => {
  seen.length = 0; writes = 0;
  reply = () => ({ status: 200, body: { ministry: { ...ministry, name: 'Ministry of Health' } } });
  await withCivicApi(async base => {
    const principal = Buffer.from(JSON.stringify({ sub: 'dev', tenantId: 't' })).toString('base64url');
    const res = await post(base, '/api/org/ministries/min-health/rename', { name: 'Ministry of Health', by: 'Someone Else' }, {
      cookie: 'civicos_official=signed.session.token; other=1',
      authorization: 'Bearer caller-token',
      'x-civic-principal': principal,
    });
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('x-civicos-mode'), 'forward');
    assert.equal(res.headers.get('x-civicos-forwarded-to'), 'POST /api/org/ministries/min-health/rename');
    // civic-api's shape: upper-case enums, departments and modules keyed by their ministry.
    const body = await res.json() as { name: string; status: string; departments: { id: string; ministryId: string }[]; modules: { id: string }[] };
    assert.equal(body.name, 'Ministry of Health');
    assert.equal(body.status, 'ACTIVE');
    assert.deepEqual(body.departments.map(d => d.id), ['min-health:dep-health-1', 'min-health:DEP-9']);
    assert.equal(body.modules[0]!.id, 'min-health:hospitals');
  });
  assert.equal(seen.length, 1);
  const s = seen[0]!;
  assert.equal(s.method, 'POST');
  assert.equal(s.url, '/api/org/ministries/min-health/rename');
  assert.equal(s.headers.cookie, 'civicos_official=signed.session.token; other=1');
  assert.equal(s.headers.authorization, 'Bearer caller-token');
  assert.equal(s.headers['x-civic-principal'], undefined, 'civic-api\'s development principal never reaches the platform');
  // Only the mapped fields: an actor named in the body is not passed on (the platform decides who acted).
  assert.deepEqual(s.body, { name: 'Ministry of Health' });
  assert.equal(writes, 0, 'no civic-api handler ran');
});

test('without credentials, none are invented', async () => {
  seen.length = 0;
  reply = () => ({ status: 401, body: { error: 'Sign in as an official to make changes (/sign-in)' } });
  await withCivicApi(async base => {
    const res = await post(base, '/api/org/ministries/min-health/rename', { name: 'X Ministry' });
    assert.equal(res.status, 401);
    const body = await res.json() as { error: string; status: number };
    assert.equal(body.status, 401);
    assert.equal(body.error, 'Sign in as an official to make changes (/sign-in)');
  });
  assert.equal(seen[0]!.headers.cookie, undefined);
  assert.equal(seen[0]!.headers.authorization, undefined);
});

test('request and answer mapping: permit decision, permit from a mirrored citizen, department removal', async () => {
  seen.length = 0; writes = 0;
  reply = s => s.url.endsWith('/decide') || s.url === '/api/permits'
    ? { status: s.url === '/api/permits' ? 201 : 200, body: { permit } }
    : { status: 200, body: { ministry } };
  await withCivicApi(async base => {
    const d = await post(base, '/api/permits/PM-1/decide', { decision: 'APPROVED', officerName: 'J. Doe', note: 'ok' });
    assert.equal(d.status, 200);
    const p = await d.json() as { type: string; status: string; timeline: { id: string; status: string }[] };
    assert.equal(p.type, 'MARKET_STALL');
    assert.equal(p.status, 'APPROVED');
    assert.deepEqual(p.timeline.map(t => [t.id, t.status]), [['PM-1:0', 'SUBMITTED'], ['PM-1:1', 'APPROVED']]);

    const c = await post(base, '/api/permits', { citizenId: 'cit-1', type: 'MARKET_STALL', title: 'Stall 4' });
    assert.equal(c.status, 201);

    const r = await post(base, '/api/org/ministries/min-health/departments/min-health:DEP-9', {}, {}, 'DELETE');
    assert.equal(r.status, 200);
    assert.deepEqual(await r.json(), { removed: 'min-health:DEP-9' });

    // No applicant to name: refused here, the platform is not asked.
    const n = await post(base, '/api/permits', { citizenId: 'unknown', type: 'EVENT', title: 'Fair' });
    assert.equal(n.status, 422);
  });
  assert.deepEqual(seen.map(s => [s.method, s.url]), [
    ['POST', '/api/permits/PM-1/decide'],
    ['POST', '/api/permits'],
    ['DELETE', '/api/org/ministries/min-health/departments/DEP-9'],
  ]);
  assert.deepEqual(seen[0]!.body, { officerName: 'J. Doe', note: 'ok', decision: 'approve' });
  assert.deepEqual(seen[1]!.body, { type: 'market-stall', title: 'Stall 4', applicantName: 'A. Mensah', municipality: 'Capital District', fields: {} });
  assert.equal(writes, 0);
});

test('a write with no platform route answers 410 and the platform is not asked', async () => {
  seen.length = 0; writes = 0;
  await withCivicApi(async base => {
    const res = await post(base, '/api/identity/citizens', { subject: 's', displayName: 'A' });
    assert.equal(res.status, 410);
    assert.equal(res.headers.get('x-civicos-owner'), '/sign-in (substrate auth)');
    const body = await res.json() as { error: string };
    assert.match(body.error, /no owner route there yet \(citizen identity is owned by the substrate/);
  });
  assert.equal(seen.length, 0);
  assert.equal(writes, 0);
});

test('upstream failures: 5xx → 502, unreachable → 502, no answer in time → 504; never retried', async () => {
  seen.length = 0;
  reply = () => ({ status: 503, body: { error: 'not the state writer just now' } });
  await withCivicApi(async base => {
    const res = await post(base, '/api/org/ministries/min-health/rename', { name: 'Ministry X' });
    assert.equal(res.status, 502);
    const body = await res.json() as { error: string; upstreamStatus: number };
    assert.equal(body.upstreamStatus, 503);
    assert.match(body.error, /answered 503 to POST \/api\/org\/ministries\/min-health\/rename: not the state writer just now/);
  });
  assert.equal(seen.length, 1);

  seen.length = 0;
  reply = () => ({ status: 200, body: { ministry }, delayMs: 600 });
  await withCivicApi(async base => {
    const res = await post(base, '/api/org/ministries/min-health/rename', { name: 'Ministry X' });
    assert.equal(res.status, 504);
    assert.match((await res.json() as { error: string }).error, /did not answer .* within 0\.2 s.*does not retry writes/);
  }, { CIVICOS_PLATFORM_TIMEOUT_MS: '200' });
  await new Promise(r => setTimeout(r, 700));
  assert.equal(seen.length, 1, 'one attempt only');

  reply = () => ({ status: 200, body: {}, raw: '<html>proxy</html>' });
  await withCivicApi(async base => {
    const res = await post(base, '/api/org/ministries/min-health/rename', { name: 'Ministry X' });
    assert.equal(res.status, 502);
    assert.match((await res.json() as { error: string }).error, /not JSON/);
  });

  // A closed port.
  const closed = createServer();
  await new Promise<void>(ok => closed.listen(0, '127.0.0.1', ok));
  const dead = `http://127.0.0.1:${(closed.address() as AddressInfo).port}`;
  await new Promise<void>(ok => closed.close(() => ok()));
  const r = await forwardWrite({ method: 'POST', path: '/api/org/ministries/m/rename', headers: {}, body: { name: 'Xyz' } }, { base: dead, timeoutMs: 2000 });
  assert.equal(r.status, 502);
  assert.match((r.body as { error: string }).error, /could not be reached/);
});

test('every civic-api write endpoint is forwarded or listed as having no owner route', () => {
  const modules = join(__dirname, '..', '..', 'src', 'modules');
  const found: string[] = [];
  for (const m of readdirSync(modules)) {
    for (const f of readdirSync(join(modules, m))) {
      if (!f.endsWith('.controller.ts') || !statSync(join(modules, m, f)).isFile()) continue;
      const src = readFileSync(join(modules, m, f), 'utf8');
      const prefix = /@Controller\((?:'([^']*)')?\)/.exec(src)?.[1] ?? '';
      for (const x of src.matchAll(/@(Post|Put|Patch|Delete)\((?:'([^']*)')?\)/g)) {
        found.push(`${x[1]!.toUpperCase()} ${[prefix, x[2] ?? ''].filter(Boolean).join('/')}`);
      }
    }
  }
  const known = new Set([...FORWARD_ROUTES.map(r => `${r.method} ${r.path}`), ...UNMAPPED.map(u => `${u.method} ${u.path}`)]);
  assert.deepEqual(found.filter(e => !known.has(e)), []);
  assert.deepEqual([...known].filter(e => !found.includes(e)), [], 'no mapping for an endpoint civic-api does not have');
  assert.equal(found.length, FORWARD_ROUTES.length + UNMAPPED.length);
  // Matching: params decoded, query ignored, /api optional.
  assert.deepEqual(matchForward('POST', '/api/org/ministries/a%20b/merge?x=1')?.params, { id: 'a b' });
  assert.equal(matchForward('POST', 'platform/backups/BK-1/restore')?.route.platform, '/api/platform/backups/{id}/restore');
  assert.equal(matchForward('GET', '/api/permits'), null);
});

test('conditional refusals: tenant-scoped configuration, another tenant\'s lifecycle', async () => {
  const base = { base: 'http://127.0.0.1:9', lookup };
  const tenantCfg = await forwardWrite({ method: 'POST', path: '/api/platform/config', headers: {}, body: { scope: 'TENANT', payload: {} } }, base);
  assert.equal(tenantCfg.status, 410);
  assert.equal(tenantCfg.forwarded, false);
  const other = await forwardWrite({ method: 'POST', path: '/api/platform/tenants/platform:min-health/transition', headers: {}, body: { to: 'SUSPENDED', reason: 'test' } }, base);
  assert.equal(other.status, 410);
  assert.match((other.body as { error: string }).error, /own tenant \(platform:home\) only/);
});
