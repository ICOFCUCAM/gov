// Regenerates src/lib/api/openapi.json from the route files, with typed
// request and response bodies from the types the routes use.
// Run after adding or changing an API route: npm run build:openapi
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanRoutes, toOpenApi } from './openapi-lib.mjs';
import { extractTypes } from './openapi-types.mjs';

const app = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const routes = await scanRoutes(app);
const types = extractTypes(app, routes.map(r => r.file));
const doc = toOpenApi(routes, '1', types);
await fs.writeFile(path.join(app, 'src/lib/api/openapi.json'), JSON.stringify(doc, null, 2) + '\n');
const ops = Object.values(doc.paths).flatMap(p => Object.values(p));
const typed = ops.filter(o => !o.responses['200'] || o.responses['200'].content['application/json'].schema.type !== 'object' || Object.keys(o.responses['200'].content['application/json'].schema).length > 1).length;
console.log(`${Object.keys(doc.paths).length} paths, ${ops.length} operations, ${typed} with typed responses, ${Object.keys(doc.components.schemas).length} schemas`);
