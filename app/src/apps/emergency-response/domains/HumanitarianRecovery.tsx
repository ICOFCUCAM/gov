'use client';

// Emergency domains — Humanitarian, Broadcast, Recovery, Foresight, Registry, Oversight.

import * as React from 'react';
import { emergencyResilienceBoard, EMERGENCY_SAFEGUARDS } from '@/lib/gov/emergency-resilience';
import { TheatreFrame, StatusBoardKpi, TheatreRule, EMERGENCY_DS, TheatreCallout } from '@/apps/emergency-response/design-system/emergency-ds';
import { seed, wave } from '@/lib/telemetry';

export function ShelterNetwork({ id, now }: { id: string; now: number }) {
  const board = emergencyResilienceBoard(now);
  void id;
  return (
    <TheatreFrame archetype="humanitarian" code="HU-SHL-18" title="Shelter Network" subtitle="per-region shelter posture">
      <StatusBoardKpi items={[
        { label: 'Networks active', value: board.humanitarian.shelterNetworks.length },
        { label: 'Total shelters', value: board.humanitarian.shelterNetworks.reduce((s, n) => s + n.shelters, 0) },
        { label: 'Capacity (k)', value: board.humanitarian.shelterNetworks.reduce((s, n) => s + n.capacityK, 0).toFixed(1) },
        { label: 'Mean utilisation', value: `${Math.round(board.humanitarian.shelterNetworks.reduce((s, n) => s + n.utilisationPct, 0) / Math.max(1, board.humanitarian.shelterNetworks.length))}%`, tone: 'warn' },
      ]} />
      <TheatreRule label="network roster" />
      {board.humanitarian.shelterNetworks.map(n => (
        <div key={n.id} className="grid grid-cols-[180px_1fr_120px_120px_100px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: EMERGENCY_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: EMERGENCY_DS.amber }}>{n.region}</span>
          <div className="h-1.5 self-center" style={{ background: EMERGENCY_DS.smoke }}>
            <div className="h-full" style={{ width: `${n.utilisationPct}%`, background: n.utilisationPct > 90 ? EMERGENCY_DS.ember : n.utilisationPct > 70 ? EMERGENCY_DS.amber : EMERGENCY_DS.stand }} />
          </div>
          <span className="uppercase tracking-[0.16em]"
            style={{ color: n.status === 'full' ? EMERGENCY_DS.ember : n.status === 'pressured' ? EMERGENCY_DS.amber : n.status === 'monitored' ? EMERGENCY_DS.watch : EMERGENCY_DS.stand }}>● {n.status}</span>
          <span className="text-right tabular-nums" style={{ color: EMERGENCY_DS.mut }}>{n.occupancyK.toFixed(1)}k / {n.capacityK.toFixed(1)}k</span>
          <span className="text-right tabular-nums" style={{ color: EMERGENCY_DS.mut }}>{n.shelters} sites</span>
        </div>
      ))}
    </TheatreFrame>
  );
}

