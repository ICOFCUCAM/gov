'use client';

// Communications — Intelligence Forecasting & Public Digital
// Services Portal. 25-year horizon traces, signal anomaly stream,
// digital service request queue, public advisory feed.

import * as React from 'react';
import { communicationsBoard, type SignalAnomaly, type DigitalServiceRequest, type PublicAdvisoryComms } from '@/lib/gov/communications-continuity';

const SIGNAL_CYAN = '#2dd4d4';
const FIBER = '#0fb98d';
const AMBER = '#d68a2e';
const ALERT = '#c44a3a';
const DEEP_NET = '#0a1628';
const PANEL = '#131e2e';
const PANEL2 = '#1a2a3e';
const DATA = '#e8eef5';
const INK = '#c5cdd6';
const MUT = '#6f7a8a';

const TIER_COL: Record<SignalAnomaly['tier'], string> = {
  observation: MUT, elevated: SIGNAL_CYAN, urgent: AMBER, critical: ALERT,
};
const STATUS_COL: Record<DigitalServiceRequest['status'], string> = {
  received: MUT, verifying: SIGNAL_CYAN, 'in-progress': AMBER, resolved: FIBER,
};
const ADV_COL: Record<PublicAdvisoryComms['severity'], string> = {
  advisory: SIGNAL_CYAN, warning: AMBER, critical: ALERT,
};
const DOMAIN_GLYPH: Record<SignalAnomaly['signalDomain'], string> = {
  cellular: '▲', fiber: '═', satellite: '✦', submarine: '≋', broadcast: '◬', 'data-center': '▭',
};
const SERVICE_LABEL: Record<DigitalServiceRequest['service'], string> = {
  'identity-renewal': 'Identity renewal',
  'connectivity-report': 'Connectivity report',
  'cyber-incident-report': 'Cyber incident report',
  'broadband-complaint': 'Broadband complaint',
  'spectrum-licence': 'Spectrum licence',
  'telecom-portability': 'Telecom portability',
};
const ADV_GLYPH: Record<PublicAdvisoryComms['kind'], string> = {
  'service-disruption': '⚠', 'planned-maintenance': '⚙', 'cyber-threat-warning': '🔒', 'emergency-broadcast': '📡', 'identity-renewal-drive': '◈', 'spectrum-reallocation': '📊',
};

// Stepped horizon trace
function StepTrace({ label, series, color, unit }: { label: string; series: number[]; color: string; unit?: string }) {
  const w = 220, h = 64, padT = 6, padB = 16, padL = 6, padR = 6;
  const plotH = h - padT - padB;
  const plotW = w - padL - padR;
  const min = Math.min(...series), max = Math.max(...series);
  const range = Math.max(1, max - min);
  const pts = series.map((v, i) => ({ x: padL + (i / 4) * plotW, y: padT + plotH - ((v - min) / range) * plotH }));
  return (
    <div className="px-3 py-3" style={{ background: PANEL, border: '1px solid rgba(45,212,212,0.18)' }}>
      <div className="text-[9px] uppercase tracking-[0.32em]" style={{ color: MUT }}>{label}</div>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="mt-1.5 block" aria-hidden>
        {[0.25, 0.5, 0.75].map(p => <line key={p} x1={padL} y1={padT + plotH * p} x2={w - padR} y2={padT + plotH * p} stroke="rgba(45,212,212,0.08)" />)}
        {pts.map((p, i) => {
          if (i === 0) return null;
          const prev = pts[i - 1]!;
          return (
            <g key={i}>
              <line x1={prev.x} y1={prev.y} x2={p.x} y2={prev.y} stroke={color} strokeWidth={1.5} />
              <line x1={p.x} y1={prev.y} x2={p.x} y2={p.y} stroke={color} strokeWidth={1.5} strokeDasharray="2 2" />
            </g>
          );
        })}
        {pts.map((p, i) => (
          <g key={`pt${i}`}>
            <rect x={p.x - 2.5} y={p.y - 2.5} width={5} height={5} fill={color} />
            <text x={p.x} y={h - 4} fontSize={7} textAnchor="middle" fill={MUT}>+{[5, 10, 15, 20, 25][i]}y</text>
          </g>
        ))}
      </svg>
      <div className="mt-1 flex items-baseline justify-between text-[9.5px]">
        <span style={{ color: MUT }}>NOW <span className="tabular-nums" style={{ color: INK }}>{series[0]}{unit ?? ''}</span></span>
        <span style={{ color: MUT }}>+25Y <span className="tabular-nums" style={{ color }}>{series[series.length - 1]}{unit ?? ''}</span></span>
      </div>
    </div>
  );
}

