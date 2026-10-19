// Reads the platform's API routes (src/app/api/**/route.ts) and describes them
// as an OpenAPI 3.1 document: every path and method, its path parameters, the
// query parameters the handler reads, the comment at the top of the file as
// the description, how a caller authenticates (security schemes from the
// permission rules in lib/auth/roles.ts and the public lists in middleware.ts)
// and, where the route's types say so, typed request and response bodies
// (scripts/openapi-types.mjs). Used by scripts/build-openapi.mjs and its test.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

async function walk(dir) {
  const out = [];
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (e.name === 'route.ts') out.push(p);
  }
  return out;
}

/** The leading // or /* comment block of a file, as plain text. */
function leadingComment(src) {
  const lines = [];
  for (const raw of src.split('\n')) {
    const l = raw.trim();
    if (l.startsWith('//')) { lines.push(l.replace(/^\/\/\s?/, '')); continue; }
    if (l.startsWith('/*') || l.startsWith('*')) { const t = l.replace(/^\/\*+\s?|\*\/$|^\*\s?/g, '').trim(); if (t) lines.push(t); continue; }
    if (!l && !lines.length) continue;
    break;
  }
  return lines.join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * The access rules, read from their one source: lib/auth/roles.ts (no
 * imports, so it is transpiled and loaded as is) and the public lists of
 * src/middleware.ts.
 */
async function accessRules(appDir) {
  const roles = await fs.readFile(path.join(appDir, 'src/lib/auth/roles.ts'), 'utf8');
  const js = ts.transpileModule(roles, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
  const mw = await fs.readFile(path.join(appDir, 'src/middleware.ts'), 'utf8');
  const list = name => {
    const m = new RegExp(`const ${name} = (\\[[^\\n]*\\]);`).exec(mw);
    return m ? new Function(`return ${m[1]}`)() : [];
  };
  return { ...mod, PUBLIC_READ: list('PUBLIC_READ'), PUBLIC: list('PUBLIC') };
}

/** The schemes an installation's callers authenticate with. */
export const SECURITY_SCHEMES = {
  officialSession: { type: 'apiKey', in: 'cookie', name: 'civicos_official', description: 'The signed session of an official (sign in at /sign-in, or POST /api/auth/official). Required for every non-public read and change when CIVICOS_AUTH=enforce; what the official may change follows lib/auth/roles.ts.' },
  integrationKey: { type: 'http', scheme: 'bearer', bearerFormat: 'civ_<prefix>_<secret>', description: 'An integration key issued in Integrations (/integrations), stored as a SHA-256 hash and checked with its scopes and rate limit. Scope ogc:read opens the twin\'s OGC API – Features, SensorThings and vector tiles to GIS clients.' },
  feedKey: { type: 'http', scheme: 'bearer', bearerFormat: 'ccf_… / facility feed key', description: 'A ministry\'s connected case or facility system: its own feed key, issued in the ministry workspace and stored as a hash; it changes only the records it sent.' },
  automation: { type: 'http', scheme: 'bearer', description: 'Scheduled jobs and the publisher: CIVICOS_CRON_SECRET (pg_cron, Vercel cron) or a platform-tier substrate session, checked by the route.' },
  agentCredential: { type: 'http', scheme: 'bearer', description: 'The nation\'s deployment agent credential (issued in /updates/settings, stored as a hash) for release health reports.' },
  metricsToken: { type: 'http', scheme: 'bearer', description: 'CIVICOS_METRICS_TOKEN for the Prometheus scraper, compared in constant time.' },
};

/** How each method of a route is reached: the security requirement and the permission rule. */
function securityFor(rules, p, method) {
  const sample = p.replace(/\{[^}]+\}/g, 'sample');
  const session = { officialSession: [] };
  if (rules.PUBLIC.some(re => re.test(sample))) return { security: [] };
  if (method === 'GET' && rules.PUBLIC_READ.some(re => re.test(sample))) return { security: [] };
  if (MUTATING.has(method) && rules.PUBLIC_WRITE.some(re => re.test(sample))) return { security: [], rule: 'public-write' };
  if (rules.SELF_AUTHENTICATED.some(re => re.test(sample))) {
    const scheme = /^\/api\/cron\//.test(sample) ? 'automation' : /^\/api\/releases\/health$/.test(sample) ? 'agentCredential'
      : /\/feed$/.test(sample) ? 'feedKey' : 'integrationKey';
    return { security: [{ [scheme]: [] }], ...(MUTATING.has(method) ? { rule: 'self-authenticated' } : {}) };
  }
  if (MUTATING.has(method)) {
    const rule = rules.mutationRule(sample) ?? 'refused';
    return { security: rules.BEARER_ROUTES.some(re => re.test(sample)) ? [session, { automation: [] }] : [session], rule };
  }
  if (rules.BEARER_READS.some(re => re.test(sample))) return { security: [/^\/api\/metrics$/.test(sample) ? { metricsToken: [] } : { integrationKey: [] }, session] };
  if (rules.BEARER_ROUTES.some(re => re.test(sample))) return { security: [session, { automation: [] }] };
  return { security: [session] };
}

export async function scanRoutes(appDir) {
  const apiDir = path.join(appDir, 'src/app/api');
  const files = (await walk(apiDir)).sort();
  const rules = await accessRules(appDir);
  const routes = [];
  for (const f of files) {
    const src = await fs.readFile(f, 'utf8');
    const rel = path.relative(apiDir, path.dirname(f)).split(path.sep).filter(Boolean);
    const params = [];
    const segs = rel.map(s => {
      const m = /^\[(\.\.\.)?(\w+)\]$/.exec(s);
      if (m) { params.push(m[2]); return `{${m[2]}}`; }
      return s;
    });
    const methods = METHODS.filter(m => new RegExp(`export\\s+(async\\s+)?function\\s+${m}\\b|export\\s+const\\s+${m}\\b`).test(src));
    const query = [...new Set([...src.matchAll(/(?:searchParams|\bq|\bparams|\bsp)\.get\(\s*['"]([\w.-]+)['"]\s*\)/g)].map(m => m[1]))].filter(q => !params.includes(q)).sort();
    const multipart = /\.formData\(\)/.test(src);
    const p = ('/api/' + segs.join('/')).replace(/\/$/, '');
    const access = Object.fromEntries(methods.map(m => [m, securityFor(rules, p, m)]));
    routes.push({ path: p, file: path.relative(appDir, f).split(path.sep).join('/'), methods, params, query, description: leadingComment(src), access, ...(multipart ? { multipart } : {}) });
  }
  return routes;
}

const ERROR = { type: 'object', properties: { error: { type: 'string', description: 'Why the request was refused, in plain words.' } }, required: ['error'] };
const isUntypedObject = s => !s || (Object.keys(s).length === 1 && s.type === 'object');

/**
 * The OpenAPI document. `types` is what scripts/openapi-types.mjs derived
 * from the route files ({ schemas, ops }); without it bodies stay `object`.
 */
export function toOpenApi(routes, version = '1', types = { schemas: {}, ops: {} }) {
  const paths = {};
  for (const r of routes) {
    const tag = r.path.split('/')[2] ?? 'api';
    const item = {};
    for (const m of r.methods) {
      const typed = types.ops?.[r.file]?.[m] ?? {};
      const responses = typed.responses && Object.keys(typed.responses).length
        ? Object.fromEntries(Object.entries(typed.responses).map(([st, schema]) => [st, { description: st === '201' ? 'Created' : 'OK', content: { 'application/json': { schema } } }]))
        : { 200: { description: 'OK', content: { 'application/json': { schema: { type: 'object' } } } } };
      const access = r.access?.[m];
      item[m.toLowerCase()] = {
        tags: [tag],
        operationId: `${m.toLowerCase()}_${r.path.replace(/^\/api\//, '').replace(/[{}]/g, '').replace(/[^\w]+/g, '_')}`,
        summary: `${m} ${r.path}`,
        ...(r.description ? { description: r.description } : {}),
        parameters: [
          ...r.params.map(p => ({ name: p, in: 'path', required: true, schema: { type: 'string' } })),
          ...(m === 'GET' ? r.query.map(q => ({ name: q, in: 'query', required: false, schema: { type: 'string' } })) : []),
        ],
        ...(m === 'GET' || m === 'DELETE' ? {} : { requestBody: { required: false, content: { 'application/json': { schema: typed.request ?? { type: 'object' } }, ...(r.multipart ? { 'multipart/form-data': { schema: { type: 'object' } } } : {}) } } }),
        responses: { ...responses, default: { description: 'Error: `{ "error": string }`', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } } },
        ...(access ? { security: access.security } : {}),
        ...(access?.rule ? { 'x-permission-rule': access.rule } : {}),
        'x-source': r.file,
      };
    }
    if (Object.keys(item).length) paths[r.path] = item;
  }
  return {
    openapi: '3.1.0',
    info: {
      title: 'CivicOS platform API',
      version,
      description: 'Every HTTP endpoint of this installation, generated from its route files (scripts/build-openapi.mjs). Request and response bodies are JSON, typed from the TypeScript types the routes use where they declare them; errors are `{ "error": string }`. Sign-in rules follow the platform middleware and lib/auth/roles.ts: public sites and public reads are open, everything else needs an official\'s session or the machine credential named in each operation\'s security. `x-permission-rule` names the rule a change falls under (administrator, ministry, official, bearer, self-authenticated, public-write).',
    },
    servers: [{ url: '/' }],
    security: [{ officialSession: [] }],
    tags: [...new Set(routes.map(r => r.path.split('/')[2]))].sort().map(name => ({ name })),
    paths,
    components: {
      securitySchemes: SECURITY_SCHEMES,
      schemas: { Error: ERROR, ...types.schemas },
    },
  };
}

/** The typed bodies stored in a document, in the shape toOpenApi() takes (for the test, without re-running the type checker). */
export function typesFromDoc(doc) {
  const { Error: _e, ...schemas } = doc.components?.schemas ?? {};
  const ops = {};
  for (const item of Object.values(doc.paths)) for (const [m, op] of Object.entries(item)) {
    const t = {};
    const req = op.requestBody?.content?.['application/json']?.schema;
    if (req && !isUntypedObject(req)) t.request = req;
    const res = Object.fromEntries(Object.entries(op.responses ?? {}).filter(([st]) => st !== 'default').map(([st, r]) => [st, r.content?.['application/json']?.schema]));
    if (!(Object.keys(res).length === 1 && res['200'] && isUntypedObject(res['200']))) t.responses = res;
    if (Object.keys(t).length) (ops[op['x-source']] ??= {})[m.toUpperCase()] = t;
  }
  return { schemas, ops };
}
