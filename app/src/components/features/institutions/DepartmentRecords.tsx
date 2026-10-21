'use client';

// An institution's departments as records (plan I2; lib/institution/departments.ts):
// each with its accountable office, functions, services, staff and every
// version. During first-run setup a change is recorded at once; afterwards one
// administrator proposes it and a different official confirms it (an
// independent institution's own officials). An ended department is kept with
// its reason. Holding the office or serving in the department grants no
// permission.

import * as React from 'react';
import Link from 'next/link';
import { Section } from '@/components/ui/DataSystem';
import { Pill } from '@/components/ui/Pill';
import { Button } from '@/components/ui/Button';
import { useInstitution, InstitutionPicker, readJson } from './InstitutionPicker';

interface Version { version: number; at: string; change: string; by: string; confirmedBy?: string; reason?: string; status: string; name: string; office?: string; functions: string[]; staff: string[]; services: { name: string; procedure?: string }[] }
interface Dept {
  id: string; name: string; status: 'active' | 'ended'; version: number; office?: string; officeTitle?: string; officeProblem?: string;
  functions: string[]; services: { name: string; procedure?: string }[]; serviceStates: { name: string; procedure?: string; state: string }[];
  staffNames: { id: string; name: string; office?: string; role?: string; problem?: string }[]; ended?: { at?: string; by?: string; reason?: string }; history: Version[];
}
interface Pending { values: { kind: string; department?: string; terms?: Record<string, unknown>; reason: string }; by: string; at: string; expiresAt: string }
interface Data {
  institution: { id: string; name: string }; departments: Dept[]; pending: Pending | null; history: { values: Pending['values']; by: string; at: string; outcome: string; confirmed?: { by: string } }[];
  setupRunning: boolean; confirmByInstitution: boolean;
  choices: { functions: { key: string; label: string }[]; offices: { id: string; title: string }[]; staff: { id: string; name: string; office: string }[]; procedures: string[] };
}

const field = 'mt-1 w-full rounded-[3px] border border-line bg-surface px-2 py-1 text-sm';

