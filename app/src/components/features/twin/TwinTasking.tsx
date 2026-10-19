'use client';

// Device tasks on the Facts and sources tab of National data (/gov/twin):
// what the device behind a readings stream can be asked to do (a tasking
// capability, declared by an administrator with the gateway that carries it
// out) and the tasks officials have asked for, with each step the gateway
// reported (lib/twin/tasking.ts, /api/twin/tasking). A task is made only by a
// signed-in official allowed to task devices, with a reason; the platform
// never carries a task out itself; the gateway collects it and reports back.

import * as React from 'react';

type Kind = 'number' | 'text' | 'choice' | 'boolean';
interface Param { name: string; label: string; kind: Kind; unit?: string; min?: number; max?: number; choices?: string[]; required: boolean }
interface Capability { id: string; sourceId: string; name: string; description: string; actuator: { name: string }; integrationId: string; parameters: Param[]; declaredBy: string; declaredAt: string; retired?: { at: string; by: string; reason: string } }
interface Task { id: string; capabilityId: string; parameters: Record<string, string | number | boolean>; reason: string; createdBy: string; createdAt: string; status: string; history: { status: string; at: string; by: string; note?: string }[] }
interface Integration { id: string; name: string; status: string; scopes: string[] }

const input = 'w-full rounded-[3px] border border-line bg-surface-2 px-2.5 py-2 text-[13px] text-ink placeholder:text-ink-muted focus-ring';
const label = 'block text-[12px] font-semibold text-ink-soft';
const btn = 'focus-ring rounded-[3px] border border-line px-3 py-1.5 text-[13px] font-semibold text-ink hover:bg-surface-2 disabled:opacity-50';
const when = (iso?: string) => (iso ? new Date(iso).toISOString().slice(0, 16).replace('T', ' ') + ' UTC' : '—');
const STATUS_TONE: Record<string, string> = { completed: 'text-ok', accepted: 'text-ok', 'in-progress': 'text-ok', rejected: 'text-alert', failed: 'text-alert', cancelled: 'text-ink-muted', created: 'text-warn', delivered: 'text-warn' };
const STATUS_WORD: Record<string, string> = { created: 'Waiting for the gateway', delivered: 'Collected by the gateway', accepted: 'Accepted', rejected: 'Refused by the gateway', 'in-progress': 'Under way', completed: 'Done', failed: 'Failed', cancelled: 'Cancelled' };
const FINAL = ['rejected', 'completed', 'failed', 'cancelled'];

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, { ...init, headers: { 'content-type': 'application/json' }, cache: 'no-store' });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((d as { error?: string }).error ?? `Request failed (${r.status})`);
  return d as T;
}

const blankParam = (): Param & { choicesText: string } => ({ name: '', label: '', kind: 'number', unit: '', required: true, choicesText: '' });

