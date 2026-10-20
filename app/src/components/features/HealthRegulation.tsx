'use client';

// Health regulation for the regulators: the registers of regulated
// professionals they keep (counts, a full record by registration number or a
// person's registrations: personal, every search in the access log) and the
// capacity returns of licensed facilities with a form to record one. Licences
// for facilities and pharmacies are standings in the organisations register;
// registrations, renewals, suspensions and revocations are cases under
// approved procedures. No patient data anywhere.

import * as React from 'react';
import Link from 'next/link';
import { Section } from '@/components/ui/DataSystem';
import { Button } from '@/components/ui/Button';
import { SignalTag } from '@/components/ui/SignalTag';

const METRICS = ['beds.total', 'beds.intensive-care', 'staff.clinical', 'staff.total', 'outpatient.attendances'] as const;
const LABEL: Record<typeof METRICS[number], string> = { 'beds.total': 'Beds', 'beds.intensive-care': 'Intensive-care beds', 'staff.clinical': 'Clinical staff', 'staff.total': 'All staff', 'outpatient.attendances': 'Outpatient attendances' };
interface Pro { number: string; name: string; profession: string; personRef: string; qualifications: string[]; state: string; validUntil?: string; conditions: string[]; history: { state: string; at: string; by: string; reason: string; case: string }[] }
interface Capacity { id: string; period: string; versions: { n: number; counts: Record<string, number>; at: string; by: string; note?: string }[] }
const field = 'mt-1 w-full rounded border border-line bg-surface px-2 py-1 text-sm';
interface ProfessionDef { key: string; title: string; authority: string; permitType: string; publicCheck: boolean; publicFields?: string[]; disclosureChanges?: { pending?: { by: string; expiresAt: string; values: { publicFields: string[] }; basis: { title?: string; instrument: string; num?: string; eId: string }[] } } }
const PUBLIC_FIELDS = ['name', 'number', 'profession', 'state', 'validUntil', 'conditions'] as const;
const FIELD_LABEL: Record<typeof PUBLIC_FIELDS[number], string> = { name: 'Name', number: 'Registration number', profession: 'Profession', state: 'Standing', validUntil: 'Valid until', conditions: 'Conditions' };
const qs = (p: Record<string, string>) => new URLSearchParams(Object.fromEntries(Object.entries(p).filter(([, v]) => v))).toString();

