'use client';

import * as React from 'react';
import Link from 'next/link';
import { TONE, Panel } from '@/components/features/SituationRoom';
import { substrateAvailable } from '@/lib/db/client';
import {
  institutionByCharterId, serviceSlaStats, serviceSlaTrend, appealsStats,
  type ServiceSlaStat, type SlaTrendPoint, type AppealsStat,
} from '@/lib/db/repos/institutions';
import { listDirectivesRows } from '@/lib/db/repos/memory';
import { downloadJson } from '@/lib/csv-download';
import type { InstitutionRow, DirectiveRow } from '@/lib/db/types';
import { SubstrateNotConfigured } from '@/components/ui/SubstrateEmpty';

const PUBLIC_STATUSES = ['signed', 'effective', 'rescinded', 'published'];

/**
 * CharterProfile — a single institution's public accountability page.
 *
 * Combines what an anonymous visitor can see about one charter: its
 * registry entry, its service-delivery SLAs + decision-time trend, its
 * appeals pipeline, and the public directives it has issued. All figures
 * come from the aggregate, anon-callable Observatory RPCs scoped to this
 * charter — no row-level citizen data is ever fetched.
 */
export function CharterProfile({ charterId }: { charterId: string }) {
  const [inst, setInst] = React.useState<InstitutionRow | null>(null);
  const [sla, setSla] = React.useState<ServiceSlaStat | null>(null);
  const [trend, setTrend] = React.useState<SlaTrendPoint[]>([]);
  const [appeals, setAppeals] = React.useState<AppealsStat | null>(null);
  const [directives, setDirectives] = React.useState<DirectiveRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const available = substrateAvailable();

  React.useEffect(() => {
    if (!available) { setLoading(false); return; }
    setLoading(true);
    void (async () => {
      try {
        const [i, s, t, a, ds] = await Promise.all([
          institutionByCharterId(charterId),
          serviceSlaStats({ charterId, days: 90 }),
          serviceSlaTrend({ charterId, weeks: 12 }),
          appealsStats({ charterId, days: 90 }),
          listDirectivesRows({ issuer: charterId, limit: 25 }),
        ]);
        setInst(i);
        setSla(s[0] ?? null);
        setTrend(t);
        setAppeals(a[0] ?? null);
        setDirectives(ds.filter(d => PUBLIC_STATUSES.includes(d.status)));
      } finally {
        setLoading(false);
      }
    })();
  }, [available, charterId]);

  if (!available) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-8">
        <SubstrateNotConfigured title="Charter profile" />
      </main>
    );
  }

  const maxMed = Math.max(1, ...trend.map(t => t.medianResolveHours ?? 0));

  return (
    <main className="max-w-4xl mx-auto px-4 py-8 space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <Link href="/public" className="text-[11px] text-link underline underline-offset-2">← Public Observatory</Link>
          <h1 className="text-2xl font-semibold text-ink">
            {inst ? inst.label : charterId}
          </h1>
          <p className="font-mono text-[10px] text-ink-muted">
            {charterId}
            {inst ? ` · ${inst.kind} · ${inst.domain}${inst.activated ? ' · active' : ' · not activated'}` : ' · not in registry'}
          </p>
        </div>
        {!loading ? (
          <button type="button"
            onClick={() => downloadJson(`civicos-charter-${charterId}`, {
              document: 'civicos.charter_accountability_profile',
              generated_at: new Date().toISOString(),
              charter_id: charterId,
              institution: inst,
              service_sla: sla,
              service_sla_trend: trend,
              appeals: appeals,
              public_directives: directives,
            }, { dated: false })}
            className="focus-ring shrink-0 rounded-[3px] border border-line px-2 py-0.5 text-[9px] uppercase tracking-wider text-ink-muted hover:text-ink">
            download json
          </button>
        ) : null}
      </div>

      <p className="font-mono text-[10px] text-ink-muted">
        open data ·{' '}
        <a href={`/api/public/accountability?charter=${encodeURIComponent(charterId)}`}
           className="text-link underline">/api/public/accountability?charter={charterId}</a>
      </p>

      {loading ? <p className="text-[11px] text-ink-muted">Loading…</p> : null}

      <Panel title="Service delivery (last 90 days)" meta={sla ? `${sla.submitted} requests` : '—'} bodyClass="!p-3">
        {!sla ? (
          <p className="text-[11px] text-ink-muted">No service requests on record for this charter.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 text-center">
            <Stat label="median decision" value={sla.medianResolveHours == null ? '—' : `${sla.medianResolveHours}h`} />
            <Stat label="p90 decision" value={sla.p90ResolveHours == null ? '—' : `${sla.p90ResolveHours}h`} />
            <Stat label="resolved" value={`${sla.resolved}/${sla.submitted}`} />
            <Stat label="open" value={String(sla.open)} tone={sla.open > 0 ? TONE.warn : TONE.ok} />
            <Stat label={`rating (${sla.rated})`} value={sla.avgSatisfaction == null ? '—' : `★${sla.avgSatisfaction}`}
              tone={sla.avgSatisfaction == null ? undefined : sla.avgSatisfaction >= 3.5 ? TONE.ok : TONE.warn} />
          </div>
        )}
      </Panel>

      {trend.length > 0 ? (
        <Panel title="Decision-time trend" meta={`${trend.length} weeks`} bodyClass="!p-3">
          <div className="space-y-1">
            {trend.map(t => (
              <div key={t.weekStart} className="flex items-center gap-2 font-mono text-[9.5px]">
                <span className="w-20 shrink-0 text-ink-muted">{t.weekStart}</span>
                <span className="w-10 shrink-0 text-right text-ink-muted">{t.resolved}×</span>
                <div className="h-2.5 min-w-0 flex-1 rounded-[2px] bg-surface-2">
                  <div className="h-full rounded-[2px]" style={{ width: `${Math.round(((t.medianResolveHours ?? 0) / maxMed) * 100)}%`, backgroundColor: TONE.link }} />
                </div>
                <span className="w-14 shrink-0 text-right text-ink">{t.medianResolveHours == null ? '—' : `${t.medianResolveHours}h`}</span>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}

      <Panel title="Contestation (appeals, last 90 days)" meta={appeals ? `${appeals.filed} filed` : '—'} bodyClass="!p-3">
        {!appeals ? (
          <p className="text-[11px] text-ink-muted">No appeals on record for this charter.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-center">
            <Stat label="filed" value={String(appeals.filed)} />
            <Stat label="decided" value={String(appeals.decided)} />
            <Stat label="median decision" value={appeals.medianDecisionDays == null ? '—' : `${appeals.medianDecisionDays}d`} />
            <Stat label="pending" value={String(appeals.pending)} tone={appeals.pending > 0 ? TONE.warn : TONE.ok} />
          </div>
        )}
      </Panel>

      <Panel title="Public directives issued" meta={`${directives.length}`} bodyClass="!p-0">
        {directives.length === 0 ? (
          <p className="px-3 py-4 text-[11px] text-ink-muted">No public directives issued by this charter.</p>
        ) : (
          <div className="max-h-[360px] overflow-y-auto">
            {directives.map(d => (
              <div key={d.id} className="border-b border-line-soft px-3 py-2 last:border-0 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="w-32 shrink-0 truncate font-mono text-link">{d.ref}</span>
                  <span className="min-w-0 flex-1 truncate text-ink">{d.title}</span>
                  <span className="w-20 shrink-0 text-right text-[8.5px] font-bold uppercase tracking-wider"
                    style={{ color: d.status === 'effective' ? TONE.ok : d.status === 'rescinded' ? TONE.alert : TONE.link }}>
                    {d.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </main>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-[3px] border border-line bg-surface px-2 py-2">
      <div className="text-lg font-semibold" style={tone ? { color: tone } : undefined}>{value}</div>
      <div className="text-[8.5px] uppercase tracking-wider text-ink-muted">{label}</div>
    </div>
  );
}
