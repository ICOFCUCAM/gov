// Public — one service of the catalogue (plan step I13): its published
// version only (never who proposed it), the institution responsible, the law
// it rests on, who can use it, what is needed, the fee as the approved rule
// sets it (or that it is not set), the ways to apply, the stages of its
// procedure, what to do when one disagrees, and the journey step by step,
// each step ready or not available yet, worked out from the records now. An
// open disruption is shown at the top. Applying online goes through the
// citizen's own sign-in (/wallet/applications).

import * as React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PublicDocument } from '@/apps/_shared/public/PublicDocument';
import { getService, publicService } from '@/lib/frontdoor/catalogue';
import { serviceJourney } from '@/lib/frontdoor/journey';
import { openDisruptions } from '@/lib/frontdoor/service-management';
import { samplesAllowed } from '@/lib/ops/mode';
import { siteMessages } from '@/lib/nation/registry';
import { visitorLocale } from '@/apps/_shared/public/site-props';
import { t as fill } from '@/lib/i18n';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Public service' };

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return <><dt className="font-semibold text-slate-800">{label}</dt><dd className="mb-2 text-slate-800">{children}</dd></>;
}

export default async function ServicePage({ params }: { params: Promise<{ id: string }> }) {
  const t = siteMessages(await visitorLocale());
  const { id } = await params;
  const e = getService(decodeURIComponent(id));
  const s = e && (!e.sample || samplesAllowed()) ? publicService(e) : null;
  if (!s) notFound();
  const steps = serviceJourney(s.id)?.steps ?? [];
  const disruptions = openDisruptions(s.id);
  const takes = (s.status === 'active' || s.status === 'pilot') && s.channels.some(c => c.key === 'online');
  return (
    <PublicDocument kicker={t.servicesTitle} title={s.name} intro={s.description}>
      <p className="mb-4 text-[14px]"><Link href="/services" className="underline underline-offset-2">{t.servicesAll}</Link></p>
      {disruptions.map((d, i) => <p key={i} role="status" className="mb-4 rounded border border-slate-500 bg-white p-3 text-[14px]"><strong>{t.servicesDisrupted}</strong>: {d.impact}{d.updates.length ? ` · ${d.updates.at(-1)!.text}` : ''}</p>)}
      <p className="mb-4 text-[15px]"><strong>{t.servicesStates[s.status] ?? s.statusLabel}</strong> · {fill(t.servicesOwner, { owner: s.owner })}{s.sample ? <> · <em>{t.servicesSample}</em></> : null}</p>
      {s.reasons.length ? <p className="mb-4 text-[14px]">{fill(t.servicesWhy, { reasons: s.reasons.join('; ') })}</p> : null}
      {takes ? <p className="mb-6"><Link href={`/wallet/applications?service=${encodeURIComponent(s.id)}`} className="inline-block rounded border border-slate-700 bg-slate-800 px-4 py-2 text-[14px] font-semibold text-white">{t.servicesApply}</Link></p> : null}
      <dl className="text-[14px]">
        <Row label={t.servicesLegal}>{s.legalBasis.map(c => `${c.title ?? c.instrument} ${c.num ?? c.eId}`).join('; ')}</Row>
        {s.eligibility ? <Row label={t.servicesEligibility}>{s.eligibility}</Row> : null}
        {s.evidence.length ? <Row label={t.servicesEvidence}><ul className="list-disc ps-5">{s.evidence.map(x => <li key={x}>{x}</li>)}</ul></Row> : null}
        <Row label={t.servicesFee}>{!s.fee ? t.servicesFeeNone : s.fee.approved ? fill(t.servicesFeeRule, { rule: s.fee.rule }) : fill(t.servicesFeeUnset, { rule: s.fee.rule })}</Row>
        <Row label={t.servicesChannels}>{s.channels.map(c => c.label).join(', ')}</Row>
        {s.stages.length ? <Row label={t.servicesSteps}>{s.stages.join(' → ')}</Row> : null}
        {s.outcome ? <Row label={t.servicesOutcome}>{s.outcome}</Row> : null}
        {s.review ? <Row label={t.servicesReview}>{s.review}</Row> : null}
        {s.languages.length ? <Row label={t.servicesLanguages}>{s.languages.join(', ')}</Row> : null}
        {s.accessibility ? <Row label={t.servicesAccess}>{s.accessibility}</Row> : null}
        {s.contact ? <Row label={t.servicesContact}>{s.contact}</Row> : null}
      </dl>
      <section aria-labelledby="journey" className="mt-6">
        <h2 id="journey" className="mb-2 text-[17px] font-semibold text-slate-800">{t.servicesJourney}</h2>
        <ol className="list-decimal space-y-2 ps-5 text-[14px]">
          {steps.filter(x => x.state !== 'not-applicable').map(x => <li key={x.key}><strong>{x.label}</strong> · {x.state === 'ready' ? t.servicesReady : t.servicesNotConnected}<span className="block text-slate-700">{x.detail}</span></li>)}
        </ol>
      </section>
      <p className="mt-6 text-[13px] text-slate-700">{fill(t.servicesVerified, { date: s.verifiedAt.slice(0, 10) })}</p>
    </PublicDocument>
  );
}
