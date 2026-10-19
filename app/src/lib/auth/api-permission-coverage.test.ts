// Every change through the API is covered by a permission rule (lib/auth/roles.ts).
// Walks every route file under app/api that exports POST, PUT, PATCH or DELETE
// and checks that its path is public-write, self-authenticated, bearer-checked,
// or covered by an administrator, ministry or official rule. A new mutating
// route that matches none fails here (and would be refused at run time: the
// permission is deny by default), in the same spirit as route-lock.test.ts.

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { apiPermission, mutationRule, BEARER_ROUTES, SELF_AUTHENTICATED } from './roles';

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
});
