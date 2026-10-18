'use client';

import * as React from 'react';

// The official acting at this desk. Every action the console sends to the
// server names this person, so the audit chain records who did it (never a
// placeholder name). One name per browser, shared by every panel on the page;
// the Update Center has always kept it under the same key.
// Register 1.x: until sign-in is bound to the substrate's identities, the
// name is declared by the official, not taken from a verified session.

const KEY = 'civicos.updates.actor';
const EVENT = 'civicos-actor';

export function useOfficial(): [string, (v: string) => void] {
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
  return [name, set];
}
