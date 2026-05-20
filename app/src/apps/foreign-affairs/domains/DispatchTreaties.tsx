'use client';

// Foreign Affairs domains — Dispatch & Treaty surfaces.

import * as React from 'react';
import { foreignAffairsBoard } from '@/lib/gov/foreign-affairs';
import { ChanceryFrame, DispatchKpi, WorldRule, TreatyStamp, MissionRow, ChanceryCallout, FOREIGN_DS } from '@/apps/foreign-affairs/design-system/foreign-ds';
import { seed, wave } from '@/lib/telemetry';

export function WorldDispatch({ id, now }: { id: string; now: number }) {
  const board = foreignAffairsBoard(now);
  void id;
  return (
    <ChanceryFrame archetype="dispatch" code="WD-DSP-02" title="World Dispatch"
      subtitle="live diplomatic incident dispatch"
      posture={board.command.posture}>
      <DispatchKpi items={[
        { label: 'Active incidents', value: board.incidents.length, tone: board.incidents.length > 4 ? 'alert' : 'warn' },
        { label: 'National severity', value: board.incidents.filter(i => i.severity === 'national').length, tone: 'alert' },
        { label: 'Ministries cascading', value: board.ministriesEngaged.length, tone: 'info' },
        { label: 'Alliance stability', value: `${board.command.allianceStabilityIdx}/100`, tone: 'ok' },
      ]} />
      <WorldRule label="incident dispatch" />
      {board.incidents.map(i => (
        <div key={i.id} className="grid grid-cols-[110px_1fr_120px_120px_120px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: FOREIGN_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: FOREIGN_DS.gold }}>{i.id}</span>
          <span style={{ color: FOREIGN_DS.ink }}>{i.kind}{' · '}{i.counterparty}</span>
          <span style={{ color: FOREIGN_DS.mut }}>{i.region}</span>
          <span className="uppercase tracking-[0.16em]"
            style={{ color: i.severity === 'national' ? FOREIGN_DS.fracture : i.severity === 'critical' ? FOREIGN_DS.fracture : i.severity === 'elevated' ? FOREIGN_DS.drift : FOREIGN_DS.alliance }}>● {i.severity}</span>
          <span className="text-right" style={{ color: FOREIGN_DS.mut }}>{i.negotiationStage}</span>
        </div>
      ))}
      <ChanceryCallout kicker="federated cascade" body="Every incident propagates through Treasury, Trade, Interior, Energy, Defense and Cabinet per §4 — the cascade ledger is sealed to the Audit Vault." />
    </ChanceryFrame>
  );
}

export function RegionalTensionBoard({ id, now }: { id: string; now: number }) {
  const board = foreignAffairsBoard(now);
  void id;
  return (
    <ChanceryFrame archetype="dispatch" code="WD-RTB-03" title="Regional Tension Board"
      subtitle="per-region drift & flashpoint posture"
      posture={board.command.posture}>
      <DispatchKpi items={[
        { label: 'Regions tracked', value: board.command.regionalTensions.length },
        { label: 'Global alignment', value: `${board.command.globalAlignmentIdx}/100`, tone: 'info' },
        { label: 'Diplomatic escalation', value: `${board.command.diplomaticEscalationIdx}/100`, tone: board.command.diplomaticEscalationIdx > 60 ? 'alert' : 'warn' },
        { label: 'Multipolar balance', value: `${board.command.multipolarBalanceIdx}/100`, tone: 'ok' },
      ]} />
      <WorldRule label="regional tension" />
      {board.command.regionalTensions.map(r => (
        <div key={r.region} className="grid grid-cols-[180px_1fr_120px_120px_100px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: FOREIGN_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: FOREIGN_DS.gold }}>{r.region}</span>
          <div className="h-1.5 self-center" style={{ background: FOREIGN_DS.navy }}>
            <div className="h-full" style={{ width: `${r.tensionIdx}%`, background: r.tensionIdx > 70 ? FOREIGN_DS.fracture : r.tensionIdx > 40 ? FOREIGN_DS.drift : FOREIGN_DS.alliance }} />
          </div>
          <span className="uppercase tracking-[0.16em]"
            style={{ color: r.drift === 'fracturing' ? FOREIGN_DS.fracture : r.drift === 'drifting' ? FOREIGN_DS.drift : r.drift === 'cooling' ? FOREIGN_DS.signal : FOREIGN_DS.alliance }}>● {r.drift}</span>
          <span className="text-right tabular-nums" style={{ color: FOREIGN_DS.mut }}>tension {r.tensionIdx}</span>
          <span className="text-right tabular-nums" style={{ color: FOREIGN_DS.mut }}>fp {r.flashpoints}</span>
        </div>
      ))}
    </ChanceryFrame>
  );
}

