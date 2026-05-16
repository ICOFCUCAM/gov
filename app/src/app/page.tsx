'use client';

import * as React from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { resolveIdentity } from '@/lib/sovereign-identity';
import { TONE, ACCENT, PALETTE, seed, Spark, waveSeries } from '@/components/features/SituationRoom';
import { WorldMap } from '@/components/ui/WorldMap';
import { CommandPalette, type CommandItem } from '@/components/ui/CommandPalette';
import { ExecutiveMenu } from '@/components/ui/ExecutiveMenu';
import { deployableInstitutions, LIFECYCLE_LABEL } from '@/lib/institution/readiness';
import { subsystemsFor, subsystemHealth } from '@/lib/institution/operational-catalog';
import { BRANCHES, branchReadiness, separationIntegrity } from '@/lib/gov/branches';
import type { SovereignProfile, NationalSnapshot, NationalCoordination, Ministry } from '@/lib/api/types';

const RAIL: { g: string; items: { i: string; l: string; s: string; href: string; live?: boolean }[] }[] = [
  { g: 'Sovereign Command', items: [
    { i: '◎', l: 'National Situation Room', s: 'Real-time command & coordination', href: '/gov/situation-room', live: true },
    { i: '◆', l: 'National Shell', s: 'Whole-of-government environment', href: '/gov' },
    { i: '⟁', l: 'National Coordination', s: 'Dependency · cascade · live tempo', href: '/gov/coordination', live: true },
    { i: '⊞', l: 'Operations Centre', s: 'Cross-institution operational state', href: '/ops' },
    { i: '⛓', l: 'Oversight', s: 'Audit · integrity · assurance', href: '/audit' },
  ]},
  { g: 'Institutional Admin', items: [
    { i: '▦', l: 'Institutions Admin', s: 'Compose ministries', href: '/ministries' },
    { i: '⚙', l: 'Platform Operations', s: 'Releases · tenancy · backups', href: '/platform' },
    { i: '⇄', l: 'Interoperability', s: 'Federation · webhooks · clients', href: '/integrations' },
    { i: '⌘', l: 'Developer Guide', s: 'API · SDK · integration', href: '/developers' },
  ]},
  { g: 'Public Service', items: [
    { i: '◊', l: 'Civic Wallet', s: 'Citizen services & records', href: '/wallet' },
    { i: '⊟', l: 'Officer Console', s: 'Decide · sign · review', href: '/console' },
    { i: '▣', l: 'Ministry Control', s: 'Daily operational control room', href: '/control' },
    { i: '◉', l: 'NCCC Wall', s: 'National coordination wall', href: '/wall' },
  ]},
  { g: 'Foundational Services', items: [
    { i: '⊕', l: 'Sign-in', s: 'Identity & access', href: '/login' },
    { i: '▤', l: 'Permits', s: 'Licensing & approvals', href: '/wallet/permits' },
    { i: '$', l: 'Payments', s: 'Receipts & reconciliation', href: '/wallet/payments' },
    { i: '✦', l: 'Verify Document', s: 'Tamper-evident verification', href: '/wallet/documents' },
    { i: '⊞', l: 'Municipal Onboarding', s: 'Tenant provisioning', href: '/admin/onboarding' },
  ]},
];

