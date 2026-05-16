'use client';

import * as React from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { resolveIdentity } from '@/lib/sovereign-identity';
import { TONE, ACCENT, PALETTE } from '@/components/features/SituationRoom';
import { CommandPalette, type CommandItem } from '@/components/ui/CommandPalette';
import { ExecutiveMenu } from '@/components/ui/ExecutiveMenu';
import type { SovereignProfile, NationalSnapshot, NationalCoordination } from '@/lib/api/types';

const RAIL: { g: string; items: { i: string; l: string; s: string; href: string; key: string }[] }[] = [
  { g: 'Sovereign Command', items: [
    { i: '◎', l: 'Situation Room', s: 'Real-time command', href: '/gov/situation-room', key: 'sr' },
    { i: '◆', l: 'Cabinet Intelligence', s: 'Executive command', href: '/gov', key: 'cab' },
    { i: '⟁', l: 'National Coordination', s: 'Dependency · cascade', href: '/gov/coordination', key: 'coord' },
    { i: '◉', l: 'Regional Overview', s: 'Provincial posture · readiness', href: '/gov/regional', key: 'reg' },
    { i: '⊞', l: 'Operations Centre', s: 'Cross-institution state', href: '/ops', key: 'ops' },
    { i: '⛓', l: 'Oversight', s: 'Audit · integrity', href: '/audit', key: 'aud' },
  ]},
  { g: 'Strategic Domains', items: [
    { i: '§', l: 'Treasury Command', s: 'Sovereign fiscal', href: '/gov/treasury', key: 'trs' },
    { i: '◈', l: 'Security & Interior', s: 'National security', href: '/gov/security', key: 'sec' },
    { i: '◷', l: 'Geopolitical Monitor', s: 'External pressure', href: '/gov/geopolitical', key: 'geo' },
  ]},
  { g: 'Institutional Admin', items: [
    { i: '▦', l: 'Institutions Admin', s: 'Compose ministries', href: '/ministries', key: 'min' },
    { i: '⚙', l: 'Sovereign Configuration', s: 'Profile · presets · identity', href: '/gov/configuration', key: 'cfg' },
    { i: '◫', l: 'Platform Operations', s: 'Releases · tenancy', href: '/platform', key: 'plat' },
    { i: '⇄', l: 'Interoperability', s: 'Federation · clients', href: '/integrations', key: 'intg' },
  ]},
  { g: 'Public Service', items: [
    { i: '◊', l: 'Civic Wallet', s: 'Citizen services', href: '/wallet', key: 'wal' },
    { i: '⊟', l: 'Officer Console', s: 'Decide · sign · review', href: '/console', key: 'con' },
    { i: '▣', l: 'Ministry Control', s: 'Control room', href: '/control', key: 'ctl' },
    { i: '◉', l: 'NCCC Wall', s: 'Coordination wall', href: '/wall', key: 'wall' },
  ]},
];

/**
 * Shared sovereign command chrome — full-screen dark command environment
 * (top telemetry bar + grouped command rail + command palette) that
 * non-flagship gov surfaces mount into so the whole platform reads as
 * one coherent operating system.
 */
