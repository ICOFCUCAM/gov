// Every route handler finishes its durable writes with its request (./settle.ts,
// scripts/durable-route-loader.cjs; wiring audit §13). Without a database: the
// build transform over every route file, the wrapper's order, and which
// installations get the hooks. The commit itself, against Postgres:
// settle-postgres.integration.test.ts.
import { describe, it, expect, afterEach, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { durableRoute, installSettle, settleHook, type SettleHook } from './settle';
import { installRequestSettle, serverless } from '@/lib/data/persist';

const require_ = createRequire(import.meta.url);
const loader = require_(path.resolve(__dirname, '../../../../scripts/durable-route-loader.cjs')) as {
  transform(src: string, settlePath?: string): { code: string; methods: string[] };
  exportedMethods(src: string): string[];
};
const APP = path.resolve(__dirname, '../../../app');
const routes = (dir: string): string[] => readdirSync(dir).flatMap(n => {
  const p = path.join(dir, n);
  return statSync(p).isDirectory() ? routes(p) : n === 'route.ts' ? [p] : [];
});

const g = globalThis as unknown as Record<string, unknown>;
afterEach(() => { installSettle(undefined); g.__persistRecords = undefined; g.__persistAdapter = undefined; g.__persistSave = undefined; });

describe('the build transform (scripts/durable-route-loader.cjs)', () => {
  const files = routes(APP);
  it('wraps every method every route file exports, and leaves valid code with the same line numbers', () => {
    expect(files.length).toBeGreaterThan(300);
    let wrapped = 0;
    for (const f of files) {
      const src = readFileSync(f, 'utf8');
      const { code, methods } = loader.transform(src, '/settle.ts');
      // A method exported in another form would go unwrapped: give it one of the two forms the transform knows.
      expect([...methods].sort(), path.relative(APP, f)).toEqual(loader.exportedMethods(src).sort());
      if (!methods.length) { expect(code).toBe(src); continue; }
      wrapped += methods.length;
      const before = src.split('\n'), after = code.split('\n');
      expect(before.filter((l, i) => after[i] !== l && !l.startsWith('export ')), path.relative(APP, f)).toEqual([]);
      for (const m of methods) {
        expect(code).toContain(`export { __civicosDurable_${m} as ${m} };`);
        expect(code).not.toMatch(new RegExp(`^export\\s+(async\\s+)?(function|const)\\s+${m}\\b`, 'm'));
      }
      const out = ts.transpileModule(code, { reportDiagnostics: true, fileName: f, compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
      expect(out.diagnostics?.map(d => ts.flattenDiagnosticMessageText(d.messageText, '\n')) ?? [], path.relative(APP, f)).toEqual([]);
    }
    expect(wrapped).toBeGreaterThan(400);
  });

  it('handles each export form: async function, function, const (typed or aliased)', () => {
    const src = [
      `import { NextResponse } from 'next/server';`,
      `export async function GET() { return NextResponse.json({}); }`,
      `export function OPTIONS() { return new Response(null); }`,
      `export const POST: (r: Request) => Promise<Response> = async () => new Response('ok');`,
      `export const PUT = GET;`,
      `export const dynamic = 'force-dynamic';`,
      `export const GETTER = 1;`,
    ].join('\n');
    const { code, methods } = loader.transform(src, '/x/settle.ts');
    expect(methods.sort()).toEqual(['GET', 'OPTIONS', 'POST', 'PUT']);
    expect(code).toContain(`export const dynamic = 'force-dynamic';`);
    expect(code).toContain('export const GETTER = 1;');
    expect(code).toContain('const PUT = GET;');
    expect(code).toContain(`import { durableRoute as __civicosDurableRoute } from "/x/settle.ts";`);
  });
});

describe('durableRoute (./settle.ts)', () => {
  const hook = (over: Partial<SettleHook> = {}) => {
    const calls: string[] = [];
    const h: SettleHook = {
      before: vi.fn(async (m: string) => { calls.push(`before ${m}`); }),
      settle: vi.fn(async () => { calls.push('settle'); return true; }),
      pending: vi.fn(() => false),
      ...over,
    };
    return { h, calls };
  };

  it('only calls the handler when no hook is installed (memory and file modes, tests)', async () => {
    const res = new Response('ok');
    const post = durableRoute('POST', (_req: Request) => res);
    expect(settleHook()).toBeUndefined();
    expect(await post(new Request('http://x/'))).toBe(res);
  });

  it('a changing request is written before its response resolves, also when the handler throws', async () => {
    const { h, calls } = hook();
    installSettle(h);
    const post = durableRoute('POST', async () => { calls.push('handler'); return new Response('ok'); });
    const res = await post();
    calls.push('response');
    expect(await res.text()).toBe('ok');
    expect(calls).toEqual(['before POST', 'handler', 'settle', 'response']);

    calls.length = 0;
    const del = durableRoute('DELETE', async () => { calls.push('handler'); throw new Error('refused'); });
    await expect(del()).rejects.toThrow('refused');
    expect(calls).toEqual(['before DELETE', 'handler', 'settle']);
  });

  it('a read is not slowed: nothing is written before it answers; what it left pending is written after', async () => {
    const pending = vi.fn(() => true);
    const { h, calls } = hook({ pending });
    installSettle(h);
    const get = durableRoute('GET', () => { calls.push('handler'); return new Response('x'); });
    await get();
    // Outside a request (a test) after() is unavailable and the write runs at once; in a request it follows the response.
    await new Promise(r => setTimeout(r, 0));
    expect(calls).toEqual(['before GET', 'handler', 'settle']);
    pending.mockReturnValue(false);
    calls.length = 0;
    await get();
    expect(calls).toEqual(['before GET', 'handler']);
  });

  it('a commit that did not finish in time keeps going after the response; OPTIONS is untouched', async () => {
    let n = 0;
    const { h, calls } = hook({ settle: vi.fn(async () => { calls.push(`settle ${++n}`); return n > 1; }) });
    installSettle(h);
    await durableRoute('PATCH', () => new Response('x'))();
    await new Promise(r => setTimeout(r, 0));
    expect(calls).toEqual(['before PATCH', 'settle 1', 'settle 2']);
    calls.length = 0;
    await durableRoute('OPTIONS', () => new Response(null))();
    expect(calls).toEqual([]);
  });

  it('a failed pull does not fail the request', async () => {
    const { h } = hook({ before: vi.fn(async () => { throw new Error('database away'); }) });
    installSettle(h);
    expect(await (await durableRoute('GET', () => new Response('still here'))()).text()).toBe('still here');
  });
});

describe('installRequestSettle (lib/data/persist.ts)', () => {
  const fakeRecords = (over: Record<string, unknown> = {}) => ({
    listening: false, ownsAll: true,
    freshen: vi.fn(async () => true), settle: vi.fn(async () => true), pending: vi.fn(() => true),
    status: () => ({ queueDepth: 0 }),
    ...over,
  });

  it('installs nothing in memory mode, or in file mode on a long-running server', () => {
    expect(installRequestSettle({})).toBe(false);
    g.__persistAdapter = { name: 'file' };
    expect(installRequestSettle({})).toBe(false);
    expect(settleHook()).toBeUndefined();
    expect(serverless({ VERCEL: '1' })).toBe(true);
    expect(serverless({})).toBe(false);
  });

  it('postgres: commits before the response; pulls first only when other instances reach it by the poll', async () => {
    const r = fakeRecords();
    g.__persistRecords = r;
    expect(installRequestSettle({})).toBe(true);
    const h = settleHook()!;
    await h.before('GET');
    expect(r.freshen).toHaveBeenCalledWith(250, 300);
    expect(await h.settle()).toBe(true);
    expect(r.settle).toHaveBeenCalledWith(5000);
    // On a long-running server the timers write what a read left behind; nothing is kept alive for it.
    expect(h.pending()).toBe(false);

    r.freshen.mockClear();
    r.listening = true;
    await h.before('GET');
    expect(r.freshen).not.toHaveBeenCalled();
    r.listening = false;
    installRequestSettle({ CIVICOS_READ_FRESH_MS: '0' });
    await settleHook()!.before('GET');
    expect(r.freshen).not.toHaveBeenCalled();
    installRequestSettle({ VERCEL: '1', CIVICOS_SETTLE_TIMEOUT_MS: '900', CIVICOS_READ_FRESH_MS: '100', CIVICOS_READ_FRESH_TIMEOUT_MS: '50' });
    await settleHook()!.before('GET');
    expect(r.freshen).toHaveBeenCalledWith(100, 50);
    expect(settleHook()!.pending()).toBe(true);
    await settleHook()!.settle();
    expect(r.settle).toHaveBeenLastCalledWith(900);
    expect(installRequestSettle({ CIVICOS_SETTLE: 'off' })).toBe(false);
    expect(settleHook()).toBeUndefined();
  });

  it('a snapshot mode on a serverless host saves with the request instead of the 5 s timer', async () => {
    const save = vi.fn(async () => undefined);
    g.__persistAdapter = { name: 'supabase' };
    g.__persistSave = save;
    expect(installRequestSettle({ VERCEL: '1' })).toBe(true);
    expect(await settleHook()!.settle()).toBe(true);
    expect(save).toHaveBeenCalledTimes(1);
    // postgres keeping every store per record: no snapshot to save.
    g.__persistRecords = fakeRecords();
    installRequestSettle({ VERCEL: '1' });
    await settleHook()!.settle();
    expect(save).toHaveBeenCalledTimes(1);
  });
});
