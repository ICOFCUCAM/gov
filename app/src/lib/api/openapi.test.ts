import { describe, it, expect } from 'vitest';
import path from 'node:path';
// @ts-expect-error plain ES module script
import { scanRoutes, toOpenApi, typesFromDoc, exampleOf } from '../../../scripts/openapi-lib.mjs';
// @ts-expect-error plain ES module script
import { extractTypes } from '../../../scripts/openapi-types.mjs';
import doc from './openapi.json';

const APP = path.resolve(__dirname, '../../..');
type Schema = Record<string, unknown>;
type Media = { schema: Schema; examples?: Record<string, { summary: string; value: unknown }> };
type Op = { operationId: string; security?: Record<string, string[]>[]; requestBody?: { content: Record<string, Media> }; responses: Record<string, { content?: Record<string, Media> }>; 'x-source': string };
const paths = doc.paths as unknown as Record<string, Record<string, Op>>;

/** A schema with every $ref replaced by what it names (recursion cut at the second visit). */
function deref(s: unknown, schemas: Record<string, unknown>, seen: string[] = []): unknown {
  if (Array.isArray(s)) return s.map(x => deref(x, schemas, seen));
  if (!s || typeof s !== 'object') return s;
  const ref = (s as { $ref?: string }).$ref;
  if (ref) {
    const name = ref.split('/').pop()!;
    if (seen.includes(name)) return { recursive: true };
    return deref(schemas[name], schemas, [...seen, name]);
  }
  return Object.fromEntries(Object.entries(s).map(([k, v]) => [k, deref(v, schemas, seen)]));
}

