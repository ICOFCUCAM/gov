// Regenerates src/lib/api/openapi.json from the route files.
// Run after adding or changing an API route: npm run build:openapi
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanRoutes, toOpenApi } from './openapi-lib.mjs';

const app = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const doc = toOpenApi(await scanRoutes(app));
await fs.writeFile(path.join(app, 'src/lib/api/openapi.json'), JSON.stringify(doc, null, 2) + '\n');
console.log(`${Object.keys(doc.paths).length} paths, ${Object.values(doc.paths).reduce((n, p) => n + Object.keys(p).length, 0)} operations`);
