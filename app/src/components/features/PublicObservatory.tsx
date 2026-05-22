'use client';

import * as React from 'react';
import Link from 'next/link';
import { TONE, Panel } from '@/components/features/SituationRoom';
import { substrateAvailable, publicClient } from '@/lib/db/client';
import { listDirectivesRows } from '@/lib/db/repos/memory';
import {
  listInstitutionsRows, serviceSlaStats, appealsStats, serviceSlaTrend, appealsTrend,
  type ServiceSlaStat, type AppealsStat, type SlaTrendPoint, type AppealsTrendPoint,
} from '@/lib/db/repos/institutions';
import { listTelemetryStreamsRows } from '@/lib/db/repos/telemetry';
import { recentWitnessRows, type AuditWitness } from '@/lib/db/repos/audit';
import { recentEventsRows, type PersistedEvent } from '@/lib/db/repos/events';
import type { DirectiveRow, InstitutionRow, TelemetryStreamRow } from '@/lib/db/types';
import { buildCsv, downloadCsv } from '@/lib/csv-download';
import { SubstrateNotConfigured } from '@/components/ui/SubstrateEmpty';

/**
 * PublicObservatory — what an anonymous visitor can see of the
 * sovereign substrate. Reads only the tables whose RLS includes
 * an anon read policy: institutions, facilities, workflow definitions,
 * telemetry stream catalogue, and public directives
 * (signed / effective / rescinded / published).
 *
 * The page is designed to demonstrate the RLS contract honestly:
 * draft directives, dispatches, escalations, audit entries, citizen
 * records, and work items are intentionally absent — those require
 * an authenticated session.
 */
