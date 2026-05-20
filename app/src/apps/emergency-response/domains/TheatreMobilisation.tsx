'use client';

// Emergency domains — Theatre & Mobilisation surfaces.

import * as React from 'react';
import { emergencyResilienceBoard } from '@/lib/gov/emergency-resilience';
import { TheatreFrame, StatusBoardKpi, TheatreRule, IncidentRow, TheatreCallout, EMERGENCY_DS } from '@/apps/emergency-response/design-system/emergency-ds';
import { seed, wave } from '@/lib/telemetry';

export function TheatreBoard({ id, now }: { id: string; now: number }) {
  const board = emergencyResilienceBoard(now);
  void id;
  return (
    <TheatreFrame archetype="theatre" code="TH-RTH-03" title="Regional Theatre Board" subtitle="per-region posture · live"
      posture={board.command.posture}>
      <StatusBoardKpi items={[
        { label: 'Theatres tracked', value: board.command.theatres.length },
        { label: 'Active crises', value: board.command.activeCrises, tone: board.command.activeCrises >= 4 ? 'alert' : 'warn' },
        { label: 'Composite severity', value: `${board.command.severityComposite}/100`, tone: board.command.severityComposite > 60 ? 'alert' : 'warn' },
        { label: 'Continuity index', value: `${board.command.continuityStabilisationIdx}/100`, tone: 'ok' },
      ]} />
      <TheatreRule label="theatre status" />
      {board.command.theatres.map(t => (
        <div key={t.region} className="grid grid-cols-[180px_1fr_120px_120px_120px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: EMERGENCY_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: EMERGENCY_DS.amber }}>{t.region}</span>
          <span style={{ color: EMERGENCY_DS.ink }}>{t.activeIncidents} incidents · {t.respondersDeployed} responders</span>
          <span style={{ color: EMERGENCY_DS.mut }}>{t.populationAffectedK}k affected</span>
          <span className="uppercase tracking-[0.16em]" style={{ color: t.status === 'crisis' ? EMERGENCY_DS.ember : t.status === 'engaged' ? EMERGENCY_DS.amber : t.status === 'watch' ? EMERGENCY_DS.watch : EMERGENCY_DS.stand }}>● {t.status}</span>
          <span className="text-right tabular-nums" style={{ color: EMERGENCY_DS.mut }}>recovery {t.recoveryStartedPct}%</span>
        </div>
      ))}
    </TheatreFrame>
  );
}

export function IncidentLedger({ id, now }: { id: string; now: number }) {
  const board = emergencyResilienceBoard(now);
  void id;
  return (
    <TheatreFrame archetype="registry" code="TH-INC-04" title="Incident Ledger" subtitle="live incident catalogue · all severities">
      <StatusBoardKpi items={[
        { label: 'Logged incidents', value: board.incidents.length },
        { label: 'National severity', value: board.incidents.filter(i => i.severity === 'national').length, tone: 'alert' },
        { label: 'Critical severity', value: board.incidents.filter(i => i.severity === 'critical').length, tone: 'alert' },
        { label: 'Ministries cascading', value: board.ministriesEngaged.length, tone: 'info' },
      ]} />
      <TheatreRule label="incident roster" />
      {board.incidents.map(i => (
        <IncidentRow key={i.id} id={i.id} kind={i.kind} region={i.region} status={i.recoveryPathway}
          tail={`${i.populationAffectedK}k · ${i.ageHours}h`} severity={i.severity} />
      ))}
      <TheatreCallout kicker="ministerial cascade" body="Every incident triggers a federated propagation map — Health, Transport, Energy, Treasury and Cabinet are notified per §19.1." />
    </TheatreFrame>
  );
}

