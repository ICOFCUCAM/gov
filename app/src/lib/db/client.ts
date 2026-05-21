// lib/db/client — Supabase client singletons.
//
// Two client classes:
//   • `publicClient()`   — anon publishable key. Reads via RLS, writes via
//                          SECURITY DEFINER RPCs only. Safe for the browser.
//   • `serverClient()`   — service-role. Bypasses RLS. Server-only (Node
//                          API routes / scripts). Throws if invoked in
//                          the browser bundle.
//
// The substrate is *configured-but-optional*: if the env vars are unset (e.g.
// during local UI development or tests), accessors return `null` and the
// callers fall back to the in-memory stubs. This lets the app boot even
// without a database — and lets persistence light up by setting two vars.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const URL_KEY  = 'NEXT_PUBLIC_SUPABASE_URL';
const ANON_KEY = 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY';
const SRV_KEY  = 'SUPABASE_SERVICE_ROLE_KEY';

// We intentionally type these as the un-narrowed SupabaseClient — the
// schema is set at construction time and types are hand-written in
// lib/db/types.ts, so we don't rely on the generated schema generic.
type DbClient = SupabaseClient;

let _publicState: { client: DbClient | null } | null = null;
let _serverState: { client: DbClient | null } | null = null;

export function publicClient(): DbClient | null {
  if (_publicState) return _publicState.client;
  const url  = process.env[URL_KEY];
  const anon = process.env[ANON_KEY];
  if (!url || !anon) { _publicState = { client: null }; return null; }
  // Persist sessions only in browser contexts — the same client is used
  // by SSR API routes where window is absent, and Supabase's localStorage
  // adapter throws when missing. autoRefreshToken keeps the JWT live
  // across long sessions.
  const inBrowser = typeof window !== 'undefined';
  const client = createClient(url, anon, {
    auth: {
      persistSession: inBrowser, autoRefreshToken: inBrowser,
      storageKey: 'civicos.auth',
    },
    db: { schema: 'public' as never },
    global: { headers: { 'x-civicos-client': 'public' } },
  });
  _publicState = { client };
  return client;
}

export function serverClient(): DbClient | null {
  if (_serverState) return _serverState.client;
  if (typeof window !== 'undefined') {
    throw new Error('serverClient() called in browser; service-role key must never reach the client.');
  }
  const url = process.env[URL_KEY];
  const srv = process.env[SRV_KEY];
  if (!url || !srv) { _serverState = { client: null }; return null; }
  const client = createClient(url, srv, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: 'public' as never },
    global: { headers: { 'x-civicos-client': 'server' } },
  });
  _serverState = { client };
  return client;
}

/** True when the persistent substrate is wired (public client available). */
export function substrateAvailable(): boolean {
  return publicClient() !== null;
}

/** Reset client singletons. Tests only. */
export function __resetClients(): void {
  _publicState = null;
  _serverState = null;
}
