'use client';

import * as React from 'react';
import Link from 'next/link';
import { PhoneShell } from '@/components/ui/PhoneShell';
import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { Button } from '@/components/ui/Button';
import { civicRef } from '@/lib/civic-ref';
import { DEMO_CITIZEN, DEMO_OFFICERS, homePlace, } from '@/lib/nation/persona';
import { nationMessages } from '@/lib/nation/registry';
import { t as fill } from '@/lib/i18n';
const accessLogFor = (home: string) => [
  { who: DEMO_OFFICERS.clinician, where: `${home} Hospital`, when: 'Today, 09:02', purpose: 'pneumococcal vaccination follow-up' },
  { who: 'Nurse A. Hussein', where: 'Mobile clinic', when: 'Today, 08:47', purpose: 'vital signs review' },
  { who: `Pharmacist ${DEMO_OFFICERS.pharmacist}`, where: `${home} Pharmacy`, when: 'Today, 09:30', purpose: 'medication reconciliation' },
  { who: 'Records audit', where: 'Ministry of Health', when: 'Yesterday, 23:00', purpose: 'nightly integrity check' },
  { who: 'Dr. S. Ahmed', where: 'National Cardiac Center', when: 'May 12, 14:20', purpose: 'referral review' },
];

const credentialsFor = (home: string): Record<string, string[]> => ({
  "Driver's license": ['Class B · valid to 2029-03', 'Issued by National Transport Authority', 'No endorsements'],
  'Education credentials (3)': ['BSc Nursing — 2014', 'Diploma, Public Health — 2016', 'CPR certification — 2025'],
  'Professional license (Nurse)': ['Registered Nurse · RN-44213', 'Status: active', 'Renews 2026-09'],
  'Vaccination records (12)': ['Influenza — 2025-05-10', 'Pneumococcal — 2025-05-14', '+10 earlier doses on file'],
  'Civil records (marriage)': ['Marriage certificate · 2018', `Registered, ${home} civil registry`],
});
const health: Record<string, string[]> = {
  'Conditions, allergies': ['Penicillin allergy (severe)', 'Hypertension — managed', 'No chronic infections'],
  'Medications': ['Atorvastatin 40mg — nightly', 'Amlodipine 5mg — morning', 'Next refill in 12 days'],
};

export default function RecordsPage() {
  const m = nationMessages();
  const r = m.records;
  const home = homePlace();
  const accessLog = accessLogFor(home);
  const credentials = credentialsFor(home);
  const [open, setOpen] = React.useState<string | null>(null);
  const [shareCode, setShareCode] = React.useState<string | null>(null);
  const [showSel, setShowSel] = React.useState(false);
  const [showHow, setShowHow] = React.useState(false);
  const [fullLog, setFullLog] = React.useState(false);

  const toggle = (k: string) => setOpen(o => (o === k ? null : k));
  const detailOf = (k: string) => credentials[k] ?? health[k] ?? [];
  const shownLog = fullLog ? accessLog : accessLog.slice(0, 3);

  return (
    <div className="bg-bg min-h-screen">
      <PhoneShell
        activeTab="/wallet/records"
        header={
          <>
            <Link href="/wallet" className="underline underline-offset-2">← {m.common.home}</Link>
            <strong>{m.common.records}</strong>
            <span />
          </>
        }
      >
        <Card tight>
          <h3 className="font-semibold mb-1">{r.identity}</h3>
          <p><strong>{DEMO_CITIZEN.name}</strong></p>
          <div className="text-sm text-ink-muted">{fill(r.born, { date: '14.03.1992', place: home })}</div>
          <div className="text-sm text-ink-muted">{r.civicIdActive}</div>
          <div className="flex gap-3 mt-3">
            <Button variant="secondary" onClick={() => { setShowSel(s => !s); setShowHow(false); }}>{r.showSelectively}</Button>
            <Button variant="ghost" onClick={() => { setShowHow(s => !s); setShowSel(false); }}>{r.howDisclosure}</Button>
          </div>
          {showSel ? (
            <div className="mt-3 rounded-[8px] border border-line p-3 text-sm">
              <div className="mb-1 font-medium text-ink">{r.discloseOnly}</div>
              <ul className="space-y-1 text-ink-muted">
                <li>✓ {r.over18}</li>
                <li>✓ {fill(r.resident, { place: home })}</li>
                <li>✓ {r.licensedNurse}</li>
              </ul>
            </div>
          ) : null}
          {showHow ? (
            <p className="mt-3 rounded-[8px] border border-line p-3 text-sm text-ink-muted">
              {r.disclosureExplain}
            </p>
          ) : null}
        </Card>

        <section>
          <h3 className="font-semibold text-lg mb-2">{r.credentials}</h3>
          <ul className="space-y-1">
            {Object.keys(credentials).map(k => (
              <li key={k}>
                <button type="button" onClick={() => toggle(k)} aria-expanded={open === k}
                  className="focus-ring underline underline-offset-2">{k}</button>
                {open === k ? (
                  <ul className="mt-1 ml-3 space-y-0.5 text-sm text-ink-muted">
                    {detailOf(k).map(d => <li key={d}>· {d}</li>)}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h3 className="font-semibold text-lg mb-2">{r.health}</h3>
          <ul className="space-y-1">
            {Object.keys(health).map(k => (
              <li key={k}>
                <button type="button" onClick={() => toggle(k)} aria-expanded={open === k}
                  className="focus-ring underline underline-offset-2">{k}</button>
                {open === k ? (
                  <ul className="mt-1 ml-3 space-y-0.5 text-sm text-ink-muted">
                    {detailOf(k).map(d => <li key={d}>· {d}</li>)}
                  </ul>
                ) : null}
              </li>
            ))}
            <li>
              <button type="button"
                onClick={() => setShareCode(civicRef('SHR', 'amina', 'health'))}
                className="focus-ring underline underline-offset-2">{r.shareClinician}</button>
              {shareCode ? (
                <div className="mt-1 ml-3 text-sm text-ink">
                  {r.shareCode.split('{code}').map((part, i) => (
                    <React.Fragment key={i}>{i > 0 ? <code className="font-mono">{shareCode}</code> : null}{part}</React.Fragment>
                  ))}
                </div>
              ) : null}
            </li>
          </ul>
        </section>

        <hr className="border-line" />

        <section id="access-log">
          <h3 className="font-semibold text-lg mb-1">{r.whoLooked}</h3>
          <p className="text-sm text-ink-muted mb-3">
            {r.allLogged}
          </p>
          <div className="space-y-2">
            {shownLog.map((a, i) => (
              <Card tight key={i}>
                <strong>{a.who}</strong> — {a.where}
                <div className="text-sm text-ink-muted">
                  {a.when} — {a.purpose}
                </div>
                <Pill>{r.withConsent}</Pill>
              </Card>
            ))}
          </div>
          {accessLog.length > 3 ? (
            <p className="mt-3">
              <button type="button" onClick={() => setFullLog(f => !f)}
                className="focus-ring text-link underline underline-offset-2">
                {fullLog ? r.showLess : fill(r.showFullLog, { count: accessLog.length })}
              </button>
            </p>
          ) : null}
        </section>
      </PhoneShell>
    </div>
  );
}