export function CommsForesightPortal({ id, now }: { id: string; now: number }) {
  void id;
  const b = communicationsBoard(now);
  const f = b.intelligence.forecast;
  const p = b.portal;
  return (
    <div style={{ background: DEEP_NET, color: INK, fontFamily: '"JetBrains Mono", ui-monospace, monospace' }}>
      <div className="h-px w-full" style={{ background: `linear-gradient(90deg, transparent 0%, ${SIGNAL_CYAN} 30%, ${SIGNAL_CYAN} 70%, transparent 100%)`, boxShadow: `0 0 6px ${SIGNAL_CYAN}` }} />

      <header className="px-8 py-5" style={{ background: 'linear-gradient(180deg, #131e2e 0%, #0a1628 100%)', borderBottom: `1px solid rgba(45,212,212,0.18)` }}>
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.42em]" style={{ color: SIGNAL_CYAN }}>NCC ◇ INTELLIGENCE FORECAST · PUBLIC DIGITAL PORTAL</div>
            <h2 className="mt-2 text-[18px] tracking-[0.04em]" style={{ color: DATA }}>25-year digital trajectory · AI reasoning {b.intelligence.aiReasoningCoveragePct}% · {b.intelligence.anomalies.length} live signals</h2>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center" style={{ minWidth: '260px' }}>
            {[
              { l: 'LONG-HORIZON RES.', v: f.longHorizonDigitalResilienceIdx, c: f.longHorizonDigitalResilienceIdx >= 75 ? FIBER : AMBER },
              { l: 'SYSTEMIC RISK', v: f.systemicConnectivityRisk, c: f.systemicConnectivityRisk >= 60 ? ALERT : f.systemicConnectivityRisk >= 30 ? AMBER : FIBER },
            ].map(x => (
              <div key={x.l} className="px-3 py-2" style={{ background: PANEL, borderLeft: `2px solid ${x.c}` }}>
                <div className="text-[8.5px] uppercase tracking-[0.24em]" style={{ color: MUT }}>{x.l}</div>
                <div className="mt-0.5 tabular-nums text-[18px]" style={{ color: x.c }}>{x.v}</div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* 25-year horizon traces */}
      <section className="px-8 py-5" style={{ background: DEEP_NET, borderBottom: `1px solid rgba(45,212,212,0.12)` }}>
        <h3 className="mb-3 text-[10px] uppercase tracking-[0.36em]" style={{ color: SIGNAL_CYAN }}>↗ 25-YEAR DIGITAL HORIZON</h3>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-5">
          <StepTrace label="Bandwidth demand" series={f.bandwidthDemandTrajectoryTbps} color={SIGNAL_CYAN} unit=" Tbps" />
          <StepTrace label="Rural 5G coverage" series={f.rural5GCoverageTrajectory} color={FIBER} unit="%" />
          <StepTrace label="Cyber threat level" series={f.cyberThreatLevelTrajectory} color={ALERT} />
          <StepTrace label="Sovereign cloud share" series={f.sovereignCloudShareTrajectory} color={FIBER} unit="%" />
          <StepTrace label="Digital identity penetr." series={f.digitalIdentityPenetrationTrajectory} color={SIGNAL_CYAN} unit="%" />
        </div>
      </section>

      {/* Signal anomaly stream */}
      <section className="px-8 py-5" style={{ background: PANEL, borderBottom: `1px solid rgba(45,212,212,0.12)` }}>
        <h3 className="mb-3 text-[10px] uppercase tracking-[0.36em]" style={{ color: SIGNAL_CYAN }}>◧ SIGNAL ANOMALY STREAM · TIER-SORTED</h3>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
          {b.intelligence.anomalies.map(a => (
            <div key={a.id} className="grid grid-cols-[28px_1fr_50px] items-center gap-2 px-3 py-2 text-[11px]" style={{ background: DEEP_NET, borderLeft: `2px solid ${TIER_COL[a.tier]}` }}>
              <span className="text-center text-[14px]" style={{ color: TIER_COL[a.tier] }}>{DOMAIN_GLYPH[a.signalDomain]}</span>
              <div>
                <div style={{ color: DATA }}>{a.signalDomain}</div>
                <div className="text-[9px]" style={{ color: MUT }}>{a.region} · {a.detectedHrsAgo}h ago</div>
              </div>
              <div className="text-right">
                <div className="tabular-nums text-[11px]" style={{ color: AMBER }}>{a.confidence}</div>
                <div className="text-[8px] uppercase tracking-[0.2em]" style={{ color: TIER_COL[a.tier] }}>● {a.tier}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Public service requests + advisories */}
      <section className="grid grid-cols-1 gap-px lg:grid-cols-[1fr_340px]" style={{ background: 'rgba(45,212,212,0.12)' }}>
        <div className="px-8 py-5" style={{ background: DEEP_NET }}>
          <h3 className="mb-3 text-[10px] uppercase tracking-[0.36em]" style={{ color: SIGNAL_CYAN }}>◇ PUBLIC DIGITAL SERVICE REQUESTS · {p.requests.length}</h3>
          <div className="overflow-hidden" style={{ background: PANEL }}>
            <div className="grid grid-cols-[80px_180px_120px_60px_100px] gap-2 px-3 py-2 text-[9px] uppercase tracking-[0.2em]" style={{ color: MUT, background: PANEL2 }}>
              <span>ID</span><span>Service</span><span>Region</span><span className="text-right">Days</span><span className="text-right">Status</span>
            </div>
            {p.requests.map(r => (
              <div key={r.id} className="grid grid-cols-[80px_180px_120px_60px_100px] items-center gap-2 px-3 py-2 text-[11px]" style={{ borderTop: '1px solid rgba(45,212,212,0.08)' }}>
                <span className="tabular-nums" style={{ color: SIGNAL_CYAN }}>{r.id}</span>
                <span style={{ color: DATA }}>{SERVICE_LABEL[r.service]}</span>
                <span style={{ color: INK }}>{r.region}</span>
                <span className="text-right tabular-nums" style={{ color: MUT }}>{r.daysOpen}d</span>
                <span className="text-right text-[9px] uppercase tracking-[0.18em]" style={{ color: STATUS_COL[r.status] }}>● {r.status}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 text-[10px] uppercase tracking-[0.24em] flex gap-4" style={{ color: MUT }}>
            <span>citizen contacts /day <span className="tabular-nums" style={{ color: SIGNAL_CYAN }}>{p.citizenContactsDailyK}K</span></span>
            <span>portal uptime <span className="tabular-nums" style={{ color: p.portalAvailabilityPct >= 99 ? FIBER : AMBER }}>{p.portalAvailabilityPct}%</span></span>
          </div>
        </div>
        <aside className="px-6 py-5" style={{ background: PANEL }}>
          <h3 className="mb-3 text-[10px] uppercase tracking-[0.36em]" style={{ color: SIGNAL_CYAN }}>📡 PUBLIC ADVISORIES</h3>
          <div className="space-y-2">
            {p.advisories.map(a => {
              const col = ADV_COL[a.severity];
              return (
                <div key={a.id} className="px-3 py-2.5" style={{ background: DEEP_NET, borderLeft: `2px solid ${col}` }}>
                  <div className="flex items-baseline justify-between">
                    <span className="text-[14px]">{ADV_GLYPH[a.kind]}</span>
                    <span className="text-[9px] uppercase tracking-[0.2em]" style={{ color: col }}>● {a.severity}</span>
                  </div>
                  <div className="mt-1 text-[11px]" style={{ color: DATA }}>{a.kind.replace(/-/g, ' ')}</div>
                  <div className="text-[9px]" style={{ color: MUT }}>{a.region} · {a.ageHrs}h</div>
                  <div className="mt-1 text-[9.5px] uppercase tracking-[0.2em]" style={{ color: AMBER }}>reach <span className="tabular-nums">{a.reachM}M</span></div>
                </div>
              );
            })}
          </div>
        </aside>
      </section>

      <div className="h-px w-full" style={{ background: `linear-gradient(90deg, transparent 0%, ${SIGNAL_CYAN} 30%, ${SIGNAL_CYAN} 70%, transparent 100%)`, boxShadow: `0 0 6px ${SIGNAL_CYAN}` }} />
    </div>
  );
}
