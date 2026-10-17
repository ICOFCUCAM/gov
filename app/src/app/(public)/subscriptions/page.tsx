// Public — email updates from a public site: the answer after subscribing, and
// the page behind the links in the emails. A link only shows what it will do;
// the button makes the change, so mail scanners that open links change nothing.

import Link from 'next/link';
import { PublicDocument } from '@/apps/_shared/public/PublicDocument';
import { SITE_IDS, siteContent } from '@/lib/public-sites';
import { publishedOverride } from '@/lib/data/site-editorial';
import { fillDeep, siteTokens } from '@/lib/public-sites/tokens';
import { lookupToken } from '@/lib/data/site-subscriptions';
import { siteMessages } from '@/lib/nation/registry';
import { visitorLocale } from '@/apps/_shared/public/site-props';
import { t as fill } from '@/lib/i18n';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Email updates', robots: { index: false } };

const INK = '#0b1a2c';

export default function SubscriptionsPage({ searchParams }: { searchParams?: { token?: string; action?: string; status?: string; site?: string } }) {
  const t = siteMessages(visitorLocale());
  const token = searchParams?.token ?? '';
  const action = searchParams?.action === 'unsubscribe' ? 'unsubscribe' : 'confirm';
  const link = token ? lookupToken(token) : null;
  const siteId = link?.siteId ?? (searchParams?.site && SITE_IDS.includes(searchParams.site) ? searchParams.site : undefined);
  const name = siteId ? fillDeep(siteContent(siteId, publishedOverride(siteId)).institution.name, siteTokens(new Date().getFullYear())) : undefined;

  const MESSAGES: Record<string, string> = {
    check: t.subscribeCheck, invalid: t.subscribeInvalid, busy: t.subscribeBusy,
    confirmed: t.confirmed, unsubscribed: t.unsubscribed,
  };
  const status = searchParams?.status && MESSAGES[searchParams.status] ? searchParams.status : undefined;
  // "invalid" after a link is a bad link; after the form it is a bad address.
  const message = status === 'invalid' && !siteId ? t.linkInvalid : status ? MESSAGES[status] : undefined;

  return (
    <PublicDocument kicker={name ?? t.subscriptionTitle} title={t.subscriptionTitle} intro={t.subscribeNote}>
      {token ? (
        link && !(action === 'confirm' && link.status === 'confirmed') ? (
          <form action="/api/subscriptions" method="post" className="rounded-lg border border-slate-200 bg-white p-5">
            <input type="hidden" name="token" value={token} />
            <input type="hidden" name="action" value={action} />
            <p className="text-[15px] text-slate-800">{fill(action === 'confirm' ? t.confirmPrompt : t.unsubscribePrompt, { name: name ?? '' })}</p>
            <button type="submit" className="mt-4 rounded-md px-5 py-2.5 text-[14px] font-semibold text-white" style={{ background: INK }}>
              {action === 'confirm' ? t.confirmButton : t.unsubscribeButton}
            </button>
          </form>
        ) : <p role="status" className="rounded-lg border border-slate-200 bg-white p-5 text-[15px] text-slate-800">{link ? t.confirmed : t.linkInvalid}</p>
      ) : message ? (
        <p role="status" className="rounded-lg border border-slate-200 bg-white p-5 text-[15px] text-slate-800">{message}</p>
      ) : null}
      {siteId ? <p className="text-[14px]"><Link href={`/${siteId}`} className="font-semibold underline underline-offset-2" style={{ color: INK }}>{name}</Link></p> : null}
    </PublicDocument>
  );
}
