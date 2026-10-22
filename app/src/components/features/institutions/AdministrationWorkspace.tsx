'use client';

// An institution's internal administration workspace (plan I2; spec Part 1
// §10; supplement part 21): one page per institution, each function with the
// departments that perform it, its catalogue forms (and whether a procedure
// carries them), the institution's own procedures and their cases, and its
// records. Only that institution's own records, within reach: the
// legislature, the judiciary and independent institutions keep their own.
// Decisions are taken in the cases, under the institution's approved
// procedures: payroll reviewed and approved by persons other than the
// preparer, privileged access time-limited and revocable, delegations
// recorded under the law. Personnel, payroll, legal-advice and disciplinary
// cases are restricted (every read in the access log); this page shows batch
// totals and counts, never a person's pay or file.

import * as React from 'react';
import Link from 'next/link';
import { Section } from '@/components/ui/DataSystem';
import { Pill, type PillTone } from '@/components/ui/Pill';
import { Button } from '@/components/ui/Button';
import { useInstitution, InstitutionPicker, readJson } from './InstitutionPicker';

interface Proc { template: string; key: string; title: string; forms: string[]; sensitivity: string; state: 'in force' | 'draft' | 'not adopted'; cases: { open: number; total: number; stages: Record<string, number> } }
interface Fn { key: string; label: string; records: string; departments: { id: string; name: string; office: string | null; staff: number }[]; forms: { id: string; title: string; identity: string; link: string }[]; procedures: Proc[] }
interface Data {
  institution: { id: string; name: string }; functions: Fn[];
  records: {
    positions: { id: string; title: string; count: number; grade: string | null; status: string; case: string; sample: boolean }[];
    payroll: { ref: string; period: { from: string; to: string }; employees: number; status: string; preparedBy: string; reviewedBy: string | null; approvedBy: string | null; deductions: string | null; sample: boolean }[];
    access: { id: string; system: string; role: string; from: string; until: string; status: string; inForce: boolean; case: string }[];
    policies: { id: string; title: string; version: number; status: string; case: string }[];
    delegations: { id: string; delegator: string; delegate: string; actions: string[]; procedures: string[]; from: string; until: string | null; basis: string[]; revoked: { at: string; reason: string } | null; case: string }[];
  };
  rules: { payrollDeductions: string };
}
const STATE_TONE: Record<Proc['state'], PillTone> = { 'in force': 'ok', draft: 'warn', 'not adopted': 'neutral' };
const LINK_TONE: Record<string, PillTone> = { approved: 'ok', under_review: 'warn', draft: 'warn', missing: 'neutral' };