function Mini({ kind, tone, focus }: { kind: 'map' | 'graph' | 'net' | 'ring' | 'shield'; tone: string; focus?: string }) {
  if (kind === 'graph') return <Spark pts={Array.from({ length: 18 }).map((_, i) => 30 + seed(`mn:${kind}:${i}`) * 60)} tone={tone} />;
  if (kind === 'map') return (
    <div className="relative h-11 w-full overflow-hidden rounded-[3px] border border-line-soft"
      style={{ background: 'radial-gradient(ellipse at 50% 40%, rgba(55,199,212,0.10) 0%, rgb(var(--c-bg)) 75%)' }}>
      <WorldMap focus={focus} />
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {[[34, 40], [58, 30], [78, 52], [50, 64]].map(([x, y], i) => (
          <span key={i} className="absolute h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ left: `${x}%`, top: `${y}%`, backgroundColor: TONE[i === 0 ? 'alert' : 'ok'], boxShadow: `0 0 5px ${TONE[i === 0 ? 'alert' : 'ok']}` }} />
        ))}
        <span className="absolute right-1 top-1 rounded-[2px] px-1 text-[7px] font-bold tracking-widest" style={{ color: ACCENT }}>LIVE</span>
      </div>
    </div>
  );
  if (kind === 'net') return (
    <svg viewBox="0 0 120 44" className="h-11 w-full">
      {[[20, 22, 60, 12], [60, 12, 100, 24], [60, 12, 60, 36], [20, 22, 60, 36]].map(([a, b, c, d], i) => <line key={i} x1={a} y1={b} x2={c} y2={d} stroke={TONE[tone]} strokeOpacity="0.4" strokeWidth="0.8" />)}
      {[[20, 22], [60, 12], [100, 24], [60, 36]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3" fill={TONE[i === 1 ? 'warn' : tone]} />)}
    </svg>
  );
  if (kind === 'ring') return (
    <svg viewBox="0 0 44 44" className="h-11 w-11">
      <circle cx="22" cy="22" r="16" fill="none" stroke="rgb(var(--c-surface-2))" strokeWidth="4" />
      <circle cx="22" cy="22" r="16" fill="none" stroke={TONE[tone]} strokeWidth="4" strokeLinecap="round" strokeDasharray="78 100" transform="rotate(-90 22 22)" />
    </svg>
  );
  return (
    <svg viewBox="0 0 44 44" className="h-11 w-11">
      <path d="M22 6 L36 12 V24 C36 33 30 38 22 40 C14 38 8 33 8 24 V12 Z" fill={TONE[tone]} fillOpacity="0.14" stroke={TONE[tone]} strokeOpacity="0.5" strokeWidth="1.4" />
    </svg>
  );
}

export default function SovereignCommandCenter() {
  const [sov, setSov] = React.useState<SovereignProfile | null>(null);
  const [mins, setMins] = React.useState<Ministry[]>([]);
  const [nat, setNat] = React.useState<NationalSnapshot | null>(null);
  const [coord, setCoord] = React.useState<NationalCoordination | null>(null);
  const [now, setNow] = React.useState(() => Date.now());

  React.useEffect(() => {
    const load = async () => {
      const [s, n, c, m] = await Promise.all([
        api.sovereign.get().then(r => r.sovereign).catch(() => null),
        api.cabinet.national().catch(() => null),
        api.cabinet.coordination().catch(() => null),
        api.org.ministries().then(r => r.ministries).catch(() => [] as Ministry[]),
      ]);
      setSov(s); setNat(n); setCoord(c); setMins(m);
    };
    void load();
    const poll = setInterval(() => void load(), 12_000);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => { clearInterval(poll); clearInterval(tick); };
  }, []);

  const identity = sov ? resolveIdentity(sov) : null;
  const posture = coord?.posture;
  const t = nat?.totals;
  const incidents = nat?.crossMinistryIncidents ?? [];
  const sev = (s: string) => incidents.filter(i => i.severity === s).length;
  const epoch = Math.floor((coord?.tick ?? 0) / 2);
  const riskLabel = posture ? posture.label : 'STABLE';
  const readiness = posture?.level === 'alert' ? 'CRITICAL' : posture?.level === 'warn' ? 'ELEVATED' : 'OPERATIONAL';

  const tele = [
    { l: 'Executive environment', v: nat?.environment ?? 'Production', t: 'ok', dot: true },
    { l: 'Institutions', v: String(t?.institutions ?? 248) },
    { l: 'Active incidents', v: String(incidents.length || sev('sev1') + sev('sev2')), t: incidents.length ? 'alert' : 'ok' },
    { l: 'Queues breaching', v: String(t?.queuesBreaching ?? 14), t: 'warn' },
    { l: 'National risk', v: riskLabel, t: posture?.level ?? 'ok' },
    { l: 'Audit integrity', v: t?.auditIntact === false ? 'Review' : 'Intact', t: t?.auditIntact === false ? 'alert' : 'ok' },
  ];

  const surfaces = [
    { l: 'National Situation Room', s: 'Flagship real-time command & coordination', href: '/gov/situation-room', cta: 'Enter Situation Room', mini: 'map' as const, badge: 'LIVE', tone: 'alert' },
    { l: 'National Shell', s: 'Whole-of-government command environment', href: '/gov', cta: 'Enter National Shell', mini: 'shield' as const, badge: 'Core', tone: 'ok' },
    { l: 'National Coordination', s: 'Dependency · cascade · live tempo', href: '/gov/coordination', cta: 'Enter Coordination', mini: 'net' as const, badge: 'LIVE', tone: 'warn' },
    { l: 'Operations Centre', s: 'Cross-institution operational state', href: '/ops', cta: 'Enter Operations Centre', mini: 'graph' as const, badge: '', tone: 'ok' },
    { l: 'Oversight', s: 'Read-only, tamper-evident audit chain', href: '/audit', cta: 'Enter Oversight', mini: 'ring' as const, badge: 'Audit', tone: 'ok' },
  ];
  const instAdmin = [
    { l: 'Institutions Admin', s: 'Compose ministries from archetypes', href: '/ministries', cta: 'Manage Institutions' },
    { l: 'Platform Operations', s: 'Releases · Tenancy · Backups · Config', href: '/platform', cta: 'Platform Operations' },
    { l: 'Interoperability', s: 'Federation · Webhooks · Clients', href: '/integrations', cta: 'View Integrations' },
    { l: 'Developer Guide', s: 'API · SDK · Integration surface', href: '/developers', cta: 'Developer Center' },
  ];
  const pubSvc = [
    { l: 'Civic Wallet', s: 'Citizen services & records', href: '/wallet', cta: 'Open Wallet' },
    { l: 'Officer Console', s: 'Decide · Sign · Review', href: '/console', cta: 'Open Console' },
    { l: 'Ministry Control', s: 'Daily operational control room', href: '/control', cta: 'Open Control Room' },
    { l: 'NCCC Wall', s: 'National coordination wall', href: '/wall', cta: 'Open NCCC Wall' },
  ];
  const phase1 = [
    { i: '⊕', l: 'Sign-in', s: 'Identity & Access', href: '/login' },
    { i: '▤', l: 'Permits', s: 'Licensing & Approvals', href: '/wallet/permits' },
    { i: '$', l: 'Payments', s: 'Receipts & Reconciliation', href: '/wallet/payments' },
    { i: '✦', l: 'Verify Document', s: 'Tamper-evident verification', href: '/wallet/documents' },
    { i: '⊞', l: 'Municipal Onboarding', s: 'Tenant provisioning', href: '/admin/onboarding' },
  ];
  const brief = [
    `National stability: ${posture && posture.level !== 'ok' ? 'Elevated' : 'Stable'}`,
    `${sev('sev1')} critical escalations require attention`,
    'Energy sector pressure in Northern Corridor',
    `Healthcare capacity at ${74 + (epoch % 8)}%`,
    'Treasury liquidity adequate for 28 days',
  ];
  const integ = ['Health', 'Treasury', 'Transport', 'Security', 'Energy', 'Emergency Comms', 'National Registry']
    .map((s, i) => ({ s, p: (98 + seed(`ig:${i}:${epoch}`) * 1.9) }));
  const rev = waveSeries('home:rev', now / 4000, 20, 70, 120);
  const exp = waveSeries('home:exp', now / 4000, 20, 60, 100);

  const cmd: CommandItem[] = [
    ...RAIL.flatMap(g => g.items.map(it => ({ id: it.href + it.l, group: g.g, label: it.l, hint: it.s, href: it.href }))),
  ];

  return (
    <div className="sov flex h-screen flex-col overflow-hidden font-sans [height:100dvh]"
      style={{ ...PALETTE, ['--c-bg' as string]: '5 7 11' }}>
      <CommandPalette items={cmd} accent={ACCENT} />

      {/* Top telemetry strip */}
      <header className="flex h-14 shrink-0 items-center gap-4 border-b border-line bg-surface px-4">
        <Link href="/" className="focus-ring flex items-center gap-2.5 no-underline">
          <span aria-hidden className="grid h-9 w-9 place-items-center rounded-sm text-sm font-bold text-white ring-1 ring-white/15" style={{ backgroundColor: ACCENT }}>
            {identity ? identity.seal : 'CO'}
          </span>
          <span className="leading-tight">
            <span className="flex items-center gap-1.5 text-sm font-bold tracking-[0.18em] text-ink">CIVICOS
              <span className="rounded-sm border border-line px-1 text-[8px] font-semibold tracking-[0.2em] text-ink-soft">OFFICIAL</span>
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
          <span className="hidden font-mono text-xs tabular-nums text-ink-muted sm:inline">{new Date(now).toLocaleTimeString()}<span className="ml-1 text-[9px] text-ink-muted">UTC+3</span></span>
          <span className="hidden items-center gap-1.5 rounded-sm border border-line px-2 py-1 text-[10px] text-ink-soft sm:flex"><span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: TONE.ok }} /> Secure Comms</span>
          <span className="relative grid h-7 w-7 place-items-center rounded-sm text-ink-soft" title="Notifications">⌁<span className="absolute -right-0.5 -top-0.5 grid h-3.5 w-3.5 place-items-center rounded-full text-[8px] text-white" style={{ backgroundColor: TONE.alert }}>{incidents.length || 7}</span></span>
          <span className="border-l border-line pl-3">
            <ExecutiveMenu title={sov?.executiveTitle ?? 'Head of Government'} sub="National Executive" accent={ACCENT} />
          </span>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Command rail */}
        <nav aria-label="Sovereign command" className="hidden w-[228px] shrink-0 flex-col border-r border-line bg-bg xl:flex">
          <div className="flex-1 overflow-y-auto py-2">
            {RAIL.map(grp => (
              <div key={grp.g} className="mb-1">
                <div className="px-4 pb-1 pt-3 text-[9px] font-semibold uppercase tracking-[0.18em] text-ink-muted">{grp.g}</div>
                {grp.items.map(it => (
                  <Link key={it.l} href={it.href} className="focus-ring flex items-center gap-2.5 border-l-2 border-transparent px-4 py-1.5 no-underline transition-colors duration-150 hover:bg-surface-2/50">
                    <span aria-hidden className="grid h-6 w-6 shrink-0 place-items-center rounded-[5px] bg-surface-2 text-[11px] text-ink-soft ring-1 ring-line">{it.i}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1 text-[12px] text-ink">{it.l}{it.live ? <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: TONE.ok }} /> : null}</span>
                      <span className="block truncate text-[9px] text-ink-muted">{it.s}</span>
                    </span>
                  </Link>
                ))}
              </div>
            ))}
          </div>
          <Link href="/gov" className="focus-ring m-3 flex items-center gap-2 rounded-[3px] border px-3 py-2 text-left text-xs no-underline" style={{ borderColor: TONE.alert, backgroundColor: `color-mix(in srgb, ${TONE.alert} 12%, transparent)` }}>
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: TONE.alert }} />
            <span><span className="block font-semibold uppercase tracking-widest" style={{ color: TONE.alert }}>Command Mode</span><span className="block text-ink-muted">War Room</span></span>
          </Link>
          <div className="border-t border-line px-4 py-2.5 text-[10px] leading-relaxed">
            <div className="flex justify-between"><span className="uppercase tracking-widest text-ink-muted">System</span><span style={{ color: TONE.ok }}>Operational</span></div>
            <div className="flex justify-between"><span className="uppercase tracking-widest text-ink-muted">Environment</span><span className="text-ink-soft">{nat?.environment ?? 'Production'}</span></div>
            <div className="flex justify-between"><span className="uppercase tracking-widest text-ink-muted">Version</span><span className="text-ink-soft">v2.1.0</span></div>
            <div className="mt-1 text-ink-muted">© 2025 CivicOS</div>
          </div>
        </nav>

        {/* Main command canvas */}
        <main className="min-w-0 flex-1 space-y-3 overflow-y-auto p-3"
          style={{ backgroundImage: 'linear-gradient(rgba(55,199,212,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(55,199,212,0.025) 1px, transparent 1px)', backgroundSize: '38px 38px' }}>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.16em] text-ink-muted">Welcome back, {sov?.executiveTitle ?? 'Head of Government'}.</div>
              <h1 className="text-2xl font-semibold tracking-tight text-ink">Sovereign Command Center</h1>
              <p className="text-xs text-ink-muted">One coherent platform for institutional operation, citizen service, and whole-of-government coordination.</p>
            </div>
          </div>

          {/* Posture + readiness */}
          <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
            <div className="flex items-center gap-5 rounded-[3px] border border-line bg-surface px-4 py-3">
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-sm" style={{ backgroundColor: `color-mix(in srgb, ${TONE[posture?.level ?? 'ok']} 18%, transparent)`, color: TONE[posture?.level ?? 'ok'] }}>⛨</span>
                <div><div className="text-[9px] uppercase tracking-[0.16em] text-ink-muted">Executive posture</div><div className="text-lg font-semibold" style={{ color: TONE[posture?.level ?? 'ok'] }}>{riskLabel}</div></div>
              </div>
              <p className="max-w-md text-xs text-ink-muted">National posture is {riskLabel.toLowerCase()} due to active incidents and regional pressures. <Link href="/gov" className="text-link underline underline-offset-2">View executive briefing →</Link></p>
              <div className="ml-auto text-right">
                <div className="text-[9px] uppercase tracking-[0.16em] text-ink-muted">Readiness status</div>
                <div className="font-semibold" style={{ color: TONE[readiness === 'CRITICAL' ? 'alert' : readiness === 'ELEVATED' ? 'warn' : 'ok'] }}>{readiness}</div>
              </div>
              <div className="hidden w-40 sm:block"><Spark pts={waveSeries('home:pst', now / 4000, 22, 40, 90)} tone="ok" /></div>
            </div>
          </div>

          {/* Sovereign command surfaces */}
          <Section label="Sovereign Command Surfaces">
            <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-5">
              {surfaces.map(c => (
                <Link key={c.l} href={c.href} className="focus-ring group flex flex-col rounded-[3px] border border-line bg-surface p-3 no-underline transition-all duration-200 hover:-translate-y-0.5 hover:border-link/40 hover:shadow-elev-2">
                  <div className="flex items-start justify-between">
                    <span className="text-[13px] font-semibold text-ink">{c.l}</span>
                    {c.badge ? <span className="rounded px-1 py-0.5 text-[8px] font-bold uppercase tracking-wider" style={{ backgroundColor: `color-mix(in srgb, ${TONE[c.tone]} 18%, transparent)`, color: TONE[c.tone] }}>{c.badge}</span> : null}
                  </div>
                  <span className="mt-0.5 text-[10px] leading-snug text-ink-muted">{c.s}</span>
                  <div className="my-2 flex-1"><Mini kind={c.mini} tone={c.tone} focus={sov?.stateName} /></div>
                  <span className="flex items-center justify-between border-t border-line pt-2 text-[11px]" style={{ color: ACCENT }}>{c.cta}<span className="transition-transform group-hover:translate-x-0.5">→</span></span>
                </Link>
              ))}
            </div>
          </Section>

          <Section label="Constitutional Posture · Separation of Powers">
            {(() => {
              const t = now / 4000;
              const sep = separationIntegrity(t);
              const cells = BRANCHES.map(b => {
                const r = branchReadiness(b.key, t);
                return { l: b.name, v: `${r.total}% · ${r.posture}`, c: r.total >= 85 ? 'rgb(var(--c-ok))' : r.total >= 65 ? 'rgb(var(--c-warn))' : 'rgb(var(--c-alert))', href: b.key === 'legislature' ? '/gov/legislature' : b.key === 'judiciary' ? '/gov/judiciary' : b.key === 'oversight' ? '/audit' : '/gov' };
              });
              return (
                <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[3px] border border-line bg-line text-[10px] sm:grid-cols-3 md:grid-cols-5">
                  {cells.map(s => (
                    <Link key={s.l} href={s.href} className="focus-ring flex items-center justify-between gap-2 bg-surface px-3 py-1.5 no-underline transition-colors hover:bg-surface-2/50">
                      <span className="uppercase tracking-[0.14em] text-ink-muted">{s.l}</span>
                      <span className="font-mono font-semibold tabular-nums" style={{ color: s.c }}>{s.v}</span>
                    </Link>
                  ))}
                  <div className="flex items-center justify-between gap-2 bg-surface px-3 py-1.5">
                    <span className="uppercase tracking-[0.14em] text-ink-muted">Separation</span>
                    <span className="flex items-center gap-1.5 font-mono font-semibold tabular-nums" style={{ color: sep.intact ? 'rgb(var(--c-ok))' : 'rgb(var(--c-alert))' }}>
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ backgroundColor: sep.intact ? 'rgb(var(--c-ok))' : 'rgb(var(--c-alert))' }} />
                      {sep.intact ? 'INTACT' : 'STRAINED'}
                    </span>
                  </div>
                </div>
              );
            })()}
          </Section>

          <Section label="Activated Institutions · Deployment Directory">
            {(() => {
              const dir = deployableInstitutions(mins);
              if (dir.length === 0) {
                return (
                  <div className="rounded-[3px] border border-line bg-surface px-3 py-4 text-center text-[11px] text-ink-muted">
                    No institutions activated yet. Compose one from a sovereign archetype in{' '}
                    <Link href="/ministries" className="text-link underline underline-offset-2">Institutions Admin</Link> — activated institutions are listed here for deployment.
                  </div>
                );
              }
              const deployable = dir.filter(d => d.readiness.deployable).length;
              const meanReady = Math.round(dir.reduce((a, d) => a + d.readiness.total, 0) / dir.length);
              const subsClasses = dir.reduce((a, d) => a + subsystemsFor(d.ministry.archetype).length, 0);
              const meanSsHealth = Math.round(dir.reduce((a, d) => a + subsystemHealth(d.ministry.id, d.ministry.archetype), 0) / dir.length);
              const crisisCapable = dir.filter(d => d.readiness.lifecycle === 'crisis-capable').length;
              const roll = [
                { l: 'Active institutions', v: String(dir.length), c: 'rgb(var(--c-ink))' },
                { l: 'Deployable', v: `${deployable}/${dir.length}`, c: deployable === dir.length ? 'rgb(var(--c-ok))' : 'rgb(var(--c-warn))' },
                { l: 'Mean readiness', v: `${meanReady}%`, c: meanReady >= 70 ? 'rgb(var(--c-ok))' : 'rgb(var(--c-warn))' },
                { l: 'Subsystem classes', v: String(subsClasses), c: 'rgb(var(--c-ink))' },
                { l: 'Mean subsystem health', v: `${meanSsHealth}%`, c: meanSsHealth >= 85 ? 'rgb(var(--c-ok))' : meanSsHealth >= 70 ? 'rgb(var(--c-warn))' : 'rgb(var(--c-alert))' },
                { l: 'Crisis-capable', v: String(crisisCapable), c: 'rgb(var(--c-ok))' },
              ];
              return (
                <div className="space-y-2.5">
                <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[3px] border border-line bg-line text-[10px] sm:grid-cols-3 md:grid-cols-6">
                  {roll.map(s => (
                    <div key={s.l} className="flex items-center justify-between gap-2 bg-surface px-3 py-1.5">
                      <span className="uppercase tracking-[0.14em] text-ink-muted">{s.l}</span>
                      <span className="font-mono font-semibold tabular-nums" style={{ color: s.c }}>{s.v}</span>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-5">
                  {dir.map(({ ministry: m, readiness: r }) => {
                    const tn = r.deployable ? TONE.ok : TONE.warn;
                    return (
                      <Link key={m.id} href={`/gov/ministry/${m.id}`}
                        className="focus-ring group flex flex-col rounded-[3px] border border-line bg-surface p-3 no-underline transition-all duration-200 hover:-translate-y-0.5 hover:border-link/40 hover:shadow-elev-2">
                        <div className="flex items-start justify-between gap-2">
                          <span className="min-w-0 truncate text-[13px] font-semibold text-ink">{m.name}</span>
                          <span className="shrink-0 rounded-[3px] px-1 py-0.5 text-[8px] font-bold uppercase tracking-wider" style={{ backgroundColor: `color-mix(in srgb, ${tn} 18%, transparent)`, color: tn }}>
                            {r.deployable ? 'Deployable' : 'Incomplete'}
                          </span>
                        </div>
                        <span className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-ink-muted">{m.archetype} · {LIFECYCLE_LABEL[r.lifecycle]}</span>
                        <div className="mt-2 flex items-center gap-2">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                            <div className="h-full rounded-full transition-all duration-700 ease-sov" style={{ width: `${r.total}%`, backgroundColor: tn }} />
                          </div>
                          <span className="font-mono text-[11px] tabular-nums" style={{ color: tn }}>{r.total}%</span>
                        </div>
                        <div className="mt-2 flex-1 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[9px]">
                          {r.dimensions.slice(0, 6).map(d => (
                            <React.Fragment key={d.key}>
                              <span className="truncate text-ink-muted">{d.label.split(' ')[0]}</span>
                              <span className="text-right font-mono tabular-nums" style={{ color: d.score >= 70 ? TONE.ok : d.score >= 40 ? TONE.warn : TONE.alert }}>{d.score}</span>
                            </React.Fragment>
                          ))}
                        </div>
                        <span className="mt-2 flex items-center justify-between border-t border-line pt-2 text-[11px]" style={{ color: ACCENT }}>
                          Enter workspace<span className="transition-transform group-hover:translate-x-0.5">→</span>
                        </span>
                      </Link>
                    );
                  })}
                </div>
                </div>
              );
            })()}
          </Section>

          <Section label="Institutional Administration">
            <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
              {instAdmin.map(c => (
                <Link key={c.l} href={c.href} className="focus-ring group flex items-center justify-between rounded-[3px] border border-line bg-surface px-3 py-2.5 no-underline transition-colors hover:border-link/40">
                  <span className="min-w-0"><span className="block text-[13px] font-semibold text-ink">{c.l}</span><span className="block truncate text-[10px] text-ink-muted">{c.s}</span><span className="text-[11px]" style={{ color: ACCENT }}>{c.cta} →</span></span>
                </Link>
              ))}
            </div>
          </Section>

          <Section label="Public Service Surfaces">
            <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
              {pubSvc.map(c => (
                <Link key={c.l} href={c.href} className="focus-ring group flex items-center justify-between rounded-[3px] border border-line bg-surface px-3 py-2.5 no-underline transition-colors hover:border-link/40">
                  <span className="min-w-0"><span className="block text-[13px] font-semibold text-ink">{c.l}</span><span className="block truncate text-[10px] text-ink-muted">{c.s}</span><span className="text-[11px]" style={{ color: ACCENT }}>{c.cta} →</span></span>
                  <span className="ml-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: TONE.ok }} />
                </Link>
              ))}
            </div>
          </Section>

          <Section label="Phase 1 — Foundational Services">
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-5">
              {phase1.map(c => (
                <Link key={c.l} href={c.href} className="focus-ring flex items-center gap-2.5 rounded-[3px] border border-line bg-surface px-3 py-2.5 no-underline transition-colors hover:border-link/40">
                  <span aria-hidden className="grid h-7 w-7 shrink-0 place-items-center rounded-[5px] bg-surface-2 text-[11px] text-ink-soft ring-1 ring-line">{c.i}</span>
                  <span className="min-w-0"><span className="block text-[12px] font-medium text-ink">{c.l}</span><span className="block truncate text-[9px] text-ink-muted">{c.s}</span></span>
                </Link>
              ))}
            </div>
          </Section>

          {/* Bottom status strip */}
          <div className="flex flex-wrap items-center gap-x-8 gap-y-1 rounded-[3px] border border-line bg-surface px-4 py-2 text-[10px]">
            {[
              { l: 'Classification', v: 'OFFICIAL', t: ACCENT },
              { l: 'National readiness', v: readiness, t: TONE[readiness === 'CRITICAL' ? 'alert' : readiness === 'ELEVATED' ? 'warn' : 'ok'] },
              { l: 'Cabinet posture', v: 'Active', t: TONE.ok },
              { l: 'Last sync', v: new Date(now).toLocaleTimeString(), t: 'rgb(var(--c-ink-soft))' },
              { l: 'Secure channel', v: 'Encrypted', t: TONE.ok },
            ].map(s => (
              <span key={s.l} className="flex items-center gap-2">
                <span className="uppercase tracking-[0.16em] text-ink-muted">{s.l}</span>
                <span className="font-mono font-semibold tabular-nums" style={{ color: s.t }}>{s.v}</span>
              </span>
            ))}
            <span className="ml-auto flex items-center gap-1.5 text-ink-muted"><span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ backgroundColor: TONE.ok }} /> LIVE</span>
          </div>
        </main>

        {/* Right intelligence column */}
        <aside className="hidden w-[300px] shrink-0 flex-col gap-3 overflow-y-auto border-l border-line bg-bg p-3 2xl:flex">
          <Panel label="Executive Briefing (Morning)" meta="Updated live">
            <ul className="space-y-1.5 text-[11px] leading-snug">
              {brief.map((b, i) => <li key={i} className="flex gap-1.5"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full" style={{ backgroundColor: ACCENT }} /><span className="text-ink-soft">{b}</span></li>)}
            </ul>
            <Link href="/gov" className="focus-ring mt-2 inline-block text-[11px] text-link underline underline-offset-2">Read full briefing →</Link>
          </Panel>

          <Panel label={`Active Incidents (${incidents.length})`} meta={<Link href="/gov/coordination" className="text-link underline">View all</Link>}>
            {incidents.length === 0 ? <p className="text-[11px] text-ink-muted">No active escalations.</p> : incidents.slice(0, 5).map((c, i) => {
              const tn = c.severity === 'sev1' ? 'alert' : c.severity === 'sev2' ? 'warn' : c.severity === 'sev3' ? 'warn' : 'neutral';
              const lbl = c.severity === 'sev1' ? 'CRITICAL' : c.severity === 'sev2' ? 'ELEVATED' : c.severity === 'sev3' ? 'ELEVATED' : 'WATCH';
              return (
                <Link key={i} href={`/gov/ministry/${c.ministryId}`} className="focus-ring block border-b border-line-soft py-2 no-underline last:border-0" style={{ borderLeft: `3px solid ${TONE[tn]}`, paddingLeft: 8 }}>
                  <div className="flex items-center justify-between">
                    <span className="rounded px-1 text-[8px] font-bold tracking-wider" style={{ backgroundColor: `color-mix(in srgb, ${TONE[tn]} 20%, transparent)`, color: TONE[tn] }}>{c.severity === 'sev1' ? <span className="animate-pulse">{lbl}</span> : lbl}</span>
                    <span className="font-mono text-[9px] tabular-nums text-ink-muted">{17 + (i % 3)}:{(32 - i * 3 + 60) % 60 || 12}</span>
                  </div>
                  <div className="mt-0.5 truncate text-[11px] font-medium text-ink">{c.label}</div>
                  <div className="truncate text-[9px] text-ink-muted">{c.ministry} · {1 + (i * 3) % 14} regions · Cabinet L{c.severity === 'sev1' ? 3 : 2}</div>
                </Link>
              );
            })}
            <Link href="/gov/coordination" className="focus-ring mt-1 block text-center text-[11px] text-link underline underline-offset-2">View all escalations →</Link>
          </Panel>

          <Panel label="System Integrity" meta={<span style={{ color: TONE.ok }}>✓ all operational</span>}>
            <ul className="space-y-1 text-[11px]">
              {integ.map(s => (
                <li key={s.s} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: TONE.ok }} />
                  <span className="text-ink-soft">{s.s} System</span>
                  <span className="ml-auto font-mono tabular-nums text-ink-muted">{s.p.toFixed(1)}%</span>
                </li>
              ))}
            </ul>
            <Link href="/gov/coordination" className="focus-ring mt-2 inline-block text-[11px] text-link underline underline-offset-2">View integration map →</Link>
          </Panel>

          <Panel label="Treasury Overview" meta={<Link href="/gov" className="text-link underline">View details</Link>}>
            <div className="space-y-2">
              <div>
                <div className="flex items-baseline justify-between text-[10px]"><span className="uppercase tracking-wide text-ink-muted">Revenue 24h</span><span className="font-mono tabular-nums" style={{ color: TONE.ok }}>+3.2%</span></div>
                <div className="flex items-end justify-between"><span className="font-mono text-sm tabular-nums text-ink">${(120 + seed(`r:${epoch}`) * 16).toFixed(1)}B</span></div>
                <Spark pts={rev} tone="ok" />
              </div>
              <div>
                <div className="flex items-baseline justify-between text-[10px]"><span className="uppercase tracking-wide text-ink-muted">Expenditure 24h</span><span className="font-mono tabular-nums" style={{ color: TONE.warn }}>-1.8%</span></div>
                <div className="font-mono text-sm tabular-nums text-ink">${(90 + seed(`e:${epoch}`) * 12).toFixed(1)}M</div>
                <Spark pts={exp} tone="warn" />
              </div>
            </div>
          </Panel>
        </aside>
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-soft">{label}</h2>
      {children}
    </section>
  );
}
function Panel({ label, meta, children }: { label: string; meta?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-[3px] border border-line bg-surface">
      <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-soft">{label}</h3>
        {meta ? <span className="text-[10px] text-ink-muted">{meta}</span> : null}
      </div>
      <div className="p-3">{children}</div>
    </section>
  );
}
