// Every change through the API is covered by a permission rule (lib/auth/roles.ts).
// Walks every route file under app/api that exports POST, PUT, PATCH or DELETE
// and checks that its path is public-write, self-authenticated, bearer-checked,
// or covered by an administrator, ministry or official rule. A new mutating
// route that matches none fails here (and would be refused at run time: the
// permission is deny by default), in the same spirit as route-lock.test.ts.

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { apiPermission, mutationRule, BEARER_READS, BEARER_ROUTES, INSTITUTION_READS, SELF_AUTHENTICATED } from './roles';

const API = path.join(__dirname, '..', '..', 'app', 'api');
const METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'] as const;

function routeFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e =>
    e.isDirectory() ? routeFiles(path.join(dir, e.name)) : e.name === 'route.ts' ? [path.join(dir, e.name)] : []);
}

/** A concrete request path for a route file: each [param] becomes a sample segment. */
const samplePath = (file: string) => '/api' + path.dirname(file).slice(API.length).split(path.sep).join('/')
  .replace(/\[\.\.\.[^\]]+\]/g, 'a/b').replace(/\[([^\]]+)\]/g, (_m, p: string) => `sample-${p.toLowerCase()}`);

const mutating = routeFiles(API).flatMap(file => {
  const src = fs.readFileSync(file, 'utf8');
  const methods = METHODS.filter(m => new RegExp(`export (async function|function|const) ${m}\\b`).test(src));
  return methods.length ? [{ file: path.relative(API, file), path: samplePath(file), methods, src }] : [];
});

