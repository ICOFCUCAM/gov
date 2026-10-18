import { describe, it, expect } from 'vitest';
import path from 'node:path';
// @ts-expect-error plain ES module script
import { scanRoutes, toOpenApi } from '../../../scripts/openapi-lib.mjs';
import doc from './openapi.json';

describe('OpenAPI description of the platform API', () => {
  it('matches the route files (run `npm run build:openapi` after changing a route)', async () => {
    const fresh = toOpenApi(await scanRoutes(path.resolve(__dirname, '../../..')));
    expect(JSON.parse(JSON.stringify(fresh))).toEqual(doc);
  });

  it('lists every route with at least one method and unique operation ids', () => {
    const ops = Object.values(doc.paths).flatMap(p => Object.values(p as Record<string, { operationId: string }>));
    expect(Object.keys(doc.paths).length).toBeGreaterThan(150);
    expect(Object.values(doc.paths).every(p => Object.keys(p).length > 0)).toBe(true);
    expect(new Set(ops.map(o => o.operationId)).size).toBe(ops.length);
  });
});
