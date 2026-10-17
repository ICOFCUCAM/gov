'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { substrateAvailable } from '@/lib/db/client';

// Shared entry behaviour for every cover design. Designs differ in look;
// where each path lands, and how sign-in is handed off, stays identical.

export type EntryPath = 'officer' | 'citizen' | 'institution';

export const ENTRY_PATHS: { k: EntryPath; title: string; sub: string; cta: string }[] = [
  { k: 'officer', title: 'Government', sub: 'Officers, ministries and the executive', cta: 'Enter Command' },
  { k: 'citizen', title: 'Citizen', sub: 'Your Civic Wallet — services, records, receipts', cta: 'Open Civic Wallet' },
  { k: 'institution', title: 'New institution', sub: 'Charter a ministry or agency from an archetype', cta: 'Begin charter' },
];

export const PUBLIC_LINKS = [
  { l: 'Government Directory', href: '/government' },
  { l: 'Citizen Portal', href: '/portal' },
  { l: 'Verify a Document', href: '/wallet/documents' },
  { l: 'National Briefing', href: '/noc' },
  { l: 'Public Observatory', href: '/public' },
  { l: 'Developers', href: '/developers' },
];

export const CITIZEN_NOTE = 'Verify on this device, with an authorised agent, or at any government office. No social login, no password to steal.';

/** Demo session — the same cookie /login sets and middleware checks under
 *  CIVICOS_AUTH=enforce. Used only when no identity substrate is configured. */
function setDemoSession() {
  document.cookie = `civicos_session=demo; path=/; max-age=${60 * 60 * 8}; samesite=lax`;
}

export function useCoverEntry(initial: EntryPath = 'officer') {
  const router = useRouter();
  const [path, setPath] = React.useState<EntryPath>(initial);
  const [email, setEmail] = React.useState('');
  const [live, setLive] = React.useState<boolean | null>(null);
  React.useEffect(() => { setLive(substrateAvailable()); }, []);

  const enter = React.useCallback((e?: React.FormEvent, override?: EntryPath) => {
    e?.preventDefault();
    const p = override ?? path;
    if (p === 'citizen') { router.push('/login?from=/wallet'); return; }
    const dest = p === 'officer' ? '/command' : '/ministries';
    if (live) {
      const q = new URLSearchParams({ from: dest });
      if (email.trim()) q.set('email', email.trim().toLowerCase());
      if (p === 'institution') q.set('mode', 'sign-up');
      router.push(`/sign-in?${q.toString()}`);
      return;
    }
    setDemoSession();
    router.push(dest);
  }, [path, live, email, router]);

  const note = live === false
    ? 'Prototype mode — no identity substrate is configured, so you enter with a demo session.'
    : path === 'citizen'
      ? 'You choose how to verify on the next step.'
      : 'Confirm with the password from your invitation. Every session is signed and written to the audit chain.';

  const cta = ENTRY_PATHS.find(p => p.k === path)!.cta;
  return { path, setPath, email, setEmail, live, enter, note, cta };
}

/** Number keys 1–3 pick a path (ignored while typing). */
export function usePathKeys(setPath: (p: EntryPath) => void) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.metaKey || e.ctrlKey || e.altKey) return;
      const p = ENTRY_PATHS[Number(e.key) - 1];
      if (p) setPath(p.k);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setPath]);
}

export function useClock() {
  const [clock, setClock] = React.useState('');
  React.useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);
  return clock;
}

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduced;
}
