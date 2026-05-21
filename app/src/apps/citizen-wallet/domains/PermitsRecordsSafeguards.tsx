'use client';

// Citizen Portal domains — Permits, Records, Safeguards surfaces.

import * as React from 'react';
import { CITIZEN_PORTAL_SAFEGUARDS } from '@/lib/gov/citizen-portal-engine';
import { CitizenFrame, CitizenKpi, CitizenRule, CitizenCallout, PORTAL_DS } from '@/apps/citizen-wallet/design-system/portal-ds';
import { wave } from '@/lib/telemetry';

export function PermitsLicences({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  const permits = ['Driving licence', 'Passport', 'Firearm permit', 'Building permit', 'Trade licence'];
  return (
    <CitizenFrame archetype="permits" code="PR-LIC-24" title="Permits & Licences"
      subtitle="every permit you hold · renew · transfer">
      <CitizenKpi items={[
        { label: 'Active permits', value: 4, tone: 'ok' },
        { label: 'Expiring (90d)', value: Math.round(wave('pl:e', ts, 0, 2)), tone: 'warn' },
        { label: 'Suspended', value: 0, tone: 'ok' },
        { label: 'Renewal median', value: `${Math.round(wave('pl:r', ts, 2, 14))}d` },
      ]} />
      <CitizenRule label="permits & licences" />
      {permits.map((p, i) => (
        <div key={p} className="grid grid-cols-[1fr_120px_120px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: PORTAL_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: PORTAL_DS.ink }}>{p}</span>
          <span style={{ color: PORTAL_DS.inkMut }}>{Math.round(wave(`pl:p:${i}`, ts, 30, 1800))}d remaining</span>
          <span className="text-right uppercase" style={{ color: i === 2 ? PORTAL_DS.inkMut : PORTAL_DS.jade }}>● {i === 2 ? 'not held' : 'active'}</span>
        </div>
      ))}
    </CitizenFrame>
  );
}

export function BusinessRegistry({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  return (
    <CitizenFrame archetype="business" code="PR-BIZ-25" title="Business Registry"
      subtitle="register · update · close — open & cheap">
      <CitizenKpi items={[
        { label: 'Businesses owned', value: Math.round(wave('br:b', ts, 0, 2)), tone: 'info' },
        { label: 'Median registration', value: '< 24h', tone: 'ok' },
        { label: 'Filings auto-pre-filled', value: '✓', tone: 'ok' },
        { label: 'Closure penalty', value: '✗ none', tone: 'ok' },
      ]} />
      <CitizenCallout kicker="enterprise doctrine" body="Starting and closing a business is a citizen right, not a privilege. Filings are pre-filled, fees are reasonable, and refusals must cite the rule." />
    </CitizenFrame>
  );
}

export function PersonalRecords({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  const records = ['Birth certificate', 'Marriage certificate', 'Property deed', 'Vehicle registry', 'Voter registry', 'Civil registry'];
  return (
    <CitizenFrame archetype="records" code="RC-PER-26" title="Personal Records"
      subtitle="every sovereign record about you · in one place">
      <CitizenKpi items={[
        { label: 'Records linked', value: records.length, tone: 'info' },
        { label: 'Export formats', value: 'PDF · JSON · open', tone: 'ok' },
        { label: 'Audit on access', value: '✓', tone: 'ok' },
        { label: 'Removal requests', value: 0 },
      ]} />
      <CitizenRule label="record catalogue" />
      {records.map((r, i) => (
        <div key={r} className="grid grid-cols-[1fr_140px_80px] gap-3 border-b py-1 text-[11px]"
          style={{ borderColor: PORTAL_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: PORTAL_DS.ink }}>{r}</span>
          <span style={{ color: PORTAL_DS.inkMut }}>{Math.round(wave(`pr:r:${i}`, ts, 1, 40))}y ago</span>
          <span className="text-right uppercase" style={{ color: PORTAL_DS.jade }}>✓ owned</span>
        </div>
      ))}
    </CitizenFrame>
  );
}

export function MobilityWallet({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  return (
    <CitizenFrame archetype="mobility" code="RC-MOB-27" title="Mobility Wallet"
      subtitle="travel · transit · driving history">
      <CitizenKpi items={[
        { label: 'Trips logged (year)', value: Math.round(wave('mw:t', ts, 12, 240)), tone: 'info' },
        { label: 'Tracking', value: '✗ off by default', tone: 'ok' },
        { label: 'Public transit credit', value: Math.round(wave('mw:c', ts, 0, 1800)).toLocaleString() },
        { label: 'Drive record', value: 'clean', tone: 'ok' },
      ]} />
      <CitizenCallout kicker="movement privacy" body="The state does not track citizen movement by default. Mobility data is yours; consent grants are scoped and revocable." />
    </CitizenFrame>
  );
}

export function EnergyAccount({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  return (
    <CitizenFrame archetype="records" code="RC-ENG-28" title="Energy Account"
      subtitle="consumption · billing · sovereign energy">
      <CitizenKpi items={[
        { label: 'Monthly kWh', value: Math.round(wave('ea:k', ts, 120, 480)), tone: 'info' },
        { label: 'Renewable share', value: `${Math.round(wave('ea:r', ts, 38, 78))}%`, tone: 'ok' },
        { label: 'Carbon footprint', value: `${Math.round(wave('ea:c', ts, 20, 220))}kg/mo` },
        { label: 'Disconnections', value: 0, tone: 'ok' },
      ]} />
      <CitizenCallout kicker="energy dignity" body="Disconnection of essential energy is forbidden during winter and for vulnerable households. Arrears are repayable on dignified terms." />
    </CitizenFrame>
  );
}

export function ConsularServices({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  return (
    <CitizenFrame archetype="foreign" code="RC-CON-29" title="Consular Services"
      subtitle="diaspora · travel · evacuation">
      <CitizenKpi items={[
        { label: 'Diaspora-eligible', value: 'yes / no' },
        { label: 'Passport status', value: '✓ active', tone: 'ok' },
        { label: 'Travel advisories', value: Math.round(wave('cs:a', ts, 0, 6)), tone: 'info' },
        { label: 'Evacuation enrolment', value: '✓ active', tone: 'ok' },
      ]} />
      <CitizenCallout kicker="never abandoned" body="The state is obliged to evacuate citizens in crisis. Every citizen abroad may enrol for evacuation; the state may not refuse return." />
    </CitizenFrame>
  );
}

export function VoterWallet({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  return (
    <CitizenFrame archetype="voting" code="RC-VOT-30" title="Voter Wallet"
      subtitle="voter status · upcoming elections · ballot history">
      <CitizenKpi items={[
        { label: 'Voter status', value: '✓ active', tone: 'ok' },
        { label: 'Constituency', value: 'Capital-3' },
        { label: 'Next election', value: `${Math.round(wave('vw:n', ts, 30, 720))}d`, tone: 'info' },
        { label: 'Ballot privacy', value: '✓ guaranteed', tone: 'ok' },
      ]} />
      <CitizenCallout kicker="ballot doctrine" body="Voter status is presumed; removal requires due process. Ballots are secret. The state may not compel disclosure of how you voted." />
    </CitizenFrame>
  );
}

export function CitizenSafeguardsView({ id, now }: { id: string; now: number }) {
  void id; void now;
  return (
    <CitizenFrame archetype="safeguards" code="SF-CIT-31" title="Citizen Safeguards"
      subtitle="CITIZEN_PORTAL_SAFEGUARDS constitutional contract">
      <CitizenKpi items={[
        { label: 'Citizen-owned identity', value: '✓', tone: 'ok' },
        { label: 'Consent-bound sharing', value: '✓', tone: 'ok' },
        { label: 'No behavioural profiling', value: '✓', tone: 'ok' },
        { label: 'Universal appeal', value: '✓', tone: 'ok' },
      ]} />
      <CitizenRule label="prohibited acts (constitutionally void)" />
      {CITIZEN_PORTAL_SAFEGUARDS.prohibited.map(p => (
        <div key={p} className="border-b py-1 text-[11px]"
          style={{ borderColor: PORTAL_DS.ruleSoft, fontFamily: 'ui-monospace, monospace', color: PORTAL_DS.ember }}>✗ {p}</div>
      ))}
      <CitizenCallout kicker="constitutional doctrine" body="The state may serve, but never score. The acts above are automatically void; the Citizen Tribunal will strike them in expedited session." />
    </CitizenFrame>
  );
}

export function DataDoctrine({ id, now }: { id: string; now: number }) {
  void id; void now;
  return (
    <CitizenFrame archetype="safeguards" code="SF-DAT-32" title="Data Doctrine"
      subtitle="how ministries may use citizen data">
      <CitizenKpi items={[
        { label: 'Default sharing', value: '✗ none', tone: 'ok' },
        { label: 'Consent-bound only', value: '✓', tone: 'ok' },
        { label: 'Cross-ministry silent transfer', value: '✗ void', tone: 'ok' },
        { label: 'Data minimisation', value: '✓ mandatory', tone: 'ok' },
      ]} />
      <CitizenCallout kicker="silent transfer prohibited" body="A ministry may not silently share citizen data with another. Every cross-ministry data movement requires a recorded consent token or a constitutional duty cited in the audit." />
    </CitizenFrame>
  );
}

export function AppealDoctrine({ id, now }: { id: string; now: number }) {
  void id; void now;
  return (
    <CitizenFrame archetype="safeguards" code="SF-APP-33" title="Appeal Doctrine"
      subtitle="universal right of appeal">
      <CitizenKpi items={[
        { label: 'Appealable decisions', value: 'every one', tone: 'ok' },
        { label: 'Filing cost', value: '0', tone: 'ok' },
        { label: 'Independent tribunal', value: '✓', tone: 'ok' },
        { label: 'Reasoned published decision', value: '✓ required', tone: 'ok' },
      ]} />
      <CitizenCallout kicker="appealability" body="Every administrative decision is appealable to an independent tribunal at no cost. A decision without reasoning is automatically appealable on procedural grounds." />
    </CitizenFrame>
  );
}
