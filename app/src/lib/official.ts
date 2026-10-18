'use client';

import * as React from 'react';

// The official acting at this desk. When someone has signed in
// (/api/auth/official, register 15.4) that is their verified name, and the
// server records it whatever a request says. Otherwise the name is declared at
// the desk and kept in this browser (shared by every panel on the page; the
// Update Center has always kept it under the same key) — unless the
// installation enforces sign-in, in which case changes are refused until
// someone signs in.

const KEY = 'civicos.updates.actor';
const EVENT = 'civicos-actor';

export interface VerifiedOfficial { sub: string; name: string; office?: string; method: 'local' | 'substrate' }
export interface SignInState { official: VerifiedOfficial | null; enforced: boolean; accounts: boolean; methods: { local: boolean; substrate: boolean } }

let cache: SignInState | null = null;
let pending: Promise<SignInState | null> | null = null;
const listeners = new Set<(s: SignInState | null) => void>();

export function refreshSignIn(): Promise<SignInState | null> {
  pending = fetch('/api/auth/official', { cache: 'no-store' }).then(r => (r.ok ? r.json() : null)).catch(() => null).then((s: SignInState | null) => {
    cache = s; pending = null; listeners.forEach(l => l(s)); return s;
  });
  return pending;
}

/** Who is signed in on this installation (null until known). */
export function useSignIn(): SignInState | null {
  const [s, setS] = React.useState<SignInState | null>(cache);
  React.useEffect(() => {
    listeners.add(setS);
    if (!cache && !pending) void refreshSignIn(); else if (cache) setS(cache);
    return () => { listeners.delete(setS); };
  }, []);
  return s;
}

export const officialLabel = (o: VerifiedOfficial) => (o.office ? `${o.name}, ${o.office}` : o.name);

export function useOfficial(): [string, (v: string) => void] {
  const signIn = useSignIn();
  const [name, setName] = React.useState('');
  React.useEffect(() => {
    try { setName(localStorage.getItem(KEY) ?? ''); } catch { /* storage unavailable */ }
    const on = (e: Event) => setName((e as CustomEvent<string>).detail);
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, []);
  const set = React.useCallback((v: string) => {
    try { localStorage.setItem(KEY, v); } catch { /* storage unavailable */ }
    window.dispatchEvent(new CustomEvent(EVENT, { detail: v }));
  }, []);
  if (signIn?.official) return [officialLabel(signIn.official), () => {}];
  if (signIn?.enforced) return ['', () => {}];
  return [name, set];
}
