'use client';

// apps/ministry-health/subsystems/HospitalSystem — a TRUE hospital-network
// execution system: regional capacity grid with surge/divert, ICU
// orchestration, operating-theatre management, ambulance zone
// coordination, national capacity telemetry, AI guidance and the
// executable admissions runtime. Multi-role aware.

import * as React from 'react';
import { CommandHeader, CommandPanel, KpiTile, RingGauge, sc, ACCENT } from '@/apps/_shared/SovereignUI';
import { GeoMap } from '@/apps/_shared/GeoMap';
import { healthGeo } from '@/lib/gov/health-geo';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { hospitalOps } from '@/lib/gov/health-systems';
import { hospitalDeepExecution } from '@/lib/gov/health-operations';
import { aiAdvisory } from '@/shared/ai/advisory';
import { DispatchChannel } from '@/apps/_shared/InstitutionChain';
import { facilities, actors, chainIntegrity } from '@/lib/gov/institution-chain';
import type { SovereignRole, Capability } from '@/shared/permissions/rbac';

const ACC = ACCENT.hospital!;

export function HospitalSystem({ id, now, role, withheld }: {
  id: string; now: number; role: SovereignRole; withheld: Capability[];
}) {
  const ts = now / 4000;
  const h = hospitalOps(id, ts);
  const hd = hospitalDeepExecution(id, ts);
  const hp = hospitalDeepExecution(id, ts - 3); // deterministic delta window
  const geo = healthGeo(id, ts);

  // Inter-facility transfer authorisation — a real operational action.
  const [accepted, setAccepted] = React.useState<Set<string>>(() => new Set());

  const pTone: 'ok' | 'warn' | 'alert' =
    hd.posture === 'crisis' ? 'alert' : hd.posture === 'strained' ? 'warn' : 'ok';

  const adv = aiAdvisory('Hospital Network', [
    { label: 'Bed headroom', value: Math.max(0, 100 - hd.nationalBedHeadroomPct * 4), adverse: true },
    { label: 'Regions on divert', value: Math.min(100, hd.regions.filter(r => r.surge === 'divert').length * 34), adverse: true },
    { label: 'ICU escalation', value: Math.min(100, hd.icu.filter(u => u.escalation === 'critical').length * 34), adverse: true },
    { label: 'Theatre delays', value: Math.min(100, hd.theatres.filter(x => x.status === 'delayed').length * 18), adverse: true },
  ]);
  const headroomTone: 'ok' | 'warn' | 'alert' = hd.nationalBedHeadroomPct >= 12 ? 'ok' : hd.nationalBedHeadroomPct >= 4 ? 'warn' : 'alert';
  // The hospital is a facility tier: clinicians enrol here, records are
  // held here, and it uplinks to the Ministry of Health → national system.
  const epoch = Math.max(0, Math.floor(ts));
  const fList = facilities('HEALTH', epoch);
  const fac = fList[Math.abs([...id].reduce((hh, c) => (hh * 31 + c.charCodeAt(0)) | 0, 5)) % fList.length] ?? fList[0]!;
  const roster = actors('HEALTH', fac.id, epoch);
  const cInt = chainIntegrity('HEALTH', epoch);
  const cTone = cInt.status === 'synchronised' ? 'ok' : cInt.status === 'lagging' ? 'warn' : 'alert';

  return (
    <div className="space-y-2 rounded-[5px] p-2" style={{ background: '#070d11' }}>
      <CommandHeader index={2} title="Hospital Operations" subtitle="Hospital Network Command"
        postureLabel={`NETWORK · ${hd.posture}`} postureTone={pTone} now={now} role={role} accent={ACC} />

      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 xl:grid-cols-8">
        <KpiTile label="Bed occ." value={`${h.beds.occupancyPct}%`} delta={h.beds.occupancyPct - hospitalOps(id, ts - 3).beds.occupancyPct} tone={h.beds.occupancyPct >= 92 ? 'alert' : h.beds.occupancyPct >= 82 ? 'warn' : 'ok'} />
        <KpiTile label="ICU occ." value={`${h.icu.occupancyPct}%`} tone={h.icu.occupancyPct >= 95 ? 'alert' : h.icu.occupancyPct >= 85 ? 'warn' : 'ok'} />
        <KpiTile label="Ventilators" value={`${h.icu.ventInUse}/${h.icu.ventilators}`} tone={h.icu.ventInUse / h.icu.ventilators >= 0.9 ? 'alert' : 'warn'} />
        <KpiTile label="Theatre util." value={`${h.theatres.utilisationPct}%`} tone={h.theatres.utilisationPct >= 92 ? 'warn' : 'ok'} />
        <KpiTile label="Blocked beds" value={`${hd.blockedBeds}`} delta={hd.blockedBeds - hp.blockedBeds} tone={hd.blockedBeds > 300 ? 'alert' : hd.blockedBeds > 150 ? 'warn' : 'ok'} />
        <KpiTile label="Admit/hr" value={`${hd.admissionsPerHr}`} delta={hd.admissionsPerHr - hp.admissionsPerHr} tone={hd.admissionsPerHr > hd.dischargesPerHr + 30 ? 'alert' : 'ok'} />
        <KpiTile label="Disch/hr" value={`${hd.dischargesPerHr}`} delta={hd.dischargesPerHr - hp.dischargesPerHr} tone="ok" />
        <KpiTile label="Transfers" value={`${hd.transferRequests}`} delta={hd.transferRequests - hp.transferRequests} tone={hd.transferRequests > 30 ? 'warn' : 'ok'} />
      </div>

      {/* Enrolled clinicians + ministry uplink (facility tier of the chain) */}
      <div className="grid gap-2 lg:grid-cols-3">
        <div className="lg:col-span-2">
        <CommandPanel title={`Enrolled clinicians · ${fac.id}`} meta={`${roster.length} · ${fac.name}`} accent={ACC}>
          <div className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
            {roster.map(a => (
              <div key={a.id} className="flex items-center gap-2 text-[10px]">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: a.standing === 'active' ? sc('ok') : a.standing === 'probation' ? sc('warn') : sc('alert') }} />
                <span className="min-w-0 flex-1 truncate text-ink-soft">{a.name} <span className="text-ink-muted">· {a.role}</span></span>
                <span className="shrink-0 font-mono text-[8px] tabular-nums text-ink-muted">load {a.caseload} · rel {a.reliability}%</span>
              </div>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5 border-t border-line-soft pt-1.5 text-[9px] text-ink-muted">
            <span>Records held at {fac.id} → <span style={{ color: sc('warn') }}>{cInt.ministry}</span> → National</span>
            <span>uplink sync <span style={{ color: sc(cTone) }}>{cInt.meanSyncPct}%</span> · {cInt.status}</span>
            <span>roll-up {cInt.uplinkLatencyMin}m · national lag {cInt.nationalLagMin}m</span>
          </div>
        </CommandPanel>
        </div>
        <DispatchChannel scope={`health:${fac.id}`} now={now} accent={ACC}
          selfTier="FACILITY" selfName={`${fac.id} admin`} toTier="MINISTRY"
          title={`Ministry uplink · ${fac.id}`} />
      </div>

      <div className="grid gap-2 xl:grid-cols-4">
        <div className="xl:col-span-3">
          <CommandPanel title="Hospital load geography" meta="ICU load · transfer corridors" accent={ACC} live>
            <GeoMap geo={geo} metric="icuLoad" title="" height={260} />
          </CommandPanel>
        </div>
        <div className="space-y-2">
          <CommandPanel title="National bed headroom" accent={ACC}>
            <div className="flex items-center justify-around py-1">
              <RingGauge value={hd.nationalBedHeadroomPct} label="headroom" tone={headroomTone} size={100} sub="%" />
            </div>
          </CommandPanel>
          <CommandPanel title="AI operational guidance" meta={`${adv.severity} · ${adv.confidence}%`} accent={ACC}>
            <div className="text-[10px] text-ink">{adv.headline}</div>
            <ul className="mt-0.5 space-y-0.5">{adv.recommended.map((r, i) => <li key={i} className="text-[9px] text-ink-soft">▸ {r}</li>)}</ul>
          </CommandPanel>
        </div>
      </div>

      <CommandPanel title="Regional capacity grid" meta="bed/ICU · surge · accept transfer" accent={ACC} live>
        <div className="space-y-1.5">
          {hd.regions.map(r => {
            const done = accepted.has(r.region);
            return (
              <div key={r.region} className="flex flex-wrap items-center gap-2 rounded-[3px] border border-line-soft bg-surface-2/40 px-2.5 py-1.5" style={{ borderLeft: `3px solid ${sc(r.tone)}` }}>
                <span className="w-28 shrink-0 truncate text-[11px] text-ink">{r.region}</span>
                <span className="font-mono text-[9px] tabular-nums text-ink-muted">bed {r.bedOccPct}% · ICU {r.icuOccPct}%</span>
                <span className="text-[8px] font-bold uppercase tracking-[0.14em]" style={{ color: sc(r.tone) }}>{r.surge}</span>
                {r.transfersPending > 0 ? (
                  done ? (
                    <span className="ml-auto text-[8.5px] font-semibold uppercase tracking-wider" style={{ color: sc('ok') }}>✓ {r.transfersPending} accepted</span>
                  ) : (
                    <button
                      onClick={() => setAccepted(prev => new Set(prev).add(r.region))}
                      className="focus-ring ml-auto rounded-[3px] border border-line bg-surface px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-ink transition-colors hover:bg-surface-2">
                      Accept {r.transfersPending} transfer{r.transfersPending === 1 ? '' : 's'}
                    </button>
                  )
                ) : <span className="ml-auto text-[8.5px] text-ink-muted">no transfers</span>}
              </div>
            );
          })}
        </div>
      </CommandPanel>

      <div className="grid gap-2 xl:grid-cols-2">
        <CommandPanel title="ICU orchestration" meta="unit · occupied/beds · vent · ECMO · escalation" accent={ACC}>
          <div className="space-y-1">
            {hd.icu.map(u => (
              <div key={u.unit} className="flex items-center gap-2 text-[10px]">
                <span className="w-28 shrink-0 truncate text-ink">{u.unit}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2"><span className="block h-full" style={{ width: `${Math.min(100, (u.occupied / u.beds) * 100)}%`, backgroundColor: sc(u.tone) }} /></div>
                <span className="w-32 shrink-0 text-right font-mono tabular-nums text-ink-muted">{u.occupied}/{u.beds} · v{u.ventilated} · e{u.ecmo}</span>
                <span className="w-14 shrink-0 text-right text-[8px] font-bold uppercase" style={{ color: sc(u.tone) }}>{u.escalation}</span>
              </div>
            ))}
          </div>
        </CommandPanel>
        <CommandPanel title="Operating theatre management" meta="theatre · case · status · delay" accent={ACC}>
          <div className="space-y-1">
            {hd.theatres.map(x => (
              <div key={x.theatre} className="flex items-center gap-2 text-[10px]">
                <span className="w-14 shrink-0 text-ink">{x.theatre}</span>
                <span className="min-w-0 flex-1 truncate text-[9px] text-ink-muted">{x.caseType}</span>
                <span className="w-16 shrink-0 text-right text-[8px] font-bold uppercase" style={{ color: sc(x.tone) }}>{x.status}</span>
                <span className="w-12 shrink-0 text-right font-mono tabular-nums" style={{ color: sc(x.tone) }}>{x.delayMin}m</span>
              </div>
            ))}
          </div>
        </CommandPanel>
      </div>

      <div className="grid gap-2 xl:grid-cols-2">
        <CommandPanel title="Ambulance zone coordination" meta="zone · available/units · ETA · posture" accent={ACC}>
          <div className="space-y-1">
            {hd.ambulanceZones.map(z => (
              <div key={z.zone} className="flex items-center gap-2 text-[8.5px]">
                <span className="w-32 shrink-0 truncate text-ink-soft">{z.zone} ({z.available}/{z.units})</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: '#13243a' }}><span className="block h-full rounded-full" style={{ width: `${Math.min(100, (z.available / z.units) * 100)}%`, background: sc(z.tone), boxShadow: `0 0 6px ${sc(z.tone)}` }} /></span>
                <span className="w-12 shrink-0 text-right font-mono tabular-nums" style={{ color: sc(z.tone) }}>{z.meanEtaMin}m</span>
              </div>
            ))}
          </div>
        </CommandPanel>
        <CommandPanel title="Operational timeline" meta="most recent first" accent={ACC}>
          <div className="space-y-1">
            {hd.timeline.map((e, i) => (
              <div key={i} className="flex items-start gap-2 text-[10px]">
                <span className="w-12 shrink-0 font-mono tabular-nums text-ink-muted">−{e.atHrsAgo}h</span>
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: sc(e.tone) }} />
                <span className="min-w-0"><span className="text-[8px] uppercase tracking-wider text-ink-muted">{e.kind}</span><span className="block text-ink-soft">{e.detail}</span></span>
              </div>
            ))}
          </div>
        </CommandPanel>
      </div>

      <RuntimeQueue
        scope={`${id}:hospitals`}
        kind="case"
        title="Admissions & capacity runtime — admit → place → escalate → discharge"
        by="Bed Manager"
        role={role}
        withheld={withheld}
      />
    </div>
  );
}
