'use client';

// apps/ministry-health/subsystems/NationalSituationRoom — Layer 1, the
// "brain". Command-grade dark/cinematic Mode A: a fused whole-of-nation
// health command picture (regional pressure grid, ICU/outbreak/medicine
// heat, disaster state) with national crisis propagation and AI command
// intelligence. Multi-role aware.

import * as React from 'react';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { nationalSituation } from '@/lib/gov/health-operations';
import { propagateNationalEvent } from '@/lib/gov/national-propagation';
import { aiAdvisory } from '@/shared/ai/advisory';
import type { SovereignRole, Capability } from '@/shared/permissions/rbac';

const C = (t: 'ok' | 'warn' | 'alert') => `rgb(var(--c-${t}))`;

export function NationalSituationRoom({ id, now, role, withheld }: {
  id: string; now: number; role: SovereignRole; withheld: Capability[];
}) {
  const ts = now / 4000;
  const ns = nationalSituation(id, ts);
  const sev = Math.min(100, Math.round(ns.regions[0]!.composite * (ns.disasterState === 'national-disaster' ? 1 : 0.85)));
  const prop = propagateNationalEvent(
    { trigger: ns.activeOutbreaks >= 1 ? 'outbreak' : ns.nationalIcuLoad >= 90 ? 'capacity-collapse' : 'mass-casualty', severity: sev, originRegion: ns.worstRegion },
    ts,
  );
  const pT: 'ok' | 'warn' | 'alert' = ns.posture === 'crisis' ? 'alert' : ns.posture === 'elevated' ? 'warn' : 'ok';
  const adv = aiAdvisory('National Situation Room', [
    { label: 'National ICU load', value: ns.nationalIcuLoad, adverse: true },
    { label: 'Active outbreaks', value: Math.min(100, ns.activeOutbreaks * 22), adverse: true },
    { label: 'Critical regions', value: Math.min(100, ns.regions.filter(r => r.state === 'critical').length * 25), adverse: true },
    { label: 'Medicine shortfalls', value: Math.min(100, ns.medicineShortfalls * 16), adverse: true },
  ]);
  const at: 'ok' | 'warn' | 'alert' = adv.severity === 'critical' || adv.severity === 'priority' ? 'alert' : adv.severity === 'advisory' ? 'warn' : 'ok';
  const dT = ns.disasterState === 'national-disaster' || ns.disasterState === 'emergency' ? 'alert' : ns.disasterState === 'watch' ? 'warn' : 'ok';

  const Cell = ({ label, v, t }: { label: string; v: string; t: 'ok' | 'warn' | 'alert' }) => (
    <div className="rounded-[3px] border bg-[#0b0f14] px-2.5 py-1.5" style={{ borderColor: 'color-mix(in srgb, #1d2a36 70%, transparent)' }}>
      <div className="text-[7.5px] font-semibold uppercase tracking-[0.18em] text-ink-muted">{label}</div>
      <div className="font-mono text-[16px] tabular-nums" style={{ color: C(t), textShadow: `0 0 12px color-mix(in srgb, ${C(t)} 55%, transparent)` }}>{v}</div>
    </div>
  );

  return (
    <div className="space-y-2 rounded-[4px] bg-[#070a0e] p-2" style={{ boxShadow: 'inset 0 0 60px rgba(0,0,0,0.6)' }}>
      <div className="flex flex-wrap items-center gap-3 rounded-[3px] border px-2.5 py-1.5" style={{ borderColor: '#1d2a36', background: 'linear-gradient(90deg,#0b0f14,#0d1620)' }}>
        <span className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: C(pT), textShadow: `0 0 14px color-mix(in srgb, ${C(pT)} 60%, transparent)` }}>◉ NATIONAL SITUATION ROOM</span>
        <span className="rounded-[2px] px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.18em]" style={{ backgroundColor: `color-mix(in srgb, ${C(dT)} 20%, transparent)`, color: C(dT) }}>DISASTER · {ns.disasterState}</span>
        <span className="font-mono text-[9px] tabular-nums text-ink-muted">{new Date(now).toLocaleTimeString()}</span>
        <span className="ml-auto text-[9px] text-ink-muted">command · {role}</span>
      </div>

      <div className="rounded-[3px] border px-2.5 py-1.5 text-[11px] font-medium" style={{ borderColor: '#1d2a36', color: C(pT), background: '#0b0f14' }}>
        {ns.headline}
      </div>

      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 xl:grid-cols-8">
        <Cell label="Bed pressure" v={`${ns.nationalBedPressure}%`} t={ns.nationalBedPressure >= 92 ? 'alert' : ns.nationalBedPressure >= 82 ? 'warn' : 'ok'} />
        <Cell label="ICU load" v={`${ns.nationalIcuLoad}%`} t={ns.nationalIcuLoad >= 95 ? 'alert' : ns.nationalIcuLoad >= 85 ? 'warn' : 'ok'} />
        <Cell label="Active outbreaks" v={`${ns.activeOutbreaks}`} t={ns.activeOutbreaks >= 2 ? 'alert' : ns.activeOutbreaks ? 'warn' : 'ok'} />
        <Cell label="Ambulance cover" v={`${ns.ambulanceCoverPct}%`} t={ns.ambulanceCoverPct < 55 ? 'alert' : ns.ambulanceCoverPct < 72 ? 'warn' : 'ok'} />
        <Cell label="Medicine shortfalls" v={`${ns.medicineShortfalls}`} t={ns.medicineShortfalls >= 3 ? 'alert' : ns.medicineShortfalls ? 'warn' : 'ok'} />
        <Cell label="Mortality idx" v={`${ns.mortalityIndex}`} t={ns.mortalityIndex >= 16 ? 'alert' : ns.mortalityIndex >= 11 ? 'warn' : 'ok'} />
        <Cell label="Cascade reach" v={`${prop.reach}/${prop.hops.length}`} t={prop.reach >= 4 ? 'alert' : prop.reach >= 2 ? 'warn' : 'ok'} />
        <Cell label="Escalation" v={prop.escalation} t={prop.escalation === 'cabinet' || prop.escalation === 'mobilise' ? 'alert' : prop.escalation === 'coordinate' ? 'warn' : 'ok'} />
      </div>

      <div className="grid gap-2 xl:grid-cols-3">
        <div className="xl:col-span-2 rounded-[3px] border p-2" style={{ borderColor: '#1d2a36', background: '#0b0f14' }}>
          <div className="mb-1.5 text-[8.5px] font-bold uppercase tracking-[0.18em] text-ink-muted">National pressure grid — bed · ICU · ER · outbreak · medicine</div>
          <div className="grid gap-0.5" style={{ gridTemplateColumns: '110px repeat(5,1fr) 56px' }}>
            <span />
            {['BED', 'ICU', 'ER', 'OUTBRK', 'MED'].map(h => <span key={h} className="px-1 text-center text-[7px] font-bold uppercase tracking-wider text-ink-muted">{h}</span>)}
            <span className="px-1 text-right text-[7px] font-bold uppercase tracking-wider text-ink-muted">CMP</span>
            {ns.regions.map(r => (
              <React.Fragment key={r.region}>
                <span className="truncate px-1 py-1 text-[9px]" style={{ color: C(r.tone) }}>{r.region}</span>
                {[r.bedPressure, r.icuPressure, r.emergencyLoad, r.outbreakHeat, r.medicineShortage].map((v, k) => {
                  const vt: 'ok' | 'warn' | 'alert' = v >= 80 ? 'alert' : v >= 58 ? 'warn' : 'ok';
                  return <div key={k} className="flex items-center justify-center py-1 font-mono text-[8.5px] tabular-nums" style={{ backgroundColor: `color-mix(in srgb, ${C(vt)} ${Math.round(v * 0.6)}%, transparent)`, color: v >= 58 ? '#000' : 'rgb(var(--c-ink-soft))' }}>{v}</div>;
                })}
                <span className="px-1 py-1 text-right font-mono text-[9px] tabular-nums" style={{ color: C(r.tone), textShadow: `0 0 8px color-mix(in srgb, ${C(r.tone)} 50%, transparent)` }}>{r.composite}</span>
              </React.Fragment>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <div className="rounded-[3px] border p-2" style={{ borderColor: at === 'alert' ? C('alert') : '#1d2a36', background: '#0b0f14', boxShadow: at === 'alert' ? `0 0 18px color-mix(in srgb, ${C('alert')} 30%, transparent)` : 'none' }}>
            <div className="text-[9px] font-bold uppercase tracking-[0.18em]" style={{ color: C(at) }}>AI COMMAND INTELLIGENCE · {adv.severity}</div>
            <div className="mt-0.5 text-[10px] text-ink">{adv.headline}</div>
            <ul className="mt-1 space-y-0.5">
              {prop.recommended.map((r, i) => <li key={i} className="text-[9px] text-ink-soft">▸ {r}</li>)}
            </ul>
          </div>
          <div className="rounded-[3px] border p-2" style={{ borderColor: '#1d2a36', background: '#0b0f14' }}>
            <div className="mb-1 text-[8.5px] font-bold uppercase tracking-[0.18em] text-ink-muted">Crisis propagation</div>
            <div className="space-y-0.5">
              {prop.hops.map(h => (
                <div key={h.order} className="flex items-center gap-1.5 text-[9px]" style={{ opacity: h.status === 'latent' ? 0.45 : 1 }}>
                  <span className="w-3 text-center font-mono text-ink-muted">{h.order}</span>
                  <span className="min-w-0 flex-1 truncate text-ink-soft">{h.institution}</span>
                  <span className="w-7 text-right font-mono tabular-nums" style={{ color: C(h.tone), textShadow: `0 0 6px color-mix(in srgb, ${C(h.tone)} 50%, transparent)` }}>{h.magnitude}</span>
                  <span className="w-9 text-right text-[7px] font-bold uppercase" style={{ color: C(h.tone) }}>{h.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <RuntimeQueue
        scope={`${id}:situation`}
        kind="incident"
        title="National command runtime — direct whole-of-nation health response"
        by="National Command"
        role={role}
        withheld={withheld}
      />
    </div>
  );
}