export function EmbassyOperations({ id, now }: { id: string; now: number }) {
  const board = foreignAffairsBoard(now);
  void id;
  return (
    <ChanceryFrame archetype="mission" code="MI-EMB-05" title="Embassy Operations"
      subtitle="per-embassy security & continuity">
      <DispatchKpi items={[
        { label: 'Embassies', value: board.missions.filter(m => m.flag === 'embassy').length },
        { label: 'Heightened security', value: board.missions.filter(m => m.securityPosture === 'heightened').length, tone: 'warn' },
        { label: 'Lockdown / evacuation', value: board.missions.filter(m => m.securityPosture === 'lockdown' || m.securityPosture === 'evacuation').length, tone: 'alert' },
        { label: 'Mean continuity', value: Math.round(board.missions.reduce((s, m) => s + m.continuityIdx, 0) / Math.max(1, board.missions.length)), tone: 'ok' },
      ]} />
      <WorldRule label="embassy register" />
      {board.missions.filter(m => m.flag === 'embassy').slice(0, 12).map(m => (
        <MissionRow key={m.id} post={m.postName} partner={m.partner} ambassador={m.ambassador}
          security={m.securityPosture} continuity={m.continuityIdx} flag={m.flag} />
      ))}
    </ChanceryFrame>
  );
}

export function ConsularContinuity({ id, now }: { id: string; now: number }) {
  const board = foreignAffairsBoard(now);
  void id;
  return (
    <ChanceryFrame archetype="consular" code="MI-CON-06" title="Consular Continuity"
      subtitle="citizens-abroad case continuity">
      <DispatchKpi items={[
        { label: 'Citizens registered abroad', value: `${board.consular.citizensRegisteredAbroadK.toFixed(1)}k`, tone: 'info' },
        { label: 'Active consular cases', value: board.consular.consularCasesActive, tone: 'warn' },
        { label: 'Emergency evacuations', value: board.consular.emergencyEvacuationsActive, tone: board.consular.emergencyEvacuationsActive > 0 ? 'alert' : 'ok' },
        { label: 'Passport queue', value: board.consular.passportIssuanceQueue.toLocaleString(), tone: 'mute' },
      ]} />
      <WorldRule label="active travel advisories" />
      {board.consular.travelAdvisoriesActive.map(a => (
        <div key={a.region} className="grid grid-cols-[200px_1fr_120px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: FOREIGN_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: FOREIGN_DS.gold }}>{a.region}</span>
          <span style={{ color: FOREIGN_DS.ink }}>{a.level}</span>
          <span className="text-right uppercase tracking-[0.16em]"
            style={{ color: a.level === 'do-not-travel' ? FOREIGN_DS.fracture : a.level === 'reconsider' ? FOREIGN_DS.drift : a.level === 'increased' ? FOREIGN_DS.signal : FOREIGN_DS.alliance }}>● {a.level}</span>
        </div>
      ))}
    </ChanceryFrame>
  );
}

