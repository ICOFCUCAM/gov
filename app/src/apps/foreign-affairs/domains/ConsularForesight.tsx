'use client';

// Foreign Affairs domains — Consular, Foresight, Organizations & Oversight surfaces.

import * as React from 'react';
import { foreignAffairsBoard } from '@/lib/gov/foreign-affairs';
import { foreignAffairsExtendedBoard, FOREIGN_EXTENDED_SAFEGUARDS } from '@/lib/gov/foreign-affairs-extended';
import { ChanceryFrame, DispatchKpi, WorldRule, FOREIGN_DS, ChanceryCallout } from '@/apps/foreign-affairs/design-system/foreign-ds';

export function PassportPipeline({ id, now }: { id: string; now: number }) {
  const ext = foreignAffairsExtendedBoard(now);
  void id;
  return (
    <ChanceryFrame archetype="consular" code="CN-PSP-23" title="Passport Pipeline"
      subtitle="issuance, renewal & emergency travel">
      <DispatchKpi items={[
        { label: 'Services', value: ext.portal.passports.length },
        { label: 'Issued today', value: ext.portal.passports.reduce((s, p) => s + p.issuedToday, 0).toLocaleString(), tone: 'ok' },
        { label: 'Total backlog', value: ext.portal.passports.reduce((s, p) => s + p.pendingBacklog, 0).toLocaleString(), tone: 'warn' },
        { label: 'Portal availability', value: `${ext.portal.portalAvailabilityPct}%`, tone: 'ok' },
      ]} />
      <WorldRule label="pipeline by service" />
      {ext.portal.passports.map(p => (
        <div key={p.service} className="grid grid-cols-[180px_1fr_80px_80px_100px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: FOREIGN_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: FOREIGN_DS.gold }}>{p.service}</span>
          <div className="h-1.5 self-center" style={{ background: FOREIGN_DS.navy }}>
            <div className="h-full" style={{ width: `${Math.min(100, (p.issuedToday / Math.max(1, p.applicationsToday)) * 100)}%`, background: FOREIGN_DS.alliance }} />
          </div>
          <span className="text-right tabular-nums" style={{ color: FOREIGN_DS.ink }}>{p.issuedToday}/{p.applicationsToday}</span>
          <span className="text-right tabular-nums" style={{ color: FOREIGN_DS.mut }}>{p.medianTurnaroundDays}d</span>
          <span className="text-right tabular-nums" style={{ color: FOREIGN_DS.mut }}>{p.pendingBacklog} pend</span>
        </div>
      ))}
    </ChanceryFrame>
  );
}

export function VisaProcessing({ id, now }: { id: string; now: number }) {
  const ext = foreignAffairsExtendedBoard(now);
  void id;
  return (
    <ChanceryFrame archetype="consular" code="CN-VSA-24" title="Visa Processing"
      subtitle="inbound visa categories">
      <DispatchKpi items={[
        { label: 'Categories', value: ext.portal.visas.length },
        { label: 'Mean approval', value: `${Math.round(ext.portal.visas.reduce((s, v) => s + v.approvalRatePct, 0) / Math.max(1, ext.portal.visas.length))}%`, tone: 'ok' },
        { label: 'Total pending', value: ext.portal.visas.reduce((s, v) => s + v.pending, 0).toLocaleString(), tone: 'warn' },
        { label: 'Median review (d)', value: Math.round(ext.portal.visas.reduce((s, v) => s + v.medianReviewDays, 0) / Math.max(1, ext.portal.visas.length)) },
      ]} />
      <WorldRule label="visa category board" />
      {ext.portal.visas.map(v => (
        <div key={v.category} className="grid grid-cols-[180px_1fr_80px_80px_100px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: FOREIGN_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: FOREIGN_DS.gold }}>{v.category}</span>
          <div className="h-1.5 self-center" style={{ background: FOREIGN_DS.navy }}>
            <div className="h-full" style={{ width: `${v.approvalRatePct}%`, background: v.approvalRatePct > 80 ? FOREIGN_DS.alliance : v.approvalRatePct > 55 ? FOREIGN_DS.gold : FOREIGN_DS.fracture }} />
          </div>
          <span className="text-right tabular-nums" style={{ color: FOREIGN_DS.ink }}>{v.applicationsThisWeek.toLocaleString()}</span>
          <span className="text-right tabular-nums" style={{ color: FOREIGN_DS.mut }}>{v.medianReviewDays}d</span>
          <span className="text-right tabular-nums" style={{ color: FOREIGN_DS.mut }}>{v.pending} pend</span>
        </div>
      ))}
    </ChanceryFrame>
  );
}

