'use client';

// Emergency domains — Rescue Operations & Infrastructure Continuity.

import * as React from 'react';
import { emergencyResilienceBoard } from '@/lib/gov/emergency-resilience';
import { TheatreFrame, StatusBoardKpi, TheatreRule, EMERGENCY_DS, TheatreCallout } from '@/apps/emergency-response/design-system/emergency-ds';
import { seed, wave } from '@/lib/telemetry';

function severityCol(s: string): string {
  return s === 'catastrophic' ? EMERGENCY_DS.ember
    : s === 'severe' ? EMERGENCY_DS.ember
    : s === 'elevated' ? EMERGENCY_DS.amber
    : EMERGENCY_DS.stand;
}

function rescueSurface(kinds: string[], code: string, title: string, subtitle: string) {
  return function RescueSurface({ id, now }: { id: string; now: number }) {
    const board = emergencyResilienceBoard(now);
    void id;
    const ops = board.response.rescueOperations.filter(o => kinds.includes(o.kind));
    return (
      <TheatreFrame archetype="rescue" code={code} title={title} subtitle={subtitle}>
        <StatusBoardKpi items={[
          { label: 'Active operations', value: ops.length, tone: ops.length > 0 ? 'warn' : 'ok' },
          { label: 'Responders on-scene (k)', value: ops.reduce((s, o) => s + o.respondersOnSceneK, 0).toFixed(1) },
          { label: 'Rescued today', value: ops.reduce((s, o) => s + o.rescuedToday, 0).toLocaleString(), tone: 'ok' },
          { label: 'Mean response', value: `${Math.round(ops.reduce((s, o) => s + o.meanResponseMin, 0) / Math.max(1, ops.length))}m`, tone: 'warn' },
        ]} />
        <TheatreRule label="rescue operations" />
        {ops.length === 0 ? (
          <p className="text-[10.5px] italic" style={{ color: EMERGENCY_DS.mut }}>
            No active operations of this class. National posture: monitoring.
          </p>
        ) : ops.map(o => (
          <div key={o.id} className="grid grid-cols-[110px_1fr_140px_110px_110px] gap-3 border-b py-1.5 text-[11px]"
            style={{ borderColor: EMERGENCY_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
            <span style={{ color: EMERGENCY_DS.amber }}>{o.id}</span>
            <span style={{ color: EMERGENCY_DS.ink }}>{o.kind} · {o.region}</span>
            <span className="uppercase tracking-[0.16em]" style={{ color: severityCol(o.severity) }}>● {o.severity}</span>
            <span style={{ color: EMERGENCY_DS.mut }}>{o.phase}</span>
            <span className="text-right tabular-nums" style={{ color: EMERGENCY_DS.mut }}>{o.rescuedToday} rescued</span>
          </div>
        ))}
      </TheatreFrame>
    );
  };
}

export const SearchAndRescue   = rescueSurface(['earthquake', 'building-collapse'], 'RC-SAR-08', 'Search & Rescue',   'multi-modal SAR operations');
export const FireSuppression   = rescueSurface(['fire'],                            'RC-FIR-09', 'Fire Suppression',  'wildfire & structural fire');
export const FloodRescue       = rescueSurface(['flood', 'storm'],                  'RC-FLD-10', 'Flood Rescue',      'swift-water & inundation');
export const MaritimeRescue    = rescueSurface(['maritime'],                        'RC-MAR-11', 'Maritime Rescue',   'vessel-in-distress coordination');
export const UrbanCollapse     = rescueSurface(['building-collapse', 'industrial-accident'], 'RC-USR-12', 'Urban Search & Collapse', 'building-collapse rescue');

export function InfrastructureContinuity({ id, now }: { id: string; now: number }) {
  const board = emergencyResilienceBoard(now);
  void id;
  return (
    <TheatreFrame archetype="continuity" code="CN-INF-13" title="Infrastructure Continuity" subtitle="cross-sector survivability">
      <StatusBoardKpi items={[
        { label: 'Sectors tracked', value: board.resilience.infrastructure.length },
        { label: 'Hardening index', value: `${board.resilience.resilienceHardeningIdx}/100`, tone: 'ok' },
        { label: 'Strategic reserve active', value: `${board.resilience.strategicReserveActivePct}%`, tone: 'warn' },
        { label: 'Societal stability', value: `${board.resilience.societalStabilityIdx}/100`, tone: 'ok' },
      ]} />
      <TheatreRule label="sector continuity" />
      {board.resilience.infrastructure.map(s => (
        <div key={s.domain} className="grid grid-cols-[180px_1fr_120px_120px_100px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: EMERGENCY_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: EMERGENCY_DS.amber }}>{s.domain}</span>
          <div className="h-1.5 self-center" style={{ background: EMERGENCY_DS.smoke }}>
            <div className="h-full" style={{ width: `${s.survivabilityIdx}%`, background: s.survivabilityIdx > 70 ? EMERGENCY_DS.stand : s.survivabilityIdx > 40 ? EMERGENCY_DS.amber : EMERGENCY_DS.ember }} />
          </div>
          <span className="uppercase tracking-[0.16em]"
            style={{ color: s.status === 'degraded' ? EMERGENCY_DS.ember : s.status === 'pressured' ? EMERGENCY_DS.amber : s.status === 'restoring' ? EMERGENCY_DS.watch : EMERGENCY_DS.stand }}>● {s.status}</span>
          <span className="text-right tabular-nums" style={{ color: EMERGENCY_DS.mut }}>recovery {s.recoveryProgressPct}%</span>
          <span className="text-right tabular-nums" style={{ color: EMERGENCY_DS.mut }}>{s.reserveCoverageDays}d cover</span>
        </div>
      ))}
    </TheatreFrame>
  );
}

export function PowerRestoration({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  const regions = ['Capital District', 'Northern', 'Eastern', 'Western', 'Coastal', 'Highland'];
  return (
    <TheatreFrame archetype="continuity" code="CN-PWR-14" title="Power Restoration" subtitle="grid stabilisation & black-start coordination">
      <StatusBoardKpi items={[
        { label: 'Substations offline', value: Math.round(wave(`pwr:s:${id}`, ts, 0, 48)), tone: 'alert' },
        { label: 'Households dark (k)', value: Math.round(wave(`pwr:d:${id}`, ts, 12, 8400)).toLocaleString(), tone: 'alert' },
        { label: 'Black-start crews engaged', value: Math.round(wave(`pwr:bs:${id}`, ts, 2, 18)) },
        { label: 'Mean restoration', value: `${Math.round(wave(`pwr:r:${id}`, ts, 4, 38))}h`, tone: 'warn' },
      ]} />
      <TheatreRule label="restoration by region" />
      {regions.map((r, i) => {
        const k = `pwr:${id}:${i}`;
        const restored = Math.round(wave(`${k}:r`, ts, 38, 99));
        return (
          <div key={r} className="grid grid-cols-[180px_1fr_80px_100px] gap-3 border-b py-1.5 text-[11px]"
            style={{ borderColor: EMERGENCY_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
            <span style={{ color: EMERGENCY_DS.amber }}>{r}</span>
            <div className="h-1.5 self-center" style={{ background: EMERGENCY_DS.smoke }}>
              <div className="h-full" style={{ width: `${restored}%`, background: restored > 90 ? EMERGENCY_DS.stand : restored > 60 ? EMERGENCY_DS.amber : EMERGENCY_DS.ember }} />
            </div>
            <span className="text-right tabular-nums" style={{ color: EMERGENCY_DS.mut }}>{restored}%</span>
            <span className="text-right tabular-nums" style={{ color: EMERGENCY_DS.mut }}>ETA {Math.round(wave(`${k}:e`, ts, 1, 24))}h</span>
          </div>
        );
      })}
      <TheatreCallout kicker="continuity contract" body="Critical loads (hospitals, water, comms) are restored first per the §19.3 restoration matrix. Treasury auto-funds black-start contracts." />
    </TheatreFrame>
  );
}

export function TransportCorridors({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  const corridors = ['North-South Trunk', 'East Coastal Highway', 'Western Ring', 'Highland Pass', 'Capital Beltway', 'Eastern Rail Spine'];
  return (
    <TheatreFrame archetype="continuity" code="CN-TRN-15" title="Transport Corridors" subtitle="relief routing & corridor status">
      <StatusBoardKpi items={[
        { label: 'Corridors monitored', value: corridors.length },
        { label: 'Closures active', value: Math.round(wave(`tr:cl:${id}`, ts, 0, 12)), tone: 'warn' },
        { label: 'Relief lanes opened', value: Math.round(wave(`tr:rl:${id}`, ts, 2, 18)), tone: 'ok' },
        { label: 'Detour avg delay', value: `${Math.round(wave(`tr:dt:${id}`, ts, 8, 96))}m`, tone: 'warn' },
      ]} />
      <TheatreRule label="corridor posture" />
      {corridors.map((c, i) => {
        const k = `tr:${id}:${i}`;
        const flow = Math.round(wave(`${k}:f`, ts, 15, 100));
        const status = flow < 30 ? 'closed' : flow < 60 ? 'restricted' : flow < 85 ? 'flowing' : 'open';
        return (
          <div key={c} className="grid grid-cols-[200px_1fr_80px_100px] gap-3 border-b py-1.5 text-[11px]"
            style={{ borderColor: EMERGENCY_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
            <span style={{ color: EMERGENCY_DS.amber }}>{c}</span>
            <div className="h-1.5 self-center" style={{ background: EMERGENCY_DS.smoke }}>
              <div className="h-full" style={{ width: `${flow}%`, background: flow < 30 ? EMERGENCY_DS.ember : flow < 60 ? EMERGENCY_DS.amber : EMERGENCY_DS.stand }} />
            </div>
            <span className="text-right uppercase tracking-[0.16em]"
              style={{ color: flow < 30 ? EMERGENCY_DS.ember : flow < 60 ? EMERGENCY_DS.amber : EMERGENCY_DS.stand }}>{status}</span>
            <span className="text-right tabular-nums" style={{ color: EMERGENCY_DS.mut }}>flow {flow}%</span>
          </div>
        );
      })}
    </TheatreFrame>
  );
}

export function WaterSanitation({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  const services = [
    { label: 'Drinking water (treated)', code: 'DW' },
    { label: 'Wastewater treatment',     code: 'WW' },
    { label: 'Tankering & bottled water',code: 'TK' },
    { label: 'Sanitation in shelters',   code: 'SN' },
    { label: 'Surface-water quality',    code: 'SW' },
  ];
  return (
    <TheatreFrame archetype="continuity" code="CN-WTR-16" title="Water & Sanitation" subtitle="drinking water & hygiene continuity">
      <StatusBoardKpi items={[
        { label: 'Citizens with potable water', value: `${Math.round(wave(`ws:p:${id}`, ts, 76, 99))}%`, tone: 'ok' },
        { label: 'Tankers deployed', value: Math.round(wave(`ws:t:${id}`, ts, 40, 480)) },
        { label: 'Litres distributed (M)', value: (wave(`ws:l:${id}`, ts, 0.4, 24)).toFixed(1), tone: 'info' },
        { label: 'Sanitation incidents (24h)', value: Math.round(wave(`ws:s:${id}`, ts, 0, 18)), tone: 'warn' },
      ]} />
      <TheatreRule label="service lanes" />
      {services.map((s, i) => {
        const k = `ws:${id}:${i}`;
        const cover = Math.round(wave(`${k}:c`, ts, 58, 99));
        return (
          <div key={s.code} className="grid grid-cols-[180px_1fr_80px] gap-3 border-b py-1.5 text-[11px]"
            style={{ borderColor: EMERGENCY_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
            <span style={{ color: EMERGENCY_DS.amber }}>{s.label}</span>
            <div className="h-1.5 self-center" style={{ background: EMERGENCY_DS.smoke }}>
              <div className="h-full" style={{ width: `${cover}%`, background: cover > 80 ? EMERGENCY_DS.stand : cover > 60 ? EMERGENCY_DS.amber : EMERGENCY_DS.ember }} />
            </div>
            <span className="text-right tabular-nums" style={{ color: EMERGENCY_DS.mut }}>{cover}%</span>
          </div>
        );
      })}
    </TheatreFrame>
  );
}
