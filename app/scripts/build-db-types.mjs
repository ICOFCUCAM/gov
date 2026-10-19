// Regenerates src/lib/db/types.generated.ts from the SQL migrations, offline
// (no database, no Supabase CLI; scripts/db-types-lib.mjs).
// Run after adding a migration: npm run build:db-types
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generate, readMigrations, replay } from './db-types-lib.mjs';

const app = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const text = await generate(app);
await fs.writeFile(path.join(app, 'src/lib/db/types.generated.ts'), text);
const db = replay(await readMigrations(app));
const count = (k) => Object.values(db).reduce((n, s) => n + s[k].size, 0);
console.log(`${count('tables')} tables, ${count('views')} views, ${count('functions')} functions, ${count('enums')} enums`);