export function DepartmentRecords() {
  const inst = useInstitution();
  const [data, setData] = React.useState<Data | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [sel, setSel] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({ kind: 'amend', name: '', office: '', functions: [] as string[], staff: [] as string[], services: '', reason: '' });

  const load = React.useCallback(async () => {
    if (!inst.id) return;
    const r = await readJson<Data>(`/api/org/ministries/${inst.id}/departments`);
    if (r.error) { setErr(r.error); setData(null); return; }
    setErr(null); setData(r.data!);
    setSel(s => (s && r.data!.departments.some(d => d.id === s) ? s : r.data!.departments[0]?.id ?? null));
  }, [inst.id]);
  React.useEffect(() => { void load(); }, [load]);

  const current = data?.departments.find(d => d.id === sel) ?? null;
  React.useEffect(() => {
    if (current) setForm(f => ({ ...f, name: current.name, office: current.office ?? '', functions: current.functions, staff: current.staffNames.map(s => s.id), services: current.services.map(s => (s.procedure ? `${s.name} | ${s.procedure}` : s.name)).join('\n') }));
  }, [current?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const post = async (body: Record<string, unknown>, done: string) => {
    setMsg(null);
    const r = await fetch(`/api/org/ministries/${inst.id}/departments`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    setMsg(r.ok ? (r.status === 202 ? 'Proposed: a different official confirms it before it applies.' : done) : (j.error ?? `Refused (${r.status})`));
    await load();
  };
  const change = () => {
    const terms = form.kind === 'end' ? undefined : {
      name: form.name, office: form.office || null, functions: form.functions, staff: form.staff,
      services: form.services.split('\n').map(l => l.trim()).filter(Boolean).map(l => { const [name, procedure] = l.split('|').map(x => x.trim()); return { name, ...(procedure ? { procedure } : {}) }; }),
    };
    return { kind: form.kind, ...(form.kind !== 'establish' && current ? { department: current.id } : {}), ...(terms ? { terms } : {}), reason: form.reason };
  };
  const label = (k: string) => data?.choices.functions.find(f => f.key === k)?.label ?? k;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <InstitutionPicker {...inst} />
        {inst.id ? <span className="flex flex-wrap gap-3 text-xs"><Link className="underline" href={`/gov/institutions/administration?institution=${inst.id}`}>Internal administration</Link><Link className="underline" href={`/gov/institutions/completeness?institution=${inst.id}`}>Readiness by item</Link></span> : null}
      </div>
      {err ? <p role="alert" className="text-sm text-alert">{err}</p> : null}
      {msg ? <p role="status" className="text-sm">{msg}</p> : null}
      {data ? (
        <>
          <p className="text-sm text-ink-muted">
            Each department is a record: the office accountable for it, the functions it performs, the services it delivers and who serves in it, with every version kept.
            {data.setupRunning ? ' Setup is running: changes are recorded at once.' : ' Changes are proposed by one administrator and confirmed by a different official'}{!data.setupRunning && data.confirmByInstitution ? ' of this institution, which is independent.' : !data.setupRunning ? '.' : ''}
            {' '}Holding the office or serving in the department grants no permission.
          </p>
          {data.pending ? (
            <div className="rounded-[3px] border border-line bg-surface p-3 text-sm">
              <p><strong>Waiting for a second official:</strong> {data.pending.values.kind} {data.pending.values.terms?.name as string ?? data.departments.find(d => d.id === data.pending!.values.department)?.name ?? ''} · {data.pending.values.reason}</p>
              <p className="text-xs text-ink-muted">Proposed by {data.pending.by} on {data.pending.at.slice(0, 16).replace('T', ' ')}; lapses {data.pending.expiresAt.slice(0, 16).replace('T', ' ')}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button onClick={() => void post({ op: 'confirm' }, 'Confirmed: the change applies.')}>Confirm</Button>
                <Button variant="secondary" onClick={() => void post({ op: 'withdraw', reason: 'Withdrawn' }, 'Withdrawn (kept in the history).')}>Withdraw</Button>
              </div>
            </div>
          ) : null}
          <div className="grid gap-4 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
            <Section title="Departments" meta={`${data.departments.filter(d => d.status === 'active').length} in operation`}>
              <ul className="space-y-1">
                {data.departments.map(d => (
                  <li key={d.id}>
                    <button type="button" onClick={() => setSel(d.id)} aria-current={d.id === sel ? 'true' : undefined}
                      className={`w-full rounded-[3px] border px-2 py-1.5 text-start text-sm ${d.id === sel ? 'border-ink bg-surface' : 'border-line bg-surface hover:bg-surface-2'}`}>
                      <span className="block font-medium">{d.name}</span>
                      <span className="block text-xs text-ink-muted">{d.status === 'ended' ? 'Ended (kept)' : d.officeTitle ?? 'No accountable office yet'} · v{d.version}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </Section>
            {current ? (
              <Section title={current.name} meta={<span className="flex gap-2"><Pill tone={current.status === 'active' ? 'ok' : 'neutral'}>{current.status === 'active' ? 'In operation' : 'Ended'}</Pill><Pill>Version {current.version}</Pill></span>}>
                <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[minmax(0,180px)_minmax(0,1fr)]">
                  <dt className="text-ink-muted">Accountable office</dt>
                  <dd>{current.officeTitle ?? <span className="text-ink-muted">None recorded</span>}{current.officeProblem ? <span className="block text-xs text-alert">{current.officeProblem}</span> : null}</dd>
                  <dt className="text-ink-muted">Functions</dt>
                  <dd>{current.functions.length ? current.functions.map(label).join(', ') : <span className="text-ink-muted">None recorded</span>}</dd>
                  <dt className="text-ink-muted">Services</dt>
                  <dd>{current.serviceStates.length ? <ul>{current.serviceStates.map(s => <li key={s.name}>{s.name}{s.procedure ? <span className="text-xs text-ink-muted"> · {s.procedure} ({s.state})</span> : null}</li>)}</ul> : <span className="text-ink-muted">None recorded</span>}</dd>
                  <dt className="text-ink-muted">Staff</dt>
                  <dd>{current.staffNames.length ? <ul>{current.staffNames.map(s => <li key={s.id}>{s.name}<span className="text-xs text-ink-muted">{s.office ? ` · ${s.office}` : ''}{s.problem ? ` · ${s.problem}` : ''}</span></li>)}</ul> : <span className="text-ink-muted">None recorded</span>}</dd>
                  {current.ended ? (<><dt className="text-ink-muted">Ended</dt><dd>{current.ended.at?.slice(0, 10)} by {current.ended.by}: {current.ended.reason}</dd></>) : null}
                </dl>
                <h3 className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">History</h3>
                {current.history.length ? (
                  <ol className="mt-1 space-y-1 text-xs">
                    {[...current.history].reverse().map(h => (
                      <li key={h.version} className="rounded-[3px] border border-line-soft bg-surface-2/40 px-2 py-1">
                        <span className="font-medium">v{h.version} · {h.change}</span> · {h.at.slice(0, 10)} · {h.by}{h.confirmedBy ? `, confirmed by ${h.confirmedBy}` : ''}{h.reason ? ` · ${h.reason}` : ''}
                      </li>
                    ))}
                  </ol>
                ) : <p className="text-xs text-ink-muted">Recorded before departments kept versions: the first change starts its history.</p>}
              </Section>
            ) : <p className="text-sm text-ink-muted">No department recorded.</p>}
          </div>

          <Section title={data.setupRunning ? 'Record a change' : 'Propose a change'}>
            <div className="grid gap-3 text-sm md:grid-cols-2">
              <label>Change
                <select className={field} value={form.kind} onChange={e => setForm({ ...form, kind: e.target.value })}>
                  <option value="amend">Amend {current?.name ?? 'the selected department'}</option>
                  <option value="establish">Establish a new department</option>
                  <option value="end">End {current?.name ?? 'the selected department'} (kept, with its reason)</option>
                </select>
              </label>
              {form.kind !== 'end' ? (
                <>
                  <label>Name<input className={field} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
                  <label>Accountable office
                    <select className={field} value={form.office} onChange={e => setForm({ ...form, office: e.target.value })}>
                      <option value="">None</option>
                      {data.choices.offices.map(o => <option key={o.id} value={o.id}>{o.title}</option>)}
                    </select>
                  </label>
                  <fieldset className="md:col-span-2">
                    <legend>Functions</legend>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                      {data.choices.functions.map(f => (
                        <label key={f.key} className="flex items-center gap-1.5 text-xs">
                          <input type="checkbox" checked={form.functions.includes(f.key)} onChange={e => setForm({ ...form, functions: e.target.checked ? [...form.functions, f.key] : form.functions.filter(x => x !== f.key) })} />{f.label}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <fieldset className="md:col-span-2">
                    <legend>Staff (official accounts of this institution)</legend>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                      {data.choices.staff.length ? data.choices.staff.map(a => (
                        <label key={a.id} className="flex items-center gap-1.5 text-xs">
                          <input type="checkbox" checked={form.staff.includes(a.id)} onChange={e => setForm({ ...form, staff: e.target.checked ? [...form.staff, a.id] : form.staff.filter(x => x !== a.id) })} />{a.name} · {a.office}
                        </label>
                      )) : <span className="text-xs text-ink-muted">No official accounts of this institution yet.</span>}
                    </div>
                  </fieldset>
                  <label className="md:col-span-2">Services (one per line; “name | procedure key” where a procedure carries it)
                    <textarea className={field} rows={3} value={form.services} onChange={e => setForm({ ...form, services: e.target.value })} />
                  </label>
                </>
              ) : null}
              <label className="md:col-span-2">Reason (kept with the history)<input className={field} value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} /></label>
            </div>
            <div className="mt-3">
              <Button onClick={() => void post({ op: data.setupRunning ? 'record' : 'propose', change: change() }, 'Recorded.')}>{data.setupRunning ? 'Record' : 'Propose'}</Button>
            </div>
          </Section>
        </>
      ) : !err ? <p className="text-sm text-ink-muted">Reading the departments…</p> : null}
    </div>
  );
}
