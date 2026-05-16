import Link from 'next/link';
import { CommandShell } from '@/components/ui/CommandShell';
import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { Plain } from '@/components/ui/Plain';
import { EmptyState } from '@/components/ui/EmptyState';
import { MetricStat, ThresholdBar, SeverityBadge } from '@/components/ui/Ops';
import { TerritoryHeat, TONE } from '@/components/features/SituationRoom';
import { serviceReadings } from '@/lib/gov/ministry-services';
import { instantiateMinistry, systemKindLabel } from '@/lib/institution/blueprint';
import { listMinistries, ministryOperations } from '@/lib/data/store';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Ministry Control' };


// Service health is CONFIG-DRIVEN, not a hardcoded single ministry. It
// renders whatever institutions exist in the tenant: each ministry's name,
// departments, and enabled modules come from the institutional framework.
export default function MinistryControlPage({
  searchParams,
}: {
  searchParams: { ministry?: string };
}) {
  const ministries = listMinistries().filter(m => m.status !== 'merged');
  const selected =
    ministries.find(m => m.slug === searchParams.ministry) ??
    ministries.find(m => m.status === 'active') ??
    ministries[0] ??
    null;

  return (
    <CommandShell active="ctl">
      <h1 className="text-base font-semibold uppercase tracking-[0.14em] text-ink-soft">Service health</h1>
      <p className="mb-3 mt-0.5 max-w-3xl text-[11px] leading-relaxed text-ink-muted">
        Operational view per institution. The structure below is composed from
        the institutional framework, not hardcoded.
      </p>

      {ministries.length === 0 ? (
        <EmptyState
          title="No institutions configured"
          hint="Compose a ministry, agency, or commission from an archetype first."
          action={<Link href="/ministries" className="text-link underline underline-offset-2">Go to Institutions →</Link>}
        />
      ) : (
        <div className="space-y-3">
          <Card tight>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-ink-muted">Institution:</span>
              {ministries.map(m => (
                <Link
                  key={m.id}
                  href={`/control?ministry=${m.slug}`}
                  className={
                    'rounded-[3px] border px-3 py-1 text-sm no-underline ' +
                    (selected && m.id === selected.id
                      ? 'border-ink bg-ink text-surface'
                      : 'border-line text-ink hover:bg-surface-2')
                  }
                >
                  {m.name}
                </Link>
              ))}
            </div>
          </Card>

          {selected ? (
            <>
              <Card tight>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-xl font-semibold">{selected.name}</h2>
                  <Pill tone={selected.status === 'active' ? 'ok' : 'warn'}>{selected.status}</Pill>
                </div>
                <p className="mt-1 text-sm text-ink-muted">
                  Archetype {selected.archetype} · {selected.departments.length} departments ·{' '}
                  {selected.modules.filter(m => m.enabled).length} active modules
                </p>
              </Card>

              {(() => {
                const ops = ministryOperations(selected.id);
                if ('error' in ops) return null;
                const activeAlerts = ops.modules.flatMap(m =>
                  m.alerts.filter(a => a.active).map(a => ({ m: m.title, a })),
                );
                const breaching = ops.modules.flatMap(m =>
                  m.queues.filter(q => q.breaching),
                ).length;
                return (
                  <div className="space-y-4">
                    <section className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                      <MetricStat label="Active modules" value={String(ops.modules.length)} tone="neutral" />
                      <MetricStat label="Queues breaching SLA" value={String(breaching)} tone={breaching === 0 ? 'ok' : 'alert'} />
                      <MetricStat label="Active alerts" value={String(activeAlerts.length)} tone={activeAlerts.length === 0 ? 'ok' : 'warn'} />
                      <MetricStat label="Departments" value={String(selected.departments.length)} tone="neutral" />
                    </section>

                    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[3px] border border-line bg-line text-[10px] md:grid-cols-5">
                      {[
                        { l: 'Service posture', v: breaching === 0 && activeAlerts.length === 0 ? 'NOMINAL' : breaching ? 'STRAINED' : 'WATCH', c: breaching ? 'rgb(var(--c-alert))' : activeAlerts.length ? 'rgb(var(--c-warn))' : 'rgb(var(--c-ok))' },
                        { l: 'Modules online', v: `${ops.modules.length} active`, c: 'rgb(var(--c-ok))' },
                        { l: 'SLA breaches', v: `${breaching}`, c: breaching ? 'rgb(var(--c-alert))' : 'rgb(var(--c-ok))' },
                        { l: 'Open alerts', v: `${activeAlerts.length}`, c: activeAlerts.length ? 'rgb(var(--c-warn))' : 'rgb(var(--c-ok))' },
                        { l: 'Sovereign core', v: 'INHERITED', c: 'rgb(var(--c-ok))' },
                      ].map(s => (
                        <div key={s.l} className="flex items-center justify-between gap-2 bg-surface px-3 py-1.5">
                          <span className="uppercase tracking-[0.14em] text-ink-muted">{s.l}</span>
                          <span className="font-mono font-semibold tabular-nums" style={{ color: s.c }}>{s.v}</span>
                        </div>
                      ))}
                    </div>

                    <Card tight>
                      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft">Service deployment theatre</h3>
                      <div className="overflow-hidden rounded-[3px] border border-line-soft">
                        <TerritoryHeat epoch={(selected.id.charCodeAt(0) || 9) % 50} height={240} />
                      </div>
                      <div className="mt-1.5 flex items-center justify-between text-[10px] text-ink-muted">
                        <span>Nominal</span>
                        <span className="mx-2 h-1.5 flex-1 rounded-full" style={{ background: `linear-gradient(90deg, ${TONE.ok}, ${TONE.warn}, ${TONE.alert})` }} />
                        <span>Saturated</span>
                      </div>
                    </Card>

                    <Card tight>
                      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft">Service operations · {selected.archetype}</h3>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-6">
                        {serviceReadings(selected.id, selected.archetype, (selected.id.charCodeAt(1) || 5) % 60).map(r => (
                          <div key={r.l} className="rounded-[3px] border border-line bg-surface px-2 py-1.5">
                            <div className="truncate text-[8px] font-semibold uppercase tracking-[0.12em] text-ink-muted">{r.l}</div>
                            <div className="font-mono text-base tabular-nums" style={{ color: `rgb(var(--c-${r.tone}))` }}>{r.value}{r.unit}</div>
                          </div>
                        ))}
                      </div>
                    </Card>

                    {(() => {
                      const eco = instantiateMinistry(selected, (selected.id.charCodeAt(2) || 4) % 60);
                      return (
                        <Card tight>
                          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                            <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft">
                              Institutional ecosystem · {selected.archetype}
                            </h3>
                            <span className="text-[10px] text-ink-muted">
                              {eco.stats.groups} groups · {eco.stats.systems} systems · {eco.stats.operational} operational · {eco.stats.meanHealth}% mean
                            </span>
                          </div>
                          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                            {eco.groups.map(g => (
                              <div key={g.key} className="rounded-[3px] border border-line-soft bg-surface-2/40 p-2">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[11px] font-semibold text-ink">{g.name}</span>
                                  <span className="font-mono text-[10px] tabular-nums" style={{ color: `rgb(var(--c-${g.tone}))` }}>{g.health}%</span>
                                </div>
                                <div className="mb-1 text-[9px] text-ink-muted">{g.purpose}</div>
                                <ul className="space-y-0.5">
                                  {g.systems.map(s => {
                                    const c = s.status === 'operational' ? 'rgb(var(--c-ok))' : s.status === 'degraded' ? 'rgb(var(--c-alert))' : 'rgb(var(--c-ink-muted))';
                                    return (
                                      <li key={s.name} className="flex items-center gap-1.5 text-[10px]">
                                        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: c }} />
                                        <span className="min-w-0 flex-1 truncate text-ink-soft">{s.name}</span>
                                        <span className="shrink-0 text-[8px] uppercase tracking-wider text-ink-muted">{systemKindLabel(s.kind)}</span>
                                        <span className="w-9 shrink-0 text-right font-mono text-[9px] tabular-nums" style={{ color: c }}>{s.uptime}%</span>
                                      </li>
                                    );
                                  })}
                                </ul>
                              </div>
                            ))}
                          </div>
                        </Card>
                      );
                    })()}

                    {activeAlerts.length > 0 ? (
                      <Card tight>
                        <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft">Operational alerts</h3>
                        <ul className="mt-2 space-y-2">
                          {activeAlerts.map(({ m, a }, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <SeverityBadge severity={a.severity} />
                              <span>
                                <strong>{a.label}</strong> · {m}
                                <div className="text-ink-muted">{a.detail}</div>
                              </span>
                            </li>
                          ))}
                        </ul>
                      </Card>
                    ) : null}

                    <section aria-label="Module operations" className="space-y-3" data-bw-hide-empty>
                      <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft">Operational dashboards</h3>
                      {ops.modules.map(mod => (
                        <Card tight key={mod.module}>
                          <div className="flex items-baseline justify-between gap-2">
                            <strong>{mod.title}</strong>
                            <span className="font-mono text-xs text-ink-muted">{mod.module}</span>
                          </div>
                          {mod.kpis.length > 0 ? (
                            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                              {mod.kpis.map(k => (
                                <div key={k.label} className="rounded-[3px] border border-line p-2">
                                  <div className="text-xs text-ink-muted">{k.label}</div>
                                  <div className="flex items-baseline gap-2">
                                    <span className="font-mono text-lg tabular-nums">{k.value}</span>
                                    <Pill tone={k.tone}>{k.tone}</Pill>
                                  </div>
                                  {k.target ? (
                                    <div className="text-xs text-ink-muted">target {k.target}</div>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                          ) : null}
                          {mod.queues.length > 0 ? (
                            <div className="mt-3 space-y-2">
                              {mod.queues.map(q => (
                                <div key={q.label}>
                                  <div className="flex justify-between text-sm">
                                    <span>{q.label}</span>
                                    <span className="text-ink-muted">
                                      {q.depth} · oldest {q.oldestAgeHours}h / SLA {Math.round(q.slaHours / 24)}d
                                    </span>
                                  </div>
                                  <div className="mt-1">
                                    <ThresholdBar value={q.oldestAgeHours} threshold={q.slaHours} breaching={q.breaching} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </Card>
                      ))}
                    </section>
                  </div>
                );
              })()}

              <div className="grid gap-4 md:grid-cols-2">
                <Card tight>
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft">Departments</h3>
                  <ul className="mt-2 space-y-1 text-sm">
                    {selected.departments.map(d => <li key={d.id}>{d.name}</li>)}
                    {selected.departments.length === 0 ? <li className="text-ink-muted">None configured.</li> : null}
                  </ul>
                </Card>
                <Card tight>
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft">Active operational modules</h3>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {selected.modules.filter(m => m.enabled).map(m => (
                      <Pill key={m.moduleKey} tone="ok">{m.moduleKey}</Pill>
                    ))}
                    {selected.modules.filter(m => m.enabled).length === 0 ? (
                      <span className="text-sm text-ink-muted">No modules enabled.</span>
                    ) : null}
                  </div>
                  {selected.modules.some(m => !m.enabled) ? (
                    <div className="mt-3">
                      <div className="text-sm text-ink-muted">Disabled:</div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {selected.modules.filter(m => !m.enabled).map(m => (
                          <Pill key={m.moduleKey}>{m.moduleKey}</Pill>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </Card>
              </div>

              <Plain>
                Shared sovereign core is inherited by every institution:
                identity, audit, RBAC, observability, workflows, notifications,
                interoperability, documents, payments. Configure structure in{' '}
                <Link href="/ministries" className="text-link underline underline-offset-2">Institutions</Link>.
              </Plain>

              <p className="text-sm text-ink-muted">
                What this view never shows: individual citizen records, officer
                click data, political affiliations. Per Companions 156 and 158.
              </p>
            </>
          ) : null}
        </div>
      )}
    </CommandShell>
  );
}
