import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { REGISTER_OWNERS } from './register-owners';

const SRC = join(__dirname, '..', '..');
const ROOT = join(SRC, '..', '..');
function files(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) { if (f !== 'node_modules') files(p, out); }
    else if (/\.(ts|tsx)$/.test(f) && !/\.test\.tsx?$/.test(f)) out.push(p);
  }
  return out;
}

describe('one owner per register', () => {
  it('every store the platform keeps belongs to exactly one register', () => {
    const keys = new Set<string>();
    for (const f of files(join(SRC, 'lib'))) for (const m of readFileSync(f, 'utf8').replace(/\/\/.*$/gm, '').matchAll(/\b(__civicos[A-Z][A-Za-z]*|__civicos)\b(?=\s*\?\?=|\s*\?:|\s*:)/g)) keys.add(m[1]!);
    const owned = REGISTER_OWNERS.flatMap(r => (r.owner.where === 'platform' ? r.owner.keys : []));
    // The main store (`__civicos`) holds several registers, one field each, until it is split (review R16).
    const twice = owned.filter((k, i) => k !== '__civicos' && owned.indexOf(k) !== i);
    expect(twice).toEqual([]);
    // A platform fallback copy (directives without the substrate) is listed under its register's copies.
    const fallbacks = REGISTER_OWNERS.flatMap(r => r.copies.filter(c => c.where === 'platform').map(c => c.what.split(' ')[0]));
    const missing = [...keys].filter(k => !owned.includes(k) && !fallbacks.includes(k));
    expect(missing, 'add the new store to lib/data/register-owners.ts').toEqual([]);
  });

  it('every civic-api module is accounted for', () => {
    const modules = readdirSync(join(ROOT, 'services', 'civic-api', 'src', 'modules'));
    const named = REGISTER_OWNERS.flatMap(r => r.copies.filter(c => c.where === 'civic-api').map(c => c.what.split('/').pop()));
    expect(modules.filter(m => !named.includes(m))).toEqual([]);
  });

  it('a register has one owner and every other copy says what it is', () => {
    for (const r of REGISTER_OWNERS) {
      expect(r.api.length).toBeGreaterThan(0);
      for (const c of r.copies) { expect(['mirror', 'fallback', 'retired']).toContain(c.role); expect(c.note.length).toBeGreaterThan(10); }
    }
    expect(new Set(REGISTER_OWNERS.map(r => r.id)).size).toBe(REGISTER_OWNERS.length);
  });
});
