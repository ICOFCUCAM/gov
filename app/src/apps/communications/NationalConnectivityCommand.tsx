'use client';

// Communications — National Connectivity Command.
// Network-topology header, regional connectivity tiles with signal-
// strength columns, telecom asset register, data-center capacity
// strip, routing-health gauges. Monospaced typography; signal cyan /
// fiber green / amber signal / deep network blue palette — no reuse
// of any prior ministry geometry.

import * as React from 'react';
import { communicationsBoard, type ConnectivityPosture, type RegionalConnectivity, type NetworkAsset, type DataCenterCapacity, type RoutingHealth } from '@/lib/gov/communications-continuity';

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

const POSTURE_COL: Record<ConnectivityPosture, string> = {
  nominal: FIBER, engaged: SIGNAL_CYAN, degraded: AMBER, critical: ALERT, 'sovereign-lockdown': '#7d1817',
};

const REGION_COL: Record<RegionalConnectivity['classification'], string> = {
  nominal: FIBER, observant: SIGNAL_CYAN, degraded: AMBER, fractured: ALERT,
};

const ASSET_GLYPH: Record<NetworkAsset['kind'], string> = {
  'mobile-tower': '▲', 'fiber-trunk': '═', 'submarine-cable': '≋', 'satellite-uplink': '✦', 'broadcast-tower': '◬', 'data-center': '▭',
};
const ASSET_COL: Record<NetworkAsset['status'], string> = {
  operational: FIBER, degraded: AMBER, maintenance: SIGNAL_CYAN, offline: ALERT,
};
const DC_COL: Record<DataCenterCapacity['status'], string> = {
  optimal: FIBER, monitored: SIGNAL_CYAN, pressured: AMBER, degraded: ALERT,
};
const ROUTING_COL: Record<RoutingHealth['classification'], string> = {
  stable: FIBER, watch: SIGNAL_CYAN, engaged: AMBER, degraded: ALERT,
};

// Signal-strength column (5 bars)
function SignalColumn({ pct, col }: { pct: number; col: string }) {
  const bars = 5;
  const lit = Math.round((pct / 100) * bars);
  return (
    <div className="flex items-end gap-0.5" aria-hidden>
      {Array.from({ length: bars }).map((_, i) => (
        <span key={i} style={{
          width: 4, height: 4 + i * 3,
          background: i < lit ? col : 'rgba(45,212,212,0.15)',
        }} />
      ))}
    </div>
  );
}

