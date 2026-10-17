import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// Preservation lock. Every route in route-lock.json must keep a page. Routes
// may be added (then appended to the lock) or moved (lock updated in the same
// change, old path redirected) — never silently removed.
const APP = __dirname;

function routes(dir: string, base = ''): string[] {
  const out: string[] = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (e.name === 'api' && base === '') continue;
      const seg = /^\(.*\)$/.test(e.name) ? '' : `/${e.name}`;
      out.push(...routes(path.join(dir, e.name), base + seg));
    } else if (e.name === 'page.tsx') {
      out.push(base || '/');
    }
  }
  return out;
}

describe('route preservation lock', () => {
  const lock: string[] = JSON.parse(fs.readFileSync(path.join(APP, 'route-lock.json'), 'utf8'));
  const live = new Set(routes(APP));

  it('keeps every locked route', () => {
    expect(lock.filter(r => !live.has(r))).toEqual([]);
  });

  it('has every live route recorded in the lock', () => {
    const locked = new Set(lock);
    expect([...live].filter(r => !locked.has(r)).sort()).toEqual([]);
  });
});
