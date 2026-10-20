'use client';

// The demo cast in the header menu (lib/auth/demo-cast.ts, /api/demo/cast):
// a "Switch to…" list grouped by institution, shown only on a demonstration
// or training installation (the API answers 404 on a production one, and the
// list then never appears), with "Create the demo cast" for an administrator
// while there is none. Switching issues a session for the chosen account
// (/api/demo/act-as, audited) and reloads the page.

import * as React from 'react';
import { roleLabel, type OfficialRole } from '@/lib/auth/roles';
import { refreshSignIn } from '@/lib/official';

export interface CastMember { id: string; name: string; office: string; role: OfficialRole; institution?: string; institutionName?: string }
export interface CastState {
  mode: 'demo' | 'training';
  groups: { institution: string; name: string; members: CastMember[] }[];
  institutions: { id: string; name: string }[];
  viewer: { sub: string; cast: boolean; administrator: boolean } | null;
  canSwitch: boolean;
}

let cache: CastState | null | undefined;
let pending: Promise<CastState | null> | null = null;
const listeners = new Set<(s: CastState | null) => void>();

/** Ask again (after creating the cast). Null when the installation has no cast (production) or it cannot be read. */
export function refreshCast(): Promise<CastState | null> {
  pending = fetch('/api/demo/cast', { cache: 'no-store' }).then(r => (r.ok ? r.json() : null)).catch(() => null).then((s: CastState | null) => {
    cache = s; pending = null; listeners.forEach(l => l(s)); return s;
  });
  return pending;
}

/** The demo cast, or null when there is none to show (production, or not readable). Undefined while loading. */
export function useDemoCast(): CastState | null | undefined {
  const [s, setS] = React.useState<CastState | null | undefined>(cache);
  React.useEffect(() => {
    listeners.add(setS);
    if (cache === undefined && !pending) void refreshCast(); else if (cache !== undefined) setS(cache);
    return () => { listeners.delete(setS); };
  }, []);
  return s;
}

/** Switch to a cast account and reload, so every panel reads as that official. Returns the error, if any. */
export async function switchTo(accountId: string): Promise<string | null> {
  const r = await fetch('/api/demo/act-as', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ accountId }) }).catch(() => null);
  if (!r) return 'The switch could not be sent; try again';
  if (!r.ok) return ((await r.json().catch(() => ({}))) as { error?: string }).error ?? `Switch refused (${r.status})`;
  await refreshSignIn();
  window.location.reload();
  return null;
}

/** The "Demo cast" part of the header menu. Renders nothing outside demo and training installations. */
export function DemoCastMenu({ onDone }: { onDone?: () => void }) {
  const cast = useDemoCast();
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);
  if (!cast) return null;
  const empty = cast.groups.length === 0;
  const create = async () => {
    setBusy(true); setMsg(null);
    const r = await fetch('/api/demo/cast', { method: 'POST' }).catch(() => null);
    if (!r?.ok) setMsg(((await r?.json().catch(() => ({}))) as { error?: string } | undefined)?.error ?? 'The demo cast could not be created');
    await refreshCast();
    setBusy(false);
  };
  const go = async (id: string) => {
    setBusy(true); setMsg(null);
    const err = await switchTo(id);
    if (err) { setMsg(err); setBusy(false); } else onDone?.();
  };
  return (
    <div className="border-t border-line py-1" data-demo-cast>
      <div className="px-3 pb-0.5 pt-1 text-[10px] uppercase tracking-wide text-ink-muted">Demo cast · sample officials</div>
      {empty ? (
        cast.viewer?.administrator ? (
          <button type="button" role="menuitem" disabled={busy} onClick={() => void create()}
            className="focus-ring flex w-full items-center justify-between px-3 py-1.5 text-left text-[12px] text-link transition-colors hover:bg-surface-2">
            <span>Create the demo cast</span><span aria-hidden className="text-[10px]">+</span>
          </button>
        ) : (
          <p className="px-3 py-1 text-[11px] text-ink-muted">No demo cast yet; an administrator creates it here.</p>
        )
      ) : !cast.canSwitch ? (
        <p className="px-3 py-1 text-[11px] text-ink-muted">Sign in as an administrator to switch to a demo official.</p>
      ) : (
        <div className="max-h-72 overflow-y-auto">
          {cast.groups.map(g => (
            <div key={g.institution || 'whole'} role="group" aria-label={g.name}>
              <div className="px-3 pt-1 text-[10px] font-medium text-ink-soft">{g.name}</div>
              {g.members.map(m => {
                const current = cast.viewer?.sub === `local:${m.id}`;
                return (
                  <button key={m.id} type="button" role="menuitem" disabled={busy || current} onClick={() => void go(m.id)}
                    className="focus-ring flex w-full items-center justify-between px-3 py-1 text-left text-[11px] text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-60">
                    <span>{current ? 'You: ' : 'Switch to '}{m.name}</span>
                    <span className="text-[10px] text-ink-muted">{roleLabel(m.role)}</span>
                  </button>
                );
              })}
            </div>
          ))}
          {cast.viewer?.administrator ? (
            <button type="button" role="menuitem" disabled={busy} onClick={() => void create()}
              className="focus-ring flex w-full items-center justify-between px-3 py-1 text-left text-[11px] text-link transition-colors hover:bg-surface-2">
              <span>Refresh the cast from who is responsible</span><span aria-hidden className="text-[10px]">↻</span>
            </button>
          ) : null}
        </div>
      )}
      {msg ? <p role="status" className="px-3 py-1 text-[11px] text-alert">{msg}</p> : null}
    </div>
  );
}
