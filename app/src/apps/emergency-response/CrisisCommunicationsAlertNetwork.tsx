'use client';

// Emergency Management — Crisis Communications & Alert Networks.
// Alert-channel transmission rack with uptime gauges, ticker strip
// of active alerts, propagation timing readout.

import * as React from 'react';
import { emergencyResilienceBoard, type AlertChannel } from '@/lib/gov/emergency-resilience';

const AMBER = '#d68a2e';
const CRIMSON = '#b8302e';
const RESCUE_WHITE = '#f5f5f0';
const BLUEGRAY = '#4a5a6a';
const HAZARD = '#c75a2a';
const INK = '#dcdcd8';
const INK_DARK = '#1b1f24';
const PANEL = '#1f242b';
const PANEL2 = '#262c34';
const MUT = '#7e848c';
const OK = '#3a8a82';

const HEALTH_COL: Record<AlertChannel['channelHealth'], string> = {
  operational: OK, degraded: AMBER, offline: CRIMSON,
};

function TransmissionPulse({ uptime }: { uptime: number }) {
  // 24-segment uptime bar
  const segs = 24;
  const lit = Math.round((uptime / 100) * segs);
  return (
    <div className="flex h-3 items-end gap-[2px]" aria-hidden>
      {Array.from({ length: segs }).map((_, i) => {
        const active = i < lit;
        return <div key={i} className="flex-1 rounded-sm" style={{
          height: active ? '100%' : '40%',
          background: active ? (uptime >= 95 ? OK : uptime >= 88 ? AMBER : CRIMSON) : BLUEGRAY,
          opacity: active ? 0.4 + (i / segs) * 0.6 : 0.4,
        }} />;
      })}
    </div>
  );
}

export function CrisisCommunicationsAlertNetwork({ id, now }: { id: string; now: number }) {
  void id;
  const b = emergencyResilienceBoard(now);
  const cc = b.communications;
  const totalReach = cc.channels.reduce((s, c) => s + c.reachM, 0);
  return (
    <div style={{ background: INK_DARK, color: INK, fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>
      <div className="h-1.5 w-full" style={{ background: `repeating-linear-gradient(135deg, ${AMBER} 0 8px, ${INK_DARK} 8px 16px)` }} />

      <header className="px-6 py-5" style={{ background: PANEL, borderBottom: `1px solid ${BLUEGRAY}40` }}>
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.5em]" style={{ color: AMBER, fontFamily: 'ui-monospace, monospace' }}>NEC ▮ CRISIS COMMUNICATIONS</div>
            <h2 className="mt-2 text-[18px] uppercase tracking-[0.04em]" style={{ color: RESCUE_WHITE }}>{cc.nationalAlertsActive} active alerts · reach {totalReach.toFixed(1)}M citizens</h2>
          </div>
          <div className="grid grid-cols-3 gap-2" style={{ fontFamily: 'ui-monospace, monospace' }}>
            {[
              { l: 'ADVISORIES 24H', v: cc.publicAdvisoriesIssued24h, c: AMBER },
              { l: 'INTER-MIN ROUTES', v: cc.interMinistryRoutesActive, c: OK },
              { l: 'AVG PROPAG. (S)', v: cc.averagePropagationSeconds, c: cc.averagePropagationSeconds <= 10 ? OK : cc.averagePropagationSeconds <= 20 ? AMBER : CRIMSON },
            ].map(x => (
              <div key={x.l} className="px-3 py-2" style={{ background: PANEL2, borderLeft: `2px solid ${x.c}` }}>
                <div className="text-[8.5px] uppercase tracking-[0.24em]" style={{ color: MUT }}>{x.l}</div>
                <div className="mt-0.5 tabular-nums text-[18px]" style={{ color: x.c }}>{x.v}</div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Ticker strip */}
      <div className="overflow-hidden border-b" style={{ borderColor: `${BLUEGRAY}30`, background: PANEL2 }}>
        <div className="flex items-center gap-6 px-6 py-2 text-[10px] uppercase tracking-[0.22em] whitespace-nowrap" style={{ fontFamily: 'ui-monospace, monospace', color: AMBER }}>
          <span style={{ color: CRIMSON }}>● LIVE ALERT FEED</span>
          {cc.channels.flatMap(c => Array.from({ length: c.activeAlerts }).map((_, i) => (
            <span key={`${c.channel}-${i}`} style={{ color: MUT }}>
              <span style={{ color: HAZARD }}>▮</span> {c.channel.toUpperCase()} · ALERT-{(c.reachM * 100 + i).toFixed(0)} · {c.uptimePct.toFixed(1)}% UP
            </span>
          )))}
          {cc.nationalAlertsActive === 0 ? <span style={{ color: OK }}>○ NO ACTIVE PUBLIC ALERTS</span> : null}
        </div>
      </div>

      {/* Channel rack */}
      <section className="px-6 py-5" style={{ background: INK_DARK }}>
        <h3 className="mb-3 text-[10px] uppercase tracking-[0.36em]" style={{ color: AMBER, fontFamily: 'ui-monospace, monospace' }}>📡 NATIONAL ALERT TRANSMISSION RACK</h3>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {cc.channels.map(c => {
            const col = HEALTH_COL[c.channelHealth];
            return (
              <div key={c.channel} className="grid grid-cols-[40px_1fr_120px] items-center gap-4 px-4 py-3" style={{ background: PANEL, borderLeft: `3px solid ${col}`, fontFamily: 'ui-monospace, monospace' }}>
                <div className="flex flex-col items-center">
                  <span className="text-[20px]" style={{ color: col }}>▮</span>
                  <span className="text-[7.5px] uppercase tracking-[0.18em]" style={{ color: MUT }}>CH</span>
                </div>
                <div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-[12px]" style={{ color: RESCUE_WHITE }}>{c.channel}</span>
                    <span className="text-[9px] uppercase tracking-[0.22em]" style={{ color: col }}>· {c.channelHealth}</span>
                  </div>
                  <div className="mt-2"><TransmissionPulse uptime={c.uptimePct} /></div>
                  <div className="mt-1 flex items-baseline justify-between text-[9.5px]" style={{ color: MUT }}>
                    <span>UPTIME <span className="ml-1 tabular-nums" style={{ color: col }}>{c.uptimePct.toFixed(1)}%</span></span>
                    <span>REACH <span className="ml-1 tabular-nums" style={{ color: INK }}>{c.reachM.toFixed(1)}M</span></span>
                    <span>ALERTS <span className="ml-1 tabular-nums" style={{ color: c.activeAlerts ? CRIMSON : OK }}>{c.activeAlerts}</span></span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[8.5px] uppercase tracking-[0.22em]" style={{ color: MUT }}>STATUS</div>
                  <div className="rounded-sm px-2 py-1 text-[10px] uppercase tracking-[0.18em]" style={{ background: `${col}22`, color: col }}>● {c.channelHealth}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="h-1.5 w-full" style={{ background: `repeating-linear-gradient(135deg, ${AMBER} 0 8px, ${INK_DARK} 8px 16px)` }} />
    </div>
  );
}
