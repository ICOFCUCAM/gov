'use client';

// Citizen Portal domains — Welfare, Taxation, Justice, Civic surfaces.

import * as React from 'react';
import { CitizenFrame, CitizenKpi, CitizenRule, CitizenBar, CitizenCallout, PORTAL_DS } from '@/apps/citizen-portal/design-system/portal-ds';
import { wave } from '@/lib/telemetry';

export function WelfareBenefits({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  const benefits = ['Family allowance', 'Disability support', 'Child care support', 'Heating allowance', 'Rural-area grant'];
  return (
    <CitizenFrame archetype="welfare" code="WB-BEN-13" title="Welfare & Benefits"
      subtitle="active benefit programmes you qualify for">
      <CitizenKpi items={[
        { label: 'Active benefits', value: Math.round(wave('wb:a', ts, 0, 2)), tone: 'info' },
        { label: 'Eligibility check', value: '✓ instant', tone: 'ok' },
        { label: 'Means-test transparency', value: '✓ rule explained', tone: 'ok' },
        { label: 'Appeal rate', value: `${Math.round(wave('wb:p', ts, 88, 99))}%`, tone: 'ok' },
      ]} />
      <CitizenRule label="programmes available" />
      {benefits.map((b, i) => (
        <div key={b} className="grid grid-cols-[1fr_140px_100px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: PORTAL_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: PORTAL_DS.ink }}>{b}</span>
          <span style={{ color: PORTAL_DS.inkMut }}>monthly ledger</span>
          <span className="text-right uppercase" style={{ color: i % 2 === 0 ? PORTAL_DS.jade : PORTAL_DS.teal }}>{i % 2 === 0 ? '● eligible' : '● apply'}</span>
        </div>
      ))}
      <CitizenCallout kicker="no-shame doctrine" body="Benefits are entitlements, not favours. Eligibility rules are public and machine-readable. A denial must cite the rule and may be appealed." />
    </CitizenFrame>
  );
}

export function UnemploymentAccount({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  return (
    <CitizenFrame archetype="welfare" code="WB-UEM-14" title="Unemployment Account"
      subtitle="benefits, retraining, job matching">
      <CitizenKpi items={[
        { label: 'Account status', value: 'idle', tone: 'mute' },
        { label: 'Retraining options', value: Math.round(wave('un:r', ts, 12, 64)), tone: 'info' },
        { label: 'Job matches available', value: Math.round(wave('un:j', ts, 0, 24)) },
        { label: 'Sanction-free', value: '✓ no benefit sanction', tone: 'ok' },
      ]} />
      <CitizenCallout kicker="dignity doctrine" body="Unemployment benefits cannot be sanctioned for refusing exploitative work. Retraining is offered, not imposed. Your dignity is constitutional." />
    </CitizenFrame>
  );
}

export function TaxAccount({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  return (
    <CitizenFrame archetype="taxation" code="TX-ACC-15" title="Tax Account"
      subtitle="personal tax account · transparent ledger">
      <CitizenKpi items={[
        { label: 'Balance', value: 'in good standing', tone: 'ok' },
        { label: 'Liabilities (year)', value: Math.round(wave('tx:l', ts, 800, 12000)).toLocaleString(), tone: 'info' },
        { label: 'Payments (year)', value: Math.round(wave('tx:p', ts, 800, 12000)).toLocaleString() },
        { label: 'Refunds owed', value: Math.round(wave('tx:r', ts, 0, 800)), tone: 'ok' },
      ]} />
      <CitizenCallout kicker="transparent tax" body="Every tax line cites the legislative section and the formula. Discretionary assessments must explain the rule applied; opaque assessments are appealable on demand." />
    </CitizenFrame>
  );
}

export function PaymentsHistory({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  const rows = Array.from({ length: 6 }, (_, i) => ({
    desc: ['PAYE (monthly)', 'VAT credit', 'Service fee (passport)', 'Property tax', 'Refund', 'PAYE (monthly)'][i]!,
    amount: Math.round(wave(`ph:a:${i}`, ts, -800, 1800)),
  }));
  return (
    <CitizenFrame archetype="taxation" code="TX-PAY-16" title="Payments History"
      subtitle="every payment to and from the sovereign treasury">
      <CitizenKpi items={[
        { label: 'Payments (12mo)', value: Math.round(wave('ph:t', ts, 8, 36)), tone: 'info' },
        { label: 'Net outflow', value: Math.round(wave('ph:n', ts, 800, 12000)).toLocaleString() },
        { label: 'Refunds received', value: Math.round(wave('ph:r', ts, 1, 4)), tone: 'ok' },
        { label: 'Disputed', value: 0, tone: 'ok' },
      ]} />
      <CitizenRule label="recent" />
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-[200px_1fr_140px] gap-3 border-b py-1 text-[11px]"
          style={{ borderColor: PORTAL_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: PORTAL_DS.ink }}>{r.desc}</span>
          <span style={{ color: PORTAL_DS.inkMut }}>{Math.round(wave(`ph:d:${i}`, ts, 1, 120))}d ago</span>
          <span className="text-right tabular-nums" style={{ color: r.amount >= 0 ? PORTAL_DS.ember : PORTAL_DS.jade }}>{r.amount >= 0 ? '−' : '+'} {Math.abs(r.amount).toLocaleString()}</span>
        </div>
      ))}
    </CitizenFrame>
  );
}

export function TaxFiling({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  return (
    <CitizenFrame archetype="taxation" code="TX-FIL-17" title="Tax Filing"
      subtitle="pre-filled · machine-checked · appealable">
      <CitizenKpi items={[
        { label: 'Status', value: 'filed', tone: 'ok' },
        { label: 'Pre-fill accuracy', value: `${Math.round(wave('tf:a', ts, 92, 99))}%`, tone: 'ok' },
        { label: 'Open queries', value: 0, tone: 'ok' },
        { label: 'Median filing time', value: `${Math.round(wave('tf:m', ts, 4, 14))} min` },
      ]} />
      <CitizenCallout kicker="pre-filled" body="Your tax return is pre-filled from existing records. You amend, sign, and submit. The state may not impose adjustments without citing the rule." />
    </CitizenFrame>
  );
}

export function CivicJustice({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  return (
    <CitizenFrame archetype="justice" code="JT-CVC-18" title="Civic Justice"
      subtitle="open courts · personal records · every right asserted">
      <CitizenKpi items={[
        { label: 'Active matters', value: Math.round(wave('cj:a', ts, 0, 2)), tone: 'info' },
        { label: 'Legal aid available', value: '✓ free', tone: 'ok' },
        { label: 'Hearings public', value: '✓ default', tone: 'ok' },
        { label: 'Appeal rate', value: `${Math.round(wave('cj:p', ts, 86, 99))}%`, tone: 'ok' },
      ]} />
      <CitizenCallout kicker="open justice" body="Every citizen has standing access to civic justice. Legal aid is free for the indigent. Hearings are public unless a constitutional rationale seals them." />
    </CitizenFrame>
  );
}

export function CaseTracker({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  return (
    <CitizenFrame archetype="justice" code="JT-CAS-19" title="Case Tracker"
      subtitle="your matters · public timeline · sealed personal data">
      <CitizenKpi items={[
        { label: 'Total cases', value: Math.round(wave('ct:t', ts, 0, 3)), tone: 'info' },
        { label: 'Open', value: Math.round(wave('ct:o', ts, 0, 2)) },
        { label: 'Closed (positive)', value: Math.round(wave('ct:p', ts, 0, 1)), tone: 'ok' },
        { label: 'Median resolution', value: `${Math.round(wave('ct:r', ts, 14, 120))}d` },
      ]} />
    </CitizenFrame>
  );
}

export function AppealCentre({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  return (
    <CitizenFrame archetype="justice" code="JT-APP-20" title="Appeal Centre"
      subtitle="every decision is appealable · independent tribunal">
      <CitizenKpi items={[
        { label: 'Active appeals', value: Math.round(wave('ac:a', ts, 0, 1)), tone: 'info' },
        { label: 'Median resolution', value: `${Math.round(wave('ac:m', ts, 12, 90))}d` },
        { label: 'Success rate (citizen)', value: `${Math.round(wave('ac:s', ts, 38, 64))}%`, tone: 'ok' },
        { label: 'Cost to file', value: '0', tone: 'ok' },
      ]} />
      <CitizenRule label="appealable decisions" />
      {['Tax assessment', 'Benefit denial', 'Permit refusal', 'Identity rejection', 'Service decision', 'Penalty'].map((d, i) => {
        const v = Math.round(wave(`ac:d:${i}`, ts, 32, 64));
        return <CitizenBar key={d} label={d} pct={v} tone="info" tail={`${v}% upheld`} />;
      })}
      <CitizenCallout kicker="universal right" body="Every administrative decision affecting a citizen is appealable. Filing is free, the tribunal is independent, and reasoning is published." />
    </CitizenFrame>
  );
}

export function CivicVoice({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  return (
    <CitizenFrame archetype="civic" code="CV-VOC-21" title="Civic Voice"
      subtitle="participate in decisions that shape your life">
      <CitizenKpi items={[
        { label: 'Open consultations', value: Math.round(wave('cv:c', ts, 4, 22)), tone: 'info' },
        { label: 'Active petitions', value: Math.round(wave('cv:p', ts, 48, 320)) },
        { label: '5,000-threshold reached', value: Math.round(wave('cv:t', ts, 1, 6)), tone: 'ok' },
        { label: 'Civic participation rate', value: `${Math.round(wave('cv:r', ts, 22, 64))}%` },
      ]} />
      <CitizenCallout kicker="active civic voice" body="The state hears citizens by default, not by exception. Open consultations, petitions, and public-record voting are first-class surfaces — not afterthoughts." />
    </CitizenFrame>
  );
}

export function PetitionsWallet({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  return (
    <CitizenFrame archetype="civic" code="CV-PET-22" title="Petitions Wallet"
      subtitle="file · sign · track">
      <CitizenKpi items={[
        { label: 'Petitions signed', value: Math.round(wave('pw:s', ts, 0, 22)), tone: 'info' },
        { label: 'Filed by you', value: Math.round(wave('pw:f', ts, 0, 4)) },
        { label: '5k threshold reached', value: Math.round(wave('pw:t', ts, 0, 2)), tone: 'ok' },
        { label: 'Assembly debates triggered', value: Math.round(wave('pw:d', ts, 0, 1)) },
      ]} />
    </CitizenFrame>
  );
}

export function PublicConsultations({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  const consultations = ['Curriculum pluralism review', 'Climate adaptation plan', 'Tax brackets review', 'Health-data doctrine', 'Voter wallet rules'];
  return (
    <CitizenFrame archetype="civic" code="CV-CNS-23" title="Public Consultations"
      subtitle="active consultations · your input shapes the rule">
      <CitizenKpi items={[
        { label: 'Active consultations', value: consultations.length },
        { label: 'Submissions (you)', value: Math.round(wave('pc:y', ts, 0, 4)), tone: 'info' },
        { label: 'Median window', value: '30 d' },
        { label: 'Outcomes published', value: '✓ rationale required', tone: 'ok' },
      ]} />
      <CitizenRule label="open now" />
      {consultations.map((c, i) => (
        <div key={c} className="grid grid-cols-[1fr_120px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: PORTAL_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: PORTAL_DS.ink }}>{c}</span>
          <span className="text-right tabular-nums" style={{ color: PORTAL_DS.inkMut }}>{Math.round(wave(`pc:c:${i}`, ts, 4, 28))}d remaining</span>
        </div>
      ))}
    </CitizenFrame>
  );
}
