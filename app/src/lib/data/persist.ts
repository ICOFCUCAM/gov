// Durable platform state (register 1.1). Every server store keeps its data on
// globalThis under a key starting with "__civicos" (the nation profile and
// ministries in store.ts, the Update Center, site settings, editorial,
// subscriptions …). This module saves those stores and restores them when the
// server starts, so a restart no longer loses the nation's configuration,
// audit chain, decisions or published content.
//
// How: at start (src/instrumentation.ts, before any request) every saved store
// is put back on globalThis, so each module's `g.__civicosX ??= seed()` picks
// it up instead of seeding. Then every few seconds, and on shutdown, each store
// whose contents changed is written back.
//
// Where (CIVICOS_STATE):
//   file      JSON files in CIVICOS_STATE_DIR (default ./.civicos-state), written
//             atomically — for a nation's own servers, including air-gapped ones
//   supabase  the nation's substrate: civicos.platform_state (service role only)
//   unset     memory only, as before (development and demonstrations)
//
// Limits: one running server owns the state (several instances would overwrite
// each other); changes from the last few seconds before a crash can be lost.
// Both are recorded in docs/INTEGRATION_REGISTER.md 1.1.

import { promises as fs } from 'node:fs';
import path from 'node:path';

export interface StateAdapter {
  name: 'file' | 'supabase' | 'memory';
  loadAll(): Promise<Record<string, unknown>>;
  save(key: string, json: string): Promise<void>;
}

/** Snapshot format; bump when the envelope changes. */
export const SNAPSHOT_FORMAT = 1;
const KEY = /^__civicos[A-Za-z0-9_]*$/;

// ── Serialisation that keeps Maps, Sets and Dates ─────────────────────────
type Tagged = { $map: [unknown, unknown][] } | { $set: unknown[] } | { $date: string };
function replacer(this: unknown, k: string, v: unknown): unknown {
  const raw = (this as Record<string, unknown>)[k];
  if (raw instanceof Map) return { $map: [...raw.entries()] };
  if (raw instanceof Set) return { $set: [...raw.values()] };
  if (raw instanceof Date) return { $date: raw.toISOString() };
  return v;
}
function reviver(_k: string, v: unknown): unknown {
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    const t = v as Tagged;
    if ('$map' in t && Array.isArray(t.$map)) return new Map(t.$map);
    if ('$set' in t && Array.isArray(t.$set)) return new Set(t.$set);
    if ('$date' in t && typeof t.$date === 'string' && Object.keys(t).length === 1) return new Date(t.$date);
  }
  return v;
}
export const encode = (value: unknown): string => JSON.stringify(value, replacer);
export const decode = (json: string): unknown => JSON.parse(json, reviver);

// ── Adapters ──────────────────────────────────────────────────────────────
export function fileAdapter(dir: string): StateAdapter {
  return {
    name: 'file',
    async loadAll() {
      const out: Record<string, unknown> = {};
      const names = await fs.readdir(dir).catch(() => [] as string[]);
      for (const n of names) {
        const key = n.replace(/\.json$/, '');
        if (!n.endsWith('.json') || !KEY.test(key)) continue;
        out[key] = await fs.readFile(path.join(dir, n), 'utf8');
      }
      return out;
    },
    async save(key, json) {
      await fs.mkdir(dir, { recursive: true });
      const tmp = path.join(dir, `.${key}.${process.pid}.tmp`);
      await fs.writeFile(tmp, json, 'utf8');
      await fs.rename(tmp, path.join(dir, `${key}.json`));
    },
  };
}

/** The nation's substrate (Supabase). Uses the two service-role RPCs from migration civicos_platform_state. */
export async function supabaseAdapter(): Promise<StateAdapter | null> {
  const { serverClient } = await import('@/lib/db/client');
  const db = serverClient();
  if (!db) return null;
  return {
    name: 'supabase',
    async loadAll() {
      const { data, error } = await db.rpc('civicos_platform_state_all' as never);
      if (error) throw new Error(`civicos_platform_state_all: ${error.message}`);
      const out: Record<string, unknown> = {};
      for (const row of (data ?? []) as { key: string; value: string }[]) if (KEY.test(row.key)) out[row.key] = row.value;
      return out;
    },
    async save(key, json) {
      const { error } = await db.rpc('civicos_platform_state_put' as never, { p_key: key, p_value: json } as never);
      if (error) throw new Error(`civicos_platform_state_put: ${error.message}`);
    },
  };
}

