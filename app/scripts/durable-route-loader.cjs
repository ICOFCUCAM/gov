// Build-time wrapper for every route handler (src/app/**/route.ts): each
// exported HTTP method is passed through durableRoute() from
// src/lib/data/repo/settle.ts, so a changing request commits its durable
// writes before its response and a stale instance pulls before it answers
// (wiring audit §13, register 18.37). Applied by next.config.mjs to the Node
// server build only; the route files themselves stay as they are, and tests
// that import a route call it unwrapped.
//
// The transform is plain text on the file as written: `export (async) function
// METHOD` and `export const METHOD` lose their `export`, and the wrapped value
// is exported under the same name at the end. Line numbers are unchanged.
// src/lib/data/repo/durable-route.test.ts runs it over every route file and
// fails if a route exports a method in any other form (it would go unwrapped).

// A webpack loader is loaded with require(): CommonJS.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('node:path');

const METHODS = 'GET|HEAD|POST|PUT|PATCH|DELETE|OPTIONS';
const SETTLE = path.resolve(__dirname, '../src/lib/data/repo/settle.ts');

/** The source with every exported method wrapped, and the methods found. */
function transform(source, settlePath = SETTLE) {
  const found = [];
  let out = source.replace(new RegExp(`^export\\s+(async\\s+function|function)\\s+(${METHODS})\\b`, 'gm'), (_m, kw, name) => { found.push(name); return `${kw.replace(/\s+/g, ' ')} ${name}`; });
  out = out.replace(new RegExp(`^export\\s+const\\s+(${METHODS})\\b(?=\\s*[:=])`, 'gm'), (_m, name) => { found.push(name); return `const ${name}`; });
  if (!found.length) return { code: source, methods: [] };
  const tail = [`;import { durableRoute as __civicosDurableRoute } from ${JSON.stringify(settlePath)};`];
  for (const name of found) tail.push(`const __civicosDurable_${name} = __civicosDurableRoute(${JSON.stringify(name)}, ${name});`, `export { __civicosDurable_${name} as ${name} };`);
  return { code: `${out}\n${tail.join('\n')}\n`, methods: found };
}

/** The methods a route file exports in any form (to check none escapes the transform). */
function exportedMethods(source) {
  const names = new Set();
  for (const m of source.matchAll(new RegExp(`export\\s+(?:async\\s+)?(?:function|const|let|var)\\s+(${METHODS})\\b`, 'g'))) names.add(m[1]);
  for (const m of source.matchAll(/export\s*\{([^}]*)\}/g)) {
    for (const part of m[1].split(',')) {
      const name = part.trim().split(/\s+as\s+/).pop();
      if (name && new RegExp(`^(${METHODS})$`).test(name)) names.add(name);
    }
  }
  return [...names];
}

module.exports = function durableRouteLoader(source) {
  return transform(source).code;
};
module.exports.transform = transform;
module.exports.exportedMethods = exportedMethods;
