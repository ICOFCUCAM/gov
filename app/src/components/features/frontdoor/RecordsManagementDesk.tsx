'use client';

// Records management for the console (plan step I13; /api/records-management,
// lib/recordkeeping). One institution at a time: its record classes with
// every retention schedule version (the law's period and disposition, cited;
// none ships, and nothing is disposed of without one), its legal holds (who,
// why, scope, release), registered incoming correspondence, disposals with the
// exact list, what was destroyed or kept and the certificate, transfers to the
// archive with its receipt, and migrations with their counts, manifests and
// reconciliation. Every change is a decided case of the institution's own
// records procedures (rec.*); the archive records its own receipt here.

import * as React from 'react';
import Link from 'next/link';
import { Section } from '@/components/ui/DataSystem';
import { Button } from '@/components/ui/Button';
import { SignalTag } from '@/components/ui/SignalTag';

type Who = { name: string };
interface Listed { kind: string; id: string; sha256: string }
interface Data {
  archive: { id: string; name: string } | null;
  labels: { triggers: Record<string, string>; dispositions: Record<string, string> };
  platformRules: Record<string, { action: string; days?: number; basis?: string }>;
  institutions: { id: string; name: string }[];
  institution: { id: string; name: string } | null;
  classes?: { key: string; title: string; description: string; access: string; schedules: { n: number; trigger: string; periodDays?: number; disposition: string; citations: { title?: string; num?: string; eId: string }[]; case: string; approvedBy: Who[]; at: string; sample?: true }[] }[];
  holds?: { id: string; scope: { kind: string; ref: string }; reason: string; placedBy: Who[]; placedAt: string; case: string; released?: { at: string; reason: string; by: Who[] }; sample?: true }[];
  incoming?: { number: string; class: string; subject: string; channel: string; receivedOn: string; case: string; disposed?: unknown; transferred?: unknown; sample?: true }[];
  disposals?: { id: string; class: string; schedule: number; case: string; items: Listed[]; listDigest: string; listedBy: string; executed?: { destroyed: Listed[]; skipped: (Listed & { why: string })[]; certificate: string; at: string }; sample?: true }[];
  transfers?: { id: string; archive: string; class: string; items: Listed[]; manifest: string; received?: { receipt: string; at: string; by: Who }; case: string }[];
  received?: { id: string; institution: string; class: string; items: Listed[]; manifest: string; received?: { receipt: string } }[];
  migrations?: { id: string; case: string; source: { system: string; count: number; manifest: string }; target: { system: string; kind: string; ref?: string }; approved?: unknown; reconciliation?: { count: number; manifest: string; computed: boolean; matched: boolean; discrepancies: string; corrective: string }[]; closed?: { outcome: string } }[];
  procedures?: { template: string; key: string; title: string; forms: string[]; state: string }[];
}
const field = 'mt-1 w-full rounded border border-line bg-surface px-2 py-1 text-sm';

