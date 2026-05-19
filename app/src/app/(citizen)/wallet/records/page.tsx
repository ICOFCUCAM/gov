'use client';

import * as React from 'react';
import Link from 'next/link';
import { PhoneShell } from '@/components/ui/PhoneShell';
import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { Button } from '@/components/ui/Button';

const accessLog = [
  { who: 'Dr. K. Mwangi', where: 'Kiambu Hospital', when: 'Today, 09:02', purpose: 'pneumococcal vaccination follow-up' },
  { who: 'Nurse A. Hussein', where: 'Mobile clinic', when: 'Today, 08:47', purpose: 'vital signs review' },
  { who: 'Pharmacist L. Wamboi', where: 'Kiambu Pharmacy', when: 'Today, 09:30', purpose: 'medication reconciliation' },
  { who: 'Records audit', where: 'Ministry of Health', when: 'Yesterday, 23:00', purpose: 'nightly integrity check' },
  { who: 'Dr. S. Ahmed', where: 'National Cardiac Center', when: 'May 12, 14:20', purpose: 'referral review' },
];

const credentials: Record<string, string[]> = {
  "Driver's license": ['Class B · valid to 2029-03', 'Issued by National Transport Authority', 'No endorsements'],
  'Education credentials (3)': ['BSc Nursing — 2014', 'Diploma, Public Health — 2016', 'CPR certification — 2025'],
  'Professional license (Nurse)': ['Registered Nurse · RN-44213', 'Status: active', 'Renews 2026-09'],
  'Vaccination records (12)': ['Influenza — 2025-05-10', 'Pneumococcal — 2025-05-14', '+10 earlier doses on file'],
  'Civil records (marriage)': ['Marriage certificate · 2018', 'Registered, Nairobi civil registry'],
};
const health: Record<string, string[]> = {
  'Conditions, allergies': ['Penicillin allergy (severe)', 'Hypertension — managed', 'No chronic infections'],
  'Medications': ['Atorvastatin 40mg — nightly', 'Amlodipine 5mg — morning', 'Next refill in 12 days'],
};

export default function RecordsPage() {
  const [open, setOpen] = React.useState<string | null>(null);
  const [shareCode, setShareCode] = React.useState<string | null>(null);
  const [showSel, setShowSel] = React.useState(false);
  const [showHow, setShowHow] = React.useState(false);
  const [fullLog, setFullLog] = React.useState(false);

  const toggle = (k: string) => setOpen(o => (o === k ? null : k));
  const detailOf = (k: string) => credentials[k] ?? health[k] ?? [];
  const shownLog = fullLog ? accessLog : accessLog.slice(0, 3);

  return (
    <main className="bg-bg min-h-screen">
      <PhoneShell
        activeTab="/wallet/records"
        header={
          <>
            <Link href="/wallet" className="underline underline-offset-2">← Home</Link>
            <strong>Records</strong>
            <span />
          </>
        }
      >
        <Card tight>
          <h3 className="font-semibold mb-1">Identity</h3>
          <p><strong>Amina Hassan Mwangi</strong></p>
          <div className="text-sm text-ink-muted">Born 14.03.1992 (Nairobi)</div>
          <div className="text-sm text-ink-muted">CivicID active</div>
          <div className="flex gap-3 mt-3">
            <Button variant="secondary" onClick={() => { setShowSel(s => !s); setShowHow(false); }}>Show selectively</Button>
            <Button variant="ghost" onClick={() => { setShowHow(s => !s); setShowSel(false); }}>How selective disclosure works</Button>
          </div>
          {showSel ? (
            <div className="mt-3 rounded-[8px] border border-line p-3 text-sm">
              <div className="mb-1 font-medium text-ink">Disclose only what's asked</div>
              <ul className="space-y-1 text-ink-muted">
                <li>✓ Over 18 — yes (date of birth stays hidden)</li>
                <li>✓ Resident of Nairobi — yes (address stays hidden)</li>
                <li>✓ Licensed nurse — yes (license number stays hidden)</li>
              </ul>
            </div>
          ) : null}
          {showHow ? (
            <p className="mt-3 rounded-[8px] border border-line p-3 text-sm text-ink-muted">
              Selective disclosure proves a fact (e.g. &ldquo;over 18&rdquo;) without revealing the
              underlying data. The verifier sees only the answer, signed by the state — never your full record.
            </p>
          ) : null}
        </Card>

        <section>
          <h3 className="font-semibold text-lg mb-2">Credentials</h3>
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
          <h3 className="font-semibold text-lg mb-2">Health</h3>
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
                onClick={() => setShareCode(`SHR-${Math.abs([...'amina:health'].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7)) % 1e6}`)}
                className="focus-ring underline underline-offset-2">Share with a clinician</button>
              {shareCode ? (
                <div className="mt-1 ml-3 text-sm text-ink">
                  One-time share code <code className="font-mono">{shareCode}</code> — valid 15 minutes, read-only,
                  logged below when used.
                </div>
              ) : null}
            </li>
          </ul>
        </section>

        <hr className="border-line" />

        <section id="access-log">
          <h3 className="font-semibold text-lg mb-1">Who has looked at my records?</h3>
          <p className="text-sm text-ink-muted mb-3">
            All access is logged. You see who, when, and why.
          </p>
          <div className="space-y-2">
            {shownLog.map((a, i) => (
              <Card tight key={i}>
                <strong>{a.who}</strong> — {a.where}
                <div className="text-sm text-ink-muted">
                  {a.when} — {a.purpose}
                </div>
                <Pill>With your consent</Pill>
              </Card>
            ))}
          </div>
          {accessLog.length > 3 ? (
            <p className="mt-3">
              <button type="button" onClick={() => setFullLog(f => !f)}
                className="focus-ring text-link underline underline-offset-2">
                {fullLog ? 'Show less' : `Show full access log (${accessLog.length}) →`}
              </button>
            </p>
          ) : null}
        </section>
      </PhoneShell>
    </main>
  );
}
