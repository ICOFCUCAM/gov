'use client';

import * as React from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { resolveIdentity } from '@/lib/sovereign-identity';
import { TONE, ACCENT, PALETTE } from '@/components/features/SituationRoom';
import { CommandPalette, type CommandItem, type CommandSearchFn } from '@/components/ui/CommandPalette';
import { substrateSearch } from '@/lib/db/search';
import { ExecutiveMenu } from '@/components/ui/ExecutiveMenu';
import { deployableInstitutions } from '@/lib/institution/readiness';
import { constitutionFor } from '@/lib/gov/constitution';
import { nationalResilience } from '@/lib/gov/national-resilience';
import { subscribe as rtSubscribe, runtimeStats, version as rtVersion } from '@/lib/gov/runtime-store';
import { useFederationSync } from '@/apps/useFederationSync';
import { subscribe as orchSubscribe, orchestrationStats, version as orchVersion } from '@/services/orchestration-engine';
import type { SovereignProfile, NationalSnapshot, NationalCoordination, Ministry } from '@/lib/api/types';

// Adapter from substrate search hits → CommandPalette items.
const substrateSearchAsCommands: CommandSearchFn = async (query) => {
  const hits = await substrateSearch(query);
  return hits.slice(0, 24).map(h => ({
    id: `${h.kind}:${h.id}`,
    label: h.label,
    hint: `${h.ref} · ${h.detail}`,
    group: `Substrate · ${h.kind}`,
    href: h.href,
  }));
};

