// Reads the platform's API routes (src/app/api/**/route.ts) and describes them
// as an OpenAPI 3.1 document: every path and method, its path parameters, the
// query parameters the handler reads, and the comment at the top of the file
// as the description. Used by scripts/build-openapi.mjs and its test.

import { promises as fs } from 'node:fs';
import path from 'node:path';

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

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

export async function scanRoutes(appDir) {
  const apiDir = path.join(appDir, 'src/app/api');
  const files = (await walk(apiDir)).sort();
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
    routes.push({ path: '/api/' + segs.join('/'), file: path.relative(appDir, f).split(path.sep).join('/'), methods, params, query, description: leadingComment(src), ...(multipart ? { multipart } : {}) });
  }
  return routes.map(r => ({ ...r, path: r.path.replace(/\/$/, '') }));
}

export function toOpenApi(routes, version = '1') {
  const paths = {};
  for (const r of routes) {
    const tag = r.path.split('/')[2] ?? 'api';
    const item = {};
    for (const m of r.methods) {
      item[m.toLowerCase()] = {
        tags: [tag],
        operationId: `${m.toLowerCase()}_${r.path.replace(/^\/api\//, '').replace(/[{}]/g, '').replace(/[^\w]+/g, '_')}`,
        summary: `${m} ${r.path}`,
        ...(r.description ? { description: r.description } : {}),
        parameters: [
          ...r.params.map(p => ({ name: p, in: 'path', required: true, schema: { type: 'string' } })),
          ...(m === 'GET' ? r.query.map(q => ({ name: q, in: 'query', required: false, schema: { type: 'string' } })) : []),
        ],
        ...(m === 'GET' || m === 'DELETE' ? {} : { requestBody: { required: false, content: { 'application/json': { schema: { type: 'object' } }, ...(r.multipart ? { 'multipart/form-data': { schema: { type: 'object' } } } : {}) } } }),
        responses: { 200: { description: 'OK', content: { 'application/json': { schema: { type: 'object' } } } }, default: { description: 'Error: `{ "error": string }`' } },
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
      description: 'Every HTTP endpoint of this installation, generated from its route files (scripts/build-openapi.mjs). Request and response bodies are JSON; errors are `{ "error": string }`. Sign-in rules follow the platform middleware: public sites and public reads are open, everything else needs a session.',
    },
    servers: [{ url: '/' }],
    tags: [...new Set(routes.map(r => r.path.split('/')[2]))].sort().map(name => ({ name })),
    paths,
  };
}