export function DisplacementRegistry({ id, now }: { id: string; now: number }) {
  const board = emergencyResilienceBoard(now);
  const ts = now / 4000;
  void id;
  const lanes = [
    { code: 'CAR', label: 'Families with children' },
    { code: 'ELD', label: 'Elderly & disability registered' },
    { code: 'UAM', label: 'Unaccompanied minors' },
    { code: 'MED', label: 'Medical-needs population' },
    { code: 'WOM', label: 'Women-headed households' },
    { code: 'LIV', label: 'Livestock owners housed' },
  ];
  return (
    <TheatreFrame archetype="registry" code="HU-DSP-19" title="Displacement Registry" subtitle="population register · privacy-preserving">
      <StatusBoardKpi items={[
        { label: 'Displaced population (k)', value: board.humanitarian.displacedPopulationK.toFixed(1) },
        { label: 'Registered in NEOC', value: `${Math.round(wave(`dr:r:${id}`, ts, 78, 99))}%`, tone: 'ok' },
        { label: 'Family-tracing active', value: Math.round(wave(`dr:t:${id}`, ts, 120, 4800)).toLocaleString() },
        { label: 'Reunifications (7d)', value: Math.round(wave(`dr:rn:${id}`, ts, 24, 480)), tone: 'ok' },
      ]} />
      <TheatreRule label="protected population lanes" />
      {lanes.map((l, i) => {
        const k = `dr:${id}:${i}`;
        const n = Math.round(wave(`${k}:n`, ts, 240, 12000));
        return (
          <div key={l.code} className="grid grid-cols-[80px_1fr_100px] gap-3 border-b py-1.5 text-[11px]"
            style={{ borderColor: EMERGENCY_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
            <span style={{ color: EMERGENCY_DS.amber }}>{l.code}</span>
            <span style={{ color: EMERGENCY_DS.ink }}>{l.label}</span>
            <span className="text-right tabular-nums" style={{ color: EMERGENCY_DS.mut }}>{n.toLocaleString()}</span>
          </div>
        );
      })}
      <TheatreCallout kicker="privacy doctrine" body="Displacement records are pseudonymised at the shelter; centralised aggregates only. Identifiers expire 90 days after reunification or programme exit." />
    </TheatreFrame>
  );
}

export function ReliefSupply({ id, now }: { id: string; now: number }) {
  const board = emergencyResilienceBoard(now);
  const ts = now / 4000;
  void id;
  return (
    <TheatreFrame archetype="humanitarian" code="HU-SUP-20" title="Relief Supply" subtitle="food / water / NFI logistics chain">
      <StatusBoardKpi items={[
        { label: 'Food deliveries (k/d)', value: board.humanitarian.emergencyFoodDeliveriesDailyK.toFixed(1) },
        { label: 'Water (ML/d)', value: board.humanitarian.emergencyWaterDeliveriesDailyM.toFixed(2) },
        { label: 'Supplies cover (d)', value: board.humanitarian.reliefSuppliesCoverDays, tone: 'warn' },
        { label: 'Humanitarian access', value: `${board.humanitarian.humanitarianAccessIdx}/100`, tone: 'ok' },
      ]} />
      <TheatreRule label="dispatch board" />
      {Array.from({ length: 6 }, (_, i) => {
        const k = `rs:${id}:${i}:${Math.floor(ts / 4)}`;
        const kinds = ['Rations (family)', 'Bottled water (pallets)', 'Tarpaulins', 'Hygiene kits', 'Medical NFI', 'Blankets'];
        return {
          id: `SUP-${(70000 + Math.floor(seed(`${k}:c`) * 30000))}`,
          kind: kinds[i]!,
          dest: ['Capital District', 'Northern', 'Eastern', 'Western', 'Coastal', 'Highland'][i]!,
          qty: Math.round(wave(`${k}:q`, ts, 80, 4800)),
          eta: Math.round(wave(`${k}:e`, ts, 1, 24)),
        };
      }).map(s => (
        <div key={s.id} className="grid grid-cols-[110px_1fr_120px_80px_80px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: EMERGENCY_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: EMERGENCY_DS.amber }}>{s.id}</span>
          <span style={{ color: EMERGENCY_DS.ink }}>{s.kind}</span>
          <span style={{ color: EMERGENCY_DS.mut }}>{s.dest}</span>
          <span className="text-right tabular-nums" style={{ color: EMERGENCY_DS.ink }}>{s.qty.toLocaleString()}</span>
          <span className="text-right tabular-nums" style={{ color: EMERGENCY_DS.mut }}>ETA {s.eta}h</span>
        </div>
      ))}
    </TheatreFrame>
  );
}

export function AlertNetwork({ id, now }: { id: string; now: number }) {
  const board = emergencyResilienceBoard(now);
  void id;
  return (
    <TheatreFrame archetype="broadcast" code="BC-ALT-21" title="Alert Network" subtitle="multi-channel citizen alerting">
      <StatusBoardKpi items={[
        { label: 'Channels', value: board.communications.channels.length },
        { label: 'Active alerts', value: board.communications.nationalAlertsActive, tone: 'alert' },
        { label: 'Advisories / 24h', value: board.communications.publicAdvisoriesIssued24h, tone: 'info' },
        { label: 'Avg propagation', value: `${board.communications.averagePropagationSeconds}s`, tone: 'ok' },
      ]} />
      <TheatreRule label="channel posture" />
      {board.communications.channels.map(c => (
        <div key={c.channel} className="grid grid-cols-[200px_1fr_80px_100px_100px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: EMERGENCY_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: EMERGENCY_DS.amber }}>{c.channel}</span>
          <div className="h-1.5 self-center" style={{ background: EMERGENCY_DS.smoke }}>
            <div className="h-full" style={{ width: `${c.uptimePct}%`, background: c.uptimePct > 95 ? EMERGENCY_DS.stand : c.uptimePct > 80 ? EMERGENCY_DS.amber : EMERGENCY_DS.ember }} />
          </div>
          <span className="text-right tabular-nums" style={{ color: EMERGENCY_DS.mut }}>{c.uptimePct}%</span>
          <span className="text-right tabular-nums" style={{ color: EMERGENCY_DS.ink }}>{c.reachM.toFixed(1)}M reach</span>
          <span className="text-right uppercase tracking-[0.16em]"
            style={{ color: c.channelHealth === 'offline' ? EMERGENCY_DS.ember : c.channelHealth === 'degraded' ? EMERGENCY_DS.amber : EMERGENCY_DS.stand }}>● {c.channelHealth}</span>
        </div>
      ))}
    </TheatreFrame>
  );
}

export function SmsCellBroadcast({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  return (
    <TheatreFrame archetype="broadcast" code="BC-SMS-22" title="SMS / Cell Broadcast" subtitle="mass notification channel">
      <StatusBoardKpi items={[
        { label: 'Cell broadcast reach (M)', value: (wave(`sms:r:${id}`, ts, 12, 38)).toFixed(1), tone: 'info' },
        { label: 'Messages dispatched (24h)', value: Math.round(wave(`sms:d:${id}`, ts, 80000, 4800000)).toLocaleString() },
        { label: 'Delivery success', value: `${Math.round(wave(`sms:s:${id}`, ts, 94, 99.6) * 10) / 10}%`, tone: 'ok' },
        { label: 'Languages supported', value: Math.round(wave(`sms:l:${id}`, ts, 6, 18)), tone: 'info' },
      ]} />
      <TheatreCallout kicker="constitutional safeguard" body="Cell broadcast is a one-way emergency channel only. It cannot be used for political messaging; misuse is prosecutable under §19.5." />
    </TheatreFrame>
  );
}

export function MultilingualAdvisories({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  const languages = ['English', 'Swahili', 'Mandarin', 'Spanish', 'Arabic', 'French', 'Hindi', 'Portuguese'];
  return (
    <TheatreFrame archetype="broadcast" code="BC-MLT-23" title="Multilingual Advisories" subtitle="inclusive advisory production">
      <StatusBoardKpi items={[
        { label: 'Active languages', value: languages.length },
        { label: 'Advisories dispatched (24h)', value: Math.round(wave(`ml:d:${id}`, ts, 24, 480)) },
        { label: 'Sign-language coverage', value: `${Math.round(wave(`ml:s:${id}`, ts, 84, 100))}%`, tone: 'ok' },
        { label: 'Reading-level (grade)', value: `${Math.round(wave(`ml:r:${id}`, ts, 5, 9))}`, tone: 'info' },
      ]} />
      <TheatreRule label="language coverage" />
      {languages.map((l, i) => {
        const k = `ml:${id}:${i}`;
        const cov = Math.round(wave(`${k}:c`, ts, 65, 99));
        return (
          <div key={l} className="grid grid-cols-[160px_1fr_80px] gap-3 border-b py-1.5 text-[11px]"
            style={{ borderColor: EMERGENCY_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
            <span style={{ color: EMERGENCY_DS.amber }}>{l}</span>
            <div className="h-1.5 self-center" style={{ background: EMERGENCY_DS.smoke }}>
              <div className="h-full" style={{ width: `${cov}%`, background: cov > 90 ? EMERGENCY_DS.stand : cov > 70 ? EMERGENCY_DS.amber : EMERGENCY_DS.ember }} />
            </div>
            <span className="text-right tabular-nums" style={{ color: EMERGENCY_DS.mut }}>{cov}%</span>
          </div>
        );
      })}
    </TheatreFrame>
  );
}

export function RecoveryProgrammes({ id, now }: { id: string; now: number }) {
  const board = emergencyResilienceBoard(now);
  void id;
  return (
    <TheatreFrame archetype="recovery" code="RV-PRG-24" title="Recovery Programmes" subtitle="active reconstruction pipeline">
      <StatusBoardKpi items={[
        { label: 'Programmes active', value: board.recovery.length },
        { label: 'Total funding (Bn)', value: board.recovery.reduce((s, r) => s + r.fundingCommittedBn, 0).toFixed(1) },
        { label: 'Mean progress', value: `${Math.round(board.recovery.reduce((s, r) => s + r.progressPct, 0) / Math.max(1, board.recovery.length))}%`, tone: 'warn' },
        { label: 'Programmes completing', value: board.recovery.filter(r => r.status === 'completing').length, tone: 'ok' },
      ]} />
      <TheatreRule label="programme docket" />
      {board.recovery.map(r => (
        <div key={r.id} className="grid grid-cols-[110px_1fr_100px_80px_100px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: EMERGENCY_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: EMERGENCY_DS.amber }}>{r.id}</span>
          <span style={{ color: EMERGENCY_DS.ink }}>{r.programme} · {r.region}</span>
          <span style={{ color: EMERGENCY_DS.mut }}>{r.category}</span>
          <span className="text-right tabular-nums" style={{ color: EMERGENCY_DS.mut }}>{r.progressPct}%</span>
          <span className="text-right tabular-nums" style={{ color: EMERGENCY_DS.mut }}>{r.fundingCommittedBn.toFixed(2)} Bn</span>
        </div>
      ))}
    </TheatreFrame>
  );
}

export function ReconstructionBench({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  const projects = ['Coastal flood-defence (Phase II)', 'Northern hospital cluster rebuild', 'Highland bridge corridor', 'Capital water-treatment expansion', 'Eastern grid hardening', 'Western seismic retrofit'];
  return (
    <TheatreFrame archetype="recovery" code="RV-BCH-25" title="Reconstruction Bench" subtitle="capital-works pipeline (12-24 month horizon)">
      <StatusBoardKpi items={[
        { label: 'Projects in pipeline', value: projects.length },
        { label: 'Capital committed (Bn)', value: (wave(`rb:c:${id}`, ts, 4, 36)).toFixed(1) },
        { label: 'Average IRR', value: `${Math.round(wave(`rb:r:${id}`, ts, 6, 24))}%`, tone: 'ok' },
        { label: 'Climate-resilience uplift', value: `${Math.round(wave(`rb:u:${id}`, ts, 18, 62))}%`, tone: 'info' },
      ]} />
      <TheatreRule label="project bench" />
      {projects.map((p, i) => {
        const k = `rb:${id}:${i}`;
        const stage = ['scoping', 'design', 'tender', 'construction', 'commissioning'][Math.floor(seed(`${k}:s`) * 5)]!;
        const pct = Math.round(wave(`${k}:p`, ts, 4, 96));
        return (
          <div key={p} className="grid grid-cols-[1fr_100px_80px] gap-3 border-b py-1.5 text-[11px]"
            style={{ borderColor: EMERGENCY_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
            <span style={{ color: EMERGENCY_DS.ink }}>{p}</span>
            <span style={{ color: EMERGENCY_DS.mut }}>{stage}</span>
            <span className="text-right tabular-nums" style={{ color: EMERGENCY_DS.amber }}>{pct}%</span>
          </div>
        );
      })}
    </TheatreFrame>
  );
}

export function ResilienceForesight({ id, now }: { id: string; now: number }) {
  const board = emergencyResilienceBoard(now);
  void id;
  return (
    <TheatreFrame archetype="forecast" code="FC-RES-26" title="Resilience Foresight" subtitle={`${board.forecast.horizonYears.join('y / ')}y national trajectory`}>
      <StatusBoardKpi items={[
        { label: 'Catastrophe survivability', value: `${board.forecast.catastropheSurvivabilityIdx}/100`, tone: 'ok' },
        { label: 'Systemic resilience risk', value: board.forecast.systemicResilienceRisk, tone: 'warn' },
        { label: 'Horizons modelled', value: board.forecast.horizonYears.length, tone: 'info' },
        { label: 'Cascading-failure trend', value: board.forecast.cascadingFailureTrajectory.length, tone: 'mute' },
      ]} />
      <TheatreRule label="horizon trajectories" />
      <div className="grid grid-cols-4 gap-2 text-[11px]">
        {['Resilience', 'Preparedness', 'Recovery capacity', 'Cascading failure'].map((label, i) => {
          const series = [board.forecast.resilienceTrajectory, board.forecast.preparednessTrajectory, board.forecast.recoveryCapacityTrajectory, board.forecast.cascadingFailureTrajectory][i]!;
          return (
            <div key={label} className="border p-2" style={{ borderColor: EMERGENCY_DS.rule }}>
              <div className="text-[9px] uppercase tracking-[0.18em]" style={{ color: EMERGENCY_DS.mut, fontFamily: 'ui-monospace, monospace' }}>{label}</div>
              <div className="text-[13px] font-semibold tabular-nums" style={{ color: EMERGENCY_DS.amber }}>{series[series.length - 1]}</div>
              <div className="mt-1 flex gap-1">
                {series.map((v, j) => (
                  <div key={j} className="flex-1" style={{ height: `${Math.max(2, Math.min(40, v / 3))}px`, background: i === 3 ? EMERGENCY_DS.ember : EMERGENCY_DS.amber, alignSelf: 'flex-end' }} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </TheatreFrame>
  );
}

export function NationalRiskBoard({ id, now }: { id: string; now: number }) {
  const board = emergencyResilienceBoard(now);
  void id;
  return (
    <TheatreFrame archetype="forecast" code="FC-RSK-27" title="National Risk Board" subtitle="sovereign risk register · classification by composite">
      <StatusBoardKpi items={[
        { label: 'Risks tracked', value: board.risks.length },
        { label: 'Severe classification', value: board.risks.filter(r => r.classification === 'severe').length, tone: 'alert' },
        { label: 'Elevated classification', value: board.risks.filter(r => r.classification === 'elevated').length, tone: 'warn' },
        { label: 'Mean preparedness', value: Math.round(board.risks.reduce((s, r) => s + r.preparednessIdx, 0) / Math.max(1, board.risks.length)), tone: 'info' },
      ]} />
      <TheatreRule label="risk register" />
      {board.risks.map(r => (
        <div key={r.kind} className="grid grid-cols-[220px_80px_80px_80px_100px_100px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: EMERGENCY_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: EMERGENCY_DS.amber }}>{r.kind}</span>
          <span className="text-right tabular-nums" style={{ color: EMERGENCY_DS.mut }}>p {r.probabilityPct}%</span>
          <span className="text-right tabular-nums" style={{ color: EMERGENCY_DS.mut }}>i {r.potentialImpactIdx}</span>
          <span className="text-right tabular-nums" style={{ color: EMERGENCY_DS.mut }}>pr {r.preparednessIdx}</span>
          <span className="text-right tabular-nums" style={{ color: EMERGENCY_DS.ink }}>c {r.composite}</span>
          <span className="text-right uppercase tracking-[0.16em]"
            style={{ color: r.classification === 'severe' ? EMERGENCY_DS.ember : r.classification === 'elevated' ? EMERGENCY_DS.amber : r.classification === 'moderate' ? EMERGENCY_DS.watch : EMERGENCY_DS.stand }}>● {r.classification}</span>
        </div>
      ))}
    </TheatreFrame>
  );
}

export function AssetRegistry({ id, now }: { id: string; now: number }) {
  const board = emergencyResilienceBoard(now);
  const ts = now / 4000;
  void id;
  return (
    <TheatreFrame archetype="registry" code="RG-AST-28" title="Asset Registry" subtitle="vehicle / aerial / marine inventory">
      <StatusBoardKpi items={[
        { label: 'Rescue vehicles', value: board.response.rescueVehiclesDeployed.toLocaleString() },
        { label: 'Aerial assets', value: board.response.aerialAssetsDeployed },
        { label: 'Marine assets', value: board.response.marineAssetsDeployed },
        { label: 'Mean mobilise', value: `${board.response.meanMobiliseMin}m`, tone: 'warn' },
      ]} />
      <TheatreRule label="asset class summary" />
      {[
        { label: 'Heavy rescue trucks',      total: 480 },
        { label: 'Pump / fire engines',      total: 1200 },
        { label: 'Ambulance / MICU',         total: 2400 },
        { label: 'Rescue helicopters',       total: 28 },
        { label: 'Coastal rescue vessels',   total: 64 },
        { label: 'Mobile command centres',   total: 18 },
      ].map((g, i) => {
        const k = `ar:${id}:${i}`;
        const op = Math.round(wave(`${k}:o`, ts, 78, 99));
        const dep = Math.round(g.total * wave(`${k}:d`, ts, 0.1, 0.6));
        return (
          <div key={g.label} className="grid grid-cols-[200px_1fr_80px_80px_80px] gap-3 border-b py-1.5 text-[11px]"
            style={{ borderColor: EMERGENCY_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
            <span style={{ color: EMERGENCY_DS.amber }}>{g.label}</span>
            <div className="h-1.5 self-center" style={{ background: EMERGENCY_DS.smoke }}>
              <div className="h-full" style={{ width: `${op}%`, background: op > 90 ? EMERGENCY_DS.stand : op > 70 ? EMERGENCY_DS.amber : EMERGENCY_DS.ember }} />
            </div>
            <span className="text-right tabular-nums" style={{ color: EMERGENCY_DS.ink }}>{g.total}</span>
            <span className="text-right tabular-nums" style={{ color: EMERGENCY_DS.mut }}>{dep} dep</span>
            <span className="text-right tabular-nums" style={{ color: EMERGENCY_DS.mut }}>{op}% op</span>
          </div>
        );
      })}
    </TheatreFrame>
  );
}

export function TrainingReadiness({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  const cohorts = [
    { name: 'NEOC duty officers',                target: 480 },
    { name: 'Search-&-rescue technicians',       target: 1200 },
    { name: 'Fire-suppression captains',         target: 600 },
    { name: 'Mass-casualty medical leads',       target: 240 },
    { name: 'Logistics co-ordinators',           target: 380 },
    { name: 'Public-information officers',       target: 120 },
  ];
  return (
    <TheatreFrame archetype="registry" code="RG-TRN-29" title="Training & Readiness" subtitle="drill cadence & certification">
      <StatusBoardKpi items={[
        { label: 'Cohorts active', value: cohorts.length },
        { label: 'Personnel certified', value: cohorts.reduce((s, c) => s + c.target, 0).toLocaleString() },
        { label: 'Drill cadence (per quarter)', value: Math.round(wave(`tr:d:${id}`, ts, 6, 14)) },
        { label: 'Recertification overdue', value: Math.round(wave(`tr:o:${id}`, ts, 4, 84)), tone: 'warn' },
      ]} />
      <TheatreRule label="cohort certification" />
      {cohorts.map((c, i) => {
        const k = `tr:${id}:${i}`;
        const cert = Math.round(wave(`${k}:c`, ts, 78, 99));
        return (
          <div key={c.name} className="grid grid-cols-[220px_1fr_80px_80px] gap-3 border-b py-1.5 text-[11px]"
            style={{ borderColor: EMERGENCY_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
            <span style={{ color: EMERGENCY_DS.amber }}>{c.name}</span>
            <div className="h-1.5 self-center" style={{ background: EMERGENCY_DS.smoke }}>
              <div className="h-full" style={{ width: `${cert}%`, background: cert > 92 ? EMERGENCY_DS.stand : cert > 78 ? EMERGENCY_DS.amber : EMERGENCY_DS.ember }} />
            </div>
            <span className="text-right tabular-nums" style={{ color: EMERGENCY_DS.mut }}>{cert}%</span>
            <span className="text-right tabular-nums" style={{ color: EMERGENCY_DS.mut }}>{c.target.toLocaleString()}</span>
          </div>
        );
      })}
    </TheatreFrame>
  );
}

export function ConstitutionalSafeguards({ id, now }: { id: string; now: number }) {
  void id; void now;
  return (
    <TheatreFrame archetype="oversight" code="OV-CSF-30" title="Constitutional Safeguards" subtitle="EMERGENCY_SAFEGUARDS contract · §19.9">
      <StatusBoardKpi items={[
        { label: 'Humanitarian continuity', value: EMERGENCY_SAFEGUARDS.humanitarianContinuity ? '✓' : '✗', tone: 'ok' },
        { label: 'Rights-preserving response', value: EMERGENCY_SAFEGUARDS.rightsPreservingResponse ? '✓' : '✗', tone: 'ok' },
        { label: 'Civilian priority', value: EMERGENCY_SAFEGUARDS.civilianPriority ? '✓' : '✗', tone: 'ok' },
        { label: 'Equitable disaster support', value: EMERGENCY_SAFEGUARDS.equitableDisasterSupport ? '✓' : '✗', tone: 'ok' },
      ]} />
      <TheatreRule label="prohibited postures" />
      <ul className="grid grid-cols-1 gap-1 md:grid-cols-2 text-[11px]"
        style={{ color: EMERGENCY_DS.ink, fontFamily: 'ui-monospace, monospace' }}>
        {EMERGENCY_SAFEGUARDS.prohibited.map(p => (
          <li key={p} className="border-l-2 pl-2"
            style={{ borderColor: EMERGENCY_DS.ember }}>
            <span style={{ color: EMERGENCY_DS.ember }}>✕</span> {p}
          </li>
        ))}
      </ul>
      <TheatreCallout kicker="binding contract" body="Every Emergency Response surface attests against this contract. A violation triggers an automatic Audit Vault entry and a constitutional escalation to the judiciary." />
    </TheatreFrame>
  );
}

export function AfterActionReview({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  const aars = Array.from({ length: 6 }, (_, i) => {
    const k = `aar:${id}:${i}:${Math.floor(ts / 4)}`;
    const incidents = ['Coastal flood event Q1', 'Highland wildfire Q2', 'Capital industrial accident', 'Northern earthquake', 'National cyber incident', 'Western mass-displacement'];
    return {
      id: `AAR-${(50000 + Math.floor(seed(`${k}:c`) * 40000))}`,
      incident: incidents[i]!,
      stage: ['drafting', 'panel-review', 'recommendations', 'closed'][Math.floor(seed(`${k}:s`) * 4)]!,
      lessons: Math.round(wave(`${k}:l`, ts, 4, 38)),
      ageDays: Math.round(wave(`${k}:a`, ts, 4, 240)),
    };
  });
  return (
    <TheatreFrame archetype="oversight" code="OV-AAR-31" title="After-Action Review" subtitle="post-incident learning · §19.9">
      <StatusBoardKpi items={[
        { label: 'AARs active', value: aars.length },
        { label: 'Closed (YTD)', value: Math.round(wave(`aar:c:${id}`, ts, 12, 64)) },
        { label: 'Lessons in adoption', value: aars.reduce((s, a) => s + a.lessons, 0), tone: 'info' },
        { label: 'Mean cycle (d)', value: Math.round(aars.reduce((s, a) => s + a.ageDays, 0) / aars.length), tone: 'warn' },
      ]} />
      <TheatreRule label="review docket" />
      {aars.map(a => (
        <div key={a.id} className="grid grid-cols-[110px_1fr_120px_80px_80px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: EMERGENCY_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: EMERGENCY_DS.amber }}>{a.id}</span>
          <span style={{ color: EMERGENCY_DS.ink }}>{a.incident}</span>
          <span style={{ color: EMERGENCY_DS.mut }}>{a.stage}</span>
          <span className="text-right tabular-nums" style={{ color: EMERGENCY_DS.mut }}>{a.lessons}</span>
          <span className="text-right tabular-nums" style={{ color: EMERGENCY_DS.mut }}>{a.ageDays}d</span>
        </div>
      ))}
      <TheatreCallout kicker="mandatory cycle" body="Every closed incident requires an AAR within 90 days. Recommendations are tracked in adoption; lessons not adopted within a year escalate to the constitutional oversight surface." />
    </TheatreFrame>
  );
}