export function SpecialEnvoys({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  const envoys = Array.from({ length: 6 }, (_, i) => {
    const k = `env:${id}:${i}:${Math.floor(ts / 4)}`;
    const names = ['Climate Diplomacy', 'Cyber Norms', 'Conflict Mediation', 'Maritime Security', 'Trade Realignment', 'Human Rights'];
    const stages = ['scoping', 'shuttle', 'consultation', 'preliminary-deal', 'finalising'];
    return {
      id: `ENV-${(50000 + Math.floor(seed(`${k}:c`) * 40000))}`,
      portfolio: names[i]!,
      envoy: ['Ambassador Adamu', 'Ambassador Petrov', 'Ambassador Mehta', 'Ambassador Oduya', 'Ambassador Tanaka', 'Ambassador Brennan'][i]!,
      stage: stages[Math.floor(seed(`${k}:s`) * stages.length)]!,
      ageDays: Math.round(wave(`${k}:a`, ts, 14, 240)),
    };
  });
  return (
    <ChanceryFrame archetype="mission" code="MI-ENV-07" title="Special Envoys"
      subtitle="time-bounded special missions">
      <DispatchKpi items={[
        { label: 'Active envoys', value: envoys.length },
        { label: 'Active portfolios', value: envoys.length },
        { label: 'Mean tenure (d)', value: Math.round(envoys.reduce((s, e) => s + e.ageDays, 0) / envoys.length) },
        { label: 'Finalising deals', value: envoys.filter(e => e.stage === 'finalising').length, tone: 'ok' },
      ]} />
      <WorldRule label="envoy dossier" />
      {envoys.map(e => (
        <div key={e.id} className="grid grid-cols-[110px_180px_1fr_120px_60px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: FOREIGN_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: FOREIGN_DS.gold }}>{e.id}</span>
          <span style={{ color: FOREIGN_DS.ink }}>{e.portfolio}</span>
          <span style={{ color: FOREIGN_DS.mut }}>{e.envoy}</span>
          <span className="uppercase tracking-[0.16em]" style={{ color: e.stage === 'finalising' ? FOREIGN_DS.alliance : FOREIGN_DS.drift }}>● {e.stage}</span>
          <span className="text-right tabular-nums" style={{ color: FOREIGN_DS.mut }}>{e.ageDays}d</span>
        </div>
      ))}
    </ChanceryFrame>
  );
}

export function TreatyComplianceBench({ id, now }: { id: string; now: number }) {
  const board = foreignAffairsBoard(now);
  void id;
  return (
    <ChanceryFrame archetype="treaty" code="TR-CMP-09" title="Treaty Compliance Bench"
      subtitle="compliance review docket">
      <DispatchKpi items={[
        { label: 'Treaties tracked', value: board.treaties.length },
        { label: 'In force', value: board.treaties.filter(t => t.status === 'in-force').length, tone: 'ok' },
        { label: 'Under review', value: board.treaties.filter(t => t.status === 'review' || t.status === 'amendment').length, tone: 'warn' },
        { label: 'Suspended', value: board.treaties.filter(t => t.status === 'suspended').length, tone: 'alert' },
      ]} />
      <WorldRule label="treaty docket" />
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
        {board.treaties.slice(0, 9).map(t => (
          <TreatyStamp key={t.id}
            id={t.id} title={t.title} scope={t.scope} status={t.status}
            compliance={t.complianceIdx} signatories={t.signatories} domain={t.domain} />
        ))}
      </div>
    </ChanceryFrame>
  );
}

export function NegotiationDocket({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  const docket = Array.from({ length: 7 }, (_, i) => {
    const k = `neg:${id}:${i}:${Math.floor(ts / 4)}`;
    const titles = ['Coastal Maritime Boundary', 'Climate Cooperation Framework', 'Cyber Norms & Restraint', 'Aviation Safety Mutual Recognition', 'Cross-border Tax Coordination', 'Cultural Heritage Repatriation', 'Polar Frontier Coordination'];
    const stages = ['scoping', 'first-draft', 'consolidated-text', 'final-round', 'signature-window'];
    return {
      id: `NEG-${(60000 + Math.floor(seed(`${k}:c`) * 30000))}`,
      title: titles[i]!,
      stage: stages[Math.floor(seed(`${k}:s`) * stages.length)]!,
      partners: 1 + Math.floor(seed(`${k}:p`) * 12),
      ageDays: Math.round(wave(`${k}:a`, ts, 14, 720)),
    };
  });
  return (
    <ChanceryFrame archetype="treaty" code="TR-NEG-10" title="Negotiation Docket"
      subtitle="active treaty negotiations">
      <DispatchKpi items={[
        { label: 'Active negotiations', value: docket.length },
        { label: 'Signature-window stage', value: docket.filter(d => d.stage === 'signature-window').length, tone: 'ok' },
        { label: 'Long-running (>2y)', value: docket.filter(d => d.ageDays > 730).length, tone: 'mute' },
        { label: 'Mean partners', value: Math.round(docket.reduce((s, d) => s + d.partners, 0) / docket.length) },
      ]} />
      <WorldRule label="negotiation board" />
      {docket.map(d => (
        <div key={d.id} className="grid grid-cols-[110px_1fr_140px_80px_80px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: FOREIGN_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: FOREIGN_DS.gold }}>{d.id}</span>
          <span style={{ color: FOREIGN_DS.ink }}>{d.title}</span>
          <span className="uppercase tracking-[0.16em]" style={{ color: d.stage === 'signature-window' ? FOREIGN_DS.alliance : FOREIGN_DS.drift }}>● {d.stage}</span>
          <span className="text-right tabular-nums" style={{ color: FOREIGN_DS.mut }}>{d.partners} sigs</span>
          <span className="text-right tabular-nums" style={{ color: FOREIGN_DS.mut }}>{d.ageDays}d</span>
        </div>
      ))}
    </ChanceryFrame>
  );
}
