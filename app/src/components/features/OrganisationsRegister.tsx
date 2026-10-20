'use client';

// The organisations register (lib/organisations/register.ts; directions 6.6,
// 16.5, 16.6): the organisations registered, licensed or accredited, their
// standing in each register, and one organisation's full record (versions,
// representatives, every step with its case and decision) for those its read
// rule allows (the read is written to the access log). Standings change only
// through decided cases under approved procedures; administrators configure
// the register types (which authority keeps which register).

import * as React from 'react';
import Link from 'next/link';
import { Section } from '@/components/ui/DataSystem';
import { Button } from '@/components/ui/Button';

interface Standing { register: string; title: string; state: string; since: string; validUntil?: string; conditions: string[]; certificate?: string }
interface PublicOrg { number: string; name: string; kind: string; region?: string; standings: Standing[] }
interface RegisterType { key: string; title: string; kind: string; authority: string; orgKinds: string[]; validityMonths?: number; publicCheck: boolean; reference: boolean }
interface FullOrg { number: string; facilities: string[]; versions: { n: number; name: string; kind: string; region?: string; address?: string; representatives: { name: string; role: string; since: string }[]; at: string; by: string; reason: string; case?: string }[]; standings: { register: string; state: string; validUntil?: string; conditions: string[]; certificate?: string; history: { state: string; at: string; by: string; reason: string; case?: string; decision?: string }[] }[] }

const field = 'mt-1 w-full rounded border border-line bg-surface px-2 py-1 text-sm';
const STATE: Record<string, string> = { applied: 'Applied', granted: 'Granted', suspended: 'Suspended', revoked: 'Revoked', expired: 'Expired', refused: 'Refused', 'struck-off': 'Struck off' };