export function MobilisationRuntime({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  const stages = [
    { code: 'CALL',  label: 'Call received',           tat: Math.round(wave(`mb:c:${id}`, ts, 0, 4)) },
    { code: 'TRIG',  label: 'Trigger condition met',   tat: Math.round(wave(`mb:t:${id}`, ts, 1, 12)) },
    { code: 'ACTV',  label: 'NEOC activated',          tat: Math.round(wave(`mb:a:${id}`, ts, 2, 24)) },
    { code: 'DEPL',  label: 'Responders deployed',     tat: Math.round(wave(`mb:d:${id}`, ts, 4, 56)) },
    { code: 'OPS',   label: 'Operational',             tat: Math.round(wave(`mb:o:${id}`, ts, 8, 240)) },
    { code: 'STD',   label: 'Stand-down',              tat: Math.round(wave(`mb:s:${id}`, ts, 48, 720)) },
  ];
  return (
    <TheatreFrame archetype="mobilise" code="MB-RT-05" title="Mobilisation Runtime" subtitle="activation pipeline · stage latencies">
      <StatusBoardKpi items={[
        { label: 'Active activations', value: Math.round(wave(`mb:n:${id}`, ts, 1, 8)) },
        { label: 'Median activation', value: `${Math.round(wave(`mb:m:${id}`, ts, 8, 36))}m`, tone: 'warn' },
        { label: 'Mutual-aid engagements', value: Math.round(wave(`mb:ma:${id}`, ts, 1, 12)) },
        { label: 'NEOC readiness', value: `${Math.round(wave(`mb:r:${id}`, ts, 88, 99))}%`, tone: 'ok' },
      ]} />
      <TheatreRule label="stage TAT (live)" />
      {stages.map(s => (
        <div key={s.code} className="grid grid-cols-[80px_1fr_100px_60px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: EMERGENCY_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: EMERGENCY_DS.amber }}>{s.code}</span>
          <span style={{ color: EMERGENCY_DS.ink }}>{s.label}</span>
          <div className="h-1.5 self-center" style={{ background: EMERGENCY_DS.smoke }}>
            <div className="h-full" style={{ width: `${Math.min(100, s.tat * 1.2)}%`, background: EMERGENCY_DS.amber }} />
          </div>
          <span className="text-right tabular-nums" style={{ color: EMERGENCY_DS.mut }}>{s.tat}m</span>
        </div>
      ))}
    </TheatreFrame>
  );
}

export function ResponderRoster({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  const groups = [
    { label: 'Urban Search & Rescue', total: 1200 },
    { label: 'Fire Suppression',      total: 4800 },
    { label: 'Flood / swift-water',   total: 800 },
    { label: 'Maritime Rescue',       total: 600 },
    { label: 'Mass-casualty Medical', total: 2400 },
    { label: 'Logistics & Engineering', total: 1800 },
  ];
  return (
    <TheatreFrame archetype="registry" code="MB-RR-06" title="Responder Roster" subtitle="multi-discipline responder pool">
      <StatusBoardKpi items={[
        { label: 'Total responders', value: groups.reduce((s, g) => s + g.total, 0).toLocaleString() },
        { label: 'On active duty', value: Math.round(wave(`rr:a:${id}`, ts, 800, 3200)).toLocaleString(), tone: 'warn' },
        { label: 'Mean readiness', value: `${Math.round(wave(`rr:r:${id}`, ts, 84, 97))}%`, tone: 'ok' },
        { label: 'Awaiting rotation', value: Math.round(wave(`rr:rot:${id}`, ts, 60, 480)).toLocaleString(), tone: 'mute' },
      ]} />
      <TheatreRule label="responder disciplines" />
      {groups.map((g, i) => {
        const k = `rr:${id}:${i}`;
        const deployed = Math.round(g.total * wave(`${k}:d`, ts, 0.12, 0.62));
        const pct = Math.round((deployed / g.total) * 100);
        return (
          <div key={g.label} className="grid grid-cols-[180px_1fr_100px_80px] gap-3 border-b py-1.5 text-[11px]"
            style={{ borderColor: EMERGENCY_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
            <span style={{ color: EMERGENCY_DS.amber }}>{g.label}</span>
            <div className="h-1.5 self-center" style={{ background: EMERGENCY_DS.smoke }}>
              <div className="h-full" style={{ width: `${pct}%`, background: pct > 60 ? EMERGENCY_DS.ember : pct > 30 ? EMERGENCY_DS.amber : EMERGENCY_DS.stand }} />
            </div>
            <span className="text-right tabular-nums" style={{ color: EMERGENCY_DS.ink }}>{deployed.toLocaleString()}</span>
            <span className="text-right tabular-nums" style={{ color: EMERGENCY_DS.mut }}>{pct}%</span>
          </div>
        );
      })}
    </TheatreFrame>
  );
}

export function MutualAidBoard({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  const partners = [
    { name: 'Federal Search & Rescue Reserve', kind: 'national' },
    { name: 'Maritime Joint Task Force',       kind: 'national' },
    { name: 'Neighbouring State Aid (East)',   kind: 'international' },
    { name: 'Neighbouring State Aid (North)',  kind: 'international' },
    { name: 'UN OCHA Coordination Cell',       kind: 'international' },
    { name: 'IFRC Logistics',                  kind: 'international' },
  ];
  return (
    <TheatreFrame archetype="mobilise" code="MB-MA-07" title="Mutual-Aid Board" subtitle="inter-regional & international support">
      <StatusBoardKpi items={[
        { label: 'Partners engaged', value: partners.length },
        { label: 'Personnel inbound', value: Math.round(wave(`ma:p:${id}`, ts, 80, 2400)).toLocaleString(), tone: 'warn' },
        { label: 'Aerial assets inbound', value: Math.round(wave(`ma:a:${id}`, ts, 2, 24)) },
        { label: 'Diplomatic clearances', value: `${Math.round(wave(`ma:c:${id}`, ts, 64, 100))}%`, tone: 'ok' },
      ]} />
      <TheatreRule label="aid partners" />
      {partners.map((p, i) => {
        const k = `ma:${id}:${i}:${Math.floor(ts / 4)}`;
        const st = seed(`${k}:s`);
        const status = st > 0.7 ? 'deployed' : st > 0.35 ? 'inbound' : 'standby';
        return (
          <IncidentRow key={p.name} id={`AID-${String(i + 1).padStart(2, '0')}`} kind={`${p.name} · ${p.kind}`} region="trans-regional" status={status}
            tail={status === 'deployed' ? `${Math.round(wave(`${k}:t`, ts, 6, 48))}h on-scene` : '—'}
            severity={status === 'deployed' ? 'critical' : status === 'inbound' ? 'elevated' : 'advisory'} />
        );
      })}
      <TheatreCallout kicker="sovereign reciprocity" body="International mutual aid is governed by reciprocal MoUs and never preempts domestic command authority. All foreign assets check in to NEOC before deployment." />
    </TheatreFrame>
  );
}
