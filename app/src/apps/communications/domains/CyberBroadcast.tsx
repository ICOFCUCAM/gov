'use client';

// Communications domains — Cyber, Broadcast & Identity surfaces.

import * as React from 'react';
import { communicationsBoard } from '@/lib/gov/communications-continuity';
import { TopologyFrame, TopologyKpi, TopologyRule, NodeBar, TopologyCallout, COMMS_DS } from '@/apps/communications/design-system/communications-ds';
import { seed, wave } from '@/lib/telemetry';

export function CyberIncidents({ id, now }: { id: string; now: number }) {
  const board = communicationsBoard(now);
  void id;
  return (
    <TopologyFrame archetype="cyber" code="CY-INC-12" title="Cyber Incident Ledger"
      subtitle="live incident ledger · all severities">
      <TopologyKpi items={[
        { label: 'Active incidents', value: board.cyber.incidentsActive.length },
        { label: 'National severity', value: board.cyber.incidentsActive.filter(i => i.severity === 'national').length, tone: 'alert' },
        { label: 'Threat level', value: board.cyber.threatLevel, tone: board.cyber.threatLevel === 'severe' ? 'alert' : board.cyber.threatLevel === 'high' ? 'warn' : 'info' },
        { label: 'Resilience idx', value: `${board.cyber.cyberResilienceIdx}/100`, tone: 'ok' },
      ]} />
      <TopologyRule label="incident ledger" />
      {board.cyber.incidentsActive.map(i => (
        <div key={i.id} className="grid grid-cols-[110px_180px_140px_100px_120px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: COMMS_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: COMMS_DS.electric }}>{i.id}</span>
          <span style={{ color: COMMS_DS.ink }}>{i.kind}</span>
          <span style={{ color: COMMS_DS.mut }}>{i.targetSector}</span>
          <span className="text-right tabular-nums" style={{ color: COMMS_DS.mut }}>{i.containmentPct}%</span>
          <span className="text-right uppercase tracking-[0.16em]"
            style={{ color: i.severity === 'national' || i.severity === 'critical' ? COMMS_DS.coral : i.severity === 'elevated' ? COMMS_DS.amber : COMMS_DS.lime }}>● {i.phase}</span>
        </div>
      ))}
    </TopologyFrame>
  );
}

export function SocOperations({ id, now }: { id: string; now: number }) {
  const board = communicationsBoard(now);
  void id;
  return (
    <TopologyFrame archetype="cyber" code="CY-SOC-13" title="SOC Operations"
      subtitle="security operations centre">
      <TopologyKpi items={[
        { label: 'Analysts on duty', value: board.cyber.socAnalystsOnDuty, tone: 'info' },
        { label: 'Threats blocked / day', value: board.cyber.threatsBlockedDaily.toLocaleString(), tone: 'ok' },
        { label: 'Mean containment', value: `${board.cyber.meanContainmentHrs} h`, tone: 'warn' },
        { label: 'Threat level', value: board.cyber.threatLevel, tone: board.cyber.threatLevel === 'severe' ? 'alert' : 'warn' },
      ]} />
      <TopologyCallout kicker="SOC doctrine" body="The SOC operates 24/7 with mandatory rotation and double-signoff on critical containment. Concealment of cyber incidents is constitutionally prohibited." />
    </TopologyFrame>
  );
}

