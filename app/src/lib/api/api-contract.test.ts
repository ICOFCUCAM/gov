// The per-endpoint API contract and endpoint families (plan I9; specification
// Part 5 F.1), generated with the OpenAPI document from the route files: run
// `npm run build:openapi` after changing a route.
import { describe, it, expect } from 'vitest';
import path from 'node:path';
// @ts-expect-error plain ES module script
import { scanRoutes } from '../../../scripts/openapi-lib.mjs';
// @ts-expect-error plain ES module script
import { apiContract } from '../../../scripts/api-contract-lib.mjs';
import contract from './api-contract.json';
import doc from './openapi.json';

const APP = path.resolve(__dirname, '../../..');
type Endpoint = { path: string; method: string; family: string; authentication: string[]; permission: string; refusals: number[] };

describe('the API contract', () => {
  it('matches the route files (run `npm run build:openapi` after changing a route)', async () => {
    const fresh = await apiContract(APP, await scanRoutes(APP), '1');
    expect(JSON.parse(JSON.stringify(fresh))).toEqual(contract);
  });

  it('has one contract per OpenAPI operation, each in a family, with its authentication and permission', () => {
    const endpoints = contract.endpoints as Endpoint[];
    const ops = Object.entries(doc.paths as Record<string, Record<string, unknown>>).flatMap(([p, item]) => Object.keys(item).map(m => `${m.toUpperCase()} ${p}`));
    expect(endpoints.map(e => `${e.method} ${e.path}`).sort()).toEqual(ops.sort());
    expect(contract.families.map(f => f.family)).toEqual(expect.arrayContaining(['institutions', 'legal-instruments', 'cases', 'registers', 'documents', 'exchanges', 'audit-events', 'indicators']));
    for (const e of endpoints) {
      expect(e.authentication.length, `${e.method} ${e.path}`).toBeGreaterThan(0);
      expect(e.permission.length).toBeGreaterThan(0);
    }
    // The existence of an endpoint never implies public access: a change to cases needs a signed-in official.
    const change = endpoints.find(e => e.path === '/api/cases' && e.method === 'POST')!;
    expect(change).toMatchObject({ family: 'cases', authentication: ['officialSession'], permission: 'official' });
    // Federation: another installation sends envelopes with its integration key.
    expect(endpoints.find(e => e.path === '/api/federation/inbound')).toMatchObject({ family: 'exchanges', authentication: ['integrationKey'], permission: 'self-authenticated' });
  });
});