describe('OpenAPI description of the platform API', () => {
  it('matches the route files (run `npm run build:openapi` after changing a route)', async () => {
    // Paths, parameters, security and descriptions are re-derived; the typed bodies are taken from the document
    // and checked for key routes below (deriving them all type-checks the routes).
    const fresh = toOpenApi(await scanRoutes(APP), '1', typesFromDoc(doc));
    expect(JSON.parse(JSON.stringify(fresh))).toEqual(doc);
  });

  it('lists every route with at least one method and unique operation ids', () => {
    const ops = Object.values(paths).flatMap(p => Object.values(p));
    expect(Object.keys(doc.paths).length).toBeGreaterThan(150);
    expect(Object.values(doc.paths).every(p => Object.keys(p).length > 0)).toBe(true);
    expect(new Set(ops.map(o => o.operationId)).size).toBe(ops.length);
  });

  it('declares how callers authenticate, per operation', () => {
    const schemes = Object.keys(doc.components.securitySchemes);
    expect(schemes).toEqual(expect.arrayContaining(['officialSession', 'integrationKey', 'integrationClient', 'integrationToken', 'feedKey', 'automation', 'agentCredential', 'metricsToken']));
    const sec = (p: string, m: string) => paths[p]![m]!.security!.flatMap(r => Object.keys(r));
    expect(sec('/api/twin/sources', 'post')).toEqual(['officialSession']);
    expect(sec('/api/cron/sla', 'get').concat(sec('/api/cron/sla', 'post') ?? [])).toContain('automation');
    expect(sec('/api/metrics', 'get')).toContain('metricsToken');
    expect(sec('/api/org/ministries/{id}/queue/feed', 'post')).toEqual(['feedKey']);
    expect(sec('/api/releases/health', 'post')).toEqual(['agentCredential']);
    expect(sec('/api/twin/ogc/collections/{collectionId}/items', 'get')).toEqual(expect.arrayContaining(['integrationKey', 'integrationToken']));
    // OAuth2 client credentials: the token endpoint takes the integration's id and key, and grants ogc:read.
    expect(sec('/api/oauth/token', 'post')).toEqual(['integrationClient']);
    const oauth = (doc.components.securitySchemes as Record<string, { flows?: { clientCredentials?: { tokenUrl: string; scopes: Record<string, string> } } }>).integrationToken!;
    expect(oauth.flows?.clientCredentials).toMatchObject({ tokenUrl: '/api/oauth/token', scopes: { 'ogc:read': expect.any(String) } });

    expect(paths['/api/sovereign']!.get!.security).toEqual([]);
    // Every operation names its security, and every scheme it names exists.
    for (const item of Object.values(paths)) for (const op of Object.values(item)) {
      expect(op.security, op.operationId).toBeDefined();
      for (const r of op.security!) for (const k of Object.keys(r)) expect(schemes, op.operationId).toContain(k);
    }
  });

  it('gives every typed or documented body an example (review I5)', () => {
    const schemas = doc.components.schemas as Record<string, unknown>;
    const ops = Object.values(paths).flatMap(p => Object.values(p));
    const typed = (m: Media) => JSON.stringify(m.schema) !== '{"type":"object"}';
    for (const o of ops) {
      const media = [...Object.values(o.requestBody?.content ?? {}), ...Object.entries(o.responses).filter(([st]) => st !== 'default').flatMap(([, r]) => Object.values(r.content ?? {}))];
      for (const m of media) if (typed(m) && m.schema && Object.keys(m.schema).length) expect(m.examples, o.operationId).toBeDefined();
    }
    expect(ops.filter(o => JSON.stringify(o).includes('"examples"')).length).toBeGreaterThan(250);
    // From the route's own @example lines, for form and JSON bodies alike.
    const token = paths['/api/oauth/token']!.post!;
    expect(token.requestBody!.content['application/x-www-form-urlencoded']!.examples!.route!.value).toMatchObject({ grant_type: 'client_credentials', scope: 'ogc:read' });
    expect(token.responses['200']!.content!['application/json']!.examples!.route!.value).toMatchObject({ token_type: 'Bearer', expires_in: 600 });
    // Generated from the schema: the body's own properties, nothing nation-specific.
    const gen = paths['/api/twin/sources']!.post!.requestBody!.content['application/json']!.examples!.schema!.value as Record<string, unknown>;
    expect(Object.keys(gen)).toEqual(expect.arrayContaining(['name', 'publisher', 'kind']));
    expect(exampleOf({ type: 'object', properties: { at: { type: 'string' }, n: { type: 'number' }, k: { enum: ['b', 'a'] } }, required: ['at'] }, schemas)).toEqual({ at: '2026-01-15T09:30:00.000Z', n: 1, k: 'b' });
    expect(exampleOf({ $ref: '#/components/schemas/Error' }, schemas)).toEqual({ error: 'Text' });
  });

  it('every $ref resolves to a component schema', () => {
    const names = new Set(Object.keys(doc.components.schemas));
    const refs = JSON.stringify(doc).match(/"#\/components\/schemas\/[^"]+"/g) ?? [];
    for (const r of refs) expect(names.has(r.slice(22, -1)), r).toBe(true);
  });

  it('types the request and response bodies of key routes from their TypeScript types', () => {
    const schemas = doc.components.schemas as Record<string, unknown>;
    const body = (p: string, m: string) => deref(paths[p]![m]!.requestBody!.content['application/json']!.schema, schemas) as { properties?: Record<string, unknown> };
    const ok = (p: string, m: string, st = '200') => deref(paths[p]![m]!.responses[st]!.content!['application/json']!.schema, schemas) as { properties?: Record<string, unknown> };
    expect(Object.keys(body('/api/twin/sources', 'post').properties ?? {})).toEqual(expect.arrayContaining(['name', 'publisher', 'kind', 'mapping', 'schedule']));
    expect(Object.keys(body('/api/twin/scenarios', 'post').properties ?? {})).toEqual(expect.arrayContaining(['metric', 'assumptions', 'asOf']));
    expect(Object.keys(ok('/api/twin/scenarios', 'get').properties ?? {})).toContain('scenarios');
    expect(Object.keys(ok('/api/twin/scenarios', 'post', '201').properties ?? {})).toContain('scenario');
    // Exported interfaces of lib/api/types.ts are components.
    expect(Object.keys(schemas)).toEqual(expect.arrayContaining(['Error', 'TwinSource', 'Scenario']));
    const typedOps = Object.values(paths).flatMap(p => Object.values(p)).filter(o => Object.entries(o.responses).some(([st, r]) => st !== 'default' && JSON.stringify(r.content?.['application/json']?.schema) !== '{"type":"object"}'));
    expect(typedOps.length).toBeGreaterThan(150);
  });

  it('the stored body schemas of key routes are current (re-derived with the type checker)', () => {
    const files = ['src/app/api/twin/sources/route.ts', 'src/app/api/twin/scenarios/route.ts', 'src/app/api/twin/runs/[id]/withdraw/route.ts'];
    const fresh = extractTypes(APP, files, { includeApiTypes: false }) as { schemas: Record<string, unknown>; ops: Record<string, Record<string, { request?: unknown; responses?: Record<string, unknown> }>> };
    const stored = doc.components.schemas as Record<string, unknown>;
    for (const f of files) {
      for (const [m, t] of Object.entries(fresh.ops[f] ?? {})) {
        const op = Object.values(paths).map(i => i[m.toLowerCase()]).find(o => o?.['x-source'] === f)!;
        expect(op, `${m} ${f}`).toBeTruthy();
        if (t.request) expect(deref(op.requestBody!.content['application/json']!.schema, stored), `${m} ${f} request`).toEqual(deref(t.request, fresh.schemas));
        for (const [st, s] of Object.entries(t.responses ?? {})) expect(deref(op.responses[st]!.content!['application/json']!.schema, stored), `${m} ${f} ${st}`).toEqual(deref(s, fresh.schemas));
      }
    }
  }, 60_000);
});
