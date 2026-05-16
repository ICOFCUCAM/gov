'use client';

import * as React from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { TONE } from '@/components/features/SituationRoom';
import { useFederationSync } from '@/apps/useFederationSync';
import { subscribe as orchSubscribe, findApp, activatedApps } from '@/services/orchestration-engine';
import { SubsystemConsole } from '@/components/features/SubsystemConsole';
import { BranchWorkspace } from '@/components/features/BranchWorkspace';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { archetypeOperations } from '@/lib/gov/archetype-operations';
import { policeOps, emergencyOps, immigrationOps, customsOps } from '@/lib/gov/agency-systems';
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
export function AppHost({ domain }: { domain: string }) {
  const [mins, setMins] = React.useState<Ministry[]>([]);
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    api.org.ministries().then(r => setMins(r.ministries)).catch(() => {});
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  useFederationSync(mins);
  React.useSyncExternalStore(orchSubscribe, () => activatedApps().length, () => 0);

  const app = findApp(domain);
  const [navKey, setNavKey] = React.useState<string | null>(null);
  const active = navKey ?? app?.nav[0]?.key ?? null;

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
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-line bg-surface px-4">
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
        <span className="ml-auto font-mono text-[10px] tabular-nums text-ink-muted">{new Date(now).toLocaleTimeString()}</span>
        <Link href="/gov/shell" className="text-[10px] text-link underline underline-offset-2">Sovereign platform →</Link>
      </header>

      <div className="flex min-h-0 flex-1">
        <nav aria-label={`${app.label} navigation`} className="hidden w-[200px] shrink-0 flex-col border-r border-line bg-bg py-1 lg:flex">
          <div className="px-3 pb-1 pt-2 text-[8px] font-semibold uppercase tracking-[0.18em] text-ink-muted">{app.label}</div>
          {app.nav.map(s => (
            <button key={s.key} onClick={() => setNavKey(s.key)}
              className={'focus-ring border-l-2 px-3 py-1.5 text-left text-[11px] transition-colors ' + (active === s.key ? 'border-link bg-surface-2 font-medium text-ink' : 'border-transparent text-ink-muted hover:bg-surface-2/50 hover:text-ink')}>
              {s.label}
            </button>
          ))}
        </nav>

        <main className="min-h-0 flex-1 overflow-y-auto p-3">
          {!app.activated ? (
            <p className="text-[12px] text-ink-muted">This sovereign application is provisioned but not activated. Activate the institution from the platform to bring its operational systems online.</p>
          ) : app.kind === 'ministry' && app.instanceId ? (
            <SubsystemConsole id={app.instanceId} group={active ?? 'command'} />
          ) : app.kind === 'branch' ? (
            <BranchWorkspace branchKey={app.archetypeOrBranch} />
          ) : (
            <AgencyApp appId={app.id} label={app.label} archetype={app.archetypeOrBranch as ArchetypeKey} navKey={active ?? 'command'} now={now} />
          )}
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

function AgencyApp({ appId, label, archetype, navKey, now }: { appId: string; label: string; archetype: ArchetypeKey; navKey: string; now: number }) {
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

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {stats.map(s => <Stat key={s.l} {...s} />)}
      </div>
      <RuntimeQueue scope={`${appId}:${navKey}`} kind={kind} title={`${label} · ${navKey} runtime — executable workflow`} by="Duty Officer" />
    </div>
  );
}