export function NationalConnectivityCommand({ id, now }: { id: string; now: number }) {
  void id;
  const b = communicationsBoard(now);
  const c = b.command;
  return (
    <div style={{ background: DEEP_NET, color: INK, fontFamily: '"JetBrains Mono", ui-monospace, monospace' }}>
      {/* signal-line header */}
      <div className="h-px w-full" style={{ background: `linear-gradient(90deg, transparent 0%, ${SIGNAL_CYAN} 30%, ${SIGNAL_CYAN} 70%, transparent 100%)`, boxShadow: `0 0 6px ${SIGNAL_CYAN}` }} />

      <header className="px-8 py-5" style={{ background: 'linear-gradient(180deg, #131e2e 0%, #0a1628 100%)', borderBottom: `1px solid rgba(45,212,212,0.18)` }}>
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.42em]" style={{ color: SIGNAL_CYAN }}>NCC ◇ NATIONAL CONNECTIVITY COMMAND</div>
            <h2 className="mt-2 text-[18px] tracking-[0.04em]" style={{ color: DATA }}>{b.bannerLine}</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-block h-3 w-3" style={{ background: POSTURE_COL[c.posture], boxShadow: `0 0 8px ${POSTURE_COL[c.posture]}aa` }} />
            <span className="text-[11px] uppercase tracking-[0.32em]" style={{ color: POSTURE_COL[c.posture] }}>{c.posture.replace(/-/g, ' ')}</span>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-px md:grid-cols-5" style={{ background: 'rgba(45,212,212,0.18)' }}>
          {[
            { l: 'NAT. UPTIME', v: `${c.nationalUptimePct}%`, c: c.nationalUptimePct >= 99 ? FIBER : AMBER },
            { l: 'SIGNAL INTEG.', v: c.signalIntegrityIdx, c: c.signalIntegrityIdx >= 80 ? FIBER : AMBER },
            { l: 'ROUTING RES.', v: c.routingResilienceIdx, c: c.routingResilienceIdx >= 75 ? FIBER : SIGNAL_CYAN },
            { l: 'SOV. AUTONOMY', v: c.sovereignAutonomyIdx, c: c.sovereignAutonomyIdx >= 70 ? FIBER : SIGNAL_CYAN },
            { l: 'EMERG. CHAN.', v: c.emergencyChannelsActive, c: c.emergencyChannelsActive ? AMBER : FIBER },
          ].map(x => (
            <div key={x.l} className="px-3 py-2.5" style={{ background: PANEL }}>
              <div className="text-[8.5px] uppercase tracking-[0.24em]" style={{ color: MUT }}>{x.l}</div>
              <div className="mt-0.5 tabular-nums text-[16px]" style={{ color: x.c }}>{x.v}</div>
            </div>
          ))}
        </div>
      </header>

      {/* Regional connectivity tiles */}
      <section className="px-8 py-5" style={{ background: DEEP_NET, borderBottom: `1px solid rgba(45,212,212,0.12)` }}>
        <h3 className="mb-3 text-[10px] uppercase tracking-[0.36em]" style={{ color: SIGNAL_CYAN }}>◇ REGIONAL CONNECTIVITY · {c.regions.length} REGIONS</h3>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
          {c.regions.map(r => (
            <article key={r.region} className="grid grid-cols-[60px_1fr] gap-3 px-4 py-3" style={{ background: PANEL, borderLeft: `2px solid ${REGION_COL[r.classification]}` }}>
              <div className="flex flex-col items-center justify-center">
                <SignalColumn pct={r.mobileCoveragePct} col={REGION_COL[r.classification]} />
                <span className="mt-2 text-[8px] uppercase tracking-[0.18em]" style={{ color: MUT }}>SIG</span>
              </div>
              <div>
                <div className="flex items-baseline justify-between">
                  <span className="text-[12px]" style={{ color: DATA }}>{r.region}</span>
                  <span className="text-[9px] uppercase tracking-[0.2em]" style={{ color: REGION_COL[r.classification] }}>● {r.classification}</span>
                </div>
                <div className="text-[9px]" style={{ color: MUT }}>{r.households.toLocaleString()} households</div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-[10px]">
                  <div>
                    <div className="uppercase tracking-[0.18em]" style={{ color: MUT, fontSize: '8.5px' }}>BBAND</div>
                    <div className="tabular-nums" style={{ color: r.broadbandPenetrationPct >= 75 ? FIBER : AMBER }}>{r.broadbandPenetrationPct}%</div>
                  </div>
                  <div>
                    <div className="uppercase tracking-[0.18em]" style={{ color: MUT, fontSize: '8.5px' }}>MOBILE</div>
                    <div className="tabular-nums" style={{ color: r.mobileCoveragePct >= 95 ? FIBER : AMBER }}>{r.mobileCoveragePct}%</div>
                  </div>
                  <div>
                    <div className="uppercase tracking-[0.18em]" style={{ color: MUT, fontSize: '8.5px' }}>LAT MS</div>
                    <div className="tabular-nums" style={{ color: r.averageLatencyMs > 120 ? ALERT : r.averageLatencyMs > 60 ? AMBER : FIBER }}>{r.averageLatencyMs}</div>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Network assets table */}
      <section className="px-8 py-5" style={{ background: PANEL, borderBottom: `1px solid rgba(45,212,212,0.12)` }}>
        <h3 className="mb-3 text-[10px] uppercase tracking-[0.36em]" style={{ color: SIGNAL_CYAN }}>≋ NATIONAL NETWORK ASSETS · {b.networkAssets.length} TRACKED</h3>
        <div className="overflow-hidden" style={{ background: DEEP_NET }}>
          <div className="grid grid-cols-[80px_30px_140px_120px_80px_80px_100px_100px] gap-2 px-3 py-2 text-[9px] uppercase tracking-[0.2em]" style={{ color: MUT, background: PANEL2 }}>
            <span>ID</span><span></span><span>Kind</span><span>Region</span><span className="text-right">Cap.</span><span className="text-right">Util.</span><span className="text-right">Uptime</span><span className="text-right">Status</span>
          </div>
          {b.networkAssets.slice(0, 14).map(a => (
            <div key={a.id} className="grid grid-cols-[80px_30px_140px_120px_80px_80px_100px_100px] items-center gap-2 px-3 py-1.5 text-[11px]" style={{ borderTop: '1px solid rgba(45,212,212,0.08)' }}>
              <span className="tabular-nums" style={{ color: SIGNAL_CYAN }}>{a.id}</span>
              <span className="text-center text-[14px]" style={{ color: ASSET_COL[a.status] }}>{ASSET_GLYPH[a.kind]}</span>
              <span style={{ color: DATA }}>{a.kind.replace(/-/g, ' ')}</span>
              <span style={{ color: INK }}>{a.region}</span>
              <span className="text-right tabular-nums" style={{ color: INK }}>{a.capacityIdx}</span>
              <span className="text-right tabular-nums" style={{ color: a.utilisationPct >= 100 ? ALERT : a.utilisationPct >= 80 ? AMBER : INK }}>{a.utilisationPct}%</span>
              <span className="text-right tabular-nums" style={{ color: a.uptimePct < 95 ? ALERT : FIBER }}>{a.uptimePct}%</span>
              <span className="text-right text-[9px] uppercase tracking-[0.18em]" style={{ color: ASSET_COL[a.status] }}>● {a.status}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Data centers + routing health */}
      <section className="grid grid-cols-1 gap-px lg:grid-cols-[1fr_360px]" style={{ background: 'rgba(45,212,212,0.12)' }}>
        <div className="px-8 py-5" style={{ background: DEEP_NET }}>
          <h3 className="mb-3 text-[10px] uppercase tracking-[0.36em]" style={{ color: SIGNAL_CYAN }}>▭ SOVEREIGN DATA CENTERS</h3>
          <div className="space-y-2">
            {b.dataCenters.map(dc => (
              <div key={dc.facility} className="grid grid-cols-[1fr_70px_80px_100px_100px_80px] items-center gap-2 px-3 py-2.5 text-[11px]" style={{ background: PANEL, borderLeft: `2px solid ${DC_COL[dc.status]}` }}>
                <div>
                  <div style={{ color: DATA }}>{dc.facility}</div>
                  <div className="text-[9px]" style={{ color: MUT }}>{dc.region}</div>
                </div>
                <span className="text-right tabular-nums" style={{ color: INK }}>{dc.redundancy}</span>
                <span className="text-right tabular-nums" style={{ color: dc.rackUtilisationPct >= 90 ? ALERT : AMBER }}>{dc.rackUtilisationPct}%</span>
                <span className="text-right tabular-nums" style={{ color: dc.failoverReadinessIdx >= 80 ? FIBER : AMBER }}>FO {dc.failoverReadinessIdx}</span>
                <span className="text-right tabular-nums" style={{ color: dc.greenPowerSharePct >= 60 ? FIBER : AMBER }}>{dc.greenPowerSharePct}% green</span>
                <span className="text-right text-[9px] uppercase tracking-[0.18em]" style={{ color: DC_COL[dc.status] }}>● {dc.status}</span>
              </div>
            ))}
          </div>
        </div>
        <aside className="px-6 py-5" style={{ background: PANEL }}>
          <h3 className="mb-3 text-[10px] uppercase tracking-[0.36em]" style={{ color: SIGNAL_CYAN }}>⌬ ROUTING HEALTH</h3>
          <div className="space-y-2">
            {b.routing.map(r => (
              <div key={r.metric} className="px-3 py-2" style={{ background: DEEP_NET, borderLeft: `2px solid ${ROUTING_COL[r.classification]}` }}>
                <div className="flex items-baseline justify-between">
                  <span className="text-[10.5px]" style={{ color: DATA }}>{r.metric.replace(/-/g, ' ')}</span>
                  <span className="text-[9px] uppercase tracking-[0.18em]" style={{ color: ROUTING_COL[r.classification] }}>● {r.classification}</span>
                </div>
                <div className="mt-1.5 grid grid-cols-[1fr_50px_70px] items-center gap-2">
                  <div className="h-1 rounded-full" style={{ background: PANEL2 }}>
                    <div className="h-full rounded-full" style={{ width: `${r.scoreIdx}%`, background: ROUTING_COL[r.classification] }} />
                  </div>
                  <span className="tabular-nums text-[10px]" style={{ color: ROUTING_COL[r.classification] }}>{r.scoreIdx}</span>
                  <span className="text-right text-[9.5px]" style={{ color: r.anomaliesActive ? AMBER : MUT }}>{r.anomaliesActive} anom</span>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <div className="h-px w-full" style={{ background: `linear-gradient(90deg, transparent 0%, ${SIGNAL_CYAN} 30%, ${SIGNAL_CYAN} 70%, transparent 100%)`, boxShadow: `0 0 6px ${SIGNAL_CYAN}` }} />
    </div>
  );
}
