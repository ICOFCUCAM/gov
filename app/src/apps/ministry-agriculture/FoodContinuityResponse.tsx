'use client';

// Agriculture — Food Continuity & Emergency Response. Distribution lanes
// as harvest-routing strips, rural stability cards, agri incidents with
// inter-ministry cascade, and a seasonal forecast strip.

import * as React from 'react';
import { foodSecurityBoard, type AgriIncident, type Tone } from '@/lib/gov/food-security';

const TONE_COL: Record<Tone, string> = { ok: '#3a7d4a', warn: '#d8a23a', alert: '#a8552e' };
const SEV_COL: Record<AgriIncident['severity'], string> = {
  advisory: '#d8a23a', elevated: '#c9a449', critical: '#a8552e', national: '#8a1f1f',
};

export function FoodContinuityResponse({ id, now }: { id: string; now: number }) {
  void id;
  const b = foodSecurityBoard(now);
  const f = b.forecast;
  return (
    <div className="space-y-3">
      {/* Scarcity / forecast strip */}
      <div className="flex flex-wrap items-stretch gap-px border" style={{ borderColor: 'color-mix(in srgb,#8b6f47 38%,rgb(var(--c-line)))' }}>
        <div className="min-w-[150px] flex-1 px-4 py-2" style={{ background: 'rgba(58,125,74,0.06)' }}>
          <div className="text-[8.5px] uppercase tracking-[0.16em] text-ink-muted">Scarcity risk</div>
          <div className="text-[18px] font-semibold tabular-nums" style={{ color: f.scarcityRisk >= 60 ? '#a8552e' : '#d8a23a' }}>{f.scarcityRisk}</div>
        </div>
        <div className="min-w-[150px] flex-1 px-4 py-2" style={{ background: 'rgba(216,162,58,0.06)' }}>
          <div className="text-[8.5px] uppercase tracking-[0.16em] text-ink-muted">Pest escalation</div>
          <div className="text-[18px] font-semibold tabular-nums" style={{ color: f.pestEscalationRisk >= 55 ? '#a8552e' : '#d8a23a' }}>{f.pestEscalationRisk}</div>
        </div>
        <div className="min-w-[150px] flex-1 px-4 py-2" style={{ background: 'rgba(139,111,71,0.06)' }}>
          <div className="text-[8.5px] uppercase tracking-[0.16em] text-ink-muted">Geopolitical food dependency</div>
          <div className="text-[18px] font-semibold tabular-nums" style={{ color: f.geopoliticalFoodDependency >= 50 ? '#a8552e' : '#d8a23a' }}>{f.geopoliticalFoodDependency}</div>
        </div>
        <div className="min-w-[160px] flex-1 px-4 py-2" style={{ background: 'rgba(90,143,163,0.06)' }}>
          <div className="text-[8.5px] uppercase tracking-[0.16em] text-ink-muted">Seasonal confidence</div>
          <div className="text-[18px] font-semibold tabular-nums" style={{ color: f.seasonalConfidence >= 70 ? '#3a7d4a' : '#d8a23a' }}>{f.seasonalConfidence}</div>
        </div>
        <div className="min-w-[200px] flex-[2] px-4 py-2">
          <div className="text-[8.5px] uppercase tracking-[0.16em] text-ink-muted">12-week outlook (yield · drought)</div>
          <div className="mt-1 flex h-7 items-end gap-1">
            {f.horizonWeeks.map((_, i) => {
              const y = f.yieldOutlook[i]!, d = f.droughtRisk[i]!;
              return (
                <div key={i} className="flex flex-1 items-end gap-px">
                  <span className="block flex-1" style={{ height: `${Math.max(2, y * 0.25)}px`, background: '#3a7d4a' }} title={`yield ${y}`} />
                  <span className="block flex-1" style={{ height: `${Math.max(2, d * 0.25)}px`, background: '#d8a23a' }} title={`drought ${d}`} />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Distribution lanes */}
      <div>
        <div className="mb-2 text-[10px] uppercase tracking-[0.22em]" style={{ color: '#c9a449' }}>· Food distribution &amp; cold-chain lanes</div>
        <div className="space-y-1.5">
          {b.distribution.map(l => (
            <div key={l.id} className="flex items-center gap-3 border px-3 py-2"
              style={{ borderColor: 'color-mix(in srgb,#8b6f47 38%,rgb(var(--c-line)))', background: 'rgba(0,0,0,0.18)' }}>
              <span className="w-64 shrink-0 truncate text-[11.5px] tracking-tight text-ink">{l.lane}</span>
              <span className="flex flex-1 items-center gap-2">
                <span className="text-[8.5px] uppercase tracking-[0.14em] text-ink-muted">cold-chain</span>
                <span className="relative h-2 w-32 bg-surface-2">
                  <span className="absolute inset-y-0 left-0" style={{ width: `${l.coldChainIntegrity}%`, background: TONE_COL[l.tone] }} />
                </span>
                <span className="text-[10px] tabular-nums" style={{ color: TONE_COL[l.tone] }}>{l.coldChainIntegrity}%</span>
              </span>
              <span className="w-24 shrink-0 text-right text-[10px] tabular-nums text-ink-muted">{l.throughputTons}t/day</span>
              <span className="w-20 shrink-0 text-right text-[10px] tabular-nums text-ink-muted">{l.storageDays}d store</span>
              {l.emergencyRouting ? (
                <span className="rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-[0.14em]"
                  style={{ borderColor: '#a8552e', color: '#a8552e' }}>emergency routing</span>
              ) : (
                <span className="text-[9px] uppercase tracking-[0.14em]" style={{ color: '#3a7d4a' }}>nominal</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Rural stability */}
      <div>
        <div className="mb-2 text-[10px] uppercase tracking-[0.22em]" style={{ color: '#8b6f47' }}>· Rural governance &amp; community stability</div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {b.rural.map(r => {
            const migCol = r.migrationRisk === 'elevated' ? '#a8552e' : r.migrationRisk === 'monitor' ? '#d8a23a' : '#3a7d4a';
            return (
              <div key={r.region} className="border p-3"
                style={{ borderColor: 'color-mix(in srgb,#8b6f47 38%,rgb(var(--c-line)))', background: 'rgba(58,125,74,0.04)' }}>
                <div className="flex items-baseline justify-between">
                  <span className="text-[12px] font-semibold tracking-tight text-ink">{r.region}</span>
                  <span className="rounded-full border px-2 py-0.5 text-[8.5px] uppercase tracking-[0.14em]"
                    style={{ borderColor: `color-mix(in srgb,${migCol} 45%,transparent)`, color: migCol }}>{r.migrationRisk}</span>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-center text-[10px]">
                  <div>
                    <div className="text-[8px] uppercase tracking-[0.14em] text-ink-muted">Community</div>
                    <div className="font-semibold tabular-nums" style={{ color: r.farmingCommunityIdx >= 70 ? '#3a7d4a' : '#d8a23a' }}>{r.farmingCommunityIdx}</div>
                  </div>
                  <div>
                    <div className="text-[8px] uppercase tracking-[0.14em] text-ink-muted">Labour</div>
                    <div className="font-semibold tabular-nums text-ink">{r.agriculturalLabour}</div>
                  </div>
                  <div>
                    <div className="text-[8px] uppercase tracking-[0.14em] text-ink-muted">Pressure</div>
                    <div className="font-semibold tabular-nums" style={{ color: r.economicPressure >= 50 ? '#a8552e' : '#d8a23a' }}>{r.economicPressure}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Ministries engaged */}
      {b.ministriesEngaged.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 border p-2"
          style={{ borderColor: 'color-mix(in srgb,#3a7d4a 35%,rgb(var(--c-line)))' }}>
          <span className="text-[9px] uppercase tracking-[0.18em] text-ink-muted">Ministries engaged</span>
          {b.ministriesEngaged.map(m => (
            <span key={m.ministry} className="rounded-full border px-2 py-0.5 text-[9.5px]"
              style={{ borderColor: 'color-mix(in srgb,#3a7d4a 45%,transparent)', color: '#3a7d4a' }}>
              {m.ministry} · {m.engaged}
            </span>
          ))}
        </div>
      ) : null}

      {/* Incidents with cascade */}
      <div>
        <div className="mb-2 text-[10px] uppercase tracking-[0.22em]" style={{ color: '#a8552e' }}>· Agricultural emergencies &amp; cascading effects</div>
        <div className="space-y-2">
          {b.incidents.slice(0, 5).map(i => (
            <div key={i.id} className="border" style={{ borderColor: `color-mix(in srgb,${SEV_COL[i.severity]} 35%,rgb(var(--c-line)))` }}>
              <div className="flex flex-wrap items-baseline gap-2 px-3 py-1.5" style={{ background: `linear-gradient(90deg, color-mix(in srgb,${SEV_COL[i.severity]} 10%, transparent) 0%, transparent 100%)` }}>
                <span className="font-mono text-[9.5px] tabular-nums text-ink-muted">{i.id}</span>
                <span className="text-[12px] font-semibold tracking-tight text-ink">{i.kind}</span>
                <span className="text-[9.5px] text-ink-muted">· {i.region}</span>
                {i.emergencyInterventionActive ? <span className="rounded-full border px-2 py-0.5 text-[8.5px] uppercase tracking-[0.14em]" style={{ borderColor: '#a8552e', color: '#a8552e' }}>intervention active</span> : null}
                <span className="ml-auto text-[9.5px] uppercase tracking-[0.14em]" style={{ color: SEV_COL[i.severity] }}>{i.severity}</span>
              </div>
              <div className="border-t" style={{ borderColor: 'rgba(139,111,71,0.25)' }}>
                {i.ministryCascade.map((c, idx) => (
                  <div key={idx} className="flex items-baseline gap-3 border-b px-3 py-1.5 text-[10px] last:border-0"
                    style={{ borderColor: 'rgba(139,111,71,0.15)' }}>
                    <span className="w-44 shrink-0 text-ink">{c.ministry}</span>
                    <span className="flex-1 text-ink-muted">{c.effect}</span>
                    <span className="w-12 shrink-0 text-right text-[9px] tabular-nums text-ink-muted">+{c.delayHrs}h</span>
                    <span className="w-20 shrink-0 text-right text-[9px] uppercase tracking-[0.14em]"
                      style={{ color: c.status === 'cleared' ? '#3a7d4a' : c.status === 'engaged' ? '#d8a23a' : '#8b6f47' }}>
                      {c.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <p className="text-[10px] text-ink-muted">
        Drought escalation cascades to Treasury (emergency food allocation), Transport (reserve relay), Health
        (nutritional stress), Interior (regional stability) and the cabinet — humanitarian routing always pre-empts
        commercial distribution.
      </p>
    </div>
  );
}
