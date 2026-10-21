import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// The app is built from app/ alone (Docker context, Vercel root directory), so
// the scope list and the duplicate IDs it reads at run time are copies the
// requirements generator writes into lib/forms/data. They must equal their
// sources in docs/, and no app module may import from outside app/.
const APP = join(__dirname, '..', '..', '..');
const REPO = join(APP, '..');
const read = (p: string) => JSON.parse(readFileSync(join(REPO, p), 'utf8'));

describe('form data inside the app', () => {
  it('keeps the scope list equal to docs/requirements/form-scope.json', () => {
    expect(read('app/src/lib/forms/data/form-scope.json')).toEqual(read('docs/requirements/form-scope.json'));
  });

  it('keeps the duplicate IDs equal to the gap report', () => {
    expect(read('app/src/lib/forms/data/duplicate-ids.json')).toEqual(read('docs/forms-catalogue/gap-report.json').duplicate_ids);
  });

  it('has no module outside tests importing from beyond app/', () => {
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) { walk(p); continue; }
        if (!/\.(ts|tsx)$/.test(name) || /\.test\.tsx?$/.test(name)) continue;
        const src = readFileSync(p, 'utf8');
        if (/from\s+['"](\.\.\/){4,}(docs|scripts|infra)\//.test(src) || /import\(\s*['"](\.\.\/){4,}docs\//.test(src)) offenders.push(p.slice(APP.length + 1));
      }
    };
    walk(join(APP, 'src'));
    expect(offenders).toEqual([]);
  });
});