export function CommandShell({
  active,
  children,
}: {
  active: string;
  children: React.ReactNode;
}) {
  const [sov, setSov] = React.useState<SovereignProfile | null>(null);
  const [nat, setNat] = React.useState<NationalSnapshot | null>(null);
  const [coord, setCoord] = React.useState<NationalCoordination | null>(null);
  const [now, setNow] = React.useState(() => Date.now());

  React.useEffect(() => {
    const load = async () => {
      const [s, n, c] = await Promise.all([
        api.sovereign.get().then(r => r.sovereign).catch(() => null),
        api.cabinet.national().catch(() => null),
        api.cabinet.coordination().catch(() => null),
      ]);
      setSov(s); setNat(n); setCoord(c);
    };
    void load();
    const poll = setInterval(() => void load(), 15_000);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => { clearInterval(poll); clearInterval(tick); };
  }, []);

  const identity = sov ? resolveIdentity(sov) : null;
  const posture = coord?.posture;
  const t = nat?.totals;
  const incidents = nat?.crossMinistryIncidents ?? [];

  const tele = [
    { l: 'Environment', v: nat?.environment ?? 'Production', t: 'ok', dot: true },
    { l: 'Institutions', v: String(t?.institutions ?? 0) },
    { l: 'Active incidents', v: String(incidents.length), t: incidents.length ? 'alert' : 'ok' },
    { l: 'Queues breaching', v: String(t?.queuesBreaching ?? 0), t: (t?.queuesBreaching ?? 0) > 0 ? 'warn' : 'ok' },
    { l: 'National risk', v: posture?.label ?? 'STABLE', t: posture?.level ?? 'ok' },
    { l: 'Audit integrity', v: t?.auditIntact === false ? 'Review' : 'Intact', t: t?.auditIntact === false ? 'alert' : 'ok' },
  ];
  const cmd: CommandItem[] = RAIL.flatMap(g => g.items.map(it => ({ id: it.href + it.l, group: g.g, label: it.l, hint: it.s, href: it.href })));

  return (
    <div className="sov flex h-screen flex-col overflow-hidden font-sans [height:100dvh]" style={PALETTE}>
      <CommandPalette items={cmd} accent={ACCENT} />
      <header className="flex h-14 shrink-0 items-center gap-4 border-b border-line bg-surface px-4">
        <Link href="/" className="focus-ring flex items-center gap-2.5 no-underline">
          <span aria-hidden className="grid h-9 w-9 place-items-center rounded-[3px] text-sm font-bold text-white ring-1 ring-white/15" style={{ backgroundColor: ACCENT }}>
            {identity ? identity.seal : 'CO'}
          </span>
          <span className="leading-tight">
            <span className="flex items-center gap-1.5 text-sm font-bold tracking-[0.18em] text-ink">CIVICOS
              <span className="rounded-[3px] border border-line px-1 text-[8px] font-semibold tracking-[0.2em] text-ink-soft">OFFICIAL</span>
            </span>
            <span className="block text-[9px] uppercase tracking-[0.16em] text-ink-muted">Sovereign Operating System</span>
          </span>
        </Link>
        <div className="ml-2 hidden flex-1 items-stretch lg:flex">
          {tele.map(m => (
            <div key={m.l} className="border-l border-line px-4 py-1 first:border-l-0">
              <div className="text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">{m.l}</div>
              <div className="flex items-center gap-1.5 font-mono text-sm tabular-nums" style={{ color: m.t ? TONE[m.t] : 'rgb(var(--c-ink))' }}>
                {m.dot ? <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ backgroundColor: TONE[m.t ?? 'ok'] }} /> : null}
                {m.v}
              </div>
            </div>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden font-mono text-xs tabular-nums text-ink-muted sm:inline">{new Date(now).toLocaleTimeString()}</span>
          <span className="hidden items-center gap-1.5 rounded-[3px] border border-line px-2 py-1 text-[10px] text-ink-soft sm:flex"><span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: TONE.ok }} /> Secure Comms</span>
          <span className="border-l border-line pl-3">
            <ExecutiveMenu title={sov?.executiveTitle ?? 'Head of Government'} sub="National Executive" accent={ACCENT} />
          </span>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <nav aria-label="Sovereign command" className="hidden w-[212px] shrink-0 flex-col border-r border-line bg-bg lg:flex">
          <div className="flex-1 overflow-y-auto py-1">
            {RAIL.map(grp => (
              <div key={grp.g} className="mb-0.5">
                <div className="px-3 pb-0.5 pt-2 text-[8px] font-semibold uppercase tracking-[0.18em] text-ink-muted">{grp.g}</div>
                {grp.items.map(it => {
                  const on = it.key === active;
                  return (
                    <Link key={it.l} href={it.href}
                      className={`focus-ring flex items-center gap-2 border-l-2 px-3 py-1 no-underline transition-colors duration-150 ${
                        on ? 'bg-surface-2 font-medium' : 'border-transparent text-ink-muted hover:bg-surface-2/50 hover:text-ink'
                      }`}
                      style={on ? { borderLeftColor: ACCENT } : undefined}>
                      <span aria-hidden className="grid h-5 w-5 shrink-0 place-items-center rounded-[3px] bg-surface-2 text-[10px] ring-1 ring-line"
                        style={on ? { color: ACCENT } : { color: 'rgb(var(--c-ink-soft))' }}>{it.i}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[11.5px]" style={on ? { color: ACCENT } : undefined}>{it.l}</span>
                        <span className="block truncate text-[8.5px] text-ink-muted">{it.s}</span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 border-t border-line px-3 py-2 text-[9px]">
            <div className="text-ink-muted">System</div><div className="text-right" style={{ color: TONE.ok }}>Operational</div>
            <div className="text-ink-muted">Environment</div><div className="truncate text-right text-ink-soft">{nat?.environment ?? 'Production'}</div>
            <div className="text-ink-muted">Version</div><div className="text-right text-ink-soft">v2.1.0</div>
            <div className="text-ink-muted">Channel</div><div className="text-right" style={{ color: TONE.ok }}>Encrypted</div>
          </div>
        </nav>
        <main className="min-w-0 flex-1 overflow-y-auto p-3"
          style={{ backgroundImage: 'linear-gradient(rgba(55,199,212,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(55,199,212,0.02) 1px, transparent 1px)', backgroundSize: '36px 36px' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
