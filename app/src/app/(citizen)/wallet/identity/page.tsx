import Link from 'next/link';
import { PhoneShell } from '@/components/ui/PhoneShell';
import { Card } from '@/components/ui/Card';
import { Plain } from '@/components/ui/Plain';
import { SelectiveDisclosure } from './SelectiveDisclosure';
import { getSession } from '@/lib/data/store';

import { nationMessages } from '@/lib/nation/registry';
import { t as fill } from '@/lib/i18n';
import * as React from 'react';
export default function IdentityPage() {
  const m = nationMessages();
  const r = m.records;
  const session = getSession();
  const c = session.citizen!;

  return (
    <main className="bg-bg min-h-screen">
      <PhoneShell
        activeTab="/wallet"
        header={
          <>
            <Link href="/wallet" className="underline underline-offset-2">← {m.common.home}</Link>
            <strong>{r.digitalIdentity}</strong>
            <span />
          </>
        }
      >
        <Card tight>
          <h3 className="font-semibold mb-1">CivicID</h3>
          <p><strong>{c.displayName}</strong></p>
          <div className="text-sm text-ink-muted">{fill(r.municipality, { place: c.municipality })}</div>
          <div className="text-sm text-ink-muted">{r.statusActive}</div>
        </Card>

        <Plain>
          {r.intro.split('{not}').map((part, i) => (
            <React.Fragment key={i}>{i > 0 ? <strong>{r.introNot}</strong> : null}{part}</React.Fragment>
          ))}
        </Plain>

        <section>
          <h3 className="font-semibold text-lg mb-2">{r.shareDetails}</h3>
          <SelectiveDisclosure subjectName={c.displayName} />
        </section>

        <section>
          <h3 className="font-semibold text-lg mb-2">{r.howThisWorks}</h3>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            <li>{r.how1}</li>
            <li>{r.how2}</li>
            <li>{r.how3}</li>
            <li>{r.how4}</li>
          </ul>
        </section>
      </PhoneShell>
    </main>
  );
}
