'use client';

// The education register (lib/education/register.ts) for the education
// authority: counts; an institution's inspections and returns, with a form to
// record a return it reported; a qualification by number or a holder's
// qualifications (personal: auditors give a purpose, every search is in the
// access log). School registration, inspections and qualifications are cases
// under approved procedures; the schools themselves are organisations.

import * as React from 'react';
import Link from 'next/link';
import { Section } from '@/components/ui/DataSystem';
import { Button } from '@/components/ui/Button';
import { SignalTag } from '@/components/ui/SignalTag';

const METRICS = ['enrolment.total', 'enrolment.female', 'enrolment.male', 'staff.teaching', 'staff.total'] as const;
const LABEL: Record<typeof METRICS[number], string> = { 'enrolment.total': 'Enrolment', 'enrolment.female': 'Female', 'enrolment.male': 'Male', 'staff.teaching': 'Teaching staff', 'staff.total': 'All staff' };
interface Award { number: string; state: string; awardingBody: string; accreditation: { title: string }; versions: { n: number; title: string; level?: string; awardedOn: string; holderName: string; reason: string; case: string }[]; revoked?: { reason: string } }
interface Institution { inspections: { id: string; date: string; outcome: string; summary: string; case: string }[]; returns: { id: string; period: string; versions: { n: number; counts: Record<string, number>; at: string; by: string; note?: string }[] }[]; awarded: number }
const field = 'mt-1 w-full rounded border border-line bg-surface px-2 py-1 text-sm';