export function PublicObservatory() {
  const [directives, setDirectives] = React.useState<DirectiveRow[]>([]);
  const [institutions, setInstitutions] = React.useState<InstitutionRow[]>([]);
  const [streams, setStreams] = React.useState<TelemetryStreamRow[]>([]);
  const [witnesses, setWitnesses] = React.useState<AuditWitness[]>([]);
  const [anchors, setAnchors] = React.useState<PersistedEvent[]>([]);
  const [sla, setSla] = React.useState<ServiceSlaStat[]>([]);
  const [appeals, setAppeals] = React.useState<AppealsStat[]>([]);
  const [trend, setTrend] = React.useState<SlaTrendPoint[]>([]);
  const [appealTrend, setAppealTrend] = React.useState<AppealsTrendPoint[]>([]);
  const [loading, setLoading] = React.useState(false);
  const available = substrateAvailable();

  React.useEffect(() => {
    if (!available) return;
    setLoading(true);
    void (async () => {
      try {
        // Filter directives client-side to the publicly visible statuses;
        // the policy already does this server-side but a defensive filter
        // keeps the page honest about what it's showing.
        const ds = await listDirectivesRows({ limit: 30 });
        setDirectives(ds.filter(d => ['signed','effective','rescinded','published'].includes(d.status)));
        setInstitutions(await listInstitutionsRows({ activated: true }));
        setStreams(await listTelemetryStreamsRows({ activeOnly: true, limit: 30 }));
        setWitnesses(await recentWitnessRows({ limit: 12 }));
        const events = await recentEventsRows({ type: 'audit.anchor', limit: 12 });
        setAnchors(events);
        setSla(await serviceSlaStats({ days: 90 }));
        setAppeals(await appealsStats({ days: 90 }));
        setTrend(await serviceSlaTrend({ weeks: 12 }));
        setAppealTrend(await appealsTrend({ weeks: 12 }));
      } finally {
        setLoading(false);
      }
    })();
  }, [available]);

  if (!available) {
    return (
      <main className="max-w-5xl mx-auto px-4 py-8">
        <SubstrateNotConfigured title="Public Observatory" />
      </main>
    );
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-8 space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-ink">Public Observatory</h1>
        <p className="text-sm text-ink-muted">
          What anyone can see of the sovereign substrate without signing in.
          Restricted material (audit chains, operator dispatches, citizen
          records, work items in flight) requires authentication — it does
          not appear here.
        </p>
        <p className="font-mono text-[10px] text-ink-muted">
          loaded {institutions.length} institutions · {directives.length} public directives · {streams.length} active telemetry streams · {anchors.length} chain anchors · {witnesses.length} attestations
        </p>
        {(() => {
          const totalRated = sla.reduce((s, x) => s + x.rated, 0);
          if (totalRated === 0) return null;
          // ratings-weighted mean of per-charter averages
          const weighted = sla.reduce((s, x) => s + (x.avgSatisfaction ?? 0) * x.rated, 0) / totalRated;
          return (
            <p className="text-sm" style={{ color: TONE.ok }}>
              Citizens rate government services <strong>{weighted.toFixed(1)}/5</strong> across {totalRated} ratings (last 90 days).
            </p>
          );
        })()}
      </div>

      <Panel title="Open data" meta="machine-readable JSON" bodyClass="!p-3">
        <p className="text-[11px] text-ink-muted">
          Everything on this page is also available as a programmatic open-data API —
          aggregate / metadata only, no row-level records. Start at the index:
        </p>
        <ul className="mt-2 space-y-1 font-mono text-[10px]">
          <li><a href="/api/public" className="text-link underline">/api/public</a> — endpoint directory</li>
          <li><a href="/api/public/accountability" className="text-link underline">/api/public/accountability</a> — service SLAs, appeals, SLA + appeals decision-time trends (<code>?days</code>, <code>?charter</code>)</li>
          <li><a href="/api/public/charters" className="text-link underline">/api/public/charters</a> — activated charter directory</li>
          <li><a href="/api/public/telemetry" className="text-link underline">/api/public/telemetry</a> — active telemetry stream catalog</li>
          <li><a href="/api/public/directives" className="text-link underline">/api/public/directives</a> — public directives (<code>?issuer</code>)</li>
        </ul>
      </Panel>

      <Panel title="Signed directives" meta={`${directives.length}`} bodyClass="!p-0">
        {directives.length === 0 ? (
          <p className="px-3 py-4 text-[11px] text-ink-muted">
            {loading ? 'Loading…' : 'No public directives on record.'}
          </p>
        ) : (
          <div className="max-h-[420px] overflow-y-auto">
            {directives.map(d => (
              <div key={d.id} className="border-b border-line-soft px-3 py-2 last:border-0 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="w-32 shrink-0 truncate font-mono text-link">{d.ref}</span>
                  <span className="min-w-0 flex-1 truncate text-ink">{d.title}</span>
                  <span
                    className="w-20 shrink-0 text-right text-[8.5px] font-bold uppercase tracking-wider"
                    style={{
                      color: d.status === 'effective' ? TONE.ok
                           : d.status === 'rescinded' ? TONE.alert
                           : TONE.link
                    }}
                  >
                    {d.status}
                  </span>
                </div>
                <div className="mt-1 font-mono text-[9.5px] text-ink-muted">
                  {d.kind} · {d.issued_by_charter_id}
                  {d.signed_at ? ` · signed ${new Date(d.signed_at).toLocaleDateString()}` : ''}
                  {d.effective_at
                    ? ` · ${new Date(d.effective_at) > new Date() ? 'effective from' : 'effective'} ${new Date(d.effective_at).toLocaleDateString()}`
                    : ''}
                  {d.targets && d.targets.length > 0 ? ` · targets: ${d.targets.join(', ')}` : ''}
                </div>
                {d.citation ? (
                  <p className="mt-1 text-[10px] text-ink-soft">{d.citation}</p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Service delivery — published SLAs"
        meta={<MetaWithCsv label={`${sla.length} charters · last 90 days`} show={sla.length > 0}
          onDownload={() => downloadCsv('civicos-service-sla', buildCsv(
            ['charter_id','submitted','acknowledged','resolved','open','median_ack_hours','median_resolve_hours','p90_resolve_hours','oldest_open_hours','rated','avg_satisfaction'],
            sla.map(s => [s.charterId, s.submitted, s.acknowledged, s.resolved, s.open, s.medianAckHours ?? '', s.medianResolveHours ?? '', s.p90ResolveHours ?? '', s.oldestOpenHours ?? '', s.rated, s.avgSatisfaction ?? '']),
          ))} />}
        bodyClass="!p-0">
        {sla.length === 0 ? (
          <p className="px-3 py-4 text-[11px] text-ink-muted">
            {loading ? 'Loading…' : 'No service requests on record in the window.'}
          </p>
        ) : (
          <div className="max-h-[360px] overflow-y-auto">
            <div className="flex items-center gap-2 border-b border-line px-3 py-1 text-[8.5px] font-bold uppercase tracking-wider text-ink-muted">
              <span className="w-40 shrink-0">charter</span>
              <span className="w-14 shrink-0 text-right">vol</span>
              <span className="w-14 shrink-0 text-right">open</span>
              <span className="w-24 shrink-0 text-right">med. ack</span>
              <span className="w-24 shrink-0 text-right">med. decide</span>
              <span className="w-20 shrink-0 text-right">p90</span>
              <span className="w-20 shrink-0 text-right">oldest</span>
              <span className="w-20 shrink-0 text-right">rating</span>
            </div>
            {sla.map(s => (
              <div key={s.charterId} className="flex items-center gap-2 border-b border-line-soft px-3 py-1.5 last:border-0 font-mono text-[10px]">
                <Link href={`/public/charter/${encodeURIComponent(s.charterId)}`} className="w-40 shrink-0 truncate text-link hover:underline">{s.charterId}</Link>
                <span className="w-14 shrink-0 text-right text-ink">{s.submitted}</span>
                <span className="w-14 shrink-0 text-right" style={{ color: s.open > 0 ? TONE.warn : TONE.ok }}>{s.open}</span>
                <span className="w-24 shrink-0 text-right text-ink-muted">{s.medianAckHours == null ? '—' : `${s.medianAckHours}h`}</span>
                <span className="w-24 shrink-0 text-right text-ink">{s.medianResolveHours == null ? '—' : `${s.medianResolveHours}h`}</span>
                <span className="w-20 shrink-0 text-right text-ink-muted">{s.p90ResolveHours == null ? '—' : `${s.p90ResolveHours}h`}</span>
                <span className="w-20 shrink-0 text-right text-ink-muted">{s.oldestOpenHours == null ? '—' : `${Math.round(s.oldestOpenHours)}h`}</span>
                <span className="w-20 shrink-0 text-right" style={{ color: s.avgSatisfaction == null ? undefined : s.avgSatisfaction >= 3.5 ? TONE.ok : TONE.warn }}>
                  {s.avgSatisfaction == null ? '—' : `★${s.avgSatisfaction}`}
                </span>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Decision-time trend — all charters"
        meta={<MetaWithCsv label={`${trend.length} weeks (median resolve hrs)`} show={trend.length > 0}
          onDownload={() => downloadCsv('civicos-sla-trend', buildCsv(
            ['week_start','resolved','median_resolve_hours','p90_resolve_hours'],
            trend.map(t => [t.weekStart, t.resolved, t.medianResolveHours ?? '', t.p90ResolveHours ?? '']),
          ))} />}
        bodyClass="!p-0">
        {trend.length === 0 ? (
          <p className="px-3 py-4 text-[11px] text-ink-muted">
            {loading ? 'Loading…' : 'No resolved requests in the window.'}
          </p>
        ) : (() => {
          const maxMed = Math.max(1, ...trend.map(t => t.medianResolveHours ?? 0));
          return (
            <div className="space-y-1 px-3 py-2">
              {trend.map(t => {
                const med = t.medianResolveHours ?? 0;
                const pct = Math.round((med / maxMed) * 100);
                return (
                  <div key={t.weekStart} className="flex items-center gap-2 font-mono text-[9.5px]">
                    <span className="w-20 shrink-0 text-ink-muted">{t.weekStart}</span>
                    <span className="w-10 shrink-0 text-right text-ink-muted">{t.resolved}×</span>
                    <div className="h-2.5 min-w-0 flex-1 rounded-[2px] bg-surface-2">
                      <div className="h-full rounded-[2px]" style={{ width: `${pct}%`, backgroundColor: TONE.link }} />
                    </div>
                    <span className="w-14 shrink-0 text-right text-ink">{t.medianResolveHours == null ? '—' : `${t.medianResolveHours}h`}</span>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </Panel>

      <Panel title="Contestation — appeals pipeline"
        meta={<MetaWithCsv label={`${appeals.length} charters · last 90 days`} show={appeals.length > 0}
          onDownload={() => downloadCsv('civicos-appeals', buildCsv(
            ['charter_id','filed','admitted','decided','published','pending','withdrawn','median_decision_days','p90_decision_days','oldest_pending_days'],
            appeals.map(a => [a.charterId, a.filed, a.admitted, a.decided, a.published, a.pending, a.withdrawn, a.medianDecisionDays ?? '', a.p90DecisionDays ?? '', a.oldestPendingDays ?? '']),
          ))} />}
        bodyClass="!p-0">
        {appeals.length === 0 ? (
          <p className="px-3 py-4 text-[11px] text-ink-muted">
            {loading ? 'Loading…' : 'No appeals on record in the window.'}
          </p>
        ) : (
          <div className="max-h-[360px] overflow-y-auto">
            <div className="flex items-center gap-2 border-b border-line px-3 py-1 text-[8.5px] font-bold uppercase tracking-wider text-ink-muted">
              <span className="w-40 shrink-0">charter</span>
              <span className="w-14 shrink-0 text-right">filed</span>
              <span className="w-16 shrink-0 text-right">decided</span>
              <span className="w-16 shrink-0 text-right">pending</span>
              <span className="w-24 shrink-0 text-right">med. days</span>
              <span className="w-20 shrink-0 text-right">p90</span>
              <span className="w-20 shrink-0 text-right">oldest</span>
            </div>
            {appeals.map(a => (
              <div key={a.charterId} className="flex items-center gap-2 border-b border-line-soft px-3 py-1.5 last:border-0 font-mono text-[10px]">
                <Link href={`/public/charter/${encodeURIComponent(a.charterId)}`} className="w-40 shrink-0 truncate text-link hover:underline">{a.charterId}</Link>
                <span className="w-14 shrink-0 text-right text-ink">{a.filed}</span>
                <span className="w-16 shrink-0 text-right text-ink-muted">{a.decided}</span>
                <span className="w-16 shrink-0 text-right" style={{ color: a.pending > 0 ? TONE.warn : TONE.ok }}>{a.pending}</span>
                <span className="w-24 shrink-0 text-right text-ink">{a.medianDecisionDays == null ? '—' : `${a.medianDecisionDays}d`}</span>
                <span className="w-20 shrink-0 text-right text-ink-muted">{a.p90DecisionDays == null ? '—' : `${a.p90DecisionDays}d`}</span>
                <span className="w-20 shrink-0 text-right text-ink-muted">{a.oldestPendingDays == null ? '—' : `${Math.round(a.oldestPendingDays)}d`}</span>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Appeals decision-time trend — all charters"
        meta={<MetaWithCsv label={`${appealTrend.length} weeks (median decision days)`} show={appealTrend.length > 0}
          onDownload={() => downloadCsv('civicos-appeals-trend', buildCsv(
            ['week_start','decided','median_decision_days','p90_decision_days'],
            appealTrend.map(t => [t.weekStart, t.decided, t.medianDecisionDays ?? '', t.p90DecisionDays ?? '']),
          ))} />}
        bodyClass="!p-0">
        {appealTrend.length === 0 ? (
          <p className="px-3 py-4 text-[11px] text-ink-muted">
            {loading ? 'Loading…' : 'No decided appeals in the window.'}
          </p>
        ) : (() => {
          const maxMed = Math.max(1, ...appealTrend.map(t => t.medianDecisionDays ?? 0));
          return (
            <div className="space-y-1 px-3 py-2">
              {appealTrend.map(t => {
                const med = t.medianDecisionDays ?? 0;
                const pct = Math.round((med / maxMed) * 100);
                return (
                  <div key={t.weekStart} className="flex items-center gap-2 font-mono text-[9.5px]">
                    <span className="w-20 shrink-0 text-ink-muted">{t.weekStart}</span>
                    <span className="w-10 shrink-0 text-right text-ink-muted">{t.decided}×</span>
                    <div className="h-2.5 min-w-0 flex-1 rounded-[2px] bg-surface-2">
                      <div className="h-full rounded-[2px]" style={{ width: `${pct}%`, backgroundColor: TONE.link }} />
                    </div>
                    <span className="w-14 shrink-0 text-right text-ink">{t.medianDecisionDays == null ? '—' : `${t.medianDecisionDays}d`}</span>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </Panel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Active institutions" meta={`${institutions.length}`} bodyClass="!p-0">
          {institutions.length === 0 ? (
            <p className="px-3 py-4 text-[11px] text-ink-muted">No activated institutions.</p>
          ) : (
            <div className="max-h-[320px] overflow-y-auto">
              {institutions.map(i => (
                <div key={i.id} className="border-b border-line-soft px-3 py-1.5 last:border-0 text-[10px]">
                  <div className="flex items-center gap-2">
                    <span className="w-16 shrink-0 text-[8.5px] font-bold uppercase tracking-wider text-ink-muted">{i.kind}</span>
                    <span className="min-w-0 flex-1 truncate text-ink">{i.label}</span>
                    <span className="w-20 shrink-0 truncate text-right font-mono text-link">{i.charter_id}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Telemetry streams" meta={`${streams.length}`} bodyClass="!p-0">
          {streams.length === 0 ? (
            <p className="px-3 py-4 text-[11px] text-ink-muted">No active telemetry streams.</p>
          ) : (
            <div className="max-h-[320px] overflow-y-auto">
              {streams.map(s => (
                <div key={s.id} className="border-b border-line-soft px-3 py-1.5 last:border-0 text-[10px]">
                  <div className="flex items-center gap-2">
                    <span className="w-32 shrink-0 truncate font-mono text-ink-soft">{s.stream_id}</span>
                    <span className="min-w-0 flex-1 truncate text-ink">{s.label}</span>
                    <span className="w-12 shrink-0 truncate text-right font-mono text-ink-muted">{s.unit ?? ''}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Latest chain anchors" meta={`${anchors.length}`} bodyClass="!p-0">
          {anchors.length === 0 ? (
            <p className="px-3 py-4 text-[11px] text-ink-muted">
              No audit anchors broadcast yet.
            </p>
          ) : (
            <div className="max-h-[320px] overflow-y-auto">
              {anchors.map(e => {
                const p = e.payload as Record<string, unknown>;
                const scope = String(p['scope'] ?? '');
                const seq = String(p['head_seq'] ?? '');
                const hash = String(p['head_hash'] ?? '');
                return (
                  <div key={e.id} className="border-b border-line-soft px-3 py-1.5 last:border-0 text-[10px]">
                    <div className="flex items-center gap-2">
                      <span className="w-44 shrink-0 truncate font-mono text-link">{scope}</span>
                      <span className="w-12 shrink-0 text-right font-mono tabular-nums text-ink">@{seq}</span>
                      <span className="min-w-0 flex-1 truncate font-mono text-ink-soft">{hash.slice(0, 24)}…</span>
                    </div>
                    <p className="mt-0.5 font-mono text-[9px] text-ink-muted">
                      {new Date(e.at).toLocaleString()}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        <Panel title="Latest witness attestations" meta={`${witnesses.length}`} bodyClass="!p-0">
          {witnesses.length === 0 ? (
            <p className="px-3 py-4 text-[11px] text-ink-muted">
              No witness attestations on record.
            </p>
          ) : (
            <div className="max-h-[320px] overflow-y-auto">
              {witnesses.map(w => (
                <div key={w.id} className="border-b border-line-soft px-3 py-1.5 last:border-0 text-[10px]">
                  <div className="flex items-center gap-2">
                    <span className="w-44 shrink-0 truncate font-mono text-link">{w.scope}</span>
                    <span className="w-12 shrink-0 text-right font-mono tabular-nums text-ink">@{w.observedSeq}</span>
                    <span className="min-w-0 flex-1 truncate text-ink">{w.label}</span>
                  </div>
                  <p className="mt-0.5 font-mono text-[9px] text-ink-muted">
                    {w.hasSignature ? '+ signed · ' : ''}{new Date(w.at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <p className="text-[10px] text-ink-muted">
        The substrate enforces visibility at the database. This page reads
        the same views every authenticated surface uses, but the RLS
        policies clip rows to what an anonymous session is entitled to see.
        Audit chain anchors and witness attestations are public by design —
        the more eyes on them, the harder tamper-after-the-fact becomes.{' '}
        To see your own records, <Link href="/sign-in?from=/public" className="text-link underline">sign in</Link>.
      </p>
    </main>
  );
}

function MetaWithCsv({ label, show, onDownload }: { label: string; show: boolean; onDownload: () => void }) {
  return (
    <span className="inline-flex items-center gap-2">
      {label}
      {show ? (
        <button type="button" onClick={onDownload}
          className="focus-ring rounded-[3px] border border-line px-1.5 py-0 text-[8.5px] uppercase tracking-wider text-ink-muted hover:text-ink">
          csv
        </button>
      ) : null}
    </span>
  );
}