export function TravelAdvisories({ id, now }: { id: string; now: number }) {
  const ext = foreignAffairsExtendedBoard(now);
  void id;
  return (
    <ChanceryFrame archetype="consular" code="CN-ADV-25" title="Travel Advisories"
      subtitle="per-region advisory feed">
      <DispatchKpi items={[
        { label: 'Regions', value: ext.portal.travelAdvisories.length },
        { label: 'Do-not-travel', value: ext.portal.travelAdvisories.filter(a => a.level === 'do-not-travel').length, tone: 'alert' },
        { label: 'Reconsider', value: ext.portal.travelAdvisories.filter(a => a.level === 'reconsider-travel').length, tone: 'warn' },
        { label: 'Citizens registered (k)', value: ext.portal.travelAdvisories.reduce((s, a) => s + a.citizensRegisteredK, 0).toFixed(1), tone: 'info' },
      ]} />
      <WorldRule label="advisory feed" />
      {ext.portal.travelAdvisories.map(a => (
        <div key={a.region} className="grid grid-cols-[200px_1fr_120px_120px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: FOREIGN_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: FOREIGN_DS.gold }}>{a.region}</span>
          <span style={{ color: FOREIGN_DS.ink }}>{a.reasonsActive} active reasons</span>
          <span style={{ color: FOREIGN_DS.mut }}>{a.citizensRegisteredK.toFixed(1)}k abroad</span>
          <span className="text-right uppercase tracking-[0.16em]"
            style={{ color: a.level === 'do-not-travel' ? FOREIGN_DS.fracture : a.level === 'reconsider-travel' ? FOREIGN_DS.fracture : a.level === 'heightened-caution' ? FOREIGN_DS.drift : FOREIGN_DS.alliance }}>● {a.level}</span>
        </div>
      ))}
    </ChanceryFrame>
  );
}