export function HealthRegulation() {
  const [msg, setMsg] = React.useState<string | null>(null);
  const [counts, setCounts] = React.useState<Record<string, Record<string, number>> | null>(null);
  const [q, setQ] = React.useState({ number: '', person: '', purpose: '' });
  const [pros, setPros] = React.useState<Pro[] | null>(null);
  const [org, setOrg] = React.useState('');
  const [cap, setCap] = React.useState<Capacity[] | null>(null);
  const [ret, setRet] = React.useState<{ period: string; note: string; counts: Record<string, string> }>({ period: '', note: '', counts: {} });
  const [defs, setDefs] = React.useState<ProfessionDef[]>([]);
  const loadDefs = React.useCallback(() => { fetch('/api/professions/types', { cache: 'no-store' }).then(r => r.json()).then(j => setDefs(j.professions ?? [])).catch(() => setDefs([])); }, []);
  React.useEffect(loadDefs, [loadDefs]);
  // What the public check shows changes by two officials citing the law: ticks make a draft per profession, proposed with the law, confirmed by another official.
  const [draft, setDraft] = React.useState<Record<string, string[]>>({});
  const [law, setLaw] = React.useState({ instrument: '', eId: '' });
  const shown = (p: ProfessionDef) => draft[p.key] ?? p.publicFields ?? ['name', 'number', 'profession', 'state', 'validUntil'];
  const tick = (p: ProfessionDef, f: string, on: boolean) => setDraft(d => ({ ...d, [p.key]: on ? [...new Set([...shown(p), f])] : shown(p).filter(x => x !== f) }));
  const disclosure = async (body: Record<string, unknown>, done: string) => {
    const r = await fetch('/api/professions/types', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json();
    setMsg(r.ok ? done : j.error);
    if (r.ok) setDraft(d => { const n = { ...d }; delete n[String(body.key)]; return n; });
    loadDefs();
  };

  React.useEffect(() => { fetch('/api/professions', { cache: 'no-store' }).then(r => r.json()).then(j => (j.error ? setMsg(j.error) : setCounts(j.counts))).catch(() => setMsg('Could not read the register')); }, []);
  const find = async () => {
    setMsg(null);
    const r = await fetch(`/api/professions?${qs(q)}`, { cache: 'no-store' }); const j = await r.json();
    if (!r.ok) { setMsg(j.error ?? 'Not found'); setPros([]); return; }
    setPros(j.professionals ?? []);
  };
  const open = async () => { setMsg(null); const j = await (await fetch(`/api/health-regulation?${qs({ organisation: org.trim() })}`, { cache: 'no-store' })).json(); setCap(j.returns ?? []); };
  const record = async () => {
    setMsg(null);
    const c = Object.fromEntries(Object.entries(ret.counts).filter(([, v]) => v.trim() !== '').map(([k, v]) => [k, Number(v)]));
    const r = await fetch('/api/health-regulation', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ organisation: org.trim(), period: ret.period.trim(), counts: c, note: ret.note }) });
    const j = await r.json();
    if (!r.ok) { setMsg(j.error ?? 'Not recorded'); return; }
    setMsg(`Return for ${ret.period} recorded (version ${j.return.versions.length}).`);
    await open();
  };
  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-semibold">Health regulation</h1>
      <p className="max-w-3xl text-sm text-ink-muted">Hospitals, clinics and pharmacies are <Link className="underline" href="/gov/organisations">organisations</Link>: their licences are decided in <Link className="underline" href="/gov/work/cases/open">cases</Link> and anyone can check them on the <Link className="underline" href="/registers">public registers</Link>, as they can check a professional&apos;s standing. Capacity returns hold only counts a facility reports. Patient records are never kept here.</p>
      {msg ? <p role="status" className="text-sm">{msg}</p> : null}
      <Section title="Regulated professionals" meta="the professions your institution keeps">
        {counts ? <ul className="mb-3 text-sm">{Object.entries(counts).map(([p, c]) => <li key={p}><strong>{p}</strong>: {Object.entries(c).map(([k, v]) => `${k} ${v}`).join(' · ')}</li>)}{Object.keys(counts).length ? null : <li className="text-ink-muted">None registered yet.</li>}</ul> : null}
        <div className="grid gap-2 md:grid-cols-3">
          <label className="text-sm">Registration number<input className={field} value={q.number} onChange={e => setQ(x => ({ ...x, number: e.target.value }))} /></label>
          <label className="text-sm">Person reference<input className={field} value={q.person} onChange={e => setQ(x => ({ ...x, person: e.target.value }))} /></label>
          <label className="text-sm">Purpose (auditors)<input className={field} value={q.purpose} onChange={e => setQ(x => ({ ...x, purpose: e.target.value }))} /></label>
        </div>
        <Button className="mt-2" onClick={find}>Search</Button>
        {pros ? pros.length ? <ul className="mt-3 space-y-2 text-sm">{pros.map(p => (
          <li key={p.number} className="rounded border border-line p-2">
            <p><strong>{p.number}</strong> · {p.name} · {p.profession} · {p.state}{p.validUntil ? ` until ${p.validUntil}` : ''} · person {p.personRef}</p>
            {p.qualifications.length ? <p className="text-xs">Qualifications: {p.qualifications.join('; ')}</p> : null}
            {p.conditions.length ? <p className="text-xs">Conditions: {p.conditions.join('; ')}</p> : null}
            <ul className="text-xs text-ink-muted">{p.history.map((h, i) => <li key={i}>{h.at.slice(0, 10)} · {h.state} · {h.reason}{h.case ? <> · <Link className="underline" href={`/gov/cases/${h.case}`}>case</Link></> : null}</li>)}</ul>
          </li>
        ))}</ul> : <p className="mt-2 text-sm text-ink-muted">Nothing matches.</p> : null}
      </Section>
      <Section title="Capacity returns" meta="a licensed facility, by register number">
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-sm">Register number<input className={field} value={org} onChange={e => setOrg(e.target.value)} /></label>
          <Button onClick={open}>Open</Button>
        </div>
        {cap ? (
          <div className="mt-3 space-y-3 text-sm">
            <p className="font-medium">Returns <SignalTag kind="reported" /></p>
            {cap.length ? <ul className="text-xs">{cap.map(r => { const v = r.versions.at(-1)!; return <li key={r.id}>{r.period} · {Object.entries(v.counts).map(([k, n]) => `${LABEL[k as typeof METRICS[number]] ?? k} ${n}`).join(' · ')} · version {v.n} by {v.by}{v.note ? ` (${v.note})` : ''}</li>; })}</ul> : <p className="text-xs text-ink-muted">None reported.</p>}
            <fieldset className="rounded border border-line p-2">
              <legend className="px-1 text-xs font-medium">Record a return the facility reported</legend>
              <div className="grid gap-2 md:grid-cols-3">
                <label className="text-sm">Period (2026, 2026-09, 2026-Q3)<input className={field} value={ret.period} onChange={e => setRet(x => ({ ...x, period: e.target.value }))} /></label>
                {METRICS.map(m => <label key={m} className="text-sm">{LABEL[m]}<input className={field} inputMode="numeric" value={ret.counts[m] ?? ''} onChange={e => setRet(x => ({ ...x, counts: { ...x.counts, [m]: e.target.value } }))} /></label>)}
                <label className="text-sm">Note<input className={field} value={ret.note} onChange={e => setRet(x => ({ ...x, note: e.target.value }))} /></label>
              </div>
              <Button className="mt-2" onClick={record}>Record</Button>
            </fieldset>
          </div>
        ) : null}
      </Section>

      <Section title="What the public check shows" meta="per profession, under the country's law; administrators">
        <p className="text-sm text-ink-muted">Anyone can check one person by full name at the public registers page. Each profession shows only the fields ticked here; the name and the standing always show, and conditions stay hidden until the law says they are public. A change is proposed citing the law and applies when a different official confirms it.</p>
        <div className="mt-2 grid gap-2 md:grid-cols-2">
          <label className="text-sm">Legal basis: law (id from Laws)<input className={field} value={law.instrument} onChange={e => setLaw(x => ({ ...x, instrument: e.target.value }))} placeholder="/eli/…" /></label>
          <label className="text-sm">Provision (e.g. sec_12)<input className={field} value={law.eId} onChange={e => setLaw(x => ({ ...x, eId: e.target.value }))} /></label>
        </div>
        {defs.length ? (
          <table className="mt-2 w-full text-sm">
            <thead><tr><th className="text-start">Profession</th>{PUBLIC_FIELDS.map(f => <th key={f} className="px-2 text-start">{FIELD_LABEL[f]}</th>)}<th className="text-start">Change</th></tr></thead>
            <tbody>{defs.map(p => {
              const pending = p.disclosureChanges?.pending;
              return (
                <tr key={p.key} className="border-t border-line align-top">
                  <td className="py-1">{p.title}{p.publicCheck ? '' : ' (not on the public check)'}
                    {pending ? <div className="text-xs text-ink-muted">Waiting for a second official (proposed by {pending.by}): {pending.values.publicFields.join(', ')} · {pending.basis.map(c => `${c.title ?? c.instrument} ${c.num ?? c.eId}`).join('; ')}</div> : null}
                  </td>
                  {PUBLIC_FIELDS.map(f => <td key={f} className="px-2"><input type="checkbox" aria-label={`${p.title}: show ${FIELD_LABEL[f]}`} checked={shown(p).includes(f)} disabled={f === 'name' || f === 'state' || !!pending} onChange={e => tick(p, f, e.target.checked)} /></td>)}
                  <td className="py-1">
                    {pending ? (
                      <span className="flex gap-1">
                        <Button onClick={() => void disclosure({ op: 'confirm-disclosure', key: p.key }, `${p.title}: confirmed; the public check shows the new fields from now.`)}>Confirm</Button>
                        <Button variant="secondary" onClick={() => void disclosure({ op: 'withdraw-disclosure', key: p.key }, 'Withdrawn.')}>Withdraw</Button>
                      </span>
                    ) : draft[p.key] ? (
                      <Button onClick={() => void disclosure({ op: 'propose-disclosure', key: p.key, publicFields: draft[p.key], legalBasis: law.instrument ? [{ instrument: law.instrument.trim(), eId: law.eId.trim() }] : [] }, `${p.title}: proposed; a different official confirms it.`)}>Propose</Button>
                    ) : null}
                  </td>
                </tr>
              );
            })}</tbody>
          </table>
        ) : <p className="text-sm text-ink-muted">No profession is configured.</p>}
      </Section>
    </div>
  );
}