export function ThreatIntelligence({ id, now }: { id: string; now: number }) {
  const board = communicationsBoard(now);
  const ts = now / 4000;
  void id;
  return (
    <TopologyFrame archetype="cyber" code="CY-THI-14" title="Threat Intelligence"
      subtitle="attribution & threat fusion">
      <TopologyKpi items={[
        { label: 'Incidents under attribution', value: board.cyber.incidentsActive.length },
        { label: 'State-aligned', value: board.cyber.incidentsActive.filter(i => i.attribution === 'state-aligned').length, tone: 'alert' },
        { label: 'Criminal', value: board.cyber.incidentsActive.filter(i => i.attribution === 'criminal').length, tone: 'warn' },
        { label: 'Unattributed', value: board.cyber.incidentsActive.filter(i => i.attribution === 'unattributed').length, tone: 'mute' },
      ]} />
      <TopologyRule label="attribution breakdown" />
      {[...new Set(board.cyber.incidentsActive.map(i => i.attribution))].map(att => {
        const count = board.cyber.incidentsActive.filter(i => i.attribution === att).length;
        return (
          <div key={att} className="grid grid-cols-[180px_1fr_60px] gap-3 border-b py-1.5 text-[11px]"
            style={{ borderColor: COMMS_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
            <span style={{ color: COMMS_DS.electric }}>{att}</span>
            <span style={{ color: COMMS_DS.mut }}>fusion confidence {Math.round(wave(`th:${att}`, ts, 48, 92))}/100</span>
            <span className="text-right tabular-nums" style={{ color: COMMS_DS.ink }}>{count}</span>
          </div>
        );
      })}
      {void seed}
    </TopologyFrame>
  );
}

export function EmergencyBroadcast({ id, now }: { id: string; now: number }) {
  const board = communicationsBoard(now);
  void id;
  return (
    <TopologyFrame archetype="broadcast" code="BC-EMG-15" title="Emergency Broadcast"
      subtitle="multi-channel citizen alerting">
      <TopologyKpi items={[
        { label: 'Channels', value: board.emergencyBroadcasts.length },
        { label: 'Broadcasting', value: board.emergencyBroadcasts.filter(b => b.status === 'broadcasting').length, tone: 'alert' },
        { label: 'Degraded', value: board.emergencyBroadcasts.filter(b => b.status === 'degraded').length, tone: 'warn' },
        { label: 'Mean uptime', value: `${Math.round(board.emergencyBroadcasts.reduce((s, b) => s + b.uptimePct, 0) / Math.max(1, board.emergencyBroadcasts.length))}%`, tone: 'ok' },
      ]} />
      <TopologyRule label="channel posture" />
      {board.emergencyBroadcasts.map(b => (
        <div key={b.id} className="grid grid-cols-[200px_140px_80px_80px_120px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: COMMS_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: COMMS_DS.electric }}>{b.channel}</span>
          <span style={{ color: COMMS_DS.mut }}>{b.region}</span>
          <span className="text-right tabular-nums" style={{ color: COMMS_DS.ink }}>{b.reachM.toFixed(1)}M</span>
          <span className="text-right tabular-nums" style={{ color: COMMS_DS.mut }}>{b.uptimePct}%</span>
          <span className="text-right uppercase tracking-[0.16em]"
            style={{ color: b.status === 'degraded' ? COMMS_DS.coral : b.status === 'engaged' || b.status === 'broadcasting' ? COMMS_DS.amber : COMMS_DS.lime }}>● {b.status}</span>
        </div>
      ))}
    </TopologyFrame>
  );
}

export function FailoverChannels({ id, now }: { id: string; now: number }) {
  const board = communicationsBoard(now);
  void id;
  return (
    <TopologyFrame archetype="broadcast" code="BC-FOC-16" title="Failover Channels"
      subtitle="channel failover readiness">
      <TopologyKpi items={[
        { label: 'Failover paths', value: board.failoverChannels.length },
        { label: 'High readiness (>90)', value: board.failoverChannels.filter(f => f.readinessPct > 90).length, tone: 'ok' },
        { label: 'Mean readiness', value: `${Math.round(board.failoverChannels.reduce((s, f) => s + f.readinessPct, 0) / Math.max(1, board.failoverChannels.length))}%`, tone: 'info' },
        { label: 'Failover at risk (<70)', value: board.failoverChannels.filter(f => f.readinessPct < 70).length, tone: 'warn' },
      ]} />
      <TopologyRule label="failover paths" />
      {board.failoverChannels.map((f, i) => (
        <div key={`${f.fromChannel}-${i}`} className="grid grid-cols-[160px_160px_1fr_80px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: COMMS_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: COMMS_DS.electric }}>{f.fromChannel}</span>
          <span style={{ color: COMMS_DS.ink }}>→ {f.toChannel}</span>
          <span style={{ color: COMMS_DS.mut }}>{f.triggerCondition}</span>
          <span className="text-right tabular-nums" style={{ color: f.readinessPct > 90 ? COMMS_DS.lime : f.readinessPct > 70 ? COMMS_DS.amber : COMMS_DS.coral }}>{f.readinessPct}%</span>
        </div>
      ))}
    </TopologyFrame>
  );
}

export function BroadcastStations({ id, now }: { id: string; now: number }) {
  const board = communicationsBoard(now);
  void id;
  return (
    <TopologyFrame archetype="broadcast" code="BC-STN-17" title="Broadcast Stations"
      subtitle="TV / radio / siren stations">
      <TopologyKpi items={[
        { label: 'TV channels', value: board.emergencyBroadcasts.filter(b => b.channel === 'national-tv').length },
        { label: 'Radio channels', value: board.emergencyBroadcasts.filter(b => b.channel === 'national-radio').length },
        { label: 'Siren networks', value: board.emergencyBroadcasts.filter(b => b.channel === 'siren-network').length },
        { label: 'Civic app channels', value: board.emergencyBroadcasts.filter(b => b.channel === 'civic-app').length },
      ]} />
      <TopologyCallout kicker="public-service media" body="Public-service broadcasters operate at arm's length from political authority. Press censorship without court order is constitutionally void." />
    </TopologyFrame>
  );
}

export function DigitalIdentity({ id, now }: { id: string; now: number }) {
  const board = communicationsBoard(now);
  void id;
  return (
    <TopologyFrame archetype="identity" code="ID-DIG-18" title="Digital Identity Programme"
      subtitle="CivicID programme posture">
      <TopologyKpi items={[
        { label: 'Citizens enrolled', value: `${board.digitalIdentity.citizensEnrolledM.toFixed(1)} M`, tone: 'info' },
        { label: 'Auth requests / day', value: `${board.digitalIdentity.authRequestsDailyM.toFixed(2)} M`, tone: 'ok' },
        { label: 'Auth success rate', value: `${board.digitalIdentity.authSuccessRatePct}%`, tone: 'ok' },
        { label: 'Trust idx', value: `${board.digitalIdentity.trustIdx}/100`, tone: 'info' },
      ]} />
      <TopologyCallout kicker="consent doctrine" body="Citizen authentication is consent-based. Identity credentials are never used for surveillance; misuse is prosecutable under §37.4." />
    </TopologyFrame>
  );
}

export function AuthenticationBoard({ id, now }: { id: string; now: number }) {
  const board = communicationsBoard(now);
  const ts = now / 4000;
  void id;
  return (
    <TopologyFrame archetype="identity" code="ID-AUT-19" title="Authentication Board"
      subtitle="daily auth success rate">
      <TopologyKpi items={[
        { label: 'Auth requests / day', value: `${board.digitalIdentity.authRequestsDailyM.toFixed(2)} M`, tone: 'info' },
        { label: 'Success rate', value: `${board.digitalIdentity.authSuccessRatePct}%`, tone: 'ok' },
        { label: 'Credential breaches (Q)', value: board.digitalIdentity.credentialBreachesThisQ, tone: 'alert' },
        { label: 'Trust index', value: `${board.digitalIdentity.trustIdx}/100`, tone: 'info' },
      ]} />
      <TopologyRule label="failure-mode breakdown" />
      {['Invalid credential', 'Network timeout', 'MFA challenge declined', 'Service unavailable', 'Suspicious request'].map((mode, i) => (
        <NodeBar key={mode}
          label={mode}
          pct={Math.round(wave(`au:${i}:${id}`, ts, 4, 32))}
          tone={i === 4 ? 'alert' : i === 3 ? 'warn' : 'info'} />
      ))}
    </TopologyFrame>
  );
}

export function CredentialRecovery({ id, now }: { id: string; now: number }) {
  const board = communicationsBoard(now);
  void id;
  return (
    <TopologyFrame archetype="identity" code="ID-REC-20" title="Credential Recovery"
      subtitle="recovery request queue">
      <TopologyKpi items={[
        { label: 'Pending recoveries', value: board.digitalIdentity.recoveryRequestsPending.toLocaleString(), tone: 'warn' },
        { label: 'Credential breaches (Q)', value: board.digitalIdentity.credentialBreachesThisQ, tone: 'alert' },
        { label: 'Trust index', value: `${board.digitalIdentity.trustIdx}/100`, tone: 'info' },
        { label: 'Citizens enrolled', value: `${board.digitalIdentity.citizensEnrolledM.toFixed(1)} M` },
      ]} />
      <TopologyCallout kicker="recovery doctrine" body="Credential recovery requires multi-factor proof of identity. Every recovery is logged to the Audit Vault and citizen-visible." />
    </TopologyFrame>
  );
}
