'use client';

// Communications — Cybersecurity & Information Resilience.
// Threat-level masthead, cyber incident ledger with phase pipeline,
// SOC operations strip, emergency-broadcast channel rack, failover
// channel matrix. Signal cyan / fiber green / amber / red palette.

import * as React from 'react';
import { communicationsBoard, type CyberIncident, type EmergencyBroadcast, type CyberDefence } from '@/lib/gov/communications-continuity';

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

const PHASES: CyberIncident['phase'][] = ['detection', 'containment', 'eradication', 'recovery', 'closed'];
const PHASE_COL: Record<CyberIncident['phase'], string> = {
  detection: ALERT, containment: AMBER, eradication: SIGNAL_CYAN, recovery: FIBER, closed: MUT,
};
const SEV_COL: Record<CyberIncident['severity'], string> = {
  low: SIGNAL_CYAN, elevated: AMBER, critical: '#c75a2a', national: ALERT,
};
const THREAT_COL: Record<CyberDefence['threatLevel'], string> = {
  normal: FIBER, elevated: SIGNAL_CYAN, high: AMBER, severe: ALERT,
};
const BROADCAST_COL: Record<EmergencyBroadcast['status'], string> = {
  standby: FIBER, broadcasting: ALERT, engaged: AMBER, degraded: '#c75a2a',
};
const ATTRIBUTION_COL: Record<CyberIncident['attribution'], string> = {
  unattributed: MUT, criminal: AMBER, 'state-aligned': ALERT, hacktivist: SIGNAL_CYAN, insider: '#c75a2a',
};
const KIND_GLYPH: Record<CyberIncident['kind'], string> = {
  ddos: '↯', ransomware: '🔒', 'data-exfiltration': '◇', 'supply-chain-compromise': '⌬', 'phishing-campaign': '◊', 'critical-infra-intrusion': '⚡', 'misinformation-flood': '◐', 'identity-credential-theft': '◈',
};
const CHANNEL_GLYPH: Record<EmergencyBroadcast['channel'], string> = {
  'national-tv': '📺', 'national-radio': '📻', 'cell-broadcast': '📱', 'satellite-emergency': '✦', 'siren-network': '🔔', 'civic-app': '◐',
};

function PhasePips({ phase }: { phase: CyberIncident['phase'] }) {
  const idx = PHASES.indexOf(phase);
  return (
    <div className="flex items-center gap-1">
      {PHASES.map((p, i) => (
        <React.Fragment key={p}>
          <span style={{
            width: i === idx ? 10 : 5, height: i === idx ? 10 : 5,
            background: i <= idx ? PHASE_COL[phase] : 'rgba(45,212,212,0.16)',
            transform: 'rotate(45deg)',
          }} />
          {i < PHASES.length - 1 ? <span style={{ width: 4, height: 1, background: i < idx ? PHASE_COL[phase] : 'rgba(45,212,212,0.12)' }} /> : null}
        </React.Fragment>
      ))}
    </div>
  );
}

