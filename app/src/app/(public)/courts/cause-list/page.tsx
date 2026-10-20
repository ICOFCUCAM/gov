// Public — the court cause list (lib/courts/hearings.ts): hearings scheduled
// in the coming week by case number, court, kind, time and room. Parties and
// what a case is about are never shown here; a court publishes more under its
// own rules through its public site.

import { PublicDocument } from '@/apps/_shared/public/PublicDocument';
import { causeList } from '@/lib/courts/hearings';
import { siteMessages } from '@/lib/nation/registry';
import { visitorLocale } from '@/apps/_shared/public/site-props';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Court cause list' };

export default async function CauseListPage() {
  const t = siteMessages(await visitorLocale());
  const list = causeList(new Date().toISOString().slice(0, 10), 7);
  return (
    <PublicDocument kicker={t.causeListTitle} title={t.causeListTitle} intro={t.causeListIntro}>
      {list.length ? (
        <table className="w-full border-collapse text-[14px]">
          <thead><tr className="border-b border-slate-400 text-start"><th className="py-2 pe-3 text-start">{t.causeListWhen}</th><th className="py-2 pe-3 text-start">{t.causeListCase}</th><th className="py-2 pe-3 text-start">{t.causeListCourt}</th><th className="py-2 pe-3 text-start">{t.causeListKind}</th><th className="py-2 text-start">{t.causeListRoom}</th></tr></thead>
          <tbody>{list.map((h, i) => <tr key={`${h.caseRef}-${i}`} className="border-b border-slate-200"><td className="py-2 pe-3 tabular-nums">{h.at.replace('T', ' ')}</td><td className="py-2 pe-3 font-mono">{h.caseRef}</td><td className="py-2 pe-3">{h.court}</td><td className="py-2 pe-3">{h.kind}</td><td className="py-2">{h.room ?? ''}</td></tr>)}</tbody>
        </table>
      ) : <p className="text-[14px]">{t.causeListNone}</p>}
    </PublicDocument>
  );
}
