// Architecture rules (review R16, C1–C2): the layering the platform depends
// on, checked on every test run so a shortcut cannot creep in.
// - Browser code ('use client') never loads a server store, the sign-in
//   internals, Node built-ins or the outbound fetch guard; type imports are fine.
// - Server stores and the twin never import screens.
// - Engines and the map layer never import screens either.
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const SRC = __dirname;
function files(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) files(p, out);
    else if (/\.(ts|tsx)$/.test(f) && !/\.test\.tsx?$/.test(f)) out.push(p);
  }
  return out;
}
/** Value imports (not `import type`) of a file, with their specifiers. */
function valueImports(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(/^\s*import\s+(?!type\b)([^;]*?)\s+from\s+['"]([^'"]+)['"]/gm)) {
    const what = m[1]!.trim();
    // `import { type A, type B } from` is type-only too.
    if (/^\{[^}]*\}$/.test(what) && what.slice(1, -1).split(',').every(s => !s.trim() || s.trim().startsWith('type '))) continue;
    out.push(m[2]!);
  }
  for (const m of text.matchAll(/^\s*import\s+['"]([^'"]+)['"]/gm)) out.push(m[1]!);
  return out;
}
const rel = (p: string) => relative(SRC, p);

const SERVER_ONLY = [/^@\/lib\/data\//, /^@\/lib\/auth\/official(s)?$/, /^@\/lib\/auth\/session-token$/, /^node:/, /^@\/lib\/net\//, /^@\/lib\/audit\/sign$/];
// Pure modules under lib/data that hold no state and run in the browser too.
const BROWSER_SAFE_DATA = [/^@\/lib\/data\/register-owners$/];
// Shared data, not screens: the locked route list and the public-site design presets and contrast rules.
const SHARED_DATA = [/^@\/app\/route-lock\.json$/, /^@\/apps\/_shared\/public\/design\//, /^@\/apps\/_shared\/public\/site-props$/];

describe('architecture', () => {
  const all = files(SRC);

  it('browser code never loads server stores, sign-in internals or Node built-ins', () => {
    const bad: string[] = [];
    for (const f of all) {
      const text = readFileSync(f, 'utf8');
      if (!/^\s*['"]use client['"]/.test(text)) continue;
      for (const s of valueImports(text)) {
        if (SERVER_ONLY.some(re => re.test(s)) && !BROWSER_SAFE_DATA.some(re => re.test(s))) bad.push(`${rel(f)} → ${s}`);
      }
    }
    expect(bad, 'use `import type`, or call the API').toEqual([]);
  });

  it('stores, the twin, engines and the map layer never import screens', () => {
    const bad: string[] = [];
    for (const f of all.filter(p => /[\\/]lib[\\/]/.test(p))) {
      for (const s of valueImports(readFileSync(f, 'utf8'))) if (/^@\/(components|apps|app)\//.test(s) && !SHARED_DATA.some(re => re.test(s))) bad.push(`${rel(f)} → ${s}`);
    }
    expect(bad).toEqual([]);
  });

  it('server code logs through lib/ops/log (structured, redacted), not the console', () => {
    const bad = all.filter(p => /[\\/](lib|app[\\/]api)[\\/]/.test(p) && !/[\\/]lib[\\/]ops[\\/]log\.ts$/.test(p))
      .filter(p => { const t = readFileSync(p, 'utf8'); return !/^\s*['"]use client['"]/.test(t) && /\bconsole\.(log|info|warn|error)\(/.test(t.replace(/\/\/.*$/gm, '')); })
      .map(rel);
    expect(bad, 'use logger from @/lib/ops/log').toEqual([]);
  });

  it('API routes record who acted through the verified official, never a bare body field', () => {
    const bad: string[] = [];
    for (const f of all.filter(p => /[\\/]app[\\/]api[\\/].*route\.ts$/.test(p))) {
      const text = readFileSync(f, 'utf8');
      // A route that reads `by`/`actor` from its body must pass the body through withOfficial()/chamberBody().
      const readsActor = /\b(b|body|input)\.(by|actor|officerName)\b/.test(text);
      // caseScope() and routeActor() (lib/auth/official.ts, lib/casework/actor.ts) are the verified official too; a body name counts only when no one is signed in.
      const verified = /\b(withOfficial|chamberBody|publisherBody|currentOfficial|verifiedOfficial|caseScope|routeActor|actingName)\b/.test(text);
      if (readsActor && !verified) bad.push(rel(f));
    }
    expect(bad, 'parse the body with withOfficial()').toEqual([]);
  });
});
