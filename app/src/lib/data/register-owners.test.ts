import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { REGISTER_OWNERS, CIVIC_API_FOLLOWER } from './register-owners';

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

  it('every register the platform owns names how it is kept per record with CIVICOS_STATE=postgres', () => {
    const without = REGISTER_OWNERS.filter(r => r.owner.where === 'platform' && !/^CIVICOS_STATE=postgres: per-record (tables|documents)/.test(r.storage ?? '')).map(r => r.id);
    expect(without).toEqual([]);
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

describe('the duplicates are retired behind their owners (finding D8)', () => {
  const APP = join(SRC, '..');
  const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
  const sources = () => files(SRC)
    // The map itself names the RPCs; the generated types list every function.
    .filter(f => !/\/lib\/db\/types(\.generated)?\.ts$|\/lib\/data\/register-owners\.ts$/.test(f))
    .map(f => ({ rel: f.slice(APP.length + 1), text: strip(readFileSync(f, 'utf8')) }));

  it('every copy of a platform-owned register is a mirror: a substrate one with its writer, a civic-api one in a mirror mode', () => {
    const wrong = REGISTER_OWNERS.filter(r => r.owner.where === 'platform').flatMap(r => r.copies
      .filter(c => !(c.role === 'mirror' && (c.where !== 'civic-api' || c.mode) && (c.where !== 'substrate' || c.writer)))
      .map(c => `${r.id}: ${c.where} ${c.what} (${c.role})`));
    expect(wrong).toEqual([]);
    // Every civic-api copy, whatever its register, is a mirror that forwards writes (the service's default mode).
    expect(REGISTER_OWNERS.flatMap(r => r.copies.filter(c => c.where === 'civic-api' && !(c.role === 'mirror' && c.mode === 'forward' && typeof c.fed === 'boolean')).map(c => c.what))).toEqual([]);
    const mode = readFileSync(join(ROOT, 'services', 'civic-api', 'src', 'common', 'read-only-mirror.ts'), 'utf8');
    expect(mode).toMatch(/if \(mode === undefined \|\| mode === ''\) return 'forward';/);
  });

  it('civic-api copies said to be fed are in its follower\'s registers, which the mirror feed answers', () => {
    const follower = readFileSync(join(ROOT, CIVIC_API_FOLLOWER), 'utf8');
    const registers = /export const REGISTERS = \[([^\]]+)\]/.exec(follower)![1]!.match(/'([a-z]+)'/g)!.map(x => x.slice(1, -1));
    // The platform register → the follower's registers that carry it.
    const carries: Record<string, string[]> = { nation: ['lifecycle'], institutions: ['institutions'], permits: ['permits'], payments: ['payments'],
      ops: ['incidents', 'releases', 'deployments', 'backups', 'configs'], federation: ['integrations', 'grants', 'webhooks'] };
    for (const r of REGISTER_OWNERS) for (const c of r.copies) {
      if (c.where !== 'civic-api' || !c.fed) continue;
      expect(carries[r.id], `${r.id} is fed to civic-api`).toBeDefined();
      for (const x of carries[r.id]!) expect(registers, `${r.id} → ${x}`).toContain(x);
    }
    // The feed the follower reads answers each of them.
    const feed = readFileSync(join(APP, 'src', 'app', 'api', 'platform', 'mirror', 'route.ts'), 'utf8');
    for (const x of registers) expect(feed, x).toMatch(new RegExp(`\\b${x}: \\(\\) =>`));
  });

  it('every civic-api write forwarded to the platform goes to a platform route that exists with that method', () => {
    const forward = readFileSync(join(ROOT, 'services', 'civic-api', 'src', 'common', 'forward.ts'), 'utf8');
    const routes = [...forward.matchAll(/\{ method: '(POST|DELETE)', path: '[^']*', platform: '(\/api\/[^']+)'/g)].map(m => ({ method: m[1]!, path: m[2]! }));
    expect(routes.length).toBeGreaterThan(25);
    const missing: string[] = [];
    for (const r of routes) {
      const file = join(APP, 'src', 'app', ...r.path.split('/').filter(Boolean).map(s => s.replace(/^\{(\w+)\}$/, '[$1]')), 'route.ts');
      let src = '';
      try { src = readFileSync(file, 'utf8'); } catch { missing.push(`${r.method} ${r.path} (no route file)`); continue; }
      if (!new RegExp(`export\\s+(async\\s+)?function\\s+${r.method}\\b|export\\s+const\\s+${r.method}\\b`).test(src)) missing.push(`${r.method} ${r.path}`);
    }
    expect(missing).toEqual([]);
  });

  it('no app code but the mirror writer writes a mirrored substrate table', () => {
    const src = sources();
    const offences: string[] = [];
    for (const r of REGISTER_OWNERS) for (const c of r.copies) {
      if (c.where !== 'substrate' || c.role !== 'mirror') continue;
      for (const rpc of c.writes ?? []) {
        for (const f of src) if (f.rel !== c.writer && new RegExp(`['"\`]${rpc}['"\`]`).test(f.text)) offences.push(`${f.rel} calls ${rpc} (${r.id} is written only by ${c.writer})`);
      }
      for (const t of c.tables ?? []) {
        const direct = new RegExp(`from\\(\\s*['"\`]${t}['"\`]\\s*\\)[\\s\\S]{0,80}?\\.(insert|upsert|update|delete)\\(`);
        for (const f of src) if (f.rel !== c.writer && direct.test(f.text)) offences.push(`${f.rel} writes ${t} directly`);
      }
    }
    expect(offences).toEqual([]);
  });

  it('the mirror writers exist and the substrate grants the mirror RPCs to the service role only', () => {
    const dir = join(APP, 'supabase', 'migrations');
    const sql = readdirSync(dir).filter(f => f.endsWith('.sql')).sort().map(f => readFileSync(join(dir, f), 'utf8')).join('\n');
    for (const r of REGISTER_OWNERS) for (const c of r.copies) {
      if (c.where === 'substrate' && c.writer) expect(statSync(join(APP, c.writer)).isFile(), c.writer).toBe(true);
    }
    for (const fn of ['civicos_record_directive', 'civicos_sign_directive', 'civicos_rescind_directive', 'civicos_register_institution', 'civicos_activate_institution']) {
      expect(sql, fn).toMatch(new RegExp(`revoke execute on function public\\.${fn}\\([^)]*\\) from anon, authenticated`));
    }
    for (const fn of ['civicos_mirror_directive', 'civicos_mirror_institution']) {
      expect(sql, fn).toMatch(new RegExp(`revoke all on function public\\.${fn}\\([^)]*\\) from public, anon, authenticated`));
      expect(sql, fn).toMatch(new RegExp(`grant execute on function public\\.${fn}\\([^)]*\\) to service_role`));
    }
  });

  it('civic-api names the owning platform route of each mirrored module', () => {
    const guard = readFileSync(join(ROOT, 'services', 'civic-api', 'src', 'common', 'read-only-mirror.ts'), 'utf8');
    for (const r of REGISTER_OWNERS) for (const c of r.copies) {
      if (c.where !== 'civic-api') continue;
      const mod = c.what.split('/').pop()!;
      expect(guard, `${mod} → ${r.api}`).toContain(`module: '${mod}', register: '${r.id}', owner: '${r.api}'`);
    }
  });
});