const RAIL: { g: string; items: { i: string; l: string; s: string; href: string; key: string }[] }[] = [
  { g: 'Sovereign Command', items: [
    { i: '◎', l: 'Situation Room', s: 'Real-time command', href: '/gov/situation-room', key: 'sr' },
    { i: '◆', l: 'Cabinet Intelligence', s: 'Executive command', href: '/gov', key: 'cab' },
    { i: '◈', l: 'National Shell', s: 'Whole-of-government orchestration', href: '/gov/shell', key: 'shell' },
    { i: '⟁', l: 'National Coordination', s: 'Dependency · cascade', href: '/gov/coordination', key: 'coord' },
    { i: '⬡', l: 'Interoperability Fabric', s: 'Whole-of-government mesh', href: '/gov/fabric', key: 'fabric' },
    { i: '◔', l: 'National Simulation', s: 'Scenario · cascade what-if', href: '/gov/simulation', key: 'sim' },
    { i: '◉', l: 'Regional Command', s: 'Provincial posture · readiness', href: '/gov/regional', key: 'reg' },
    { i: '⊞', l: 'Operations Centre', s: 'Cross-institution state', href: '/ops', key: 'ops' },
    { i: '❒', l: 'Operations Ledger', s: 'Executed runtime transitions', href: '/gov/ledger', key: 'ledger' },
    { i: '⛓', l: 'Oversight', s: 'Audit · integrity', href: '/audit', key: 'aud' },
    { i: '⚖', l: 'Branches of Government', s: 'Separation of powers', href: '/gov/branches', key: 'branches' },
  ]},
  { g: 'Substrate', items: [
    { i: '◆', l: 'Officer Home',       s: 'Personal landing for the signed-in officer', href: '/gov/home', key: 'home' },
    { i: '⊕', l: 'Profile',            s: 'Self · signing keys · session',  href: '/gov/me',          key: 'me'          },
    { i: '⌕', l: 'Search',             s: 'Cross-substrate search',     href: '/gov/search',      key: 'search'      },
    { i: '★', l: 'Watchlist',          s: 'Starred records (per device)',href: '/gov/watchlist',   key: 'watchlist'   },
    { i: '⏱', l: 'Cron status',        s: 'Scheduled workers',          href: '/gov/crons',       key: 'crons'       },
    { i: '?', l: 'Help',               s: 'Shortcuts · routes · API',   href: '/gov/help',        key: 'help'        },
    { i: '◊', l: 'System map',         s: 'Substrate flow diagram',     href: '/gov/map',         key: 'map'         },
    { i: '⚛', l: 'Playground',         s: 'REPL for public RPC contracts', href: '/gov/playground', key: 'playground' },
    { i: '◉', l: 'Live Wall',          s: 'Composite operational picture', href: '/gov/live',      key: 'live'        },
    { i: '◐', l: 'Substrate Status',   s: 'Counts · chain integrity',   href: '/gov/substrate',   key: 'substrate'   },
    { i: '▤', l: 'Institutions Catalogue', s: 'Federation registry',     href: '/gov/registry',    key: 'registry'    },
    { i: '◫', l: 'Charters',           s: 'Quick-jump charter list',    href: '/gov/charter',     key: 'charter'     },
    { i: '✦', l: 'Directive Board',    s: 'Draft · sign · rescind',     href: '/gov/directives',  key: 'directives'  },
    { i: '⇨', l: 'Dispatch Board',     s: 'Record · ack · close',       href: '/gov/dispatches',  key: 'dispatches'  },
    { i: '!',  l: 'Escalation Floor',   s: 'Severity-tiered escalations',href: '/gov/escalations', key: 'escalations' },
    { i: '⟐', l: 'Audit Explorer',     s: 'Hash-chained ledger',        href: '/gov/audit',       key: 'audit'       },
    { i: '◰', l: 'Telemetry Wall',     s: 'Streams · samples · alerts', href: '/gov/telemetry',   key: 'telemetry'   },
    { i: '⊡', l: 'Officer Registry',   s: 'Provision officers',         href: '/gov/officers',    key: 'officers'    },
    { i: '☷', l: 'Officer Directory',  s: 'Read-only phone book',       href: '/gov/directory',   key: 'directory'   },
    { i: '⌖', l: 'Posture Board',      s: 'Institutional posture log',  href: '/gov/posture',     key: 'posture'     },
    { i: '⇆', l: 'Federation Stream',  s: 'Inter-institution events',   href: '/gov/federation',  key: 'federation'  },
    { i: '⇣', l: 'Citizen Intake',     s: 'Requests · appeals from citizens', href: '/gov/intake', key: 'intake'  },
    { i: '⇶', l: 'Workflow Catalogue', s: 'Transition rules · stages',  href: '/gov/workflows',   key: 'workflows'   },
    { i: '⎈', l: 'Signature Audit',    s: 'Verify ECDSA signatures',    href: '/gov/signatures',  key: 'signatures'  },
    { i: '⊳', l: 'Officer Workbench',  s: 'Execute on persistent items',href: '/gov/workbench',   key: 'workbench'   },
    { i: '◔', l: 'Notifications',      s: 'Substrate alerts feed',      href: '/gov/alerts',      key: 'alerts'      },
    { i: '∿', l: 'Activity Log',       s: 'Cross-substrate transitions',href: '/gov/activity',    key: 'activity'    },
    { i: '§', l: 'Constitutional desk',s: 'Constitutional channel',     href: '/gov/constitutional', key: 'constitutional' },
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
  const [mins, setMins] = React.useState<Ministry[]>([]);
  const [now, setNow] = React.useState(() => Date.now());
  const [navOpen, setNavOpen] = React.useState(false);

  React.useEffect(() => {
    const load = async () => {
      const [s, n, c, m] = await Promise.all([
        api.sovereign.get().then(r => r.sovereign).catch(() => null),
        api.cabinet.national().catch(() => null),
        api.cabinet.coordination().catch(() => null),
        api.org.ministries().then(r => r.ministries).catch(() => []),
      ]);
      setSov(s); setNat(n); setCoord(c); setMins(m);
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
  const crit = incidents.filter(i => i.severity === 'sev1' || i.severity === 'sev2').length;
  const level = posture?.level ?? 'ok';
  const emergency = level === 'alert' || crit >= 4;
  const accent = emergency ? TONE.alert : ACCENT;
  const railCount: Record<string, number> = {
    sr: incidents.length, coord: incidents.length, ops: t?.queuesBreaching ?? 0,
    cab: crit, sec: Math.round((incidents.length || 0) * 0.6), aud: t?.auditIntact === false ? 1 : 0,
  };

  const resilience = nationalResilience(mins, now / 4000);
  React.useSyncExternalStore(rtSubscribe, rtVersion, rtVersion);
  const liveRt = runtimeStats();
  useFederationSync(mins);
  React.useSyncExternalStore(orchSubscribe, orchVersion, orchVersion);
  const fedStats = orchestrationStats();

  const tele = [
    { l: 'Environment', v: nat?.environment ?? 'Production', t: 'ok', dot: true },
    { l: 'Resilience', v: `${resilience.index} ${resilience.band}`, t: resilience.tone },
    { l: 'Runtime', v: `${liveRt.open} open · ${liveRt.transitions} tx`, t: 'ok' },
    { l: 'Federated apps', v: `${fedStats.activated}/${fedStats.registered}`, t: 'ok' },
    { l: 'Institutions', v: String(t?.institutions ?? 0) },
    { l: 'Active incidents', v: String(incidents.length), t: incidents.length ? 'alert' : 'ok' },
    { l: 'Queues breaching', v: String(t?.queuesBreaching ?? 0), t: (t?.queuesBreaching ?? 0) > 0 ? 'warn' : 'ok' },
    { l: 'National risk', v: posture?.label ?? 'STABLE', t: posture?.level ?? 'ok' },
    { l: 'Audit integrity', v: t?.auditIntact === false ? 'Review' : 'Intact', t: t?.auditIntact === false ? 'alert' : 'ok' },
  ];
  const cmd: CommandItem[] = RAIL.flatMap(g => g.items.map(it => ({ id: it.href + it.l, group: g.g, label: it.l, hint: it.s, href: it.href })));

  return (
    <div className="sov flex h-screen flex-col overflow-hidden font-sans [height:100dvh]" style={{ ...PALETTE, ...(emergency ? { ['--accent' as string]: TONE.alert } : {}) }}>
      <CommandPalette items={cmd} accent={accent} searchFn={substrateSearchAsCommands} />
      {emergency ? (
        <div className="flex shrink-0 items-center justify-between gap-3 px-4 py-1 text-[10px]"
          style={{ backgroundColor: `color-mix(in srgb, ${TONE.alert} 16%, transparent)`, borderBottom: `1px solid ${TONE.alert}` }}>
          <span className="flex items-center gap-2 font-bold uppercase tracking-[0.2em]" style={{ color: TONE.alert }}>
            <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ backgroundColor: TONE.alert }} />
            Elevated national posture · {crit} critical · cabinet coordination advised
          </span>
          <Link href="/gov/coordination" className="focus-ring rounded-[3px] border px-2 py-0.5 uppercase tracking-widest" style={{ borderColor: TONE.alert, color: TONE.alert }}>Coordinate →</Link>
        </div>
      ) : null}
      <header className="flex h-14 shrink-0 items-center gap-4 border-b border-line bg-surface px-4">
        <button type="button" aria-label="Toggle navigation" aria-expanded={navOpen}
          onClick={() => setNavOpen(o => !o)}
          className="focus-ring grid h-9 w-9 shrink-0 place-items-center rounded-[3px] border border-line text-ink-soft lg:hidden">
          <span className="text-base leading-none">{navOpen ? '✕' : '☰'}</span>
        </button>
        <Link href="/" className="focus-ring flex items-center gap-2.5 no-underline">
          <span aria-hidden className="grid h-9 w-9 place-items-center rounded-[3px] text-sm font-bold text-white ring-1 ring-white/15" style={{ backgroundColor: accent }}>
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
          <span className="hidden items-center gap-1.5 rounded-[3px] border px-2 py-1 text-[10px] sm:flex"
            style={{ borderColor: emergency ? TONE.alert : 'rgb(var(--c-line))', color: emergency ? TONE.alert : 'rgb(var(--c-ink-soft))' }}>
            <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ backgroundColor: TONE[level] }} />
            {posture?.label ?? 'STABLE'}
          </span>
          <span className="relative grid h-7 w-7 place-items-center rounded-[3px] border border-line text-[12px] text-ink-soft" title={`${incidents.length} active incidents`}>
            ⌁
            {incidents.length ? <span className="absolute -right-1 -top-1 grid h-3.5 min-w-[14px] place-items-center rounded-full px-0.5 text-[8px] font-bold text-white" style={{ backgroundColor: TONE.alert }}>{incidents.length}</span> : null}
          </span>
          <span className="hidden font-mono text-xs tabular-nums text-ink-muted sm:inline">{new Date(now).toLocaleTimeString()}</span>
          <span className="hidden items-center gap-1.5 rounded-[3px] border border-line px-2 py-1 text-[10px] text-ink-soft sm:flex"><span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: TONE.ok }} /> Encrypted</span>
          <span className="border-l border-line pl-3">
            <ExecutiveMenu title={sov?.executiveTitle ?? 'Head of Government'} sub="National Executive" accent={accent} />
          </span>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {navOpen ? <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setNavOpen(false)} aria-hidden /> : null}
        <nav aria-label="Sovereign command"
          className={`${navOpen ? 'flex' : 'hidden'} fixed inset-y-0 left-0 z-40 w-[240px] flex-col border-r border-line bg-bg lg:static lg:z-auto lg:flex lg:w-[212px]`}>
          <div className="flex-1 overflow-y-auto py-1" onClick={() => setNavOpen(false)}>
            {RAIL.map(grp => (
              <div key={grp.g} className="mb-0.5">
                <div className="px-3 pb-0.5 pt-2 text-[8px] font-semibold uppercase tracking-[0.18em] text-ink-muted">{grp.g}</div>
                {grp.items.map(it => {
                  const on = it.key === active;
                  const n = railCount[it.key] ?? 0;
                  return (
                    <Link key={it.l} href={it.href}
                      className={`focus-ring flex items-center gap-2 border-l-2 px-3 py-1 no-underline transition-colors duration-150 ${
                        on ? 'bg-surface-2 font-medium' : 'border-transparent text-ink-muted hover:bg-surface-2/50 hover:text-ink'
                      }`}
                      style={on ? { borderLeftColor: accent } : undefined}>
                      <span aria-hidden className="relative grid h-5 w-5 shrink-0 place-items-center rounded-[3px] bg-surface-2 text-[10px] ring-1 ring-line"
                        style={on ? { color: accent } : { color: 'rgb(var(--c-ink-soft))' }}>
                        {it.i}
                        {n > 0 ? <span className="absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: n >= 4 ? TONE.alert : TONE.warn }} /> : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1 truncate text-[11.5px]" style={on ? { color: accent } : undefined}>
                          {it.l}
                          {on ? <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ backgroundColor: accent }} /> : null}
                        </span>
                        <span className="block truncate text-[8.5px] text-ink-muted">{it.s}</span>
                      </span>
                      {n > 0 ? <span className="shrink-0 rounded-[3px] px-1 text-[8px] font-bold tabular-nums" style={{ backgroundColor: `color-mix(in srgb, ${n >= 4 ? TONE.alert : TONE.warn} 20%, transparent)`, color: n >= 4 ? TONE.alert : TONE.warn }}>{n}</span> : null}
                    </Link>
                  );
                })}
              </div>
            ))}
            {(() => {
              const cm = constitutionFor(sov?.stateForm ?? 'republic');
              return (
                <div className="mb-0.5">
                  <div className="px-3 pb-0.5 pt-2 text-[8px] font-semibold uppercase tracking-[0.18em] text-ink-muted">Constitutional Branches · {cm.label}</div>
                  {cm.branches.map(br => (
                    <Link key={br.key} href={`/gov/branch/${br.key}`}
                      className="focus-ring flex items-center gap-2 border-l-2 border-transparent px-3 py-1 text-ink-muted no-underline transition-colors duration-150 hover:bg-surface-2/50 hover:text-ink">
                      <span aria-hidden className="grid h-5 w-5 shrink-0 place-items-center rounded-[3px] bg-surface-2 text-[10px] ring-1 ring-line">⚖</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[11.5px]">{br.name}</span>
                        <span className="block truncate text-[8.5px] text-ink-muted">{br.mandate.split(' · ')[0]}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              );
            })()}
            {(() => {
              const dir = deployableInstitutions(mins);
              if (dir.length === 0) return null;
              return (
                <div className="mb-0.5">
                  <div className="px-3 pb-0.5 pt-2 text-[8px] font-semibold uppercase tracking-[0.18em] text-ink-muted">Active Institutions · {dir.length}</div>
                  {dir.map(({ ministry: m, readiness: r }) => {
                    const c = r.deployable ? TONE.ok : TONE.warn;
                    return (
                      <Link key={m.id} href={`/gov/ministry/${m.id}`}
                        className="focus-ring flex items-center gap-2 border-l-2 border-transparent px-3 py-1 text-ink-muted no-underline transition-colors duration-150 hover:bg-surface-2/50 hover:text-ink">
                        <span aria-hidden className="grid h-5 w-5 shrink-0 place-items-center rounded-[3px] bg-surface-2 text-[10px] ring-1 ring-line" style={{ color: c }}>▣</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[11.5px]">{m.name}</span>
                          <span className="block truncate text-[8.5px] text-ink-muted">{m.archetype} · {r.total}% ready</span>
                        </span>
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: c }} />
                      </Link>
                    );
                  })}
                </div>
              );
            })()}
          </div>
          <div className="border-t border-line px-3 py-2">
            <div className="mb-1.5 flex items-end gap-0.5" aria-hidden title="Operational pulse">
              {Array.from({ length: 24 }).map((_, i) => (
                <span key={i} className="flex-1 animate-breathe rounded-sm"
                  style={{ height: `${4 + ((Math.sin(i * 1.7 + Math.floor(now / 1000)) + 1) / 2) * 12}px`, backgroundColor: TONE[level], animationDelay: `${i * 70}ms`, opacity: 0.55 }} />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[9px]">
              <div className="text-ink-muted">Posture</div><div className="truncate text-right font-mono" style={{ color: TONE[level] }}>{posture?.label ?? 'STABLE'}</div>
              <div className="text-ink-muted">Incidents</div><div className="text-right font-mono" style={{ color: incidents.length ? TONE.alert : TONE.ok }}>{incidents.length}</div>
              <div className="text-ink-muted">Environment</div><div className="truncate text-right text-ink-soft">{nat?.environment ?? 'Production'}</div>
              <div className="text-ink-muted">Channel</div><div className="text-right" style={{ color: TONE.ok }}>Encrypted</div>
            </div>
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
