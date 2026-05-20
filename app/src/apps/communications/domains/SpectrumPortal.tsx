'use client';

// Communications domains — Spectrum, Intelligence, Portal & Oversight surfaces.

import * as React from 'react';
import { communicationsBoard, COMMUNICATIONS_SAFEGUARDS } from '@/lib/gov/communications-continuity';
import { TopologyFrame, TopologyKpi, TopologyRule, NodeBar, TopologyCallout, COMMS_DS } from '@/apps/communications/design-system/communications-ds';

export function SpectrumBands({ id, now }: { id: string; now: number }) {
  const board = communicationsBoard(now);
  void id;
  return (
    <TopologyFrame archetype="spectrum" code="SP-BND-22" title="Spectrum Bands"
      subtitle="per-band allocation & utilisation">
      <TopologyKpi items={[
        { label: 'Bands', value: board.spectrum.length },
        { label: 'Oversubscribed', value: board.spectrum.filter(b => b.classification === 'oversubscribed').length, tone: 'alert' },
        { label: 'Congested', value: board.spectrum.filter(b => b.classification === 'congested').length, tone: 'warn' },
        { label: 'Total licensees', value: board.spectrum.reduce((s, b) => s + b.licensees, 0).toLocaleString() },
      ]} />
      <TopologyRule label="band register" />
      {board.spectrum.map(b => (
        <NodeBar key={b.band}
          label={b.band}
          pct={b.utilisationPct}
          tone={b.classification === 'oversubscribed' ? 'alert' : b.classification === 'congested' ? 'warn' : b.classification === 'observant' ? 'info' : 'ok'}
          tail={`${b.licensees} licensees · ${b.allocatedMhz} MHz`} />
      ))}
    </TopologyFrame>
  );
}

export function MediaLandscape({ id, now }: { id: string; now: number }) {
  const board = communicationsBoard(now);
  void id;
  return (
    <TopologyFrame archetype="spectrum" code="SP-MED-23" title="Media Landscape"
      subtitle="broadcaster register & integrity">
      <TopologyKpi items={[
        { label: 'Broadcasters licensed', value: board.media.broadcastersLicensed.toLocaleString() },
        { label: 'Press independence', value: `${board.media.pressIndependenceIdx}/100`, tone: 'ok' },
        { label: 'Content integrity', value: `${board.media.contentIntegrityIdx}/100`, tone: 'info' },
        { label: 'Spectrum disputes', value: board.media.spectrumDisputesOpen, tone: 'warn' },
      ]} />
      <TopologyCallout kicker="press doctrine" body="Press independence is constitutionally protected. Content integrity is a transparency metric — not a censorship lever." />
    </TopologyFrame>
  );
}

export function PressIndependence({ id, now }: { id: string; now: number }) {
  const board = communicationsBoard(now);
  void id;
  return (
    <TopologyFrame archetype="spectrum" code="SP-PRS-24" title="Press Independence Board"
      subtitle="press / spectrum / network independence">
      <TopologyKpi items={[
        { label: 'Press-independence idx', value: `${board.media.pressIndependenceIdx}/100`, tone: 'ok' },
        { label: 'Public-service uptime', value: `${board.media.publicServiceMediaUptimePct}%`, tone: 'ok' },
        { label: 'Censorship orders', value: 0, tone: 'ok' },
        { label: 'Open spectrum disputes', value: board.media.spectrumDisputesOpen, tone: 'warn' },
      ]} />
      <TopologyCallout kicker="constitutional protection" body="Press censorship without court order is constitutionally void. Spectrum allocation without tender is constitutionally void." />
    </TopologyFrame>
  );
}