export function CivilizationalStanding({ id, now }: { id: string; now: number }) {
  const board = foreignAffairsBoard(now);
  void id;
  return (
    <ChanceryFrame archetype="foresight" code="FS-STD-27" title="Civilizational Standing"
      subtitle="long-horizon sovereignty trajectory">
      <DispatchKpi items={[
        { label: 'Civilizational standing', value: `${board.forecast.civilizationalStandingIdx}/100`, tone: 'ok' },
        { label: 'Long-horizon sovereignty', value: `${board.forecast.longHorizonSovereigntyIdx}/100`, tone: 'ok' },
        { label: 'Crisis risk', value: `${board.forecast.geopoliticalCrisisRisk}/100`, tone: 'warn' },
        { label: 'Horizons modelled', value: board.forecast.horizonYears.length, tone: 'info' },
      ]} />
      <WorldRule label="horizon trajectories" />
      <div className="grid grid-cols-4 gap-2 text-[11px]">
        {['Alignment', 'Alliance integrity', 'Influence', 'Global coordination'].map((label, i) => {
          const series = [board.forecast.alignmentTrajectory, board.forecast.allianceIntegrityTrajectory, board.forecast.influenceTrajectory, board.forecast.globalCoordinationTrajectory][i]!;
          return (
            <div key={label} className="border p-2" style={{ borderColor: FOREIGN_DS.rule }}>
              <div className="text-[9px] uppercase tracking-[0.18em]" style={{ color: FOREIGN_DS.mut, fontFamily: 'ui-monospace, monospace' }}>{label}</div>
              <div className="text-[13px] font-semibold tabular-nums" style={{ color: FOREIGN_DS.gold }}>{series[series.length - 1]}</div>
              <div className="mt-1 flex items-end gap-1">
                {series.map((v, j) => (
                  <div key={j} className="flex-1" style={{ height: `${Math.max(2, Math.min(40, v / 3))}px`, background: FOREIGN_DS.gold }} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </ChanceryFrame>
  );
}

export function MultilateralRoster({ id, now }: { id: string; now: number }) {
  const board = foreignAffairsBoard(now);
  void id;
  return (
    <ChanceryFrame archetype="organization" code="OR-RST-28" title="Multilateral Roster"
      subtitle="international organisation roster">
      <DispatchKpi items={[
        { label: 'Organisations', value: board.organizations.length },
        { label: 'Full membership', value: board.organizations.filter(o => o.membership === 'full').length, tone: 'ok' },
        { label: 'Leading contributor', value: board.organizations.filter(o => o.contributionTier === 'leading').length, tone: 'info' },
        { label: 'Under review', value: board.organizations.filter(o => o.membership === 'review').length, tone: 'warn' },
      ]} />
      <WorldRule label="organisation register" />
      {board.organizations.map(o => (
        <div key={o.org} className="grid grid-cols-[200px_1fr_100px_120px_120px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: FOREIGN_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: FOREIGN_DS.gold }}>{o.org}</span>
          <div className="h-1.5 self-center" style={{ background: FOREIGN_DS.navy }}>
            <div className="h-full" style={{ width: `${o.participationIdx}%`, background: FOREIGN_DS.alliance }} />
          </div>
          <span className="text-right uppercase tracking-[0.16em]" style={{ color: o.membership === 'full' ? FOREIGN_DS.alliance : o.membership === 'review' ? FOREIGN_DS.drift : FOREIGN_DS.signal }}>● {o.membership}</span>
          <span className="text-right tabular-nums" style={{ color: FOREIGN_DS.mut }}>{o.contributionTier}</span>
          <span className="text-right tabular-nums" style={{ color: FOREIGN_DS.mut }}>align {o.votingAlignmentIdx}</span>
        </div>
      ))}
    </ChanceryFrame>
  );
}

export function VotingAlignment({ id, now }: { id: string; now: number }) {
  const board = foreignAffairsBoard(now);
  void id;
  return (
    <ChanceryFrame archetype="organization" code="OR-VOT-29" title="Voting Alignment"
      subtitle="voting / contribution / alignment matrix">
      <DispatchKpi items={[
        { label: 'Mean voting alignment', value: Math.round(board.organizations.reduce((s, o) => s + o.votingAlignmentIdx, 0) / Math.max(1, board.organizations.length)), tone: 'info' },
        { label: 'Leading-tier orgs', value: board.organizations.filter(o => o.contributionTier === 'leading').length, tone: 'ok' },
        { label: 'Core-tier orgs', value: board.organizations.filter(o => o.contributionTier === 'core').length },
        { label: 'Minimal-tier orgs', value: board.organizations.filter(o => o.contributionTier === 'minimal').length, tone: 'mute' },
      ]} />
      <WorldRule label="alignment matrix" />
      {board.organizations.map(o => (
        <div key={o.org} className="grid grid-cols-[200px_1fr_80px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: FOREIGN_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: FOREIGN_DS.gold }}>{o.org}</span>
          <div className="h-1.5 self-center" style={{ background: FOREIGN_DS.navy }}>
            <div className="h-full" style={{ width: `${o.votingAlignmentIdx}%`, background: o.votingAlignmentIdx > 70 ? FOREIGN_DS.alliance : o.votingAlignmentIdx > 40 ? FOREIGN_DS.gold : FOREIGN_DS.fracture }} />
          </div>
          <span className="text-right tabular-nums" style={{ color: FOREIGN_DS.mut }}>{o.votingAlignmentIdx}%</span>
        </div>
      ))}
    </ChanceryFrame>
  );
}

export function DiplomaticSafeguards({ id, now }: { id: string; now: number }) {
  void id; void now;
  return (
    <ChanceryFrame archetype="oversight" code="OV-DSF-30" title="Diplomatic Safeguards"
      subtitle="FOREIGN_EXTENDED_SAFEGUARDS contract · §4.10">
      <DispatchKpi items={[
        { label: 'Diplomatic immunity', value: FOREIGN_EXTENDED_SAFEGUARDS.diplomaticImmunityRespected ? '✓' : '✗', tone: 'ok' },
        { label: 'International-law compliance', value: FOREIGN_EXTENDED_SAFEGUARDS.internationalLawCompliance ? '✓' : '✗', tone: 'ok' },
        { label: 'Consular right of access', value: FOREIGN_EXTENDED_SAFEGUARDS.consularRightToAccess ? '✓' : '✗', tone: 'ok' },
        { label: 'Non-intervention doctrine', value: FOREIGN_EXTENDED_SAFEGUARDS.nonInterventionDoctrine ? '✓' : '✗', tone: 'ok' },
      ]} />
      <WorldRule label="prohibited postures" />
      <ul className="grid grid-cols-1 gap-1 md:grid-cols-2 text-[11px]"
        style={{ color: FOREIGN_DS.ink, fontFamily: 'ui-monospace, monospace' }}>
        {FOREIGN_EXTENDED_SAFEGUARDS.prohibited.map(p => (
          <li key={p} className="border-l-2 pl-2" style={{ borderColor: FOREIGN_DS.fracture }}>
            <span style={{ color: FOREIGN_DS.fracture }}>✕</span> {p}
          </li>
        ))}
      </ul>
      <ChanceryCallout kicker="binding contract" body="Every Foreign Affairs surface attests against this contract. Violations route to the International Law bench, the Justice ministry and the constitutional audit chain." />
    </ChanceryFrame>
  );
}

export function AntiImperialAudit({ id, now }: { id: string; now: number }) {
  const board = foreignAffairsBoard(now);
  void id;
  return (
    <ChanceryFrame archetype="oversight" code="OV-AIA-31" title="Anti-Imperial Audit"
      subtitle="anti-imperial doctrine audit">
      <DispatchKpi items={[
        { label: 'Imperial-coercion incidents', value: 0, tone: 'ok' },
        { label: 'Per-citizen targeting reports', value: 0, tone: 'ok' },
        { label: 'Influence-ops against 3rd states', value: 0, tone: 'ok' },
        { label: 'Sovereignty integrity', value: '100%', tone: 'ok' },
      ]} />
      <WorldRule label="prohibition register" />
      <ul className="grid grid-cols-1 gap-1 md:grid-cols-2 text-[11px]"
        style={{ color: FOREIGN_DS.ink, fontFamily: 'ui-monospace, monospace' }}>
        {board.prohibited.map(p => (
          <li key={p} className="border-l-2 pl-2" style={{ borderColor: FOREIGN_DS.fracture }}>
            <span style={{ color: FOREIGN_DS.fracture }}>✕</span> {p}
          </li>
        ))}
      </ul>
      <ChanceryCallout kicker="doctrine" body="The state's foreign policy is defensive and lawful. Offensive influence operations, imperial coercion and per-citizen foreign targeting are constitutionally void — never deployed, never authorised." />
    </ChanceryFrame>
  );
}
