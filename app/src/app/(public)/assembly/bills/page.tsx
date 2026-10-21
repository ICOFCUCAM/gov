// Public — the legislature's bills and acts (lib/legislature/register.ts
// publicBills()): what the chamber's approved procedure makes public, from
// the point it sets (introduced, passed or enacted). Nothing appears until
// the legislature has approved its procedure; never who on the staff
// recorded a step.

import Link from 'next/link';
import { PublicDocument } from '@/apps/_shared/public/PublicDocument';
import { publicBills } from '@/lib/legislature/register';
import { billStatus } from '@/lib/legislature/public-wording';
import { siteMessages } from '@/lib/nation/registry';
import { visitorLocale } from '@/apps/_shared/public/site-props';
import { t as fill } from '@/lib/i18n';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Bills and acts' };

export default async function BillsPage() {
  const t = siteMessages(await visitorLocale());
  const bills = publicBills();
  return (
    <PublicDocument kicker={t.billsTitle} title={t.billsTitle} intro={t.billsIntro}>
      {bills.length ? (
        <ul className="space-y-4">
          {bills.map(b => (
            <li key={b.id} className="rounded border border-slate-300 bg-white p-4">
              <h2 className="text-[17px] font-semibold"><Link className="underline underline-offset-2" href={`/assembly/bills/${encodeURIComponent(b.id)}`}>{b.number} — {b.title}</Link></h2>
              <p className="mt-1 text-[13px] text-slate-700">
                {fill(t.billsStatus, { status: billStatus(t, b.state) })} · {fill(t.billsStage, { stage: b.stage })}
                {b.sponsor ? ` · ${fill(t.billsSponsor, { sponsor: b.sponsor })}` : ''}
              </p>
              {b.summary ? <p className="mt-2 text-[14px]">{b.summary}</p> : null}
            </li>
          ))}
        </ul>
      ) : <p className="text-[14px]">{t.billsNone}</p>}
    </PublicDocument>
  );
}
