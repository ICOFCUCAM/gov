// Public — check an organisation in the government's public registers
// (lib/organisations/register.ts): registered companies, licences,
// accredited universities and the registers the nation adds. A plain form
// (no script): choose the register, type a name or register number, and see
// each match's decided standing, validity and conditions, with its
// certificate's check link. Applications and refusals never appear;
// representatives are never shown. Below it, the same check of regulated
// health professionals (lib/professions/register.ts): name, profession,
// number, standing and conditions, never the person reference.

import { PublicDocument } from '@/apps/_shared/public/PublicDocument';
import { registerTypes, checkStanding } from '@/lib/organisations/register';
import { checkProfessional } from '@/lib/professions/register';
import { siteMessages } from '@/lib/nation/registry';
import { visitorLocale } from '@/apps/_shared/public/site-props';
import { t as fill } from '@/lib/i18n';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Public registers' };

export default async function RegistersPage({ searchParams }: { searchParams: Promise<{ register?: string; q?: string; pq?: string; pn?: string }> }) {
  const t = siteMessages(await visitorLocale());
  const sp = await searchParams;
  const registers = registerTypes().filter(r => r.publicCheck);
  const register = registers.some(r => r.key === sp.register) ? sp.register! : registers[0]?.key ?? '';
  const q = (sp.q ?? '').slice(0, 120);
  const answer = q ? checkStanding(register, q) : null;
  const pq = (sp.pq ?? '').slice(0, 120);
  const pn = (sp.pn ?? '').slice(0, 40);
  // One person at a time: the full name, optionally narrowed by the registration number (never the number alone).
  const people = pq ? checkProfessional({ name: pq, number: pn }) : null;
  return (
    <PublicDocument kicker={t.registersTitle} title={t.registersTitle} intro={t.registersIntro}>
      {registers.length ? (
        <form method="get" action="/registers" className="mb-6 flex flex-wrap items-end gap-3 rounded border border-slate-300 bg-white p-4">
          <label className="flex flex-col text-[14px]">{t.registersRegister}
            <select name="register" defaultValue={register} className="mt-1 rounded border border-slate-400 px-2 py-1.5">
              {registers.map(r => <option key={r.key} value={r.key}>{r.title}</option>)}
            </select>
          </label>
          <label className="flex min-w-[14rem] flex-1 flex-col text-[14px]">{t.registersQuery}
            <input name="q" defaultValue={q} minLength={3} maxLength={120} required className="mt-1 rounded border border-slate-400 px-2 py-1.5" />
          </label>
          <button type="submit" className="rounded border border-slate-700 bg-slate-800 px-4 py-1.5 text-[14px] font-semibold text-white">{t.registersCheck}</button>
        </form>
      ) : <p className="text-[14px]">{t.registersNone}</p>}
      {answer && 'error' in answer ? <p role="status" className="text-[14px]">{answer.error}</p> : null}
      {answer && !('error' in answer) ? (
        answer.length ? (
          <ul className="space-y-3" aria-live="polite">
            {answer.map(o => (
              <li key={o.number} className="rounded border border-slate-300 bg-white p-4">
                <h2 className="text-[17px] font-semibold">{o.name}</h2>
                <p className="text-[13px] text-slate-700">{o.number} · {o.kind}{o.region ? ` · ${o.region}` : ''}</p>
                {o.standings.map(s => (
                  <p key={s.register} className="mt-2 text-[14px]">
                    <strong>{t.registersStates[s.state] ?? s.state}</strong>{s.validUntil ? ` · ${fill(t.registersValidUntil, { date: s.validUntil })}` : ''}
                    {s.conditions.length ? <span className="block">{t.registersConditions}: {s.conditions.join('; ')}</span> : null}
                    {s.certificate ? <a className="block underline underline-offset-2" href={`/verify/${encodeURIComponent(s.certificate)}`}>{s.certificate}</a> : null}
                  </p>
                ))}
              </li>
            ))}
          </ul>
        ) : <p role="status" className="text-[14px]">{t.registersNoMatch}</p>
      ) : null}
      <section aria-labelledby="professionals" className="mt-10">
        <h2 id="professionals" className="text-[20px] font-semibold">{t.professionalsTitle}</h2>
        <p className="mb-3 text-[14px]">{t.professionalsIntro}</p>
        <form method="get" action="/registers#professionals" className="mb-6 flex flex-wrap items-end gap-3 rounded border border-slate-300 bg-white p-4">
          <label className="flex min-w-[14rem] flex-1 flex-col text-[14px]">{t.professionalsQuery}
            <input name="pq" defaultValue={pq} minLength={5} maxLength={120} required className="mt-1 rounded border border-slate-400 px-2 py-1.5" />
          </label>
          <label className="flex min-w-[10rem] flex-col text-[14px]">{t.professionalsNumber}
            <input name="pn" defaultValue={pn} maxLength={40} className="mt-1 rounded border border-slate-400 px-2 py-1.5" />
          </label>
          <button type="submit" className="rounded border border-slate-700 bg-slate-800 px-4 py-1.5 text-[14px] font-semibold text-white">{t.registersCheck}</button>
        </form>
        {people ? people.length ? (
          <ul className="space-y-3" aria-live="polite">
            {people.map(p => (
              <li key={`${p.name}-${p.number ?? p.profession}`} className="rounded border border-slate-300 bg-white p-4">
                <h3 className="text-[17px] font-semibold">{p.name}</h3>
                <p className="text-[13px] text-slate-700">{p.number ? `${p.number} · ` : ''}{p.professionTitle}</p>
                <p className="mt-2 text-[14px]"><strong>{t.registersStates[p.state] ?? p.state}</strong>{p.validUntil ? ` · ${fill(t.registersValidUntil, { date: p.validUntil })}` : ''}
                  {p.conditions?.length ? <span className="block">{t.registersConditions}: {p.conditions.join('; ')}</span> : null}</p>
              </li>
            ))}
          </ul>
        ) : <p role="status" className="text-[14px]">{t.professionalsNoMatch}</p> : null}
      </section>
    </PublicDocument>
  );
}
