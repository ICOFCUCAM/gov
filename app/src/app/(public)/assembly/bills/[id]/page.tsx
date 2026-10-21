// Public — one bill or act of the legislature (lib/legislature/register.ts
// publicBill()): every version of the text, the proceedings, votes (with
// names or counts only, as the chamber's procedure sets), amendments,
// committee reports, assent, commencement, publication and the clerk's
// certification. Not found when the chamber does not make it public.

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PublicDocument } from '@/apps/_shared/public/PublicDocument';
import { publicBill } from '@/lib/legislature/register';
import { billStatus, voteWording } from '@/lib/legislature/public-wording';
import { siteMessages } from '@/lib/nation/registry';
import { visitorLocale } from '@/apps/_shared/public/site-props';
import { t as fill } from '@/lib/i18n';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Bill' };

export default async function BillPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const b = publicBill(decodeURIComponent(id));
  if (!b) notFound();
  const t = siteMessages(await visitorLocale());
  const h2 = 'mt-2 text-[18px] font-semibold';
  return (
    <PublicDocument kicker={b.number} title={b.title} intro={[fill(t.billsStatus, { status: billStatus(t, b.state) }), fill(t.billsStage, { stage: b.stage }), b.sponsor ? fill(t.billsSponsor, { sponsor: b.sponsor }) : ''].filter(Boolean).join(' · ')}>
      <p className="text-[14px]"><Link className="underline underline-offset-2" href="/assembly/bills">{t.billsAll}</Link></p>
      {b.summary ? <p className="text-[15px]">{b.summary}</p> : null}
      {b.assent || b.publication || b.commencement || b.certified ? (
        <ul className="space-y-1 text-[14px]">
          {b.assent ? <li>{fill(b.assent.outcome === 'assented' ? t.billsAssent : t.billsAssentWithheld, { date: b.assent.date })}</li> : null}
          {b.publication ? <li>{fill(t.billsPublished, { number: b.publication.actNumber, reference: b.publication.reference, date: b.publication.date })}</li> : null}
          {b.commencement ? <li>{fill(t.billsInForce, { date: b.commencement })}</li> : null}
          {b.certified ? <li className="break-all text-[13px] text-slate-700">{fill(t.billsCertified, { date: b.certified.at.slice(0, 10), digest: b.certified.digest.slice(0, 16) })}</li> : null}
        </ul>
      ) : null}

      <section aria-labelledby="texts">
        <h2 id="texts" className={h2}>{t.billsTexts}</h2>
        {[...b.texts].reverse().map((v, n) => (
          <details key={v.n} open={n === 0} className="mt-3 rounded border border-slate-300 bg-white p-3">
            <summary className="cursor-pointer text-[14px] font-semibold">{fill(t.billsVersion, { n: v.n, label: v.label, date: v.date })}</summary>
            <ol className="mt-2 space-y-2 text-[14px]">
              {v.provisions.map(p => (
                <li key={p.eId} className={p.parent ? 'ms-4' : ''}><strong>{p.num}</strong>{p.heading ? ` ${p.heading}` : ''}{p.text && p.text !== p.heading ? <span className="block">{p.text}</span> : null}</li>
              ))}
            </ol>
            <a className="mt-2 inline-block text-[13px] underline underline-offset-2" href={`/api/legislature/bills/${encodeURIComponent(b.id)}/akn?version=${v.n}`}>Akoma Ntoso</a>
          </details>
        ))}
      </section>

      <section aria-labelledby="proceedings">
        <h2 id="proceedings" className={h2}>{t.billsRecord}</h2>
        <ol className="mt-2 space-y-1 text-[14px]">
          {b.journal.map((j, i) => <li key={i}><span className="tabular-nums">{j.date}</span> · {j.text}{j.corrected ? ` (${t.billsCorrected})` : ''}</li>)}
        </ol>
      </section>

      {b.votes?.length ? (
        <section aria-labelledby="votes">
          <h2 id="votes" className={h2}>{t.billsVotes}</h2>
          <ul className="mt-2 space-y-2 text-[14px]">
            {b.votes.map((v, i) => (
              <li key={i} className="rounded border border-slate-300 bg-white p-3">
                <p><span className="tabular-nums">{v.date}</span> · {v.stage} · {v.question}</p>
                <p className="font-semibold">{fill(t.billsVoteCounts, { yes: v.yes, no: v.no, abstain: v.abstain, result: voteWording(t, v.result) })}{v.corrected ? ` (${t.billsCorrected})` : ''}</p>
                {v.names?.length ? <p className="mt-1 text-[13px] text-slate-700">{v.names.map(m => `${m.name} (${m.vote})`).join(', ')}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {b.amendments.length ? (
        <section aria-labelledby="amendments">
          <h2 id="amendments" className={h2}>{t.billsAmendments}</h2>
          <ul className="mt-2 space-y-2 text-[14px]">
            {b.amendments.map(m => <li key={m.number}><strong>{m.number}</strong>{m.proposer ? ` · ${m.proposer}` : ''} · {m.outcome}<span className="block">{m.text}</span></li>)}
          </ul>
        </section>
      ) : null}

      {b.reports.length ? (
        <section aria-labelledby="reports">
          <h2 id="reports" className={h2}>{t.billsReports}</h2>
          <ul className="mt-2 space-y-2 text-[14px]">
            {b.reports.map((r, i) => <li key={i}><strong>{r.committee}</strong> · <span className="tabular-nums">{r.date}</span> · {r.recommendation}{r.reference ? ` · ${r.reference}` : ''}<span className="block">{r.summary}</span></li>)}
          </ul>
        </section>
      ) : null}
    </PublicDocument>
  );
}
