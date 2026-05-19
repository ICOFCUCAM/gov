'use client';

import * as React from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { TONE } from '@/components/features/SituationRoom';
import { useFederationSync } from '@/apps/useFederationSync';
import { subscribe as orchSubscribe, findApp, version as orchVersion } from '@/services/orchestration-engine';
import { publish as busPublish } from '@/services/event-bus';
import { SectorInstitutionApp } from '@/apps/sector/SectorInstitutionApp';
import { MinistryHealthApp } from '@/apps/ministry-health/MinistryHealthApp';
import { HealthEcosystemWall } from '@/apps/ministry-health/HealthEcosystemWall';
import { TreasuryApp } from '@/apps/treasury/TreasuryApp';
import { JudiciaryApp } from '@/apps/judiciary/JudiciaryApp';
import { LegislatureApp } from '@/apps/legislature/LegislatureApp';
import { PoliceCommandApp } from '@/apps/police-command/PoliceCommandApp';
import { ImmigrationApp } from '@/apps/immigration/ImmigrationApp';
import { CustomsApp } from '@/apps/customs/CustomsApp';
import { EmergencyResponseApp } from '@/apps/emergency-response/EmergencyResponseApp';
import { MinistryEducationApp } from '@/apps/ministry-education/MinistryEducationApp';
import { MinistryTransportApp } from '@/apps/ministry-transport/MinistryTransportApp';
import { MinistryEnergyApp } from '@/apps/ministry-energy/MinistryEnergyApp';
import { MinistryInteriorApp } from '@/apps/ministry-interior/MinistryInteriorApp';
import { CitizenWalletApp } from '@/apps/citizen-wallet/CitizenWalletApp';
import { OfficerConsoleApp } from '@/apps/officer-console/OfficerConsoleApp';
import { BranchWorkspace } from '@/components/features/BranchWorkspace';
import { DirectivesInbox } from '@/apps/_shared/AppKit';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { archetypeOperations } from '@/lib/gov/archetype-operations';
import { policeOps, emergencyOps, immigrationOps, customsOps } from '@/lib/gov/agency-systems';
import { citizenWallet, officerConsole } from '@/lib/gov/citizen-systems';
import { aiAdvisory } from '@/shared/ai/advisory';
import { interoperabilityFabric } from '@/services/interoperability-fabric';
import { federationPosture } from '@/services/federation-aggregate';
import { PosturePill } from '@/apps/_shared/AppKit';
import { ROLES, type SovereignRole, type Capability } from '@/shared/permissions/rbac';
import { evaluateConstitution, type AppKind } from '@/services/constitutional-engine';
import { escalationState } from '@/shared/sovereignty/escalation';
import { subscribe as auditSubscribe, auditTrail, verifyChain, version as auditVersion } from '@/services/audit-ledger';
import { legislativeState } from '@/lib/gov/legislative-engine';
import { wave } from '@/lib/telemetry';
import type { Ministry, ArchetypeKey } from '@/lib/api/types';
import type { WorkKind } from '@/lib/gov/runtime-workflow';

/**
 * Federated Application Host.
 *
 * Boots an institutional application independently of the platform shell:
 * its own chrome, its own navigation derived from the registry manifest,
 * its own routing. The platform core is NOT mounted here — this is a
 * sovereign deployable application surface.
 */