export function AdministrationWorkspace() {
  const inst = useInstitution();
  const [data, setData] = React.useState<Data | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [msg, setMsg] = React.useState<string | null>(null);
  const load = React.useCallback(async () => {
    if (!inst.id) return;
    const r = await readJson<Data>(`/api/org/ministries/${inst.id}/administration`);
    if (r.error) { setErr(r.error); setData(null); return; }
    setErr(null); setData(r.data!);
  }, [inst.id]);
  React.useEffect(() => { void load(); }, [load]);
  const draft = async () => {
    const r = await fetch(`/api/org/ministries/${inst.id}/administration`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ op: 'draft-procedures' }) });
    const j = await r.json().catch(() => ({}));
    setMsg(r.ok ? `Drafted ${(j.drafted ?? []).length} procedure(s); ${(j.present ?? []).length} already there. A second official approves each under Laws → Procedures.` : j.error ?? `Refused (${r.status})`);
    await load();
  };
  const allProcs = data?.functions.flatMap(f => f.procedures) ?? [];
  const notAdopted = allProcs.filter(p => p.state === 'not adopted').length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <InstitutionPicker {...inst} />
        {inst.id ? <span className="flex flex-wrap gap-3 text-xs"><Link className="underline" href={`/gov/institutions/departments?institution=${inst.id}`}>Departments</Link><Link className="underline" href={`/gov/institutions/capabilities?institution=${inst.id}`}>What it has</Link></span> : null}
      </div>
      {err ? <p role="alert" className="text-sm text-alert">{err}</p> : null}
      {msg ? <p role="status" className="text-sm">{msg}</p> : null}
      {data ? (
        <>
          <p className="text-sm text-ink-muted">
            The internal administration of {data.institution.name}: its own records only. Decisions are taken in cases under its approved procedures;
            payroll is reviewed and approved by persons other than the one who prepared it, privileged access is time-limited and revocable,
            and personnel, legal-advice and disciplinary cases are restricted with every read logged. No pay scale, threshold or period is set here:
            each comes from the nation&apos;s approved rules (payroll deductions: {data.rules.payrollDeductions}).
          </p>
          <div className="flex flex-wrap items-center gap-3 rounded-[3px] border border-line bg-surface p-3 text-sm">
            <span>{allProcs.length - notAdopted} of {allProcs.length} internal administration procedures drafted or in force.</span>
            {notAdopted ? <Button onClick={() => void draft()}>Draft this institution&apos;s procedures</Button> : null}
            <Link className="text-xs underline" href="/gov/law/procedures">Approve them under Laws → Procedures</Link>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {data.functions.map(f => (
              <Section key={f.key} title={f.label} meta={`${f.departments.length} department(s) · ${f.forms.length} form(s)`}>
                <p className="text-xs text-ink-muted">{f.records}</p>
                <p className="mt-2 text-sm"><span className="text-ink-muted">Departments: </span>{f.departments.length ? f.departments.map(d => `${d.name}${d.office ? ` (${d.office})` : ''}`).join(', ') : <Link className="underline" href={`/gov/institutions/departments?institution=${data.institution.id}`}>none performs it yet: record which department does</Link>}</p>
                {f.procedures.length ? (
                  <ul className="mt-2 space-y-1 text-sm">
                    {f.procedures.map(p => (
                      <li key={p.key} className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{p.title}</span>
                        <Pill tone={STATE_TONE[p.state]}>{p.state}</Pill>
                        {p.sensitivity !== 'normal' ? <Pill>restricted</Pill> : null}
                        <span className="text-xs text-ink-muted">{p.forms.join(', ')} · {p.cases.open} open of {p.cases.total} case(s){Object.keys(p.cases.stages).length ? ` · ${Object.entries(p.cases.stages).map(([k, v]) => `${k} ${v}`).join(', ')}` : ''}</span>
                        {p.state === 'in force' ? <Link className="text-xs underline" href={`/gov/work/cases/open?procedure=${encodeURIComponent(p.key)}`}>Cases</Link> : null}
                      </li>
                    ))}
                  </ul>
                ) : <p className="mt-2 text-xs text-ink-muted">No decision procedure: its records are kept under the forms below.</p>}
                {f.forms.length ? (
                  <details className="mt-2 text-xs">
                    <summary className="cursor-pointer text-ink-soft">Forms ({f.forms.length})</summary>
                    <ul className="mt-1 space-y-0.5">
                      {f.forms.map(x => <li key={x.identity} className="flex flex-wrap items-center gap-2"><span className="font-mono">{x.id}</span> {x.title} <Pill tone={LINK_TONE[x.link] ?? 'neutral'}>procedure {x.link.replace('_', ' ')}</Pill></li>)}
                    </ul>
                  </details>
                ) : null}
              </Section>
            ))}
          </div>

          <Section title="Records" meta="its own; totals only">
            <div className="grid gap-4 text-sm lg:grid-cols-2">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">Payroll batches</h3>
                {data.records.payroll.length ? (
                  <ul className="mt-1 space-y-1">
                    {data.records.payroll.map(b => (
                      <li key={b.ref} className="rounded-[3px] border border-line-soft px-2 py-1">
                        <span className="font-medium">{b.ref}</span> · {b.period.from} to {b.period.to} · {b.employees} employees · <Pill tone={b.status === 'approved' ? 'ok' : 'warn'}>{b.status}</Pill>{b.sample ? <Pill className="ms-1">Sample</Pill> : null}
                        <span className="block text-xs text-ink-muted">Prepared by {b.preparedBy}{b.reviewedBy ? ` · reviewed by ${b.reviewedBy}` : ''}{b.approvedBy ? ` · approved by ${b.approvedBy}` : ''}{b.deductions ? ` · deductions: ${b.deductions}` : ''}</span>
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-xs text-ink-muted">None submitted.</p>}
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">Authorised establishment</h3>
                {data.records.positions.length ? <ul className="mt-1">{data.records.positions.map(p => <li key={p.id}>{p.count} × {p.title}{p.grade ? ` (${p.grade})` : ''} · {p.status} · {p.case}</li>)}</ul> : <p className="text-xs text-ink-muted">No position approved yet.</p>}
                <h3 className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">Privileged access</h3>
                {data.records.access.length ? <ul className="mt-1">{data.records.access.map(a => <li key={a.id}>{a.role} on {a.system} · {a.from} to {a.until} · {a.inForce ? 'in force' : a.status}</li>)}</ul> : <p className="text-xs text-ink-muted">None granted.</p>}
                <h3 className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">Internal policies</h3>
                {data.records.policies.length ? <ul className="mt-1">{data.records.policies.map(p => <li key={p.id}>{p.title} v{p.version} · {p.status}</li>)}</ul> : <p className="text-xs text-ink-muted">None approved.</p>}
                <h3 className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">Delegations of authority</h3>
                {data.records.delegations.length ? <ul className="mt-1">{data.records.delegations.map(d => <li key={d.id}>{d.delegator} to {d.delegate}: {d.actions.join(', ')} in {d.procedures.join(', ')} · {d.from}{d.until ? ` to ${d.until}` : ''} · {d.basis.join('; ')}{d.revoked ? ` · revoked ${d.revoked.at.slice(0, 10)}` : ''}</li>)}</ul> : <p className="text-xs text-ink-muted">None recorded.</p>}
              </div>
            </div>
          </Section>
        </>
      ) : !err ? <p className="text-sm text-ink-muted">Reading the internal administration…</p> : null}
    </div>
  );
}