export function DemandForecast({ id, now }: { id: string; now: number }) {
  const board = communicationsBoard(now);
  void id;
  return (
    <TopologyFrame archetype="intelligence" code="IN-DMD-26" title="Demand Forecast"
      subtitle={`${board.intelligence.forecast.horizonYears.join('y / ')}y trajectory`}>
      <TopologyKpi items={[
        { label: 'Horizons', value: board.intelligence.forecast.horizonYears.length },
        { label: 'Long-horizon resilience', value: `${board.intelligence.forecast.longHorizonDigitalResilienceIdx}/100`, tone: 'ok' },
        { label: 'Systemic risk', value: `${board.intelligence.forecast.systemicConnectivityRisk}/100`, tone: 'warn' },
        { label: 'AI reasoning', value: `${board.intelligence.aiReasoningCoveragePct}%`, tone: 'info' },
      ]} />
      <TopologyRule label="multi-horizon trajectories" />
      <div className="grid grid-cols-2 gap-2 text-[11px] md:grid-cols-3">
        {['Bandwidth (Tbps)', 'Rural 5G coverage %', 'Cyber threat level', 'Sovereign cloud share %', 'Digital ID penetration %'].map((label, i) => {
          const series = [board.intelligence.forecast.bandwidthDemandTrajectoryTbps, board.intelligence.forecast.rural5GCoverageTrajectory, board.intelligence.forecast.cyberThreatLevelTrajectory, board.intelligence.forecast.sovereignCloudShareTrajectory, board.intelligence.forecast.digitalIdentityPenetrationTrajectory][i]!;
          const last = series[series.length - 1] ?? 0;
          const isStress = label === 'Cyber threat level';
          return (
            <div key={label} className="border p-2" style={{ borderColor: COMMS_DS.rule }}>
              <div className="text-[9px] uppercase tracking-[0.18em]" style={{ color: COMMS_DS.mut, fontFamily: 'ui-monospace, monospace' }}>{label}</div>
              <div className="text-[13px] font-semibold tabular-nums" style={{ color: isStress ? COMMS_DS.amber : COMMS_DS.lime }}>{last}</div>
              <div className="mt-1 flex items-end gap-1">
                {series.map((v, j) => (
                  <div key={j} className="flex-1" style={{ height: `${Math.max(2, Math.min(40, Math.abs(v) / 3))}px`, background: isStress ? COMMS_DS.amber : COMMS_DS.lime }} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </TopologyFrame>
  );
}

export function SignalAnomalies({ id, now }: { id: string; now: number }) {
  const board = communicationsBoard(now);
  void id;
  return (
    <TopologyFrame archetype="intelligence" code="IN-ANM-27" title="Signal Anomalies"
      subtitle="per-domain anomaly feed">
      <TopologyKpi items={[
        { label: 'Active anomalies', value: board.intelligence.anomalies.length },
        { label: 'Critical tier', value: board.intelligence.anomalies.filter(a => a.tier === 'critical').length, tone: 'alert' },
        { label: 'Urgent', value: board.intelligence.anomalies.filter(a => a.tier === 'urgent').length, tone: 'alert' },
        { label: 'Mean confidence', value: `${Math.round(board.intelligence.anomalies.reduce((s, a) => s + a.confidence, 0) / Math.max(1, board.intelligence.anomalies.length))}/100`, tone: 'info' },
      ]} />
      <TopologyRule label="anomaly ledger" />
      {board.intelligence.anomalies.map(a => (
        <div key={a.id} className="grid grid-cols-[110px_180px_140px_80px_120px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: COMMS_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: COMMS_DS.electric }}>{a.id}</span>
          <span style={{ color: COMMS_DS.ink }}>{a.signalDomain}</span>
          <span style={{ color: COMMS_DS.mut }}>{a.region}</span>
          <span className="text-right tabular-nums" style={{ color: COMMS_DS.mut }}>conf {a.confidence}</span>
          <span className="text-right uppercase tracking-[0.16em]"
            style={{ color: a.tier === 'critical' || a.tier === 'urgent' ? COMMS_DS.coral : a.tier === 'elevated' ? COMMS_DS.amber : COMMS_DS.lime }}>● {a.tier}</span>
        </div>
      ))}
    </TopologyFrame>
  );
}

export function ServiceRequests({ id, now }: { id: string; now: number }) {
  const board = communicationsBoard(now);
  void id;
  return (
    <TopologyFrame archetype="portal" code="PR-REQ-28" title="Citizen Service Requests"
      subtitle="service request docket">
      <TopologyKpi items={[
        { label: 'Active requests', value: board.portal.requests.length },
        { label: 'Resolved', value: board.portal.requests.filter(r => r.status === 'resolved').length, tone: 'ok' },
        { label: 'In progress', value: board.portal.requests.filter(r => r.status === 'in-progress').length, tone: 'info' },
        { label: 'Verifying', value: board.portal.requests.filter(r => r.status === 'verifying').length, tone: 'warn' },
      ]} />
      <TopologyRule label="request docket" />
      {board.portal.requests.map(r => (
        <div key={r.id} className="grid grid-cols-[110px_180px_140px_80px_120px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: COMMS_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: COMMS_DS.electric }}>{r.id}</span>
          <span style={{ color: COMMS_DS.ink }}>{r.service}</span>
          <span style={{ color: COMMS_DS.mut }}>{r.region}</span>
          <span className="text-right tabular-nums" style={{ color: COMMS_DS.mut }}>{r.daysOpen}d</span>
          <span className="text-right uppercase tracking-[0.16em]"
            style={{ color: r.status === 'resolved' ? COMMS_DS.lime : r.status === 'in-progress' ? COMMS_DS.electric : COMMS_DS.amber }}>● {r.status}</span>
        </div>
      ))}
    </TopologyFrame>
  );
}

export function PublicAdvisories({ id, now }: { id: string; now: number }) {
  const board = communicationsBoard(now);
  void id;
  return (
    <TopologyFrame archetype="portal" code="PR-ADV-29" title="Public Advisories"
      subtitle="advisory feed">
      <TopologyKpi items={[
        { label: 'Active advisories', value: board.portal.advisories.length },
        { label: 'Critical', value: board.portal.advisories.filter(a => a.severity === 'critical').length, tone: 'alert' },
        { label: 'Warning', value: board.portal.advisories.filter(a => a.severity === 'warning').length, tone: 'warn' },
        { label: 'Reach (M)', value: board.portal.advisories.reduce((s, a) => s + a.reachM, 0).toFixed(1), tone: 'info' },
      ]} />
      <TopologyRule label="advisory ledger" />
      {board.portal.advisories.map(a => (
        <div key={a.id} className="grid grid-cols-[110px_180px_140px_100px_100px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: COMMS_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: COMMS_DS.electric }}>{a.id}</span>
          <span style={{ color: COMMS_DS.ink }}>{a.kind}</span>
          <span style={{ color: COMMS_DS.mut }}>{a.region}</span>
          <span className="text-right tabular-nums" style={{ color: COMMS_DS.mut }}>{a.reachM.toFixed(1)}M reach</span>
          <span className="text-right uppercase tracking-[0.16em]"
            style={{ color: a.severity === 'critical' ? COMMS_DS.coral : a.severity === 'warning' ? COMMS_DS.amber : COMMS_DS.lime }}>● {a.severity}</span>
        </div>
      ))}
    </TopologyFrame>
  );
}

export function CommunicationsSafeguards({ id, now }: { id: string; now: number }) {
  void id; void now;
  return (
    <TopologyFrame archetype="oversight" code="OV-SFG-30" title="Communications Safeguards"
      subtitle="COMMUNICATIONS_SAFEGUARDS contract · §37.8">
      <TopologyKpi items={[
        { label: 'End-to-end integrity', value: COMMUNICATIONS_SAFEGUARDS.endToEndIntegrityProtected ? '✓' : '✗', tone: 'ok' },
        { label: 'Citizen auth consent-based', value: COMMUNICATIONS_SAFEGUARDS.citizenAuthenticationConsentBased ? '✓' : '✗', tone: 'ok' },
        { label: 'Spectrum as public resource', value: COMMUNICATIONS_SAFEGUARDS.spectrumAsPublicResource ? '✓' : '✗', tone: 'ok' },
        { label: 'Press independence protected', value: COMMUNICATIONS_SAFEGUARDS.pressIndependenceProtected ? '✓' : '✗', tone: 'ok' },
      ]} />
      <TopologyRule label="prohibited postures" />
      <ul className="grid grid-cols-1 gap-1 md:grid-cols-2 text-[11px]"
        style={{ color: COMMS_DS.ink, fontFamily: 'ui-monospace, monospace' }}>
        {COMMUNICATIONS_SAFEGUARDS.prohibited.map(p => (
          <li key={p} className="border-l-2 pl-2" style={{ borderColor: COMMS_DS.coral }}>
            <span style={{ color: COMMS_DS.coral }}>✕</span> {p}
          </li>
        ))}
      </ul>
      <TopologyCallout kicker="binding contract" body="Every Communications surface attests against this contract. Mass surveillance without warrant, arbitrary network shutdown, and press censorship without court order are constitutionally void." />
    </TopologyFrame>
  );
}

export function PressIndependenceAudit({ id, now }: { id: string; now: number }) {
  void id; void now;
  return (
    <TopologyFrame archetype="oversight" code="OV-PRS-31" title="Press Independence Audit"
      subtitle="press / spectrum / network independence audit">
      <TopologyKpi items={[
        { label: 'Censorship orders', value: 0, tone: 'ok' },
        { label: 'Non-tender spectrum allocations', value: 0, tone: 'ok' },
        { label: 'Network shutdowns (YTD)', value: 0, tone: 'ok' },
        { label: 'Public-service uptime', value: '99.7%', tone: 'ok' },
      ]} />
      <TopologyCallout kicker="audit doctrine" body="Censorship orders, non-tender spectrum allocations and network shutdowns are reported quarterly to the Audit Vault and the public. Zero is the expected count." />
    </TopologyFrame>
  );
}
