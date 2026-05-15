'use client';

import * as React from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { resolveIdentity } from '@/lib/sovereign-identity';
import { identityFor } from '@/lib/archetype-profiles';
import type {
  SovereignProfile,
  NationalSnapshot,
  NationalCoordination,
} from '@/lib/api/types';

const TONE_HEX: Record<string, string> = {
  alert: 'rgb(var(--c-alert))',
  warn: 'rgb(var(--c-warn))',
  ok: 'rgb(var(--c-ok))',
  neutral: 'rgb(var(--c-ink-muted))',
};

interface Entry {
  href: string;
  glyph: string;
  label: string;
  desc: string;
}

const SOVEREIGN: Entry[] = [
  { href: '/gov', glyph: '◆', label: 'National Shell', desc: 'Whole-of-government command environment' },
  { href: '/gov/coordination', glyph: '⟁', label: 'National Coordination', desc: 'Dependency · cascade · live tempo' },
  { href: '/ops', glyph: '⊞', label: 'Operations Centre', desc: 'Cross-institution operational state' },
  { href: '/audit', glyph: '⛓', label: 'Oversight', desc: 'Read-only, tamper-evident audit chain' },
];
const INSTITUTIONAL: Entry[] = [
  { href: '/ministries', glyph: '▤', label: 'Institutions Admin', desc: 'Compose ministries from archetypes' },
  { href: '/platform', glyph: '⚙', label: 'Platform Operations', desc: 'Releases · tenancy · backups · config' },
  { href: '/integrations', glyph: '⇄', label: 'Interoperability', desc: 'Federation · webhooks · clients' },
  { href: '/developers', glyph: '⌘', label: 'Developer Guide', desc: 'Typed API · integration surface' },
];
const SERVICE: Entry[] = [
  { href: '/wallet', glyph: '◊', label: 'Civic Wallet', desc: 'Citizen surface — records, services, contestation' },
  { href: '/console', glyph: '⊟', label: 'Officer Console', desc: 'Review → decide loop · signed decisions' },
  { href: '/control', glyph: '▦', label: 'Ministry Control', desc: 'Director-General daily control room' },
  { href: '/wall', glyph: '◉', label: 'NCCC Wall', desc: 'National command & coordination wall' },
];
const PHASE1: Entry[] = [
  { href: '/login', glyph: '⊕', label: 'Sign-in', desc: 'Identity flow' },
  { href: '/wallet/permits', glyph: '▣', label: 'Permits', desc: 'Licensing & approvals' },
  { href: '/wallet/payments', glyph: '▤', label: 'Payments', desc: 'Receipts & reconciliation' },
  { href: '/wallet/documents', glyph: '✦', label: 'Verify Document', desc: 'Tamper-evident verification' },
  { href: '/admin/onboarding', glyph: '⊞', label: 'Municipal Onboarding', desc: 'Tenant provisioning' },
];

