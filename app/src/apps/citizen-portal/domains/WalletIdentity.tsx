'use client';

// Citizen Portal domains — Wallet, Identity, Health, Education surfaces.

import * as React from 'react';
import { citizenPortalBoard } from '@/lib/gov/citizen-portal-engine';
import { CitizenFrame, CitizenKpi, CitizenRule, CitizenBar, CitizenCallout, PORTAL_DS } from '@/apps/citizen-portal/design-system/portal-ds';
import { wave } from '@/lib/telemetry';

export function WalletHome({ id, now }: { id: string; now: number }) {
  const b = citizenPortalBoard(now);
  void id;
  return (
    <CitizenFrame archetype="wallet" code="CW-HOM-01" title="Citizen Wallet"
      subtitle="every ministry · one wallet · one identity">
      <CitizenKpi items={[
        { label: 'Enrolled citizens', value: `${b.enrolledM}M`, tone: 'ok' },
        { label: 'Identity verified', value: `${b.identityVerifiedPct}%`, tone: 'ok' },
        { label: 'Services uptime', value: `${b.servicesUptimePct}%`, tone: 'ok' },
        { label: 'Mean latency', value: `${b.meanLatencyMs}ms`, tone: 'info' },
      ]} />
      <CitizenRule label="quick actions" />
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {[
          { label: 'File a tax return',     ministry: 'Treasury' },
          { label: 'Book health visit',     ministry: 'Health' },
          { label: 'Apply for permit',      ministry: 'Interior' },
          { label: 'File an appeal',        ministry: 'Justice' },
          { label: 'Sign a petition',       ministry: 'Assembly' },
          { label: 'Update credentials',    ministry: 'Education' },
          { label: 'Claim welfare benefit', ministry: 'Labour' },
          { label: 'Renew passport',        ministry: 'Foreign Affairs' },
        ].map(a => (
          <div key={a.label} className="rounded-[4px] border px-2 py-1.5 text-[11px]"
            style={{ borderColor: PORTAL_DS.rule, background: PORTAL_DS.paperSoft }}>
            <div style={{ color: PORTAL_DS.ink }}>{a.label}</div>
            <div className="text-[9px] uppercase tracking-[0.16em]" style={{ color: PORTAL_DS.teal }}>{a.ministry}</div>
          </div>
        ))}
      </div>
      <CitizenCallout kicker="citizen-owned" body="Your identity, records, and consents belong to you. The state may act only on consent or constitutional duty. Every decision is appealable." />
    </CitizenFrame>
  );
}

export function UnifiedInbox({ id, now }: { id: string; now: number }) {
  const b = citizenPortalBoard(now);
  void id;
  return (
    <CitizenFrame archetype="wallet" code="CW-INB-02" title="Unified Inbox"
      subtitle="every ministry communicates here">
      <CitizenKpi items={[
        { label: 'Total messages', value: b.inbox.reduce((s, i) => s + i.count, 0), tone: 'info' },
        { label: 'Unread', value: b.inbox.reduce((s, i) => s + i.unread, 0), tone: 'warn' },
        { label: 'From ministries', value: b.inbox.length },
        { label: 'Privacy', value: '✓ end-to-end', tone: 'ok' },
      ]} />
      <CitizenRule label="inbox by ministry" />
      {b.inbox.map(i => (
        <div key={`${i.fromMinistry}-${i.kind}`} className="grid grid-cols-[160px_120px_1fr_60px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: PORTAL_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: PORTAL_DS.ink }}>{i.fromMinistry}</span>
          <span className="uppercase tracking-[0.16em]" style={{ color: PORTAL_DS.teal }}>{i.kind}</span>
          <span style={{ color: PORTAL_DS.inkSoft }}>{i.count} messages · {i.unread} unread</span>
          <span className="text-right tabular-nums" style={{ color: i.unread > 0 ? PORTAL_DS.ember : PORTAL_DS.inkMut }}>{i.unread}</span>
        </div>
      ))}
    </CitizenFrame>
  );
}

export function ServicesDirectory({ id, now }: { id: string; now: number }) {
  const b = citizenPortalBoard(now);
  void id;
  return (
    <CitizenFrame archetype="wallet" code="CW-SVC-03" title="Services Directory"
      subtitle={`${b.servicesByDomain.length} services across the federation`}>
      <CitizenKpi items={[
        { label: 'Services available', value: b.servicesByDomain.filter(s => s.status === 'available').length, tone: 'ok' },
        { label: 'In progress', value: b.servicesByDomain.filter(s => s.status === 'in-progress').length, tone: 'info' },
        { label: 'Awaiting action', value: b.servicesByDomain.filter(s => s.status === 'awaiting-action').length, tone: 'warn' },
        { label: 'Open appeals', value: b.appealsOpen.toLocaleString() },
      ]} />
      <CitizenRule label="services" />
      {b.servicesByDomain.map(s => (
        <div key={s.domain} className="grid grid-cols-[120px_220px_140px_80px_80px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: PORTAL_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: PORTAL_DS.teal }}>{s.ministry}</span>
          <span style={{ color: PORTAL_DS.ink }}>{s.name}</span>
          <span className="uppercase tracking-[0.16em]"
            style={{ color: s.status === 'available' || s.status === 'completed' ? PORTAL_DS.jade : s.status === 'awaiting-action' ? PORTAL_DS.ember : PORTAL_DS.teal }}>● {s.status}</span>
          <span className="text-right tabular-nums" style={{ color: PORTAL_DS.inkMut }}>{s.latencyMs}ms</span>
          <span className="text-right tabular-nums" style={{ color: s.successPct >= 95 ? PORTAL_DS.jade : PORTAL_DS.ember }}>{s.successPct}%</span>
        </div>
      ))}
    </CitizenFrame>
  );
}

