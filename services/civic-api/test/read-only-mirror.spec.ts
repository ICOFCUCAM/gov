// civic-api is a mirror of the CivicOS platform (src/common/read-only-mirror.ts).
// Run with `npm test`: compiled by tsc (decorators), run by node's test runner.
import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { Body, Controller, Delete, Get, Module, Patch, Post, Put } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, NestFactory } from '@nestjs/core';
import { MIRRORED_MODULES, assertMirrorMode, frozenRefusal, mirrorMode, moduleFor, unmappedRefusal } from '../src/common/read-only-mirror';
import { MirrorGuard } from '../src/common/read-only-mirror.guard';
import { HttpExceptionFilter } from '../src/common/http-exception.filter';

test('frozen: reads pass, writes are refused with the owning platform route', () => {
  for (const m of ['GET', 'HEAD', 'OPTIONS', 'get']) assert.equal(frozenRefusal(m, '/api/permits'), null);
  for (const m of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    const r = frozenRefusal(m, '/api/permits/abc/approve');
    assert.ok(r);
    assert.equal(r.status, 410);
    assert.equal(r.owner, '/api/permits');
    assert.match(r.message, /frozen read-only mirror.*\/api\/permits/);
  }
  assert.equal(frozenRefusal('POST', '/api/federation/propose')?.owner, '/api/federation, /api/integrations, /api/webhooks');
  assert.equal(frozenRefusal('POST', '/api/platform/backups')?.register, 'ops');
  assert.equal(frozenRefusal('POST', '/api/tenancy?x=1')?.owner, '/api/sovereign, /api/setup');
  // A path no module serves is refused too, pointing at the ownership map.
  const unknown = frozenRefusal('POST', '/api/whatever');
  assert.ok(unknown);
  assert.equal(unknown.register, null);
  assert.match(unknown.message, /\/api\/platform\/owners/);
});

test('forward: a write with no owner route says so and names the register\'s owner', () => {
  const r = unmappedRefusal('POST', '/api/identity/citizens', 'owned by the substrate');
  assert.equal(r.status, 410);
  assert.equal(r.owner, '/sign-in (substrate auth)');
  assert.match(r.message, /no owner route there yet \(owned by the substrate\); nothing was written/);
});

test('every module is a mirror, with the platform register that owns it', () => {
  const modules = readdirSync(join(__dirname, '..', '..', 'src', 'modules'));
  assert.deepEqual([...modules].sort(), MIRRORED_MODULES.map(m => m.module).sort());
  for (const m of MIRRORED_MODULES) for (const p of m.prefixes) assert.equal(moduleFor(`/api/${p}/x`)?.module, m.module);
});

test('the mode is forward (default) or frozen; anything else does not start', () => {
  assert.equal(mirrorMode({}), 'forward');
  assert.equal(mirrorMode({ CIVIC_API_MODE: '' }), 'forward');
  assert.equal(mirrorMode({ CIVIC_API_MODE: 'forward' }), 'forward');
  assert.equal(mirrorMode({ CIVIC_API_MODE: 'frozen' }), 'frozen');
  assert.throws(() => mirrorMode({ CIVIC_API_MODE: 'writable' }), /accepts only "forward".*or "frozen"/);
  assert.throws(() => mirrorMode({ CIVIC_API_MODE: 'off' }), /mirror of the CivicOS platform/);
  // Forward needs the platform's address; frozen does not.
  assert.throws(() => assertMirrorMode({}), /CIVICOS_PLATFORM_URL/);
  assert.throws(() => assertMirrorMode({ CIVICOS_PLATFORM_URL: 'ftp://x' }), /http or https/);
  assert.equal(assertMirrorMode({ CIVICOS_PLATFORM_URL: 'http://app:3000' }), 'forward');
  assert.equal(assertMirrorMode({ CIVIC_API_MODE: 'frozen' }), 'frozen');
});

@Controller('permits')
class PermitsLike {
  writes = 0;
  @Get() list() { return { permits: [] }; }
  @Post() create(@Body() _b: unknown) { this.writes++; return { ok: true }; }
  @Put(':id') put() { this.writes++; return { ok: true }; }
  @Patch(':id') patch() { this.writes++; return { ok: true }; }
  @Delete(':id') remove() { this.writes++; return { ok: true }; }
}

@Module({
  controllers: [PermitsLike],
  providers: [
    { provide: APP_GUARD, useClass: MirrorGuard },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
class FrozenTestModule {}

test('through Nest, frozen: GET answers, every write is 410 with the owner, no handler runs', async () => {
  const saved = process.env.CIVIC_API_MODE;
  process.env.CIVIC_API_MODE = 'frozen';
  const app = await NestFactory.create(FrozenTestModule, { logger: false });
  app.setGlobalPrefix('api');
  await app.listen(0, '127.0.0.1');
  try {
    const base = await app.getUrl();
    const read = await fetch(`${base}/api/permits`);
    assert.equal(read.status, 200);
    assert.deepEqual(await read.json(), { permits: [] });
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      const res = await fetch(`${base}/api/permits${method === 'POST' ? '' : '/p1'}`, { method, headers: { 'content-type': 'application/json' }, body: '{}' });
      assert.equal(res.status, 410, method);
      assert.equal(res.headers.get('x-civicos-owner'), '/api/permits');
      assert.equal(res.headers.get('x-civicos-mode'), 'frozen-read-only-mirror');
      const body = await res.json() as { error: string; status: number };
      assert.equal(body.status, 410);
      assert.match(body.error, /owned by the CivicOS platform\. Make this change through \/api\/permits/);
    }
    assert.equal(app.get(PermitsLike).writes, 0);
  } finally {
    await app.close();
    if (saved === undefined) delete process.env.CIVIC_API_MODE; else process.env.CIVIC_API_MODE = saved;
  }
});
