import Link from 'next/link';
import { PhoneShell } from '@/components/ui/PhoneShell';
import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { Button } from '@/components/ui/Button';

const accessLog = [
  {
    who: 'Dr. K. Mwangi',
    where: 'Kiambu Hospital',
    when: 'Today, 09:02',
    purpose: 'pneumococcal vaccination follow-up',
  },
  {
    who: 'Nurse A. Hussein',
    where: 'Mobile clinic',
    when: 'Today, 08:47',
    purpose: 'vital signs review',
  },
  {
    who: 'Pharmacist L. Wamboi',
    where: 'Kiambu Pharmacy',
    when: 'Today, 09:30',
    purpose: 'medication reconciliation',
  },
];

export default function RecordsPage() {
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
            <Button variant="secondary">Show selectively</Button>
            <Button variant="ghost">How selective disclosure works</Button>
          </div>
        </Card>

        <section>
          <h3 className="font-semibold text-lg mb-2">Credentials</h3>
          <ul className="space-y-1">
            <li><Link href="#" className="underline underline-offset-2">Driver's license</Link></li>
            <li><Link href="#" className="underline underline-offset-2">Education credentials (3)</Link></li>
            <li><Link href="#" className="underline underline-offset-2">Professional license (Nurse)</Link></li>
            <li><Link href="#" className="underline underline-offset-2">Vaccination records (12)</Link></li>
            <li><Link href="#" className="underline underline-offset-2">Civil records (marriage)</Link></li>
          </ul>
        </section>

        <section>
          <h3 className="font-semibold text-lg mb-2">Health</h3>
          <ul className="space-y-1">
            <li><Link href="#" className="underline underline-offset-2">Conditions, allergies</Link></li>
            <li><Link href="#" className="underline underline-offset-2">Medications</Link></li>
            <li><Link href="#" className="underline underline-offset-2">Share with a clinician</Link></li>
          </ul>
        </section>

        <hr className="border-line" />

        <section id="access-log">
          <h3 className="font-semibold text-lg mb-1">Who has looked at my records?</h3>
          <p className="text-sm text-ink-muted mb-3">
            All access is logged. You see who, when, and why.
          </p>
          <div className="space-y-2">
            {accessLog.map((a, i) => (
              <Card tight key={i}>
                <strong>{a.who}</strong> — {a.where}
                <div className="text-sm text-ink-muted">
                  {a.when} — {a.purpose}
                </div>
                <Pill>With your consent</Pill>
              </Card>
            ))}
          </div>
          <p className="mt-3">
            <Link href="#" className="text-link underline underline-offset-2">
              Show full access log →
            </Link>
          </p>
        </section>
      </PhoneShell>
    </main>
  );
}