// ── Restore and save ──────────────────────────────────────────────────────
interface Status { adapter: StateAdapter['name']; restored: string[]; lastSaved?: string; saves: number; error?: string; startedAt: string }
const g = globalThis as unknown as Record<string, unknown> & { __persistStatus?: Status; __persistLast?: Map<string, string> };

/** The stores currently on globalThis. */
export function liveKeys(): string[] {
  return Object.keys(globalThis).filter(k => KEY.test(k) && g[k] !== undefined);
}

/** Put saved stores back on globalThis. Only keys not already live are restored (a store that started fresh is never overwritten). */
export function restore(saved: Record<string, unknown>): string[] {
  const restored: string[] = [];
  for (const [key, raw] of Object.entries(saved)) {
    if (!KEY.test(key) || g[key] !== undefined) continue;
    try {
      const env = decode(String(raw)) as { v?: number; data?: unknown };
      if (env?.v !== SNAPSHOT_FORMAT) continue;
      g[key] = env.data;
      restored.push(key);
    } catch { /* an unreadable snapshot is skipped; the store seeds as new */ }
  }
  return restored;
}

/** Write every store whose contents changed since the last save. Returns the keys written. */
export async function flush(adapter: StateAdapter, now = new Date()): Promise<string[]> {
  const last = (g.__persistLast ??= new Map());
  const written: string[] = [];
  for (const key of liveKeys()) {
    const data = encode(g[key]);
    if (last.get(key) === data) continue;
    await adapter.save(key, JSON.stringify({ v: SNAPSHOT_FORMAT, at: now.toISOString(), data: JSON.parse(data) }));
    last.set(key, data);
    written.push(key);
  }
  if (g.__persistStatus) { g.__persistStatus.saves += written.length ? 1 : 0; if (written.length) g.__persistStatus.lastSaved = now.toISOString(); }
  return written;
}

export function persistenceStatus(): Status {
  return g.__persistStatus ?? { adapter: 'memory', restored: [], saves: 0, startedAt: new Date(0).toISOString() };
}

/** Start from the environment (called once by src/instrumentation.ts). */
export async function startFromEnv(env = process.env): Promise<Status> {
  const mode = (env.CIVICOS_STATE ?? '').toLowerCase();
  const adapter = mode === 'file' ? fileAdapter(env.CIVICOS_STATE_DIR || path.join(process.cwd(), '.civicos-state'))
    : mode === 'supabase' ? await supabaseAdapter()
    : null;
  const status: Status = { adapter: adapter?.name ?? 'memory', restored: [], saves: 0, startedAt: new Date().toISOString() };
  g.__persistStatus = status;
  if (!adapter) {
    if (mode === 'supabase') status.error = 'CIVICOS_STATE=supabase but the substrate is not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY); keeping state in memory';
    return status;
  }
  try {
    status.restored = restore(await adapter.loadAll());
  } catch (e) {
    status.error = `restore failed: ${(e as Error).message}`;
  }
  // Baseline: what was just restored needs no immediate write.
  const last = (g.__persistLast ??= new Map());
  for (const k of status.restored) last.set(k, encode(g[k]));
  const save = () => flush(adapter).then(() => { status.error = undefined; }).catch(e => { status.error = `save failed: ${(e as Error).message}`; });
  const timer = setInterval(save, Number(env.CIVICOS_STATE_INTERVAL_MS) || 5000);
  timer.unref?.();
  for (const sig of ['SIGTERM', 'SIGINT'] as const) {
    process.once(sig, () => { void save().finally(() => process.exit(0)); });
  }
  return status;
}
