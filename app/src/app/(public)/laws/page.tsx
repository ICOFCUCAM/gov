// Public — the nation's laws in force (lib/law/register.ts): confirmed
// versions only, with the dates each applies and every provision. Recorded,
// unconfirmed and withdrawn versions never appear here. The Akoma Ntoso file
// of each version can be downloaded.

import { PublicDocument } from '@/apps/_shared/public/PublicDocument';
import { listInstruments } from '@/lib/law/register';
import { siteMessages } from '@/lib/nation/registry';
import { visitorLocale } from '@/apps/_shared/public/site-props';
import { t as fill } from '@/lib/i18n';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Laws in force' };

export default async function LawsPage() {
  const t = siteMessages(await visitorLocale());
  const laws = listInstruments({ state: 'confirmed' })
    .map(i => ({ ...i, versions: i.versions.filter(v => v.state === 'confirmed').sort((a, b) => b.dates.inForce.localeCompare(a.dates.inForce)) }))
    .sort((a, b) => a.title.localeCompare(b.title));
  return (
    <PublicDocument kicker={t.lawsTitle} title={t.lawsTitle} intro={t.lawsIntro}>
      {laws.length ? laws.map(i => (
        <section key={i.id} aria-labelledby={`law-${i.id}`} className="mb-8">
          <h2 id={`law-${i.id}`} className="text-[18px] font-semibold">{i.title}</h2>
          <p className="text-[13px] text-slate-600">{i.issuingAuthority} · {i.id}</p>
          {i.versions.map((v, n) => (
            <details key={v.id} open={n === 0} className="mt-3 rounded border border-slate-300 bg-white p-3">
              <summary className="cursor-pointer text-[14px] font-semibold">
                {fill(t.lawsInForceFrom, { date: v.dates.inForce })}{v.dates.ceased ? ` · ${fill(t.lawsCeased, { date: v.dates.ceased })}` : ''} · {v.language}
              </summary>
              <ol className="mt-2 space-y-2 text-[14px]">
                {v.provisions.map(p => (
                  <li key={p.eId} id={`${v.id}-${p.eId}`} className={p.parent ? 'ms-4' : ''}>
                    <strong>{p.num}</strong>{p.heading ? ` ${p.heading}` : ''}{p.text && p.text !== p.heading ? <span className="block">{p.text}</span> : null}
                  </li>
                ))}
              </ol>
              <a className="mt-2 inline-block text-[13px] underline underline-offset-2" href={`/api/law/export?${new URLSearchParams({ instrument: i.id, version: v.id })}`}>Akoma Ntoso</a>
            </details>
          ))}
        </section>
      )) : <p className="text-[14px]">{t.lawsNone}</p>}
    </PublicDocument>
  );
}
