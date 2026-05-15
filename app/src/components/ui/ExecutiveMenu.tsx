'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

const ITEMS: { l: string; href: string; k?: boolean }[] = [
  { l: 'Executive profile', href: '/gov/configuration' },
  { l: 'Cabinet session', href: '/gov' },
  { l: 'National alerts', href: '/gov/situation-room' },
  { l: 'Secure communications', href: '/integrations' },
  { l: 'Strategic briefings', href: '/gov/coordination' },
  { l: 'War room', href: '/gov', k: true },
  { l: 'Audit log', href: '/audit' },
  { l: 'Continuity posture', href: '/gov/coordination' },
  { l: 'Sovereign settings', href: '/gov/configuration' },
  { l: 'Sign out', href: '/login', k: true },
];

/**
 * Head-of-Government executive menu — an active sovereign command
 * dropdown (profile, cabinet session, alerts, secure comms, war room,
 * briefings, audit, continuity, settings, sign out).
 */
export function ExecutiveMenu({
  title = 'Head of Government',
  sub = 'National Executive',
  accent = '#37c7d4',
}: {
  title?: string;
  sub?: string;
  accent?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const go = (href: string) => { setOpen(false); router.push(href); };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="focus-ring flex items-center gap-2 rounded-[3px] border border-line px-2 py-1 transition-colors hover:border-link/40"
      >
        <span className="text-right leading-tight">
          <span className="block text-xs font-medium text-ink">{title}</span>
          <span className="block text-[10px] text-ink-muted">{sub}</span>
        </span>
        <span aria-hidden className="grid h-8 w-8 place-items-center rounded-full bg-surface-2 text-xs text-ink-soft ring-1 ring-line">◷</span>
        <span aria-hidden className="text-[9px] text-ink-muted">{open ? '▴' : '▾'}</span>
      </button>
      {open ? (
        <div
          role="menu"
          className="sov absolute right-0 z-[90] mt-1 w-60 overflow-hidden rounded-[3px] border border-line bg-surface shadow-elev-3"
        >
          <div className="border-b border-line px-3 py-2">
            <div className="text-[11px] font-semibold text-ink">{title}</div>
            <div className="flex items-center gap-1.5 text-[10px] text-ink-muted">
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: '#34d39c' }} />
              Online · authenticated · OFFICIAL
            </div>
          </div>
          <div className="py-1">
            {ITEMS.map(it => (
              <button
                key={it.l}
                type="button"
                role="menuitem"
                onClick={() => go(it.href)}
                className="focus-ring flex w-full items-center justify-between px-3 py-1.5 text-left text-[12px] text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink"
                style={it.k ? { color: '#f1707a' } : undefined}
              >
                <span>{it.l}</span>
                <span className="text-[10px] text-ink-muted" style={it.k ? { color: '#f1707a' } : { color: accent }}>→</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