export function OrganisationsRegister() {
  const [orgs, setOrgs] = React.useState<PublicOrg[]>([]);
  const [types, setTypes] = React.useState<RegisterType[]>([]);
  const [f, setF] = React.useState({ register: '', state: '', q: '' });
  const [open, setOpen] = React.useState<{ number: string; full: boolean; org: FullOrg | PublicOrg; why?: string } | null>(null);
  const [purpose, setPurpose] = React.useState('');
  const [msg, setMsg] = React.useState<string | null>(null);
  const [loads, setLoads] = React.useState<{ id: string; register: string; by: string; at: string; sha256: string; rows: number; loaded: number; refused: { row: number; reason: string }[]; withdrawn?: { removed: number } }[]>([]);
  const [loadRegister, setLoadRegister] = React.useState('');
  const [nt, setNt] = React.useState({ key: '', title: '', kind: 'licence', authority: '', orgKinds: 'pharmacy', validityMonths: '' });

  const load = React.useCallback(() => {
    const qs = new URLSearchParams(Object.entries(f).filter(([, v]) => v));
    fetch(`/api/organisations?${qs}`, { cache: 'no-store' }).then(async r => { const j = await r.json(); if (!r.ok) throw new Error(j.error ?? 'Could not load'); setOrgs(j.organisations); setTypes(j.types); }).catch(e => setMsg((e as Error).message));
  }, [f]);
  React.useEffect(load, [load]);
  const loadLoads = React.useCallback(() => { fetch('/api/organisations/loads', { cache: 'no-store' }).then(r => r.json()).then(j => setLoads(j.loads ?? [])).catch(() => setLoads([])); }, []);
  React.useEffect(loadLoads, [loadLoads]);
  const sendLoad = async (body: Record<string, unknown>, done: (j: { load: { loaded: number; refused: unknown[]; withdrawn?: { removed: number } } }) => string) => {
    const r = await fetch('/api/organisations/loads', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json();
    setMsg(r.ok ? done(j) : j.error);
    loadLoads(); load();
  };

  const show = async (number: string) => {
    const r = await fetch(`/api/organisations/${encodeURIComponent(number)}?${new URLSearchParams(purpose ? { purpose } : {})}`, { cache: 'no-store' });
    const j = await r.json();
    if (!r.ok) { setMsg(j.error); return; }
    setOpen({ number, full: j.full, org: j.organisation, why: j.why });
  };
  const define = async () => {
    const r = await fetch('/api/organisations/types', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...nt, orgKinds: nt.orgKinds.split(/[,\s]+/).filter(Boolean), validityMonths: nt.validityMonths ? Number(nt.validityMonths) : undefined }) });
    const j = await r.json();
    setMsg(r.ok ? `Register ${j.type.title} configured.` : j.error);
    if (r.ok) load();
  };
  const title = (key: string) => types.find(t => t.key === key)?.title ?? key;

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-semibold">Organisations</h1>
      <p className="max-w-3xl text-sm text-ink-muted">Companies, associations, universities, pharmacies and other organisations, and their standing in each register the government keeps. Registrations, licences and accreditations, and their renewal, suspension and revocation, are made through <Link className="underline" href="/gov/work/cases/open">cases</Link> under approved <Link className="underline" href="/gov/law/procedures">procedures</Link>, decided by two officials. Anyone can check a public register at <Link className="underline" href="/registers">/registers</Link>.</p>
      {msg ? <p role="status" className="text-sm">{msg}</p> : null}

      <Section title="Find" meta={`${orgs.length} shown`}>
        <div className="grid gap-2 md:grid-cols-4">
          <label className="text-sm">Register<select className={field} value={f.register} onChange={e => setF(x => ({ ...x, register: e.target.value }))}><option value="">Any</option>{types.map(t => <option key={t.key} value={t.key}>{t.title}</option>)}</select></label>
          <label className="text-sm">Standing<select className={field} value={f.state} onChange={e => setF(x => ({ ...x, state: e.target.value }))} disabled={!f.register}><option value="">Any</option>{Object.entries(STATE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          <label className="text-sm">Name or number<input className={field} value={f.q} onChange={e => setF(x => ({ ...x, q: e.target.value }))} /></label>
          <label className="text-sm">Purpose (auditors)<input className={field} value={purpose} onChange={e => setPurpose(e.target.value)} /></label>
        </div>
        {orgs.length ? (
          <ul className="mt-3 divide-y divide-line">
            {orgs.map(o => (
              <li key={o.number} className="flex flex-wrap items-baseline gap-2 py-2 text-sm">
                <button className="font-medium underline-offset-2 hover:underline" onClick={() => void show(o.number)}>{o.name}</button>
                <span className="font-mono text-xs text-ink-muted">{o.number}</span>
                <span className="text-ink-muted">{o.kind}{o.region ? ` · ${o.region}` : ''}</span>
                <span className="flex-1" />
                {o.standings.map(s => <span key={s.register} className="rounded border border-line px-1.5 text-xs">{s.title}: {STATE[s.state] ?? s.state}{s.validUntil ? ` to ${s.validUntil}` : ''}</span>)}
              </li>
            ))}
          </ul>
        ) : <p className="mt-2 text-sm text-ink-muted">No organisation matches. Organisations enter through a registration case.</p>}
      </Section>

      {open ? (
        <Section title={open.full ? `Record ${open.number}` : `Public view of ${open.number}`} meta={open.full ? 'full record · this read is in the access log' : open.why}>
          {open.full ? (() => {
            const o = open.org as FullOrg;
            const v = o.versions[o.versions.length - 1]!;
            return (
              <div className="space-y-3 text-sm">
                <p><strong>{v.name}</strong> · {v.kind}{v.region ? ` · ${v.region}` : ''}{v.address ? ` · ${v.address}` : ''}</p>
                {v.representatives.length ? <p>Representatives: {v.representatives.map(r => `${r.name} (${r.role}, since ${r.since})`).join('; ')}</p> : null}
                {o.facilities.length ? <p>Registered sites: {o.facilities.map(id => <Link key={id} className="me-2 underline" href={`/gov/sites?facility=${encodeURIComponent(id)}`}>{id}</Link>)}</p> : null}
                {o.standings.map(s => (
                  <div key={s.register} className="rounded border border-line p-2">
                    <p><strong>{title(s.register)}</strong>: {STATE[s.state] ?? s.state}{s.validUntil ? `, valid until ${s.validUntil}` : ''}{s.certificate ? <> · certificate <Link className="underline" href={`/verify/${encodeURIComponent(s.certificate)}`}>{s.certificate}</Link></> : null}</p>
                    {s.conditions.length ? <p className="text-xs">Conditions: {s.conditions.join('; ')}</p> : null}
                    <ol className="mt-1 space-y-0.5 text-xs text-ink-muted">{s.history.map((h, i) => <li key={i}>{new Date(h.at).toLocaleDateString()} · {STATE[h.state] ?? h.state} · {h.by} · {h.reason}{h.case ? <> · <Link className="underline" href={`/gov/cases/${h.case}`}>case</Link></> : null}</li>)}</ol>
                  </div>
                ))}
                <details><summary className="cursor-pointer text-xs">Versions ({o.versions.length})</summary><ol className="mt-1 space-y-0.5 text-xs">{o.versions.map(x => <li key={x.n}>Version {x.n}: {x.name} · {x.reason} · {x.by} · {new Date(x.at).toLocaleDateString()}</li>)}</ol></details>
              </div>
            );
          })() : (
            <div className="text-sm">
              <p><strong>{(open.org as PublicOrg).name}</strong> · {(open.org as PublicOrg).kind}</p>
              {(open.org as PublicOrg).standings.map(s => <p key={s.register}>{s.title}: {STATE[s.state] ?? s.state}{s.validUntil ? `, valid until ${s.validUntil}` : ''}</p>)}
            </div>
          )}
        </Section>
      ) : null}

      <Section title="Load an existing register" meta="a CSV from the register you keep today">
        <p className="text-sm text-ink-muted">Columns: name, kind, standing (granted, suspended, revoked, expired or struck-off), and optionally number (your current number, kept), since, valid_until, conditions (separated by ;), region, address. Every row is checked; a row that cannot be read is refused with its reason. A load can be withdrawn while nobody has acted on what it brought in.</p>
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <label className="text-sm">Register<select className={field} value={loadRegister} onChange={e => setLoadRegister(e.target.value)}><option value="">Choose</option>{types.map(t => <option key={t.key} value={t.key}>{t.title}</option>)}</select></label>
          <label className="text-sm">File<input type="file" accept=".csv,text/csv" className="mt-1 block text-sm" disabled={!loadRegister} onChange={async e => {
            const file = e.currentTarget.files?.[0];
            if (!file) return;
            const csv = await file.text();
            await sendLoad({ op: 'load', register: loadRegister, csv }, j => `${j.load.loaded} loaded, ${j.load.refused.length} refused.`);
            e.currentTarget.value = '';
          }} /></label>
        </div>
        {loads.length ? (
          <ul className="mt-3 space-y-2 text-sm">
            {loads.slice().reverse().map(l => (
              <li key={l.id} className="rounded border border-line p-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span>{title(l.register)} · {new Date(l.at).toLocaleString()} · {l.by} · {l.loaded} of {l.rows} loaded</span>
                  <span className="font-mono text-xs text-ink-muted">{l.sha256.slice(0, 16)}</span>
                  <span className="flex-1" />
                  {l.withdrawn ? <span className="text-xs">Withdrawn ({l.withdrawn.removed} removed)</span> : <Button variant="secondary" onClick={() => void sendLoad({ op: 'withdraw', id: l.id }, j => `Withdrawn: ${j.load.withdrawn?.removed ?? 0} removed.`)}>Withdraw</Button>}
                </div>
                {l.refused.length ? <details className="mt-1"><summary className="cursor-pointer text-xs">{l.refused.length} rows refused</summary><ul className="mt-1 text-xs">{l.refused.slice(0, 200).map(r => <li key={r.row}>Row {r.row}: {r.reason}</li>)}</ul></details> : null}
              </li>
            ))}
          </ul>
        ) : null}
      </Section>

      <Section title="Registers" meta={`${types.length} · which authority keeps each`}>
        <ul className="space-y-1 text-sm">
          {types.map(t => <li key={t.key}><strong>{t.title}</strong> <span className="text-ink-muted">· {t.kind} · kept by {t.authority} · holds {t.orgKinds.length > 5 ? 'every kind' : t.orgKinds.join(', ')}{t.validityMonths ? ` · valid ${t.validityMonths} months` : ''}{t.publicCheck ? ' · public check' : ''}{t.reference ? ' · shipped with the platform' : ''}</span></li>)}
        </ul>
        <details className="mt-3">
          <summary className="cursor-pointer text-sm">Configure a register (administrators)</summary>
          <div className="mt-2 grid gap-2 md:grid-cols-3">
            <label className="text-sm">Key<input className={field} value={nt.key} onChange={e => setNt(x => ({ ...x, key: e.target.value }))} placeholder="licensed-pharmacies" /></label>
            <label className="text-sm">Title<input className={field} value={nt.title} onChange={e => setNt(x => ({ ...x, title: e.target.value }))} placeholder="Licensed pharmacies" /></label>
            <label className="text-sm">Kind<select className={field} value={nt.kind} onChange={e => setNt(x => ({ ...x, kind: e.target.value }))}><option value="registration">Registration</option><option value="licence">Licence</option><option value="accreditation">Accreditation</option></select></label>
            <label className="text-sm">Kept by (responsible authority or institution id)<input className={field} value={nt.authority} onChange={e => setNt(x => ({ ...x, authority: e.target.value }))} /></label>
            <label className="text-sm">Kinds of organisation<input className={field} value={nt.orgKinds} onChange={e => setNt(x => ({ ...x, orgKinds: e.target.value }))} /></label>
            <label className="text-sm">Valid for (months)<input className={field} inputMode="numeric" value={nt.validityMonths} onChange={e => setNt(x => ({ ...x, validityMonths: e.target.value }))} /></label>
          </div>
          <Button className="mt-2" variant="secondary" onClick={() => void define()}>Save the register</Button>
        </details>
      </Section>
    </div>
  );
}