export function ConsentsLedger({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  const ministries = ['Health', 'Treasury', 'Justice', 'Education', 'Labour', 'Foreign Affairs'];
  return (
    <CitizenFrame archetype="identity" code="CW-CNS-04" title="Consents Ledger"
      subtitle="every consent · what they may see · when it expires">
      <CitizenKpi items={[
        { label: 'Active consents', value: ministries.length, tone: 'info' },
        { label: 'Pending requests', value: Math.round(wave('cl:p', ts, 0, 3)), tone: 'warn' },
        { label: 'Revoked (90 d)', value: Math.round(wave('cl:r', ts, 0, 4)) },
        { label: 'Audit chain', value: '✓ intact', tone: 'ok' },
      ]} />
      <CitizenRule label="active consents" />
      {ministries.map((m, i) => (
        <div key={m} className="grid grid-cols-[160px_1fr_120px_80px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: PORTAL_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: PORTAL_DS.teal }}>{m}</span>
          <span style={{ color: PORTAL_DS.ink }}>{['health records', 'tax history', 'case status', 'credentials', 'employment', 'consular'][i]} (read-only)</span>
          <span style={{ color: PORTAL_DS.inkMut }}>expires in {Math.round(wave(`cl:e:${i}`, ts, 30, 365))}d</span>
          <span className="text-right uppercase" style={{ color: PORTAL_DS.jade }}>● active</span>
        </div>
      ))}
      <CitizenCallout kicker="revocable always" body="Every consent is revocable at any moment, with no penalty. The state may not deny a service because you withhold or revoke consent unless a constitutional duty applies." />
    </CitizenFrame>
  );
}

export function SovereignIdentity({ id, now }: { id: string; now: number }) {
  const b = citizenPortalBoard(now);
  void id;
  return (
    <CitizenFrame archetype="identity" code="ID-SOV-05" title="Sovereign Identity"
      subtitle="citizen-owned, never state-scored">
      <CitizenKpi items={[
        { label: 'Identity verified', value: `${b.identityVerifiedPct}%`, tone: 'ok' },
        { label: 'Verification methods', value: 5, tone: 'info' },
        { label: 'Compromise drills', value: '✓ quarterly', tone: 'ok' },
        { label: 'Profile scoring', value: '✗ prohibited', tone: 'ok' },
      ]} />
      <CitizenCallout kicker="non-scoring doctrine" body="The state may not assign a score, rating, or behavioural profile to a citizen. No civic-credit system is permitted under any pretext. Every contrary instruction is void." />
    </CitizenFrame>
  );
}

export function IdentityVerification({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  const methods = ['Passport', 'National ID', 'Biometric (opt-in)', 'Civil registry cross-check', 'Officer in-person'];
  return (
    <CitizenFrame archetype="identity" code="ID-VER-06" title="Identity Verification"
      subtitle="multi-method verification — citizen chooses">
      <CitizenKpi items={[
        { label: 'Methods available', value: methods.length },
        { label: 'Median verification', value: `${Math.round(wave('iv:m', ts, 4, 18))}h`, tone: 'ok' },
        { label: 'Rejection appeal rate', value: `${Math.round(wave('iv:a', ts, 86, 99))}%`, tone: 'ok' },
        { label: 'Privacy preserved', value: '✓', tone: 'ok' },
      ]} />
      <CitizenRule label="methods" />
      {methods.map((m, i) => {
        const v = Math.round(wave(`iv:${i}`, ts, 78, 99));
        return <CitizenBar key={m} label={m} pct={v} tone={v >= 90 ? 'ok' : 'info'} tail={`${v}% success`} />;
      })}
    </CitizenFrame>
  );
}

export function BiometricDoctrine({ id, now }: { id: string; now: number }) {
  void id; void now;
  return (
    <CitizenFrame archetype="identity" code="ID-BIO-07" title="Biometric Doctrine"
      subtitle="opt-in · revocable · never coercive">
      <CitizenKpi items={[
        { label: 'Mandatory biometrics', value: '✗ never', tone: 'ok' },
        { label: 'Storage', value: 'on-device', tone: 'ok' },
        { label: 'Mass collection', value: '✗ prohibited', tone: 'ok' },
        { label: 'Independent audit', value: '✓ annual', tone: 'ok' },
      ]} />
      <CitizenCallout kicker="coercion-free" body="A biometric may be requested but never required to access a constitutional service. Mass biometric collection without a constitutional rationale is automatically void." />
    </CitizenFrame>
  );
}

export function HealthWallet({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  return (
    <CitizenFrame archetype="health" code="HW-WAL-08" title="Health Wallet"
      subtitle="personal health · your records · your control">
      <CitizenKpi items={[
        { label: 'Linked providers', value: Math.round(wave('hw:p', ts, 1, 4)), tone: 'info' },
        { label: 'Active prescriptions', value: Math.round(wave('hw:r', ts, 0, 3)) },
        { label: 'Upcoming visits', value: Math.round(wave('hw:v', ts, 0, 2)) },
        { label: 'Break-glass access', value: '0 active', tone: 'ok' },
      ]} />
      <CitizenCallout kicker="EHR doctrine" body="Your EHR belongs to you. Providers see only what you consent to share. Break-glass emergency access is logged and reviewed within 72h." />
    </CitizenFrame>
  );
}

export function HealthRecords({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  const records = ['Vital signs (last visit)', 'Immunisations', 'Allergies', 'Active conditions', 'Medications', 'Imaging archive'];
  return (
    <CitizenFrame archetype="health" code="HW-REC-09" title="Health Records"
      subtitle="citizen-owned electronic health record">
      <CitizenKpi items={[
        { label: 'Records (total)', value: Math.round(wave('hr:t', ts, 48, 240)), tone: 'info' },
        { label: 'Provider shares', value: '✓ consent-bound', tone: 'ok' },
        { label: 'Export formats', value: 'FHIR · PDF · JSON', tone: 'ok' },
        { label: 'Tamper-evident', value: '✓', tone: 'ok' },
      ]} />
      <CitizenRule label="categories" />
      {records.map((r, i) => (
        <div key={r} className="grid grid-cols-[220px_1fr_80px] gap-3 border-b py-1 text-[11px]"
          style={{ borderColor: PORTAL_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: PORTAL_DS.ink }}>{r}</span>
          <span style={{ color: PORTAL_DS.inkMut }}>{Math.round(wave(`hr:r:${i}`, ts, 1, 24))} entries</span>
          <span className="text-right tabular-nums" style={{ color: PORTAL_DS.jade }}>✓ owned</span>
        </div>
      ))}
    </CitizenFrame>
  );
}

export function Appointments({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  return (
    <CitizenFrame archetype="health" code="HW-APP-10" title="Appointments"
      subtitle="book, reschedule, cancel — no penalty">
      <CitizenKpi items={[
        { label: 'Upcoming', value: Math.round(wave('ap:u', ts, 0, 3)), tone: 'info' },
        { label: 'Median wait', value: `${Math.round(wave('ap:w', ts, 2, 14))}d` },
        { label: 'Same-day options', value: '✓ available', tone: 'ok' },
        { label: 'Cancellation fees', value: '✗ none', tone: 'ok' },
      ]} />
    </CitizenFrame>
  );
}

export function LearnerTwin({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  return (
    <CitizenFrame archetype="education" code="ED-LRN-11" title="Learner Twin"
      subtitle="federated · privacy-preserving · never profiled">
      <CitizenKpi items={[
        { label: 'Subjects active', value: Math.round(wave('lt:s', ts, 3, 8)), tone: 'info' },
        { label: 'Hours / week', value: `${Math.round(wave('lt:h', ts, 4, 22))}h` },
        { label: 'Cognitive profiling', value: '✗ prohibited', tone: 'ok' },
        { label: 'Open attestation', value: '✓ open model', tone: 'ok' },
      ]} />
      <CitizenCallout kicker="federated learning" body="Your Learner Twin runs on your device. The state cannot read individual learning traces. Only consented aggregates inform curriculum." />
    </CitizenFrame>
  );
}

export function CredentialsPortfolio({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  const credentials = ['Secondary diploma', 'Vocational certificate (Electrical)', 'University degree (BSc)', 'Professional licence'];
  return (
    <CitizenFrame archetype="education" code="ED-CRD-12" title="Credentials Portfolio"
      subtitle="verifiable, portable, lifetime">
      <CitizenKpi items={[
        { label: 'Credentials', value: credentials.length, tone: 'info' },
        { label: 'Verifiable', value: '✓ all', tone: 'ok' },
        { label: 'Portable', value: '✓ open standards', tone: 'ok' },
        { label: 'Issuer audit', value: '✓ annual', tone: 'ok' },
      ]} />
      <CitizenRule label="portfolio" />
      {credentials.map((c, i) => (
        <div key={c} className="grid grid-cols-[1fr_120px] gap-3 border-b py-1 text-[11px]"
          style={{ borderColor: PORTAL_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: PORTAL_DS.ink }}>{c}</span>
          <span className="text-right tabular-nums" style={{ color: PORTAL_DS.inkMut }}>{Math.round(wave(`cp:c:${i}`, ts, 1, 12))}y ago</span>
        </div>
      ))}
    </CitizenFrame>
  );
}