export function CyberSecurityResilience({ id, now }: { id: string; now: number }) {
  void id;
  const b = communicationsBoard(now);
  const c = b.cyber;
  return (
    <div style={{ background: DEEP_NET, color: INK, fontFamily: '"JetBrains Mono", ui-monospace, monospace' }}>
      <div className="h-px w-full" style={{ background: `linear-gradient(90deg, transparent 0%, ${ALERT} 30%, ${ALERT} 70%, transparent 100%)`, boxShadow: `0 0 6px ${ALERT}` }} />

      <header className="px-8 py-5" style={{ background: 'linear-gradient(180deg, #131e2e 0%, #0a1628 100%)', borderBottom: `1px solid rgba(196,74,58,0.22)` }}>
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.42em]" style={{ color: ALERT }}>SOC ◇ CYBERSECURITY &amp; INFORMATION RESILIENCE</div>
            <h2 className="mt-2 text-[18px] tracking-[0.04em]" style={{ color: DATA }}>{c.incidentsActive.length} active incidents · {c.threatsBlockedDaily.toLocaleString()} threats blocked daily</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-block h-3 w-3" style={{ background: THREAT_COL[c.threatLevel], boxShadow: `0 0 8px ${THREAT_COL[c.threatLevel]}aa` }} />
            <span className="text-[11px] uppercase tracking-[0.32em]" style={{ color: THREAT_COL[c.threatLevel] }}>THREAT · {c.threatLevel}</span>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-px md:grid-cols-4" style={{ background: 'rgba(196,74,58,0.18)' }}>
          {[
            { l: 'SOC ANALYSTS', v: c.socAnalystsOnDuty, c: SIGNAL_CYAN },
            { l: 'THREATS BLOCKED /D', v: c.threatsBlockedDaily.toLocaleString(), c: FIBER },
            { l: 'MEAN CONTAINMENT', v: `${c.meanContainmentHrs}h`, c: c.meanContainmentHrs >= 24 ? ALERT : AMBER },
            { l: 'RESILIENCE IDX', v: c.cyberResilienceIdx, c: c.cyberResilienceIdx >= 75 ? FIBER : AMBER },
          ].map(x => (
            <div key={x.l} className="px-3 py-2.5" style={{ background: PANEL }}>
              <div className="text-[8.5px] uppercase tracking-[0.24em]" style={{ color: MUT }}>{x.l}</div>
              <div className="mt-0.5 tabular-nums text-[16px]" style={{ color: x.c }}>{x.v}</div>
            </div>
          ))}
        </div>
      </header>

      {/* Cyber incident ledger */}
      <section className="px-8 py-5" style={{ background: DEEP_NET, borderBottom: `1px solid rgba(196,74,58,0.12)` }}>
        <h3 className="mb-3 text-[10px] uppercase tracking-[0.36em]" style={{ color: ALERT }}>⚠ ACTIVE CYBER INCIDENTS · SEVERITY-SORTED</h3>
        <div className="space-y-2">
          {c.incidentsActive.map(i => (
            <article key={i.id} className="grid grid-cols-[80px_1fr] gap-px" style={{ background: 'rgba(196,74,58,0.18)' }}>
              <div className="px-3 py-3 text-center" style={{ background: DEEP_NET }}>
                <div className="text-[20px]" style={{ color: SEV_COL[i.severity] }}>{KIND_GLYPH[i.kind]}</div>
                <div className="mt-1 tabular-nums text-[9.5px]" style={{ color: MUT }}>{i.id}</div>
                <div className="mt-1 text-[8.5px] uppercase tracking-[0.18em]" style={{ color: SEV_COL[i.severity] }}>{i.severity}</div>
              </div>
              <div className="px-4 py-3" style={{ background: PANEL }}>
                <div className="flex items-baseline justify-between">
                  <span className="text-[12px]" style={{ color: DATA }}>{i.kind.replace(/-/g, ' ')}</span>
                  <span className="text-[9.5px] uppercase tracking-[0.2em]" style={{ color: ATTRIBUTION_COL[i.attribution] }}>· {i.attribution}</span>
                </div>
                <div className="text-[9.5px] italic" style={{ color: MUT }}>target: {i.targetSector} · {i.detectedHrsAgo}h ago</div>
                <div className="mt-2 grid grid-cols-[1fr_140px] items-center gap-3">
                  <PhasePips phase={i.phase} />
                  <div className="flex items-center gap-2 text-[10px]">
                    <div className="h-1 flex-1 rounded-full" style={{ background: PANEL2 }}>
                      <div className="h-full rounded-full" style={{ width: `${i.containmentPct}%`, background: PHASE_COL[i.phase] }} />
                    </div>
                    <span className="tabular-nums" style={{ color: PHASE_COL[i.phase] }}>{i.containmentPct}%</span>
                  </div>
                </div>
                {/* Cascade */}
                <div className="mt-3 grid grid-cols-1 gap-1 md:grid-cols-2">
                  {i.ministryCascade.map((m, idx) => (
                    <div key={idx} className="grid grid-cols-[120px_1fr_50px_80px] items-baseline gap-2 px-3 py-1.5 text-[10.5px]" style={{ background: DEEP_NET, borderLeft: `2px solid ${m.status === 'cleared' ? FIBER : m.status === 'engaged' ? AMBER : MUT}` }}>
                      <span style={{ color: DATA }}>{m.ministry}</span>
                      <span className="text-[9px]" style={{ color: MUT }}>{m.effect}</span>
                      <span className="text-right tabular-nums text-[9px]" style={{ color: SIGNAL_CYAN }}>+{m.delayHrs}h</span>
                      <span className="text-right text-[9px] uppercase tracking-[0.18em]" style={{ color: m.status === 'cleared' ? FIBER : m.status === 'engaged' ? AMBER : MUT }}>· {m.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Emergency broadcasts + failover */}
      <section className="grid grid-cols-1 gap-px lg:grid-cols-2" style={{ background: 'rgba(45,212,212,0.12)' }}>
        <div className="px-8 py-5" style={{ background: PANEL }}>
          <h3 className="mb-3 text-[10px] uppercase tracking-[0.36em]" style={{ color: SIGNAL_CYAN }}>📡 EMERGENCY BROADCAST CHANNELS</h3>
          <div className="space-y-2">
            {b.emergencyBroadcasts.map(eb => (
              <div key={eb.id} className="grid grid-cols-[40px_1fr_70px_60px_90px] items-center gap-2 px-3 py-2 text-[11px]" style={{ background: DEEP_NET, borderLeft: `2px solid ${BROADCAST_COL[eb.status]}` }}>
                <span className="text-center text-[14px]">{CHANNEL_GLYPH[eb.channel]}</span>
                <div>
                  <div style={{ color: DATA }}>{eb.channel.replace(/-/g, ' ')}</div>
                  <div className="text-[9px]" style={{ color: MUT }}>{eb.region}</div>
                </div>
                <span className="text-right tabular-nums" style={{ color: SIGNAL_CYAN }}>{eb.reachM}M</span>
                <span className="text-right tabular-nums" style={{ color: eb.uptimePct < 95 ? ALERT : FIBER }}>{eb.uptimePct}%</span>
                <span className="text-right text-[9px] uppercase tracking-[0.18em]" style={{ color: BROADCAST_COL[eb.status] }}>● {eb.status}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="px-8 py-5" style={{ background: DEEP_NET }}>
          <h3 className="mb-3 text-[10px] uppercase tracking-[0.36em]" style={{ color: SIGNAL_CYAN }}>↻ FAILOVER CHANNEL MATRIX</h3>
          <div className="space-y-2">
            {b.failoverChannels.map((f, i) => (
              <div key={i} className="px-3 py-2.5" style={{ background: PANEL, borderLeft: `2px solid ${f.readinessPct >= 85 ? FIBER : f.readinessPct >= 70 ? AMBER : ALERT}` }}>
                <div className="flex items-baseline justify-between">
                  <span className="text-[10.5px]" style={{ color: DATA }}>
                    <span style={{ color: ALERT }}>{f.fromChannel}</span>
                    <span className="mx-2" style={{ color: SIGNAL_CYAN }}>↦</span>
                    <span style={{ color: FIBER }}>{f.toChannel}</span>
                  </span>
                  <span className="text-right tabular-nums text-[11px]" style={{ color: f.readinessPct >= 85 ? FIBER : AMBER }}>{f.readinessPct}%</span>
                </div>
                <div className="text-[9px] italic mt-1" style={{ color: MUT }}>trigger: {f.triggerCondition}</div>
                <div className="mt-1.5 h-1 rounded-full" style={{ background: PANEL2 }}>
                  <div className="h-full rounded-full" style={{ width: `${f.readinessPct}%`, background: f.readinessPct >= 85 ? FIBER : AMBER }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="h-px w-full" style={{ background: `linear-gradient(90deg, transparent 0%, ${ALERT} 30%, ${ALERT} 70%, transparent 100%)`, boxShadow: `0 0 6px ${ALERT}` }} />
    </div>
  );
}
