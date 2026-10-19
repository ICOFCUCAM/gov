import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// React keeps `ref` for itself: a component prop named `ref` never reaches the
// component, and a string `ref="…"` crashes the page (React error 290). Record
// references travel as `itemRef`, `recordRef`, `code` or similar instead.
const SRC = path.join(__dirname, '..');

function files(dir: string): string[] {
  const out: string[] = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'node_modules') out.push(...files(p)); }
    else if (/\.tsx$/.test(e.name) && !/\.test\.tsx$/.test(e.name)) out.push(p);
  }
  return out;
}

describe('reserved React props', () => {
  const all = files(SRC).map(f => ({ f: path.relative(SRC, f), text: fs.readFileSync(f, 'utf8') }));

  it('no component declares a data prop named ref', () => {
    const bad = all.filter(({ text }) => /function [A-Z]\w*\(\{[^}]*\bref\s*[,:}]/.test(text)).map(x => x.f);
    expect(bad).toEqual([]);
  });

  it('no element passes a string ref', () => {
    const bad = all.filter(({ text }) => /\sref="[^"]*"/.test(text)).map(x => x.f);
    expect(bad).toEqual([]);
  });
});
