// The per-endpoint API contract and its endpoint families (plan I9;
// specification Part 5 F.1 "API contract"), generated from the route files
// beside the OpenAPI document (scripts/build-openapi.mjs writes both; never
// hand-written). For every endpoint it states what the route files show:
// the family and resource, the operation, how a caller authenticates and the
// permission rule (from lib/auth/roles.ts and the middleware, as in the
// OpenAPI document), whether the route asks for a stated purpose, the refusal
// codes it can answer, and whether its source declares idempotency, rate
// limits and audit. What a route file cannot show (data classification,
// retention) is said to be declared elsewhere, never guessed.
import { promises as fs } from 'node:fs';
import path from 'node:path';

/** The specification's illustrative endpoint families, matched by the first path segment(s); the rest are named by their segment. */
export const FAMILIES = [
  { family: 'institutions', resource: 'institution', means: 'Institutions, their terms, offices and relationships', match: /^\/api\/(org|sovereign|offices|institution|constitution|setup|onboarding|municipalities|local-government)(\/|$)/ },
  { family: 'legal-instruments', resource: 'legal instrument', means: 'The laws register, rules and authority mappings', match: /^\/api\/(law|rules|permit-authorities|legislature|dual-control)(\/|$)/ },
  { family: 'cases', resource: 'case', means: 'Cases and their procedures', match: /^\/api\/(cases|case-packages|work|directives|cabinet|cabinet-office|procurement|courts)(\/|$)/ },
  { family: 'registers', resource: 'register record', means: 'Registers and their records', match: /^\/api\/(registers|organisations|professions|civil|tax|customs|education|health-regulation|immigration|identity|passports|labour|social-protection|land|parcels|building|transport|facilities|boundaries|permits|finance|oversight)(\/|$)/ },
  { family: 'documents', resource: 'document', means: 'Documents, signatures, seals and certificates', match: /^\/api\/(documents|signatures|seal-keys|trust)(\/|$)/ },
  { family: 'exchanges', resource: 'exchange', means: 'Exchange services, federation, integrations and events', match: /^\/api\/(exchange|federation|integrations|webhooks|events|oauth|messaging)(\/|$)/ },
  { family: 'audit-events', resource: 'audit event', means: 'The audit chain and the access log', match: /^\/api\/(audit|access-log)(\/|$)/ },
  { family: 'indicators', resource: 'indicator', means: 'Indicators and the national data', match: /^\/api\/(indicators|twin|national|map-pack)(\/|$)/ },
  // Families of the platform itself (beyond the specification's illustrative list).
  { family: 'identity-and-access', resource: 'session or account', means: 'Signing in, accounts, sessions and the demonstration cast', match: /^\/api\/(auth|session|citizen|demo|admin|workspace|notifications|ai)(\/|$)/ },
  { family: 'payments', resource: 'payment', means: 'Bills and payments', match: /^\/api\/payments(\/|$)/ },
  { family: 'operations', resource: 'installation', means: 'The installation: backups, releases, scheduled jobs, health and metrics (the control plane)', match: /^\/api\/(platform|releases|cron|ops|metrics|substrate|pilot|openapi|health)(\/|$)/ },
  { family: 'public-information', resource: 'public page', means: 'Public sites, public checks and email updates', match: /^\/api\/(public|public-sites|subscriptions)(\/|$)/ },
];

const STATUS = /status:\s*(\d{3})\b/g;
const unique = xs => [...new Set(xs)];

/** The contract of every endpoint, from the scanned routes (scripts/openapi-lib.mjs scanRoutes()) and their source files. */
export async function apiContract(appDir, routes, version = '1') {
  const endpoints = [];
  for (const r of routes) {
    const src = await fs.readFile(path.join(appDir, r.file), 'utf8');
    const f = FAMILIES.find(x => x.match.test(r.path));
    const family = f ? f.family : `other:${r.path.split('/')[2] ?? 'api'}`;
    const refusals = unique([...src.matchAll(STATUS)].map(m => Number(m[1])).filter(n => n >= 400)).sort((a, b) => a - b);
    for (const m of r.methods) {
      const access = r.access?.[m] ?? { security: [] };
      endpoints.push({
        path: r.path, method: m, family, resource: f ? f.resource : (r.path.split('/')[2] ?? 'api'),
        operation: m === 'GET' ? 'read' : m === 'DELETE' ? 'remove' : 'change',
        authentication: access.security.length ? unique(access.security.flatMap(s => Object.keys(s))) : ['public'],
        permission: access.rule ?? (m === 'GET' ? (access.security.length ? 'read: signed-in official or the credential named' : 'public read') : 'public'),
        purpose: /\bpurpose\b/.test(src) ? 'the route reads a stated purpose' : 'none read by the route',
        refusals,
        idempotency: /idempot|Idempotency-Key|already (recorded|received|here)|duplicate|retry/i.test(src) ? 'declared in the route or the module it calls' : 'not declared',
        rateLimit: /\btake\(|rate[- ]?limit|guardRequest|exchangeGuard|ratelimit/i.test(src) ? 'limited in the route' : 'platform limits only',
        audit: /recordAudit|logExchange|recordAccess|appendAudit|withOfficial|chamberBody|routeActor/.test(src) ? 'audited (the route or the module it calls records the act)' : (m === 'GET' ? 'read' : 'audited by the module it calls, where it changes a record'),
        classification: 'declared per record and field (forms, procedures, registers), not per endpoint',
        version, deprecated: false,
        source: r.file,
      });
    }
  }
  const families = unique(endpoints.map(e => e.family)).sort().map(name => {
    const f = FAMILIES.find(x => x.family === name);
    const of = endpoints.filter(e => e.family === name);
    return { family: name, means: f ? f.means : `Routes under /api/${name.slice(6)}`, endpoints: of.length, paths: unique(of.map(e => e.path)).length };
  });
  return {
    format: 'civicos.api-contract', version,
    about: 'Generated from the route files with the OpenAPI document (scripts/build-openapi.mjs). Each endpoint: its family and resource, operation, authentication and permission rule, whether it reads a stated purpose, the refusal codes its route answers, and whether its source declares idempotency, rate limits and audit. The existence of an endpoint never implies public access.',
    families, endpoints,
  };
}