export function RecordsManagementDesk() {
  const [inst, setInst] = React.useState('');
  const [data, setData] = React.useState<Data | null>(null);
  const [msg, setMsg] = React.useState<string | null>(null);
  const load = React.useCallback((id: string) => {
    fetch(`/api/records-management${id ? `?institution=${encodeURIComponent(id)}` : ''}`, { cache: 'no-store' }).then(async r => { const j = await r.json(); if (!r.ok) throw new Error(j.error); setData(j); if (!id && j.institution) setInst(j.institution.id); }).catch(e => setMsg((e as Error).message));
  }, []);
  React.useEffect(() => load(inst), [inst, load]);
  const post = async (body: Record<string, unknown>, done: string) => {
    setMsg(null);
    const r = await fetch('/api/records-management', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    setMsg(r.ok ? done : j.error ?? `Refused (${r.status})`);
    if (r.ok) load(inst);
  };
  const rules = data?.platformRules ?? {};
  return (
    <div className="space-y-5 p-4">
      <h1 className="text-xl font-semibold">Records management</h1>
      <p className="max-w-3xl text-sm text-ink-muted">Each institution keeps its own records: classes with the retention schedule its law sets (none ships; nothing is disposed of without one), legal holds that stop any disposal, the platform&apos;s retention sweep included, disposal of exactly the records listed, authorised by two officials other than the one who listed them (the record and its fingerprint are kept), transfers to the archive the nation names, and migrations reconciled by counts and fingerprints. Every change is a decided case of the institution&apos;s records procedures; reading this page is recorded in the <Link className="underline" href="/gov/access-log">access log</Link>.</p>
      {msg ? <p role="status" className="text-sm">{msg}</p> : null}
      {data ? (
        <>
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-sm">Institution<select className={field} value={inst} onChange={e => setInst(e.target.value)}><option value="">Choose…</option>{data.institutions.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
            <p className="text-sm">Archive: {data.archive ? data.archive.name : <>none named (<Link className="underline" href="/gov/configuration#who-is-responsible">Who is responsible</Link>): nothing is transferred until one is</>}</p>
          </div>
          <Section title="Platform retention rules" meta="lib/data/retention.ts">
            <p className="text-sm">{Object.entries(rules).map(([k, r]) => `${k}: ${r.action}${r.days ? ` after ${r.days} days (${r.basis})` : ''}`).join(' · ')}. A legal hold recorded here stops them too.</p>
          </Section>
          {data.institution ? (
            <>
              <Section title="Records procedures" meta="the institution's own; drafts until approved">
                <ul className="text-sm">{data.procedures!.map(p => <li key={p.key}><span className="font-mono text-xs">{p.key}</span> · {p.title} · forms {p.forms.join(', ')} · {p.state}</li>)}</ul>
                <div className="flex gap-2"><Button variant="secondary" onClick={() => post({ op: 'adopt', institution: inst }, 'Drafted: approve each under Procedures.')}>Draft this institution&apos;s records procedures</Button><Link className="text-sm underline" href="/gov/law/procedures">Procedures</Link><Link className="text-sm underline" href="/gov/work/cases/open">Open cases</Link></div>
              </Section>
              <Section title="Record classes and schedules" meta={`${data.classes!.length} classes`}>
                {data.classes!.length ? <ul className="space-y-1 text-sm">{data.classes!.map(c => <li key={c.key} className="rounded border border-line p-2"><strong>{c.title}</strong> <span className="font-mono text-xs">{c.key}</span> · access {c.access}
                  <ul className="text-xs">{c.schedules.map(s => <li key={s.n} className="flex flex-wrap items-center gap-1">Version {s.n}: {data.labels.dispositions[s.disposition]}{s.periodDays ? ` · ${s.periodDays} days ${data.labels.triggers[s.trigger]}` : ''} · {s.citations.map(x => `${x.title ?? ''} ${x.num ?? x.eId}`).join('; ')} · case {s.case} · {s.approvedBy.map(x => x.name).join(' and ')}{s.sample ? <SignalTag kind="sample" source="a demonstration case" /> : null}</li>)}</ul></li>)}</ul> : <p className="text-sm text-ink-muted">No class has a schedule yet: nothing of this institution is disposed of or transferred.</p>}
              </Section>
              <Section title="Legal holds" meta={`${data.holds!.filter(h => !h.released).length} in force`}>
                {data.holds!.length ? <ul className="text-sm">{data.holds!.map(h => <li key={h.id} className="border-t border-line py-1">{h.id} · {h.scope.kind} {h.scope.ref} · {h.reason} · placed by {h.placedBy.map(x => x.name).join(' and ')} on {h.placedAt.slice(0, 10)}{h.released ? ` · released ${h.released.at.slice(0, 10)} by ${h.released.by.map(x => x.name).join(' and ')}: ${h.released.reason}` : ' · in force'}</li>)}</ul> : <p className="text-sm text-ink-muted">No hold.</p>}
              </Section>
              <Section title="Disposals" meta="the exact list, authorised by two">
                {data.disposals!.length ? <ul className="text-sm">{data.disposals!.map(x => <li key={x.id} className="border-t border-line py-1">{x.id} · {x.class} (schedule {x.schedule}) · {x.items.length} listed by {x.listedBy} · list <span className="font-mono text-xs">{x.listDigest.slice(0, 12)}</span>{x.executed ? ` · ${x.executed.destroyed.length} destroyed, ${x.executed.skipped.length} kept (${x.executed.skipped.map(s => s.why).join('; ') || 'none'}) · certificate ${x.executed.certificate.slice(0, 12)}` : ' · waiting for authorisation'}</li>)}</ul> : <p className="text-sm text-ink-muted">No disposal.</p>}
              </Section>
              <Section title="Transfers to the archive" meta={data.archive ? data.archive.name : 'no archive named'}>
                {data.transfers!.length ? <ul className="text-sm">{data.transfers!.map(t => <li key={t.id} className="border-t border-line py-1">{t.id} · {t.class} · {t.items.length} items · manifest <span className="font-mono text-xs">{t.manifest.slice(0, 12)}</span> · {t.received ? `received, receipt ${t.received.receipt}` : 'not yet acknowledged by the archive'}</li>)}</ul> : <p className="text-sm text-ink-muted">No transfer sent.</p>}
                {data.received!.length ? (
                  <>
                    <p className="text-sm font-medium">Sent to this institution as the archive</p>
                    <ul className="text-sm">{data.received!.map(t => <li key={t.id} className="border-t border-line py-1">{t.id} · from {data.institutions.find(m => m.id === t.institution)?.name ?? t.institution} · {t.items.length} items{t.received ? ` · receipt ${t.received.receipt}` : <Button className="ms-2" variant="secondary" onClick={() => { const receipt = window.prompt('The archive\'s receipt reference'); if (receipt) void post({ op: 'acknowledge-transfer', transfer: t.id, manifest: t.manifest, receipt }, 'Receipt recorded.'); }}>Acknowledge receipt</Button>}</li>)}</ul>
                  </>
                ) : null}
              </Section>
              <Section title="Migrations" meta="counts and fingerprints">
                {data.migrations!.length ? <ul className="text-sm">{data.migrations!.map(m => { const r = m.reconciliation?.at(-1); return <li key={m.id} className="border-t border-line py-1">{m.id} · {m.source.system} → {m.target.system} · {m.source.count} records · {r ? `${r.count} found${r.computed ? ' (counted from the records here)' : ''} · ${r.matched ? 'matched' : `discrepancies: ${r.discrepancies}; corrective actions: ${r.corrective}`}` : m.approved ? 'approved, not reconciled' : 'plan recorded'}{m.closed ? ` · closed: ${m.closed.outcome.replace(/-/g, ' ')}` : ''}</li>; })}</ul> : <p className="text-sm text-ink-muted">No migration.</p>}
              </Section>
              <Section title="Incoming correspondence" meta={`${data.incoming!.length} registered`}>
                {data.incoming!.length ? <ul className="text-sm">{data.incoming!.map(i => <li key={i.number} className="border-t border-line py-1">{i.number} · {i.subject} · {i.channel} · received {i.receivedOn} · class {i.class}{i.disposed ? ' · disposed of' : ''}{i.transferred ? ' · transferred' : ''}{i.sample ? <SignalTag kind="sample" source="a demonstration case" /> : null}</li>)}</ul> : <p className="text-sm text-ink-muted">Nothing registered.</p>}
              </Section>
            </>
          ) : <p className="text-sm text-ink-muted">Choose an institution.</p>}
        </>
      ) : null}
    </div>
  );
}