describe('every mutating API route is covered by a permission rule', () => {
  it('finds the mutating routes', () => {
    expect(mutating.length).toBeGreaterThan(100);
  });

  for (const r of mutating) {
    it(`${r.methods.join(',')} ${r.path}`, () => {
      expect(mutationRule(r.path), `${r.file}: add it to a rule in lib/auth/roles.ts`).not.toBeNull();
      // An administrator serving the whole government passes the path rules for every covered route.
      for (const m of r.methods) expect(apiPermission({ role: 'administrator' }, m, r.path), r.file).toBeNull();
    });
  }

  it('routes reached with a bearer or their own key really check it', () => {
    for (const r of mutating) {
      const rule = mutationRule(r.path);
      if (rule !== 'bearer' && rule !== 'self-authenticated') continue;
      expect(r.src, r.file).toMatch(/publisherAuthorized|platformOrCronAuthorized|cronAuthorized|authorized\(req\)|ForKey\(|authorization/);
    }
    // The bearer list names only routes that exist.
    for (const re of [...BEARER_ROUTES, ...SELF_AUTHENTICATED]) expect(mutating.some(r => re.test(r.path)), String(re)).toBe(true);
  });

  it('refuses a change no rule covers (deny by default)', () => {
    expect(mutationRule('/api/something-new')).toBeNull();
    expect(apiPermission({ role: 'administrator' }, 'POST', '/api/something-new')).toMatch(/No permission rule/);
    expect(apiPermission({ role: 'administrator' }, 'GET', '/api/something-new')).toBeNull();
  });

  it('keeps the installation, federation, integrations and webhooks for administrators', () => {
    for (const p of ['/api/platform/backups/B-1/restore', '/api/platform/config/C-1/apply', '/api/platform/backups', '/api/platform/deployments',
      '/api/platform/lifecycle/transition', '/api/federation/propose', '/api/federation/grants/G-1/approve', '/api/integrations', '/api/integrations/I-1/approve',
      '/api/webhooks', '/api/webhooks/W-1/pause', '/api/municipalities']) {
      expect(apiPermission({ role: 'signatory' }, 'POST', p), p).toMatch(/administrator/);
      expect(apiPermission({ role: 'officer', institution: 'min-health' }, 'POST', p), p).toMatch(/administrator/);
      expect(apiPermission({ role: 'administrator' }, 'POST', p), p).toBeNull();
    }
  });

  it('lets officials do the day-to-day work, and auditors nothing', () => {
    for (const p of ['/api/twin/scenarios', '/api/twin/sources', '/api/directives', '/api/ops/incidents', '/api/releases/requests']) {
      expect(apiPermission({ role: 'officer' }, 'POST', p), p).toBeNull();
      expect(apiPermission({ role: 'auditor' }, 'POST', p), p).toMatch(/Auditors/);
    }
    // Citizens' email updates and machine routes stay open whoever is signed in.
    expect(apiPermission({ role: 'auditor' }, 'POST', '/api/public-sites/police/subscribe')).toBeNull();
    expect(apiPermission({ role: 'auditor' }, 'POST', '/api/cron/sla')).toBeNull();
  });

  it('keeps the Update Center\'s installation-level decisions for the nation\'s government-wide administrators (review H-4)', () => {
    const releases = mutating.filter(r => r.path.startsWith('/api/releases'));
    expect(releases.length).toBeGreaterThan(20);
    const work = /^\/api\/releases\/(requests|support|telemetry)(\/|$)/;
    for (const r of releases) {
      const rule = mutationRule(r.path);
      if (r.path.startsWith('/api/releases/publisher')) { expect(rule, r.file).toBe('bearer'); continue; }
      if (r.path === '/api/releases/health') { expect(rule, r.file).toBe('self-authenticated'); continue; }
      if (work.test(r.path)) {
        expect(rule, r.file).toBe('official');
        expect(apiPermission({ role: 'officer', institution: 'min-agriculture' }, 'POST', r.path), r.file).toBeNull();
        continue;
      }
      expect(rule, r.file).toBe('installation');
      // Checked again in the route against the account as it stands now (chamberBody() or pathRefusal()).
      expect(r.src, r.file).toMatch(/chamberBody|pathRefusal\(req\)/);
      for (const m of r.methods) {
        expect(apiPermission({ role: 'administrator' }, m, r.path), r.file).toBeNull();
        expect(apiPermission({ role: 'officer', institution: 'min-agriculture' }, m, r.path), r.file).toMatch(/whole government/);
        expect(apiPermission({ role: 'signatory' }, m, r.path), r.file).toMatch(/whole government/);
        expect(apiPermission({ role: 'administrator', institution: 'min-health' }, m, r.path), r.file).toMatch(/whole government/);
        expect(apiPermission({ role: 'auditor' }, m, r.path), r.file).toMatch(/Auditors/);
      }
    }
    for (const p of ['/api/releases/sovereignty', '/api/releases/settings/agent-credential', '/api/releases/break-glass', '/api/releases/DR-1/restore-data', '/api/releases/DR-1/readiness', '/api/releases/settings']) {
      expect(mutationRule(p), p).toBe('installation');
    }
  });

  it('every read of an institution\'s personal data checks who may read it (review M-3)', () => {
    const files = routeFiles(API).map(file => ({ file, path: samplePath(file), src: fs.readFileSync(file, 'utf8') }))
      .filter(r => /export (async function|function) GET\b/.test(r.src) && INSTITUTION_READS.some(re => re.test(r.path)));
    expect(files.length).toBe(INSTITUTION_READS.length + 1); // /api/permits and /api/permits/[id] share one pattern
    for (const r of files) expect(r.src, r.file).toMatch(/canReadInstitution|canReadPermits/);
  });

  it('read routes reached with a bearer check it in constant time', () => {
    const { readdirSync, readFileSync, statSync } = require('node:fs') as typeof import('node:fs');
    const { join } = require('node:path') as typeof import('node:path');
    const api = join(__dirname, '..', '..', 'app', 'api');
    const walk = (d: string, out: string[] = []): string[] => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p, out); else if (f === 'route.ts') out.push(p); } return out; };
    for (const re of BEARER_READS) {
      // Every route file a bearer read pattern opens (a prefix such as /api/twin/ogc covers several).
      const matched = walk(api).filter(f => re.test('/api' + f.slice(api.length).replace(/\\/g, '/').replace(/\/route\.ts$/, '')
        .replace(/\[\.\.\.[^\]]+\]/g, 'a/b').replace(/\[([^\]]+)\]/g, 'sample')));
      expect(matched.length, String(re)).toBeGreaterThan(0);
      // Compared in the route, or through a verifier that compares hashes in constant time
      // (machineReadRefusal() calls verifyIntegrationKey with scope ogc:read).
      for (const file of matched) expect(readFileSync(file, 'utf8'), file).toMatch(/timingSafeEqual|verifyIntegrationKey\(|machineReadRefusal\(req\)/);
    }
    expect(readFileSync(join(__dirname, '..', 'twin', 'machine-read.ts'), 'utf8')).toMatch(/verifyIntegrationKey\(auth, OGC_READ_SCOPE\)/);
  });
});