export function TwinTasking({ sources, by }: { sources: { id: string; name: string; kind: string }[]; by: string }) {
  const [caps, setCaps] = React.useState<Capability[]>([]);
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [integrations, setIntegrations] = React.useState<Integration[]>([]);
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = React.useState(false);
  const streams = sources.filter(s => s.kind === 'stream');
  const sourceName = new Map(sources.map(s => [s.id, s.name]));

  const load = React.useCallback(async () => {
    const [c, t] = await Promise.all([call<{ capabilities: Capability[] }>('/api/twin/tasking/capabilities'), call<{ tasks: Task[] }>('/api/twin/tasking/tasks')]);
    setCaps(c.capabilities); setTasks(t.tasks);
    // The gateways an administrator may name (approved, holding sta:task); read-only for others.
    void call<{ integrations: Integration[] }>('/api/integrations').then(r => setIntegrations(r.integrations.filter(i => i.status === 'approved' && i.scopes.includes('sta:task')))).catch(() => setIntegrations([]));
  }, []);
  React.useEffect(() => { void load().catch(e => setMsg({ ok: false, text: (e as Error).message })); }, [load]);

  async function act(done: string, fn: () => Promise<unknown>) {
    setBusy(true); setMsg(null);
    try { await fn(); setMsg({ ok: true, text: done }); await load(); }
    catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
    finally { setBusy(false); }
  }

  const live = caps.filter(c => !c.retired);
  return (
    <section className="rounded-[3px] border border-line bg-surface p-4" aria-labelledby="twin-tasking-title">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="twin-tasking-title" className="text-[13px] font-bold uppercase tracking-[0.14em] text-ink">Device tasks</h2>
        <div className="text-[12px] text-ink-muted">carried out by the gateway, never by the platform · named official · audited</div>
      </div>
      <p className="mb-3 max-w-3xl text-[12px] text-ink-soft">
        An administrator declares what the device behind a readings stream can be asked to do, and which gateway carries it out.
        Officials who can sign then ask for a task with a reason; the gateway collects it with its own key and reports each step here.
      </p>
      {msg ? <p role="status" className={`mb-2 text-[13px] ${msg.ok ? 'text-ok' : 'text-alert'}`}>{msg.text}</p> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <NewTask caps={live} sourceName={sourceName} busy={busy} act={act} />
        <Declare streams={streams} integrations={integrations} by={by} busy={busy} act={act} />
      </div>

      <h3 className="mt-4 text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-soft">What devices can be asked to do</h3>
      {caps.length ? (
        <ul className="mt-1 divide-y divide-line">
          {caps.map(c => <CapabilityRow key={c.id} c={c} source={sourceName.get(c.sourceId) ?? c.sourceId} by={by} busy={busy} act={act} />)}
        </ul>
      ) : <p className="mt-1 text-ink-soft">Nothing declared yet.</p>}

      <h3 className="mt-4 text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-soft">Tasks</h3>
      {tasks.length ? (
        <ul className="mt-1 space-y-2">
          {tasks.slice(0, 30).map(t => <TaskRow key={t.id} t={t} cap={caps.find(c => c.id === t.capabilityId)} busy={busy} act={act} />)}
        </ul>
      ) : <p className="mt-1 text-ink-soft">No tasks yet.</p>}
    </section>
  );
}

function Declare({ streams, integrations, by, busy, act }: { streams: { id: string; name: string }[]; integrations: Integration[]; by: string; busy: boolean; act: (done: string, fn: () => Promise<unknown>) => Promise<void> }) {
  const [f, setF] = React.useState({ sourceId: '', name: '', description: '', actuator: '', integrationId: '' });
  const [params, setParams] = React.useState([blankParam()]);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => { const v = e.currentTarget.value; setF(x => ({ ...x, [k]: v })); };
  const setP = (i: number, k: string, v: unknown) => setParams(ps => ps.map((p, j) => (j === i ? { ...p, [k]: v } : p)));
  const sourceId = f.sourceId || streams[0]?.id || '';
  const integrationId = f.integrationId || integrations[0]?.id || '';
  const submit = () => act('Capability declared', () => call('/api/twin/tasking/capabilities', {
    method: 'POST',
    body: JSON.stringify({
      by, sourceId, name: f.name, description: f.description, actuator: { name: f.actuator }, integrationId,
      parameters: params.filter(p => p.name.trim()).map(p => ({
        name: p.name.trim(), label: p.label.trim() || p.name.trim(), kind: p.kind, required: p.required,
        ...(p.kind === 'number' ? { unit: p.unit || undefined, min: p.min, max: p.max } : {}),
        ...(p.kind === 'choice' ? { choices: p.choicesText.split(',').map(x => x.trim()).filter(Boolean) } : {}),
      })),
    }),
  }));
  return (
    <form className="rounded-[3px] border border-line p-3" onSubmit={e => { e.preventDefault(); void submit(); }}>
      <h3 className="text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-soft">Declare what a device can do <span className="normal-case tracking-normal text-ink-muted">(administrators)</span></h3>
      {!streams.length ? <p className="mt-1 text-ink-soft">Register a readings stream source first.</p> : (
        <div className="mt-2 grid gap-2 md:grid-cols-2">
          <label><span className={label}>Readings stream</span>
            <select className={`${input} mt-1`} value={sourceId} onChange={set('sourceId')}>{streams.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
          </label>
          <label><span className={label}>Gateway that carries it out</span>
            {integrations.length
              ? <select className={`${input} mt-1`} value={integrationId} onChange={set('integrationId')}>{integrations.map(i => <option key={i.id} value={i.id}>{i.name} ({i.id})</option>)}</select>
              : <input className={`${input} mt-1`} value={f.integrationId} onChange={set('integrationId')} placeholder="Integration id, e.g. IC-1A2B3C" />}
            <span className="mt-0.5 block text-[12px] text-ink-muted">An approved integration holding the permission sta:task.</span>
          </label>
          <label><span className={label}>What it can be asked to do</span><input className={`${input} mt-1`} value={f.name} onChange={set('name')} placeholder="Change the sampling interval" /></label>
          <label><span className={label}>Device</span><input className={`${input} mt-1`} value={f.actuator} onChange={set('actuator')} placeholder="River gauge logger" /></label>
          <label className="md:col-span-2"><span className={label}>Description (optional)</span><input className={`${input} mt-1`} value={f.description} onChange={set('description')} /></label>
          <fieldset className="md:col-span-2">
            <legend className={label}>Values a task gives</legend>
            {params.map((p, i) => (
              <div key={i} className="mt-1 grid grid-cols-2 gap-1 md:grid-cols-6">
                <input className={input} aria-label="Name" value={p.name} onChange={e => setP(i, 'name', e.currentTarget.value)} placeholder="intervalSeconds" />
                <input className={input} aria-label="Label" value={p.label} onChange={e => setP(i, 'label', e.currentTarget.value)} placeholder="Sampling interval" />
                <select className={input} aria-label="Kind" value={p.kind} onChange={e => setP(i, 'kind', e.currentTarget.value)}>
                  <option value="number">Number</option><option value="choice">One of a list</option><option value="text">Text</option><option value="boolean">Yes or no</option>
                </select>
                {p.kind === 'number' ? <>
                  <input className={input} aria-label="Unit" value={p.unit ?? ''} onChange={e => setP(i, 'unit', e.currentTarget.value)} placeholder="unit, e.g. s" />
                  <span className="flex gap-1">
                    <input className={input} aria-label="Lowest" inputMode="decimal" value={p.min ?? ''} onChange={e => setP(i, 'min', e.currentTarget.value === '' ? undefined : Number(e.currentTarget.value))} placeholder="min" />
                    <input className={input} aria-label="Highest" inputMode="decimal" value={p.max ?? ''} onChange={e => setP(i, 'max', e.currentTarget.value === '' ? undefined : Number(e.currentTarget.value))} placeholder="max" />
                  </span>
                </> : p.kind === 'choice' ? <input className={`${input} md:col-span-2`} aria-label="Values" value={p.choicesText} onChange={e => setP(i, 'choicesText', e.currentTarget.value)} placeholder="normal, flood" /> : <span className="md:col-span-2" />}
                <label className="flex items-center gap-1 text-[12px] text-ink-soft"><input type="checkbox" checked={p.required} onChange={e => setP(i, 'required', e.currentTarget.checked)} /> Required</label>
              </div>
            ))}
            <button type="button" className={`${btn} mt-1`} onClick={() => setParams(ps => [...ps, blankParam()])}>Add a value</button>
          </fieldset>
          <div><button className={btn} disabled={busy || !by.trim() || !f.name.trim() || !integrationId}>Declare</button></div>
        </div>
      )}
    </form>
  );
}

function NewTask({ caps, sourceName, busy, act }: { caps: Capability[]; sourceName: Map<string, string>; busy: boolean; act: (done: string, fn: () => Promise<unknown>) => Promise<void> }) {
  const [capId, setCapId] = React.useState('');
  const [values, setValues] = React.useState<Record<string, string | boolean>>({});
  const [reason, setReason] = React.useState('');
  const cap = caps.find(c => c.id === capId) ?? caps[0];
  const submit = () => act('Task created; the gateway collects it on its next call', () => call('/api/twin/tasking/tasks', {
    method: 'POST',
    body: JSON.stringify({
      capabilityId: cap!.id, reason,
      parameters: Object.fromEntries(cap!.parameters.filter(p => values[p.name] !== undefined && values[p.name] !== '').map(p => [p.name, p.kind === 'number' ? Number(values[p.name]) : values[p.name]])),
    }),
  }));
  return (
    <form className="rounded-[3px] border border-line p-3" onSubmit={e => { e.preventDefault(); void submit(); }}>
      <h3 className="text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-soft">Ask a device for a task <span className="normal-case tracking-normal text-ink-muted">(signed-in officials who can sign)</span></h3>
      {!cap ? <p className="mt-1 text-ink-soft">No device can be tasked yet.</p> : (
        <div className="mt-2 grid gap-2">
          <label><span className={label}>Task</span>
            <select className={`${input} mt-1`} value={cap.id} onChange={e => { setCapId(e.currentTarget.value); setValues({}); }}>
              {caps.map(c => <option key={c.id} value={c.id}>{c.name} · {sourceName.get(c.sourceId) ?? c.sourceId}</option>)}
            </select>
          </label>
          {cap.parameters.map(p => (
            <label key={p.name}><span className={label}>{p.label}{p.unit ? ` (${p.unit})` : ''}{p.required ? '' : ' (optional)'}</span>
              {p.kind === 'choice' ? (
                <select className={`${input} mt-1`} value={String(values[p.name] ?? '')} onChange={e => setValues(v => ({ ...v, [p.name]: e.currentTarget.value }))}>
                  <option value="">—</option>{p.choices!.map(c => <option key={c}>{c}</option>)}
                </select>
              ) : p.kind === 'boolean' ? (
                <input type="checkbox" className="ms-2" checked={values[p.name] === true} onChange={e => setValues(v => ({ ...v, [p.name]: e.currentTarget.checked }))} />
              ) : (
                <input className={`${input} mt-1`} inputMode={p.kind === 'number' ? 'decimal' : undefined} value={String(values[p.name] ?? '')} onChange={e => setValues(v => ({ ...v, [p.name]: e.currentTarget.value }))}
                  placeholder={p.kind === 'number' && (p.min !== undefined || p.max !== undefined) ? `${p.min ?? ''} to ${p.max ?? ''}` : undefined} />
              )}
            </label>
          ))}
          <label><span className={label}>Why</span><input className={`${input} mt-1`} value={reason} onChange={e => setReason(e.currentTarget.value)} placeholder="e.g. flood watch: readings every minute until the warning is lifted" /></label>
          <div><button className={btn} disabled={busy || reason.trim().length < 4}>Create task</button></div>
        </div>
      )}
    </form>
  );
}

function CapabilityRow({ c, source, by, busy, act }: { c: Capability; source: string; by: string; busy: boolean; act: (done: string, fn: () => Promise<unknown>) => Promise<void> }) {
  const [reason, setReason] = React.useState('');
  const [open, setOpen] = React.useState(false);
  return (
    <li className="py-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span><span className="font-semibold">{c.name}</span> · {source} · {c.actuator.name}</span>
        <span className="font-mono text-[12px] text-ink-muted">{c.id} · gateway {c.integrationId} · declared {when(c.declaredAt)} by {c.declaredBy}</span>
      </div>
      <div className="text-[12px] text-ink-soft">Takes {c.parameters.map(p => `${p.label}${p.kind === 'number' && (p.min !== undefined || p.max !== undefined) ? ` ${p.min ?? '…'} to ${p.max ?? '…'}` : ''}${p.unit ? ` ${p.unit}` : ''}${p.kind === 'choice' ? ` (${p.choices!.join(', ')})` : ''}${p.required ? '' : ' (optional)'}`).join('; ')}</div>
      {c.retired ? <p className="text-[12px] text-warn">Retired {when(c.retired.at)} by {c.retired.by}: {c.retired.reason}</p>
        : !open ? <button type="button" className={`${btn} mt-1`} disabled={busy || !by.trim()} title="Administrators only" onClick={() => setOpen(true)}>Retire</button>
        : (
          <form className="mt-1 flex flex-wrap items-end gap-2" onSubmit={e => { e.preventDefault(); void act(`${c.name} retired`, () => call(`/api/twin/tasking/capabilities/${encodeURIComponent(c.id)}/retire`, { method: 'POST', body: JSON.stringify({ by, reason }) })); }}>
            <label className="min-w-[14rem] flex-1"><span className={label}>Why is it retired?</span><input className={`${input} mt-1`} value={reason} onChange={e => setReason(e.currentTarget.value)} /></label>
            <button className={btn} disabled={busy || reason.trim().length < 4}>Retire</button>
            <button type="button" className={btn} onClick={() => setOpen(false)}>Cancel</button>
          </form>
        )}
    </li>
  );
}

function TaskRow({ t, cap, busy, act }: { t: Task; cap?: Capability; busy: boolean; act: (done: string, fn: () => Promise<unknown>) => Promise<void> }) {
  const [reason, setReason] = React.useState('');
  return (
    <li className="rounded-[3px] border border-line px-3 py-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span><span className={`font-semibold ${STATUS_TONE[t.status] ?? 'text-ink'}`}>{STATUS_WORD[t.status] ?? t.status}</span> · {cap?.name ?? t.capabilityId} · {Object.entries(t.parameters).map(([k, v]) => `${cap?.parameters.find(p => p.name === k)?.label ?? k} ${String(v)}${cap?.parameters.find(p => p.name === k)?.unit ? ` ${cap.parameters.find(p => p.name === k)!.unit}` : ''}`).join(', ') || 'no values'}</span>
        <span className="font-mono text-[12px] text-ink-muted">{t.id} · {when(t.createdAt)} · {t.createdBy}</span>
      </div>
      <p className="text-[12px] text-ink-soft">Why: {t.reason}</p>
      <details className="mt-1">
        <summary className="cursor-pointer text-[12px] text-ink-soft">{t.history.length} steps</summary>
        <ol className="mt-1 space-y-0.5 text-[12px] text-ink-soft">{t.history.map((h, i) => <li key={i}>{when(h.at)} · {STATUS_WORD[h.status] ?? h.status} · {h.by}{h.note ? ` · ${h.note}` : ''}</li>)}</ol>
      </details>
      {!FINAL.includes(t.status) ? (
        <form className="mt-1 flex flex-wrap items-end gap-2" onSubmit={e => { e.preventDefault(); void act(`Task ${t.id} cancelled`, () => call(`/api/twin/tasking/tasks/${encodeURIComponent(t.id)}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) })); }}>
          <label className="min-w-[14rem] flex-1"><span className={label}>Cancel it: why?</span><input className={`${input} mt-1`} value={reason} onChange={e => setReason(e.currentTarget.value)} /></label>
          <button className={btn} disabled={busy || reason.trim().length < 4}>Cancel task</button>
        </form>
      ) : null}
    </li>
  );
}