export function AppHost({ domain, initialKey }: { domain: string; initialKey?: string }) {
  const [mins, setMins] = React.useState<Ministry[]>([]);
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    api.org.ministries().then(r => setMins(r.ministries)).catch(() => {});
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  useFederationSync(mins);
  React.useSyncExternalStore(orchSubscribe, orchVersion, orchVersion);

  const app = findApp(domain);
  React.useEffect(() => {
    if (app?.activated) busPublish('institution.metric', app.id, { domain: app.domain, kind: app.kind });
  }, [app?.id, app?.activated]);
  const [navKey, setNavKey] = React.useState<string | null>(initialKey ?? null);
  const selectNav = React.useCallback((k: string) => {
    setNavKey(k);
    if (typeof window !== 'undefined') window.history.replaceState(null, '', `/app/${domain}/${k}`);
  }, [domain]);
  const [role, setRole] = React.useState<SovereignRole>('commander');
  const isHealth = app?.kind === 'ministry' && app?.archetypeOrBranch === 'HEALTH';
  const navItems = app
    ? (isHealth ? [{ key: 'ecosystem', label: 'Operating Ecosystem' }, ...app.nav] : app.nav)
    : [];
  const active = navKey ?? navItems[0]?.key ?? null;

  if (!app) {
    return (
      <div className="grid min-h-screen place-items-center bg-bg p-6 text-center">
        <div>
          <div className="text-base font-semibold uppercase tracking-[0.16em] text-ink">Application not provisioned</div>
          <p className="mt-2 text-[12px] text-ink-muted">No sovereign application is registered at <code>{domain}.gov</code>. Provision it from the platform.</p>
          <Link href="/gov/shell" className="mt-3 inline-block text-[12px] text-link underline underline-offset-2">← Sovereign platform</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-line px-4" style={{ background: 'linear-gradient(100deg,#070b12,#0c1622 60%,#0a1420)' }}>
        <span className="grid h-7 w-7 place-items-center rounded-[3px] text-[10px] font-bold text-white" style={{ backgroundColor: app.activated ? 'rgb(var(--c-link))' : 'rgb(var(--c-line))' }}>
          {app.domain.slice(0, 2).toUpperCase()}
        </span>
        <div className="leading-tight">
          <div className="text-[12px] font-semibold tracking-[0.14em] text-ink">{app.label}</div>
          <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-muted">{app.domain}.gov · {app.kind} application</div>
        </div>
        <span className="ml-2 rounded-[3px] border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.16em]"
          style={{ borderColor: app.activated ? TONE.ok : TONE.warn, color: app.activated ? TONE.ok : TONE.warn }}>
          {app.activated ? 'operational' : 'provisioned · inactive'}
        </span>
        <label className="ml-auto flex items-center gap-1 text-[9px] uppercase tracking-wider text-ink-muted">
          Role
          <select value={role} onChange={e => setRole(e.target.value as SovereignRole)}
            className="rounded-[3px] border border-line bg-surface px-1.5 py-0.5 text-[10px] text-ink-soft">
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </label>
        <span className="font-mono text-[10px] tabular-nums text-ink-muted">{new Date(now).toLocaleTimeString()}</span>
        <Link href="/gov/shell" className="text-[10px] text-link underline underline-offset-2">Sovereign platform →</Link>
      </header>

      <div className="flex min-h-0 flex-1">
        <nav aria-label={`${app.label} navigation`} className="hidden w-[200px] shrink-0 flex-col border-r border-line bg-bg py-1 lg:flex">
          <div className="px-3 pb-1 pt-2 text-[8px] font-semibold uppercase tracking-[0.18em] text-ink-muted">{app.label}</div>
          {navItems.map(s => (
            <button key={s.key} onClick={() => selectNav(s.key)}
              className={'focus-ring border-l-2 px-3 py-1.5 text-left text-[11px] transition-colors ' + (active === s.key ? 'border-link bg-surface-2 font-medium text-ink' : 'border-transparent text-ink-muted hover:bg-surface-2/50 hover:text-ink')}>
              {s.label}
            </button>
          ))}
        </nav>

        <main className="min-h-0 flex-1 overflow-y-auto p-3">
          {(() => {
            const stress = Math.round(wave(`con:${app.domain}`, now / 4000, 18, 96));
            const auditScope =
              app.kind === 'ministry' && app.instanceId ? `${app.instanceId}:${active ?? 'command'}`
                : app.kind === 'branch' ? `${app.archetypeOrBranch === 'legislature' ? 'leg' : 'jud'}:${app.archetypeOrBranch}`
                  : `${app.id}:${active ?? 'command'}`;
            const chain = verifyChain(auditScope);
            // Emergency powers are a real, time-bound constitutional
            // instrument: severe sustained stress asserts an emergency at a
            // deterministic prior hour, with a constituted renewal enacted
            // mid-window. The lifecycle clock then governs sunset/lapse —
            // no synthetic age.
            const nowHrs = now / 4000;
            const emergency = stress >= 88
              ? {
                  scope: app.domain,
                  authority: app.kind === 'branch' ? 'Apex authority' : 'Cabinet emergency cell',
                  assertedAtHrs: nowHrs - (stress - 50),
                  renewals: [{ atHrs: nowHrs - (stress - 50) / 2, authority: 'Legislature' }],
                }
              : null;
            const verdict = evaluateConstitution({
              kind: app.kind as AppKind, domain: app.domain, stress,
              emergencyAsserted: emergency != null, emergency, nowHrs,
              auditIntact: chain.intact,
            });
            // Constitutional execution-chain: the Treasury may not execute
            // spending capabilities while the Legislature withholds fiscal
            // authorisation (no quorum / blocked appropriation).
            let withheld: Capability[] = verdict.withheld as Capability[];
            let fiscalGate: string | null = null;
            if (app.domain === 'treasury') {
              const lg = legislativeState(now / 4000);
              if (!lg.quorum || lg.blocked >= 3) {
                if (!withheld.includes('approve')) withheld = [...withheld, 'approve'];
                fiscalGate = !lg.quorum
                  ? 'Fiscal authorisation withheld — Legislature has no quorum (constitutional gate)'
                  : `Appropriation stalled — ${lg.blocked} blocked bills (constitutional gate)`;
              }
            }
            // Cross-institution chain feedback: procurement-bearing
            // institutions are constrained when Treasury liquidity is low.
            let chainConstraint: string | null = null;
            if (['health', 'education', 'transport', 'energy'].includes(app.domain)) {
              const trOp = federationPosture(mins, now / 4000).institutions.find(i => i.archetype === 'FINANCE')?.operational;
              if (trOp != null && trOp < 75) {
                chainConstraint = `Procurement constrained — Treasury liquidity ${trOp} (cross-institution chain)`;
              }
            }
            const vt = verdict.posture === 'breach' ? 'alert' : fiscalGate ? 'alert' : verdict.posture === 'under-review' ? 'warn' : 'ok';
            return (
              <>
                <div className="mb-2 rounded-[3px] border border-line bg-surface p-2" style={{ borderLeft: `3px solid rgb(var(--c-${vt}))` }}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: `rgb(var(--c-${vt}))` }}>
                      Constitutional posture <PosturePill label={verdict.posture} tone={vt as 'ok' | 'warn' | 'alert'} />
                    </span>
                    {withheld.length ? (
                      <span className="text-[9px] text-ink-muted">withholding: {withheld.join(', ')}</span>
                    ) : <span className="text-[9px] text-ink-muted">all capabilities constitutionally available</span>}
                    {fiscalGate ? <span className="text-[9px] font-semibold" style={{ color: 'rgb(var(--c-alert))' }}>⛔ {fiscalGate}</span> : null}
                    {chainConstraint ? <span className="text-[9px] font-semibold" style={{ color: 'rgb(var(--c-warn))' }}>⛓ {chainConstraint}</span> : null}
                    {(() => {
                      const es = escalationState(app.kind as AppKind, stress);
                      const archMap: Record<string, string> = { health: 'HEALTH', treasury: 'FINANCE', education: 'EDUCATION', transport: 'TRANSPORT', energy: 'ENERGY' };
                      const mineOp = federationPosture(mins, now / 4000).institutions.find(i => i.archetype === archMap[app.domain]);
                      return (
                        <span className="ml-auto text-[9px] text-ink-muted">
                          {mineOp ? <>national contribution · <span style={{ color: `rgb(var(--c-${mineOp.tone}))` }}>{mineOp.operational}</span> · </> : null}
                          escalation tier · <span className="text-ink-soft">{es.current}</span>
                          {es.next ? ` → next: ${es.next.tier} (${es.next.authority})` : ' · apex'}
                        </span>
                      );
                    })()}
                  </div>
                  {verdict.emergency.phase !== 'none' ? (() => {
                    const ep = verdict.emergency;
                    const et = ep.phase === 'lapsed' ? 'alert' : ep.phase === 'renewal-due' ? 'warn' : 'ok';
                    return (
                      <div className="mt-1 flex flex-wrap items-center gap-2 rounded-[2px] border border-line bg-surface-2/40 px-1.5 py-1">
                        <span className="text-[8.5px] font-semibold uppercase tracking-[0.16em]" style={{ color: `rgb(var(--c-${et}))` }}>
                          Emergency powers · {ep.phase}
                        </span>
                        <span className="font-mono text-[9px] tabular-nums text-ink-muted">
                          age {ep.ageHrs}h · {ep.renewalCount} renewal{ep.renewalCount === 1 ? '' : 's'} · sunset {ep.hrsToSunset > 0 ? `in ${ep.hrsToSunset}h` : `lapsed ${Math.abs(ep.hrsToSunset)}h ago`}
                        </span>
                        <span className="text-[9px] text-ink-soft">{ep.detail}</span>
                      </div>
                    );
                  })() : null}
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5">
                    {verdict.checks.map(c => (
                      <span key={c.rule} className="text-[8.5px]" style={{ color: c.status === 'breach' ? 'rgb(var(--c-alert))' : c.status === 'watch' ? 'rgb(var(--c-warn))' : 'rgb(var(--c-ink-muted))' }}>
                        {c.rule}: {c.status}
                      </span>
                    ))}
                  </div>
                </div>
                {(() => {
                  const adv = aiAdvisory(app.label, [
                    { label: 'Operational stress', value: stress, adverse: true },
                    { label: 'Audit integrity', value: chain.intact ? 8 : 92, adverse: true },
                    { label: 'Constitutional posture', value: verdict.posture === 'breach' ? 92 : verdict.posture === 'under-review' ? 56 : 14, adverse: true },
                  ]);
                  const at = adv.severity === 'critical' || adv.severity === 'priority' ? 'alert' : adv.severity === 'advisory' ? 'warn' : 'ok';
                  return (
                    <div className="mb-2 rounded-[3px] border border-line bg-surface p-2" style={{ borderLeft: `3px solid rgb(var(--c-${at}))` }}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: `rgb(var(--c-${at}))` }}>AI advisory · {adv.severity}</span>
                        <span className="font-mono text-[9px] tabular-nums text-ink-muted">confidence {adv.confidence}%</span>
                      </div>
                      <div className="mt-0.5 text-[11px] text-ink">{adv.headline}</div>
                      <div className="text-[9px] text-ink-muted">{adv.rationale}</div>
                      <ul className="mt-0.5 flex flex-wrap gap-x-4">
                        {adv.recommended.map((r, i) => <li key={i} className="text-[9px] text-ink-soft">▸ {r}</li>)}
                      </ul>
                    </div>
                  );
                })()}
                {app.activated ? (
                  <div className="mb-2">
                    <DirectivesInbox
                      instKeys={[app.instanceId, app.id, app.domain].filter(Boolean) as string[]}
                      by={app.label} role={role} withheld={withheld}
                    />
                  </div>
                ) : null}
                {!app.activated ? (
                  <p className="text-[12px] text-ink-muted">This sovereign application is provisioned but not activated. Activate the institution from the platform to bring its operational systems online.</p>
                ) : app.kind === 'ministry' && app.instanceId && app.archetypeOrBranch === 'HEALTH' ? (
                  active === 'ecosystem'
                    ? <HealthEcosystemWall />
                    : <MinistryHealthApp instanceId={app.instanceId} domain={active ?? 'command'} now={now} role={role} withheld={withheld} />
                ) : app.kind === 'ministry' && app.instanceId && app.archetypeOrBranch === 'FINANCE' ? (
                  <TreasuryApp instanceId={app.instanceId} domain={active ?? 'command'} now={now} role={role} withheld={withheld} />
                ) : app.kind === 'ministry' && app.instanceId && app.archetypeOrBranch === 'EDUCATION' ? (
                  <MinistryEducationApp instanceId={app.instanceId} domain={active ?? 'command'} now={now} role={role} withheld={withheld} />
                ) : app.kind === 'ministry' && app.instanceId && app.archetypeOrBranch === 'TRANSPORT' ? (
                  <MinistryTransportApp instanceId={app.instanceId} domain={active ?? 'command'} now={now} role={role} withheld={withheld} />
                ) : app.kind === 'ministry' && app.instanceId && app.archetypeOrBranch === 'ENERGY' ? (
                  <MinistryEnergyApp instanceId={app.instanceId} domain={active ?? 'command'} now={now} role={role} withheld={withheld} />
                ) : app.kind === 'ministry' && app.instanceId && app.archetypeOrBranch === 'INTERIOR' ? (
                  <MinistryInteriorApp instanceId={app.instanceId} domain={active ?? 'national-overview'} now={now} role={role} withheld={withheld} />
                ) : app.kind === 'ministry' && app.instanceId ? (
                  <SectorInstitutionApp instanceId={app.instanceId} archetype={app.archetypeOrBranch as ArchetypeKey} label={app.label} domain={active ?? 'command'} now={now} role={role} withheld={withheld} />
                ) : app.kind === 'branch' && app.archetypeOrBranch === 'judiciary' ? (
                  <JudiciaryApp instanceId={`jud:${app.archetypeOrBranch}`} domain={active ?? 'constitutional'} now={now} role={role} withheld={withheld} />
                ) : app.kind === 'branch' && app.archetypeOrBranch === 'legislature' ? (
                  <LegislatureApp domain={active ?? 'bills'} now={now} role={role} withheld={withheld} />
                ) : app.kind === 'branch' ? (
                  <BranchWorkspace branchKey={app.archetypeOrBranch} />
                ) : app.id === 'police-command' ? (
                  <PoliceCommandApp appId={app.id} domain={active ?? 'strategic-command'} now={now} role={role} withheld={withheld} />
                ) : app.id === 'immigration' ? (
                  <ImmigrationApp appId={app.id} domain={active ?? 'border'} now={now} role={role} withheld={withheld} />
                ) : app.id === 'customs' ? (
                  <CustomsApp appId={app.id} domain={active ?? 'clearance'} now={now} role={role} withheld={withheld} />
                ) : app.id === 'emergency-response' ? (
                  <EmergencyResponseApp appId={app.id} domain={active ?? 'command'} now={now} role={role} withheld={withheld} />
                ) : app.id === 'citizen-wallet' ? (
                  <CitizenWalletApp appId={app.id} domain={active ?? 'identity'} now={now} role={role} withheld={withheld} />
                ) : app.id === 'officer-console' ? (
                  <OfficerConsoleApp appId={app.id} domain={active ?? 'queue'} now={now} role={role} withheld={withheld} />
                ) : (
                  <AgencyApp appId={app.id} label={app.label} archetype={app.archetypeOrBranch as ArchetypeKey} navKey={active ?? 'command'} now={now} role={role} withheld={withheld} />
                )}
                {(() => {
                  const iof = interoperabilityFabric(mins, now / 4000);
                  const mine = iof.edges.filter(e => e.from === app.instanceId || e.to === app.instanceId
                    || e.fromName.toLowerCase().includes(app.domain) || e.toName.toLowerCase().includes(app.domain)).slice(0, 6);
                  if (mine.length === 0) return null;
                  return (
                    <div className="mt-2 rounded-[3px] border border-line bg-surface p-2">
                      <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-soft">Interoperability contracts · {app.domain}.gov</div>
                      <div className="space-y-0.5">
                        {mine.map((e, i) => (
                          <div key={i} className="flex items-center gap-2 text-[10px]">
                            <span className="min-w-0 flex-1 truncate text-ink-soft">{e.fromName} → {e.toName}</span>
                            <span className="shrink-0 truncate text-[8.5px] text-ink-muted">{e.relation}</span>
                            <span className="w-8 shrink-0 text-right font-mono tabular-nums" style={{ color: `rgb(var(--c-${e.tone}))` }}>{e.health}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
                <AuditPanel scope={auditScope} chainIntact={chain.intact} brokenAt={chain.brokenAt} />
              </>
            );
          })()}
        </main>
      </div>
    </div>
  );
}

function Stat({ l, v, t }: { l: string; v: string; t?: string }) {
  return (
    <div className="rounded-[3px] border border-line bg-surface px-3 py-2">
      <div className="truncate text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">{l}</div>
      <div className="font-mono text-[15px] tabular-nums" style={{ color: t ? `rgb(var(--c-${t}))` : 'rgb(var(--c-ink))' }}>{v}</div>
    </div>
  );
}

function AgencyApp({ appId, label, archetype, navKey, now, role, withheld = [] }: { appId: string; label: string; archetype: ArchetypeKey; navKey: string; now: number; role: SovereignRole; withheld?: Capability[] }) {
  const ts = now / 4000;
  const kind: WorkKind =
    /incident|command|dispatch|emergency|recovery|enforcement/i.test(navKey) ? 'incident'
      : /permit|visa|clearance|registry|identity/i.test(navKey) ? 'permit'
        : /payment|revenue|tariff/i.test(navKey) ? 'procurement'
          : 'case';

  let stats: { l: string; v: string; t?: string }[] = [];
  if (appId === 'police-command') {
    const o = policeOps(appId, ts);
    stats = [
      { l: 'Active incidents', v: `${o.activeIncidents}`, t: o.activeIncidents > 90 ? 'alert' : 'warn' },
      { l: 'Units deployed', v: `${o.unitsDeployed}/${o.unitsTotal}`, t: 'ok' },
      { l: 'Mean response', v: `${o.meanResponseMin}m`, t: o.meanResponseMin >= 18 ? 'alert' : o.meanResponseMin >= 12 ? 'warn' : 'ok' },
      { l: 'Clearance rate', v: `${o.clearanceRatePct}%`, t: o.clearanceRatePct >= 70 ? 'ok' : 'warn' },
      { l: 'Open investigations', v: o.openInvestigations.toLocaleString(), t: 'warn' },
      { l: 'Custody occupancy', v: `${o.custodyOccupancyPct}%`, t: o.custodyOccupancyPct >= 110 ? 'alert' : o.custodyOccupancyPct >= 95 ? 'warn' : 'ok' },
    ];
  } else if (appId === 'emergency-response') {
    const o = emergencyOps(appId, ts);
    stats = [
      { l: 'Active crises', v: `${o.activeCrises}`, t: o.activeCrises >= 4 ? 'alert' : o.activeCrises ? 'warn' : 'ok' },
      { l: 'Severity', v: o.severity, t: o.severity === 'national' || o.severity === 'major' ? 'alert' : o.severity === 'elevated' ? 'warn' : 'ok' },
      { l: 'Responders available', v: `${o.respondersAvailable}/${o.responders}`, t: 'ok' },
      { l: 'Mean mobilise', v: `${o.meanMobiliseMin}m`, t: o.meanMobiliseMin >= 25 ? 'alert' : 'warn' },
      { l: 'Shelters open', v: `${o.sheltersOpen}`, t: o.sheltersOpen ? 'warn' : 'ok' },
      { l: 'Resource cover', v: `${o.resourceCoverPct}%`, t: o.resourceCoverPct >= 70 ? 'ok' : 'warn' },
    ];
  } else if (appId === 'immigration') {
    const o = immigrationOps(appId, ts);
    stats = [
      { l: 'Borders open', v: `${o.bordersOpen}/${o.bordersTotal}`, t: o.bordersOpen < o.bordersTotal ? 'warn' : 'ok' },
      { l: 'Crossings today', v: o.crossingsToday.toLocaleString(), t: 'ok' },
      { l: 'Visa backlog', v: o.visaBacklog.toLocaleString(), t: o.visaBacklog > 5000 ? 'alert' : 'warn' },
      { l: 'Visa SLA met', v: `${o.visaSlaMetPct}%`, t: o.visaSlaMetPct >= 80 ? 'ok' : 'warn' },
      { l: 'Residents', v: `${o.residentsRegisteredM}M`, t: 'ok' },
      { l: 'Flagged entries', v: `${o.flaggedEntries}`, t: o.flaggedEntries > 90 ? 'alert' : 'warn' },
    ];
  } else if (appId === 'customs') {
    const o = customsOps(appId, ts);
    stats = [
      { l: 'Declarations today', v: o.declarationsToday.toLocaleString(), t: 'ok' },
      { l: 'Clearance median', v: `${o.clearanceMedianHrs}h`, t: o.clearanceMedianHrs >= 36 ? 'alert' : o.clearanceMedianHrs >= 18 ? 'warn' : 'ok' },
      { l: 'Revenue index', v: `${o.revenueIdx}`, t: o.revenueIdx >= 70 ? 'ok' : 'warn' },
      { l: 'Inspection rate', v: `${o.inspectionRatePct}%`, t: 'ok' },
      { l: 'Seizures', v: `${o.seizures}`, t: o.seizures > 20 ? 'alert' : 'warn' },
      { l: 'Corridors open', v: `${o.corridorsOpen}/${o.corridorsTotal}`, t: o.corridorsOpen < o.corridorsTotal ? 'warn' : 'ok' },
    ];
  } else if (appId === 'citizen-wallet') {
    const w = citizenWallet(appId, ts);
    stats = [
      { l: 'Citizens enrolled', v: `${w.enrolledM}M`, t: 'ok' },
      { l: 'Identity verified', v: `${w.identityVerifiedPct}%`, t: w.identityVerifiedPct >= 85 ? 'ok' : 'warn' },
      { l: 'Active requests', v: w.activeServiceRequests.toLocaleString(), t: 'ok' },
      { l: 'Payments today', v: `${w.paymentsTodayM}M`, t: 'ok' },
      { l: 'Applications pending', v: w.applicationsPending.toLocaleString(), t: w.applicationsPending > 18000 ? 'warn' : 'ok' },
      { l: 'Services uptime', v: `${w.servicesUptimePct}%`, t: w.servicesUptimePct >= 99 ? 'ok' : 'warn' },
    ];
  } else if (appId === 'officer-console') {
    const o = officerConsole(appId, ts);
    stats = [
      { l: 'Officers online', v: `${o.officersOnline}`, t: 'ok' },
      { l: 'Decisions queue', v: o.decisionsQueue.toLocaleString(), t: o.decisionsQueue > 2500 ? 'alert' : o.decisionsQueue > 1200 ? 'warn' : 'ok' },
      { l: 'Review backlog', v: o.reviewBacklog.toLocaleString(), t: o.reviewBacklog > 3500 ? 'alert' : 'warn' },
      { l: 'SLA met', v: `${o.slaMetPct}%`, t: o.slaMetPct >= 80 ? 'ok' : 'warn' },
      { l: 'Dispositions today', v: o.dispositionsToday.toLocaleString(), t: 'ok' },
      { l: 'Escalations open', v: `${o.escalationsOpen}`, t: o.escalationsOpen > 30 ? 'alert' : o.escalationsOpen ? 'warn' : 'ok' },
    ];
  } else {
    const ao = archetypeOperations(appId, archetype === ('GENERIC' as ArchetypeKey) ? 'INTERIOR' : archetype, ts);
    stats = [
      { l: 'Posture', v: ao.command.posture, t: ao.command.postureTone },
      { l: 'Readiness', v: `${ao.command.readiness}%`, t: ao.command.readiness >= 70 ? 'ok' : 'warn' },
      { l: 'Mean operational', v: `${ao.meanOperational}%`, t: ao.meanOperational >= 78 ? 'ok' : 'warn' },
      { l: 'Open requests', v: ao.citizen.openRequests.toLocaleString(), t: 'ok' },
      { l: 'Escalation', v: `L${ao.command.escalationTier}`, t: ao.command.escalationTier >= 2 ? 'alert' : 'ok' },
      { l: 'Staffed', v: `${ao.personnel.staffedPct}%`, t: ao.personnel.staffedPct >= 80 ? 'ok' : 'warn' },
    ];
  }

  const adv = aiAdvisory(label, stats.map(s => ({
    label: s.l, value: s.t === 'alert' ? 80 : s.t === 'warn' ? 55 : 20, adverse: s.t === 'alert' || s.t === 'warn',
  })));
  const advTone = adv.severity === 'critical' ? 'alert' : adv.severity === 'priority' ? 'alert' : adv.severity === 'advisory' ? 'warn' : 'ok';

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {stats.map(s => <Stat key={s.l} {...s} />)}
      </div>
      <div className="rounded-[3px] border border-line bg-surface p-2.5" style={{ borderLeft: `3px solid rgb(var(--c-${advTone}))` }}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: `rgb(var(--c-${advTone}))` }}>AI advisory · {adv.severity}</span>
          <span className="font-mono text-[9px] tabular-nums text-ink-muted">confidence {adv.confidence}%</span>
        </div>
        <div className="mt-0.5 text-[11px] text-ink">{adv.headline}</div>
        <div className="text-[9px] text-ink-muted">{adv.rationale}</div>
        <ul className="mt-1 space-y-0.5">
          {adv.recommended.map((r, i) => (
            <li key={i} className="flex gap-1.5 text-[10px] text-ink-soft"><span style={{ color: `rgb(var(--c-${advTone}))` }}>▸</span>{r}</li>
          ))}
        </ul>
      </div>
      <RuntimeQueue scope={`${appId}:${navKey}`} kind={kind} title={`${label} · ${navKey} runtime — executable workflow`} by="Duty Officer" role={role} withheld={withheld} />
    </div>
  );
}

function AuditPanel({ scope, chainIntact, brokenAt }: { scope: string; chainIntact: boolean; brokenAt: number | null }) {
  React.useSyncExternalStore(auditSubscribe, auditVersion, auditVersion);
  const trail = auditTrail(scope, 12);
  return (
    <div className="mt-2 rounded-[3px] border border-line bg-surface p-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-soft">Sovereign audit chain · {scope}</span>
        <span className="rounded-[3px] px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider"
          style={{ backgroundColor: `color-mix(in srgb, rgb(var(--c-${chainIntact ? 'ok' : 'alert'})) 16%, transparent)`, color: `rgb(var(--c-${chainIntact ? 'ok' : 'alert'}))` }}>
          {chainIntact ? 'intact' : `broken @${brokenAt}`}
        </span>
      </div>
      {trail.length === 0 ? (
        <p className="mt-1 text-[9px] text-ink-muted">No audited actions in this scope yet — drive the runtime to generate a tamper-evident trail.</p>
      ) : (
        <div className="mt-1 space-y-0.5">
          {trail.map(e => (
            <div key={e.seq} className="flex items-center gap-2 text-[9px]">
              <span className="w-8 shrink-0 font-mono tabular-nums text-ink-muted">#{e.seq}</span>
              <span className="w-16 shrink-0 font-mono tabular-nums text-ink-muted">{new Date(e.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
              <span className="min-w-0 flex-1 truncate text-ink-soft">{e.action} · {e.subject} · {e.detail}</span>
              <span className="w-20 shrink-0 truncate text-right text-ink-muted">{e.actor}</span>
              <span className="w-16 shrink-0 text-right font-mono text-[8px] text-ink-muted">{e.hash}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