export function EducationRegister() {
  const [counts, setCounts] = React.useState<Record<string, number> | null>(null);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [org, setOrg] = React.useState('');
  const [inst, setInst] = React.useState<Institution | null>(null);
  const [q, setQ] = React.useState({ qualification: '', holder: '', purpose: '' });
  const [awards, setAwards] = React.useState<Award[] | null>(null);
  const [ret, setRet] = React.useState<{ period: string; note: string; counts: Record<string, string> }>({ period: '', note: '', counts: {} });
  const ask = async (params: Record<string, string>) => {
    const r = await fetch(`/api/education?${new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v)))}`, { cache: 'no-store' });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error ?? 'Could not read the register');
    return j;
  };
  React.useEffect(() => { ask({}).then(j => setCounts(j.counts)).catch(e => setMsg((e as Error).message)); }, []);
  const open = async () => { setMsg(null); try { const j = await ask({ organisation: org.trim(), purpose: q.purpose }); setInst(j); } catch (e) { setMsg((e as Error).message); } };
  const find = async () => { setMsg(null); try { const j = await ask(q); setAwards(j.awards ?? []); } catch (e) { setMsg((e as Error).message); } };
  const record = async () => {
    setMsg(null);
    const c = Object.fromEntries(Object.entries(ret.counts).filter(([, v]) => v.trim() !== '').map(([k, v]) => [k, Number(v)]));
    const r = await fetch('/api/education', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ organisation: org.trim(), period: ret.period.trim(), counts: c, note: ret.note }) });
    const j = await r.json();
    if (!r.ok) { setMsg(j.error ?? 'Not recorded'); return; }
    setMsg(`Return for ${ret.period} recorded (version ${j.return.versions.length}).`);
    await open();
  };
  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-semibold">Education</h1>
      <p className="max-w-3xl text-sm text-ink-muted">Schools and colleges are <Link className="underline" href="/gov/organisations">organisations</Link>; their registration is a standing in the schools register, decided in a <Link className="underline" href="/gov/work/cases/open">case</Link> under the education authority&apos;s approved procedure. Inspections and qualifications are recorded the same way. Returns hold only the counts an institution reports, never lists of pupils. Others check a qualification through the exchange with its number and the holder&apos;s name.</p>
      {msg ? <p role="status" className="text-sm">{msg}</p> : null}
      {counts ? <p className="text-sm">Inspections {counts.inspections} · qualifications {counts.awards} ({counts.revoked} revoked) · returns {counts.returns}</p> : null}
      <Section title="An institution" meta="inspections and returns, by register number">
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-sm">Register number<input className={field} value={org} onChange={e => setOrg(e.target.value)} /></label>
          <Button onClick={open}>Open</Button>
        </div>
        {inst ? (
          <div className="mt-3 space-y-3 text-sm">
            <p>Qualifications recorded from this institution: {inst.awarded}</p>
            <div>
              <p className="font-medium">Inspections</p>
              {inst.inspections.length ? <ul className="text-xs">{inst.inspections.map(i => <li key={i.id}>{i.date} · {i.outcome} · {i.summary} · <Link className="underline" href={`/gov/cases/${i.case}`}>case</Link></li>)}</ul> : <p className="text-xs text-ink-muted">None recorded.</p>}
            </div>
            <div>
              <p className="font-medium">Returns <SignalTag kind="reported" /></p>
              {inst.returns.length ? <ul className="text-xs">{inst.returns.map(r => { const v = r.versions.at(-1)!; return <li key={r.id}>{r.period} · {Object.entries(v.counts).map(([k, n]) => `${LABEL[k as typeof METRICS[number]] ?? k} ${n}`).join(' · ')} · version {v.n} by {v.by}{v.note ? ` (${v.note})` : ''}</li>; })}</ul> : <p className="text-xs text-ink-muted">None reported.</p>}
            </div>
            <fieldset className="rounded border border-line p-2">
              <legend className="px-1 text-xs font-medium">Record a return the institution reported</legend>
              <div className="grid gap-2 md:grid-cols-4">
                <label className="text-sm">Period (2026, 2026/2027, 2026-T1)<input className={field} value={ret.period} onChange={e => setRet(x => ({ ...x, period: e.target.value }))} /></label>
                {METRICS.map(m => <label key={m} className="text-sm">{LABEL[m]}<input className={field} inputMode="numeric" value={ret.counts[m] ?? ''} onChange={e => setRet(x => ({ ...x, counts: { ...x.counts, [m]: e.target.value } }))} /></label>)}
                <label className="text-sm md:col-span-2">Note<input className={field} value={ret.note} onChange={e => setRet(x => ({ ...x, note: e.target.value }))} /></label>
              </div>
              <Button className="mt-2" onClick={record}>Record</Button>
            </fieldset>
          </div>
        ) : null}
      </Section>
      <Section title="Qualifications" meta="by number, or a holder's person reference">
        <div className="grid gap-2 md:grid-cols-3">
          <label className="text-sm">Qualification number<input className={field} value={q.qualification} onChange={e => setQ(x => ({ ...x, qualification: e.target.value }))} /></label>
          <label className="text-sm">Holder&apos;s person reference<input className={field} value={q.holder} onChange={e => setQ(x => ({ ...x, holder: e.target.value }))} /></label>
          <label className="text-sm">Purpose (auditors)<input className={field} value={q.purpose} onChange={e => setQ(x => ({ ...x, purpose: e.target.value }))} /></label>
        </div>
        <Button className="mt-2" onClick={find}>Search</Button>
        {awards ? awards.length ? <ul className="mt-3 space-y-2 text-sm">{awards.map(a => { const v = a.versions.at(-1)!; return (
          <li key={a.number} className="rounded border border-line p-2">
            <p><strong>{a.number}</strong> · {v.title}{v.level ? ` (${v.level})` : ''} · {v.holderName} · awarded {v.awardedOn} by {a.awardingBody} under {a.accreditation.title} · <span className={a.state === 'valid' ? '' : 'text-alert'}>{a.state}</span></p>
            <ul className="text-xs text-ink-muted">{a.versions.map(x => <li key={x.n}>Version {x.n}: {x.reason} · <Link className="underline" href={`/gov/cases/${x.case}`}>case</Link></li>)}{a.revoked ? <li>Revoked: {a.revoked.reason}</li> : null}</ul>
          </li>
        ); })}</ul> : <p className="mt-2 text-sm text-ink-muted">Nothing matches.</p> : null}
      </Section>
    </div>
  );
}
