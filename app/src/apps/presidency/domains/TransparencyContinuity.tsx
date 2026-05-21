'use client';

// Presidency domains — Transparency, Continuity, Safeguards surfaces.

import * as React from 'react';
import { presidencyBoard, PRESIDENTIAL_SAFEGUARDS } from '@/lib/gov/presidency-engine';
import { MansionFrame, MansionKpi, MansionRule, MansionBar, MansionCallout, PRESIDENCY_DS } from '@/apps/presidency/design-system/presidency-ds';
import { wave } from '@/lib/telemetry';

export function TransparencyReports({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  return (
    <MansionFrame archetype="transparency" code="TR-RPT-21" title="Transparency Reports"
      subtitle="quarterly transparency reports · §2.8">
      <MansionKpi items={[
        { label: 'Reports YTD', value: 4, tone: 'info' },
        { label: 'Coverage', value: '100%', tone: 'ok' },
        { label: 'Median publication delay', value: `${Math.round(wave('tr:d', ts, 0, 6))}d`, tone: 'ok' },
        { label: 'Citizen reviews', value: Math.round(wave('tr:r', ts, 2400, 18000)).toLocaleString() },
      ]} />
      <MansionRule label="report sections" />
      {['Executive orders', 'State engagements', 'Appointments', 'Fiscal commitments', 'Foreign engagements', 'Records'].map((s, i) => {
        const v = Math.round(wave(`tr:s:${i}`, ts, 82, 100));
        return <MansionBar key={s} label={s} pct={v} tone={v >= 95 ? 'ok' : v >= 80 ? 'warn' : 'alert'} tail={`${v}% complete`} />;
      })}
      <MansionCallout kicker="quarterly cadence" body="Transparency reports are published within 30 days of quarter-end. Failure to publish triggers an audit referral and a Senate inquiry." />
    </MansionFrame>
  );
}

export function AssetDisclosures({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  return (
    <MansionFrame archetype="transparency" code="TR-AST-22" title="Asset Disclosures"
      subtitle="presidential & cabinet asset disclosures">
      <MansionKpi items={[
        { label: 'Disclosures filed', value: '15 / 15', tone: 'ok' },
        { label: 'Median age', value: `${Math.round(wave('ad:a', ts, 1, 28))}d` },
        { label: 'Public access', value: '✓ open', tone: 'ok' },
        { label: 'Conflicts flagged', value: Math.round(wave('ad:c', ts, 0, 2)), tone: 'warn' },
      ]} />
      <MansionCallout kicker="conflict doctrine" body="Every cabinet member discloses assets, businesses, and beneficial interests annually. Conflicts are referred to the Ethics Commissioner; concealment is automatic disqualification." />
    </MansionFrame>
  );
}

export function RecordsPublication({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  return (
    <MansionFrame archetype="transparency" code="TR-REC-23" title="Records Publication"
      subtitle="presidential records publication pipeline">
      <MansionKpi items={[
        { label: 'Records published YTD', value: Math.round(wave('rp:y', ts, 1200, 4800)).toLocaleString(), tone: 'info' },
        { label: 'Open formats', value: '✓ machine-readable', tone: 'ok' },
        { label: 'Median lag', value: `${Math.round(wave('rp:l', ts, 1, 14))}d`, tone: 'ok' },
        { label: 'Citizen subscriptions', value: Math.round(wave('rp:s', ts, 8000, 42000)).toLocaleString() },
      ]} />
      <MansionRule label="record categories" />
      {['Orders', 'Resolutions', 'Engagements', 'Appointments', 'Addresses', 'Council minutes'].map((c, i) => {
        const v = Math.round(wave(`rp:c:${i}`, ts, 85, 100));
        return <MansionBar key={c} label={c} pct={v} tone={v >= 95 ? 'ok' : 'warn'} tail={`${v}% published`} />;
      })}
    </MansionFrame>
  );
}

export function SuccessionLine({ id, now }: { id: string; now: number }) {
  void id; void now;
  const line = [
    { rank: 1, role: 'Vice-President', holder: 'Hon. Petrov' },
    { rank: 2, role: 'Senate President', holder: 'Sen. Adamu' },
    { rank: 3, role: 'Speaker of the Assembly', holder: 'Hon. Tanaka' },
    { rank: 4, role: 'Chief Justice', holder: 'CJ Mehta' },
    { rank: 5, role: 'Treasury Secretary', holder: 'Hon. Brennan' },
  ];
  return (
    <MansionFrame archetype="continuity" code="CO-SUC-24" title="Succession Line"
      subtitle="constitutional order of succession · §2.9">
      <MansionKpi items={[
        { label: 'Line length', value: line.length, tone: 'info' },
        { label: 'Civilian throughout', value: '✓', tone: 'ok' },
        { label: 'Publicly known', value: '✓', tone: 'ok' },
        { label: 'Last review', value: '60d ago' },
      ]} />
      <MansionRule label="order of succession" />
      {line.map(l => (
        <div key={l.rank} className="grid grid-cols-[40px_180px_1fr] gap-3 border-b py-1 text-[11px]"
          style={{ borderColor: PRESIDENCY_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: PRESIDENCY_DS.goldLeaf }}>#{l.rank}</span>
          <span style={{ color: PRESIDENCY_DS.parchment }}>{l.role}</span>
          <span style={{ color: PRESIDENCY_DS.parchmentInk }}>{l.holder}</span>
        </div>
      ))}
      <MansionCallout kicker="succession doctrine" body="The line of succession is publicly known and constitutionally protected. Covert succession or military extension of authority is void." />
    </MansionFrame>
  );
}

export function CrisisHandover({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  return (
    <MansionFrame archetype="continuity" code="CO-CRH-25" title="Crisis Handover"
      subtitle="crisis handover protocol">
      <MansionKpi items={[
        { label: 'Protocol version', value: 'CHP-2025', tone: 'info' },
        { label: 'Exercises (12 mo)', value: Math.round(wave('ch:e', ts, 3, 8)), tone: 'ok' },
        { label: 'Mean handover time', value: '< 4h', tone: 'ok' },
        { label: 'Public announcement', value: '✓ required', tone: 'ok' },
      ]} />
      <MansionCallout kicker="open handover" body="A crisis handover is publicly announced within 4 hours. Covert handover, or extension beyond the constitutional duration, is automatically void." />
    </MansionFrame>
  );
}

export function PresidentialSafeguardsView({ id, now }: { id: string; now: number }) {
  void id; void now;
  return (
    <MansionFrame archetype="safeguards" code="SF-PRE-26" title="Presidential Safeguards"
      subtitle="PRESIDENTIAL_SAFEGUARDS constitutional contract · §2.10">
      <MansionKpi items={[
        { label: 'Term limited', value: '✓', tone: 'ok' },
        { label: 'Collective responsibility', value: '✓', tone: 'ok' },
        { label: 'Transparent orders', value: '✓', tone: 'ok' },
        { label: 'Civilian supremacy', value: '✓', tone: 'ok' },
      ]} />
      <MansionRule label="prohibited acts (constitutionally void)" />
      {PRESIDENTIAL_SAFEGUARDS.prohibited.map(p => (
        <div key={p} className="border-b py-1 text-[11px]"
          style={{ borderColor: PRESIDENCY_DS.ruleSoft, fontFamily: 'ui-monospace, monospace', color: PRESIDENCY_DS.crimson }}>✗ {p}</div>
      ))}
      <MansionCallout kicker="constitutional doctrine" body="The Presidency is a temporary, accountable office. Every act listed above is automatically void. The judiciary may strike any breach in expedited session." />
    </MansionFrame>
  );
}

export function CabinetCollectiveResponsibility({ id, now }: { id: string; now: number }) {
  void id; void now;
  return (
    <MansionFrame archetype="safeguards" code="SF-CCR-27" title="Cabinet Collective Responsibility"
      subtitle="collective responsibility doctrine">
      <MansionKpi items={[
        { label: 'Doctrine', value: 'ASSERTED', tone: 'ok' },
        { label: 'Confidence tests YTD', value: 0, tone: 'ok' },
        { label: 'Public dissents recorded', value: 2, tone: 'info' },
        { label: 'Confidence threshold', value: 'majority', tone: 'ok' },
      ]} />
      <MansionCallout kicker="collective responsibility" body="Ministers carry collective responsibility for every adopted resolution. Public dissent after adoption breaches the doctrine and triggers a confidence test in the Assembly." />
    </MansionFrame>
  );
}

export function CivilMilitaryDoctrine({ id, now }: { id: string; now: number }) {
  void id; void now;
  return (
    <MansionFrame archetype="safeguards" code="SF-CMD-28" title="Civil-Military Doctrine"
      subtitle="civilian supremacy over military">
      <MansionKpi items={[
        { label: 'Commander-in-chief', value: 'CIVILIAN', tone: 'ok' },
        { label: 'Voting officers on Council', value: 0, tone: 'ok' },
        { label: 'Civilian audits / yr', value: 2, tone: 'ok' },
        { label: 'Mandatory training', value: '✓ all officers', tone: 'ok' },
      ]} />
      <MansionCallout kicker="civilian supremacy" body="The President is Commander-in-Chief as a civilian office. Military officers cannot vote on civilian policy. Coup, mutiny, or unilateral mobilisation is treason." />
    </MansionFrame>
  );
}

export function AuditFabric({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  return (
    <MansionFrame archetype="safeguards" code="SF-AUD-29" title="Audit Fabric"
      subtitle="cross-branch audit interface">
      <MansionKpi items={[
        { label: 'Audit chain integrity', value: '✓ intact', tone: 'ok' },
        { label: 'Cross-branch references', value: Math.round(wave('af:c', ts, 240, 1480)).toLocaleString(), tone: 'info' },
        { label: 'Open referrals', value: Math.round(wave('af:o', ts, 1, 8)), tone: 'warn' },
        { label: 'Auditor-General reach', value: '✓ all surfaces', tone: 'ok' },
      ]} />
      <MansionCallout kicker="audit doctrine" body="Every executive act emits to the sovereign audit vault. The Auditor-General has standing access without prior notice; the President cannot redact, only annotate." />
    </MansionFrame>
  );
}

export function PresidentialRecordsAudit({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  return (
    <MansionFrame archetype="safeguards" code="SF-REC-30" title="Presidential Records Audit"
      subtitle="records preservation audit">
      <MansionKpi items={[
        { label: 'Records preserved', value: '100%', tone: 'ok' },
        { label: 'Missing records', value: 0, tone: 'ok' },
        { label: 'Format integrity', value: '✓', tone: 'ok' },
        { label: 'Public access lag', value: `${Math.round(wave('pr:l', ts, 0, 7))}d`, tone: 'ok' },
      ]} />
      <MansionCallout kicker="records doctrine" body="Presidential records are sovereign property. Their destruction, alteration, or removal is a constitutional offence. The Records Auditor reports directly to the Senate." />
    </MansionFrame>
  );
}