function rel(at: string, now: number): string {
  const s = Math.max(0, Math.round((now - new Date(at).getTime()) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  return `${Math.round(m / 60)}h`;
}

function Metric({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <div className="min-w-0 border-l border-line px-4 py-2 first:border-l-0">
      <div className="truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">{label}</div>
      <div className="font-mono text-xl tabular-nums" style={{ color: tone ? TONE_HEX[tone] : undefined }}>
        {value}
        {sub ? <span className="ml-1 text-[11px] text-ink-muted">{sub}</span> : null}
      </div>
    </div>
  );
}

function EntryGrid({ title, items }: { title: string; items: Entry[] }) {
  return (
    <section className="space-y-2">
      <h2 className="border-b border-line pb-1 text-xs font-semibold uppercase tracking-[0.2em] text-ink-soft">
        {title}
      </h2>
      <div className="grid gap-px overflow-hidden rounded-sm border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        {items.map(e => (
          <Link
            key={e.href}
            href={e.href}
            className="focus-ring group flex items-start gap-3 bg-surface px-4 py-3 no-underline transition-colors duration-150 ease-sov hover:bg-surface-2"
          >
            <span
              aria-hidden
              className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-sm bg-surface-2 text-sm text-ink-soft ring-1 ring-line transition-colors group-hover:text-ink"
            >
              {e.glyph}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium text-ink">
                {e.label}
                <span className="ml-1 text-ink-muted transition-transform group-hover:translate-x-0.5 inline-block">→</span>
              </span>
              <span className="block truncate text-xs text-ink-muted">{e.desc}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function SovereignGateway() {
  const [sov, setSov] = React.useState<SovereignProfile | null>(null);
  const [nat, setNat] = React.useState<NationalSnapshot | null>(null);
  const [coord, setCoord] = React.useState<NationalCoordination | null>(null);
  const [now, setNow] = React.useState(() => Date.now());

  React.useEffect(() => {
    const load = async () => {
      try {
        const [s, n, c] = await Promise.all([
          api.sovereign.get().then(r => r.sovereign).catch(() => null),
          api.cabinet.national().catch(() => null),
          api.cabinet.coordination().catch(() => null),
        ]);
        setSov(s);
        setNat(n);
        setCoord(c);
      } catch {
        /* gateway still renders */
      }
    };
    void load();
    const poll = setInterval(() => void load(), 20_000);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(poll);
      clearInterval(tick);
    };
  }, []);

  const identity = sov ? resolveIdentity(sov) : null;
  const accent = identity?.accent ?? '#1f5fad';
  const posture = coord?.posture;
  const ticker = coord?.timeline.slice(0, 14) ?? [];

  return (
    <div
      className="sov flex min-h-[100dvh] flex-col font-sans"
      dir={identity?.dir ?? 'ltr'}
      style={{ ['--accent' as string]: accent }}
    >
      {/* Command header */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line bg-surface px-5 py-3">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="grid h-10 w-10 shrink-0 place-items-center rounded-sm text-sm font-bold tracking-tight text-white ring-1 ring-white/15"
            style={{ backgroundColor: accent }}
          >
            {identity ? identity.seal : 'CO'}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold tracking-[0.16em]">CIVICOS</span>
              <span className="rounded-sm border border-line px-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-soft">
                {nat?.classification ?? 'OFFICIAL'}
              </span>
            </div>
            <div className="truncate text-xs text-ink-muted">
              {sov ? sov.stateName : 'Sovereign State'}
              {sov ? ` · ${sov.executiveTitle}` : ''}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {posture ? (
            <span
              className="rounded-sm px-2 py-1 text-xs font-semibold tracking-widest"
              style={{
                backgroundColor: `color-mix(in srgb, ${TONE_HEX[posture.level]} 18%, transparent)`,
                color: TONE_HEX[posture.level],
              }}
            >
              {posture.label} · {posture.nationalRisk}
            </span>
          ) : null}
          <span className="hidden font-mono text-xs tabular-nums text-ink-muted sm:inline">
            {new Date(now).toLocaleTimeString()}
          </span>
          <Link
            href="/gov"
            className="focus-ring rounded-sm border border-ink bg-ink px-4 py-2 text-sm font-medium text-bg no-underline transition-all duration-200 ease-sov hover:opacity-90 hover:shadow-elev-2"
          >
            Enter National Shell →
          </Link>
        </div>
      </header>

      {/* National status strip */}
      <div className="flex flex-wrap items-stretch border-b border-line bg-bg">
        <Metric label="Institutions" value={String(nat?.totals.institutions ?? '—')} />
        <Metric label="Active" value={String(nat?.totals.activeMinistries ?? '—')} />
        <Metric
          label="Active incidents"
          value={String(nat?.totals.activeIncidents ?? '—')}
          tone={nat && nat.totals.activeIncidents > 0 ? 'alert' : 'ok'}
        />
        <Metric
          label="Queues breaching"
          value={String(nat?.totals.queuesBreaching ?? '—')}
          tone={nat && nat.totals.queuesBreaching > 0 ? 'warn' : 'ok'}
        />
        <Metric
          label="National risk"
          value={posture ? String(posture.nationalRisk) : '—'}
          sub="/100"
          tone={posture?.level}
        />
        <Metric
          label="Audit integrity"
          value={nat ? (nat.totals.auditIntact ? 'INTACT' : 'BROKEN') : '—'}
          tone={nat ? (nat.totals.auditIntact ? 'ok' : 'alert') : undefined}
        />
        <Metric label="Environment" value={nat?.environment ?? 'Production'} sub={sov?.currency ?? 'USD'} />
      </div>

      {/* Operational canvas */}
      <main className="flex-1 space-y-7 px-5 py-6">
        <div>
          <p className="max-w-3xl text-sm text-ink-soft">
            Sovereign operational platform — one coherent command environment for
            citizen service, institutional operation and whole-of-government
            coordination. Humans govern. Institutions govern. Constitutions
            govern. The platform serves.
          </p>
        </div>

        <div className="grid gap-7 lg:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            <EntryGrid title="Sovereign command" items={SOVEREIGN} />
            <EntryGrid title="Institutional administration" items={INSTITUTIONAL} />
            <EntryGrid title="Public service surfaces" items={SERVICE} />
            <EntryGrid title="Phase 1 — foundational services" items={PHASE1} />
          </div>

          {/* Right intelligence panel */}
          <aside className="space-y-2">
            <h2 className="border-b border-line pb-1 text-xs font-semibold uppercase tracking-[0.2em] text-ink-soft">
              Cross-ministry incident feed
            </h2>
            <div className="overflow-hidden rounded-sm border border-line">
              {nat && nat.crossMinistryIncidents.length > 0 ? (
                nat.crossMinistryIncidents.slice(0, 8).map((c, i) => {
                  const id = identityFor(c.archetype);
                  return (
                    <Link
                      key={i}
                      href={`/gov/ministry/${c.ministryId}`}
                      className="focus-ring flex items-start gap-2 border-b border-line-soft px-3 py-2 no-underline transition-colors hover:bg-surface-2 last:border-b-0"
                    >
                      <span
                        aria-hidden
                        className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-sm text-[10px] text-white"
                        style={{ backgroundColor: id.accent }}
                      >
                        {id.glyph}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-medium text-ink">{c.label}</span>
                        <span className="block truncate text-[11px] text-ink-muted">
                          {c.ministry} · {c.severity.toUpperCase()} · {c.authority}
                        </span>
                      </span>
                    </Link>
                  );
                })
              ) : (
                <p className="px-3 py-6 text-center text-xs text-ink-muted">
                  {nat ? 'No active cross-ministry incidents.' : 'Establishing coordination link…'}
                </p>
              )}
            </div>
            <p className="px-1 pt-1 text-[11px] leading-relaxed text-ink-muted">
              Global-state neutral — configurable for a republic, federation,
              monarchy, emirate, city-state or union. No tracking, no analytics,
              sovereign-portable.
            </p>
          </aside>
        </div>
      </main>

      {/* Persistent live event ticker */}
      <div className="flex shrink-0 items-center gap-3 border-t border-line bg-surface px-5 py-1.5">
        <span className="flex shrink-0 items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-ink-muted">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-ok" />
          {coord ? `Live · T${coord.tick}` : 'Live'}
        </span>
        <div className="flex min-w-0 flex-1 items-center gap-6 overflow-hidden">
          {ticker.length === 0 ? (
            <span className="text-xs text-ink-muted">National operations nominal — no recent events.</span>
          ) : (
            ticker.map((ev, i) => (
              <span key={i} className="flex shrink-0 items-center gap-1.5 text-xs text-ink-soft">
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: TONE_HEX[ev.tone] ?? TONE_HEX.neutral }}
                />
                <span className="truncate">{ev.title}</span>
                <span className="font-mono text-[10px] text-ink-muted">{rel(ev.at, now)}</span>
              </span>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
