'use client';

// The publisher's side of the support desk: the queue across nations (most
// urgent first, SLA timers), working a ticket, each nation's contract tier,
// and service incidents / planned maintenance that feed status pages.

import * as React from 'react';
import { api } from '@/lib/api/client';
import { inputCls, Select, goldBtn, goldStyle, ghostBtn, hair, CHAMPAGNE } from '@/components/features/onboarding/Chrome';
import type { ServiceIncident, SupportTier, TicketPriority, TicketView } from '@/lib/api/types';
import { Chip, ErrorLine, Panel, fmtDateTime, useActor } from './ui';
import { IMPACT_TEXT, IMPACT_TONE, PRIORITY_TONE, SlaTimer } from './SupportCenter';

type Queue = Awaited<ReturnType<typeof api.updates.publisher.support>>;

export function PublisherSupportQueue() {
  const [d, setD] = React.useState<Queue | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const load = React.useCallback(() => { api.updates.publisher.support().then(setD).catch(e => setErr(e instanceof Error ? e.message : 'Could not load the queue')); }, []);
  React.useEffect(load, [load]);
  const [showDone, setShowDone] = React.useState(false);
  if (!d) return <div className="min-h-[200px]"><ErrorLine>{err}</ErrorLine></div>;
  const open = d.tickets.filter(t => t.state !== 'resolved' && t.state !== 'closed');
  const breached = open.filter(t => t.sla.response.state === 'breached' && !t.firstResponseAt || t.sla.resolution.state === 'breached').length;
  const shown = showDone ? d.tickets : open;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Chip tone="#a9c7e8">{open.length} open</Chip>
        <Chip tone="#f1938f" solid={breached > 0}>{breached} breaching</Chip>
        <Chip tone="#f1b36b">{open.filter(t => t.priority === 'P1' || t.priority === 'P2').length} P1–P2</Chip>
        <button type="button" onClick={() => setShowDone(s => !s)} className="ml-auto font-mono text-[10px] uppercase tracking-[0.18em] text-white/45 hover:text-[#f4e4bd]">{showDone ? 'Hide' : 'Show'} resolved</button>
      </div>
      {shown.map(t => <QueueItem key={t.id} t={t} onDone={load} />)}
      {!shown.length ? <p className="text-[13px] font-light text-white/50">The queue is empty.</p> : null}
      <TierEditor d={d} onDone={load} />
    </div>
  );
}

function QueueItem({ t, onDone }: { t: TicketView; onDone: () => void }) {
  const [actor] = useActor();
  const [open, setOpen] = React.useState(false);
  const [text, setText] = React.useState('');
  const [priority, setPriority] = React.useState<TicketPriority>(t.priority);
  const [err, setErr] = React.useState<string | null>(null);
  const done = t.state === 'resolved' || t.state === 'closed';
  async function act(action: string) {
    setErr(null);
    if (!actor.trim()) { setErr('Enter your name above first.'); return; }
    try { await api.updates.publisher.ticketAction(t.id, { action, by: actor, text: text || undefined, priority: action === 'reprioritise' ? priority : undefined }); setText(''); onDone(); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Action failed'); }
  }
  return (
    <Panel className="min-w-0 px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="font-mono text-[11px] text-white/45">{t.id}</span>
        <Chip tone={PRIORITY_TONE[t.priority]} solid={t.priority === 'P1' && !done}>{t.priority}</Chip>
        <span className="text-[12px] text-[#d9c398]/80">{t.nationName}</span>
        <span className="min-w-0 flex-1 text-[14px] font-light text-[#f3efe6]">{t.title}</span>
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/50">{t.state}</span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <SlaTimer label="Response" c={t.sla.response} />
        <SlaTimer label="Resolution" c={t.sla.resolution} />
        <span className="font-mono text-[10.5px] text-white/40">{t.tier} · {fmtDateTime(t.openedAt)}{t.link ? ` · ${t.link.kind} ${t.link.id}` : ''}</span>
        {t.source === 'fallback-incident' ? <Chip tone="#c9b6ff">Automatic</Chip> : null}
        <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} className="ml-auto font-mono text-[10px] uppercase tracking-[0.18em] text-white/45 hover:text-[#f4e4bd]">{open ? 'Close' : 'Work'}</button>
      </div>
      {open ? (
        <div className="mt-3">
          <ol className="grid gap-1.5">
            {t.thread.map((m, i) => (
              <li key={i} className="text-[12.5px] font-light text-white/70"><span className="font-mono text-[10px] text-white/40">{fmtDateTime(m.at)} · {m.by}{m.side === 'publisher' ? ' (us)' : ''}</span> — {m.text}</li>
            ))}
          </ol>
          {!done || t.state === 'resolved' ? (
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <textarea aria-label="Message" className={`${inputCls} min-h-[44px] min-w-[220px] flex-1 py-2 text-[13px]`} value={text} onChange={e => setText(e.target.value)} placeholder="Message to the nation" />
              <button type="button" className={`${goldBtn} px-4 py-2 text-[12.5px]`} style={goldStyle} onClick={() => act('reply')}>Reply</button>
              {!done ? (
                <>
                  {t.state === 'open' ? <button type="button" className={`${ghostBtn} py-2 text-[12.5px]`} onClick={() => act('acknowledge')}>Acknowledge</button> : null}
                  {t.state !== 'in-progress' ? <button type="button" className={`${ghostBtn} py-2 text-[12.5px]`} onClick={() => act('progress')}>In progress</button> : null}
                  {t.state !== 'waiting-on-nation' ? <button type="button" className={`${ghostBtn} py-2 text-[12.5px]`} onClick={() => act('wait')}>Wait on nation</button> : null}
                  <button type="button" className={`${ghostBtn} py-2 text-[12.5px]`} onClick={() => act('resolve')}>Resolve</button>
                  <Select aria-label="Priority" value={priority} onChange={e => setPriority(e.target.value as TicketPriority)} className="w-auto py-2 text-[12.5px]">
                    {(['P1', 'P2', 'P3', 'P4'] as TicketPriority[]).map(p => <option key={p} value={p}>{p}</option>)}
                  </Select>
                  <button type="button" className="px-2 text-[12px] text-white/50 hover:text-[#f4e4bd]" onClick={() => act('reprioritise')}>Change priority</button>
                </>
              ) : null}
            </div>
          ) : null}
          <div className="min-h-[16px]"><ErrorLine>{err}</ErrorLine></div>
        </div>
      ) : null}
    </Panel>
  );
}

function TierEditor({ d, onDone }: { d: Queue; onDone: () => void }) {
  const [actor] = useActor();
  const [err, setErr] = React.useState<string | null>(null);
  async function set(nationId: string, tier: SupportTier) {
    setErr(null);
    if (!actor.trim()) { setErr('Enter your name above first.'); return; }
    try { await api.updates.publisher.supportAction({ action: 'set-tier', nationId, tier, by: actor }); onDone(); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Could not change the tier'); }
  }
  return (
    <div className="mt-2">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#d9c398]/70">Contract tiers</p>
      <div className="mt-2 flex flex-wrap gap-3">
        {d.nations.map(n => (
          <label key={n.id} className="flex items-center gap-2 text-[12.5px] font-light text-white/65">
            {n.name}
            <Select value={n.tier} onChange={e => set(n.id, e.target.value as SupportTier)} className="w-auto py-1.5 text-[12.5px]">
              {(Object.keys(d.tiers) as SupportTier[]).map(t => <option key={t} value={t}>{d.tiers[t].label}</option>)}
            </Select>
          </label>
        ))}
      </div>
      <p className="mt-1 text-[11.5px] text-white/40">A new tier applies to tickets opened from then on.</p>
      <ErrorLine>{err}</ErrorLine>
    </div>
  );
}

export function PublisherServiceStatus() {
  const [actor] = useActor();
  const [d, setD] = React.useState<Queue | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({ title: '', impact: 'degraded', components: [] as string[], nations: 'all', text: '', start: '', end: '' });
  const load = React.useCallback(() => { api.updates.publisher.support().then(setD).catch(e => setErr(e instanceof Error ? e.message : 'Could not load')); }, []);
  React.useEffect(load, [load]);
  if (!d) return <div className="min-h-[160px]"><ErrorLine>{err}</ErrorLine></div>;
  const open = d.service.filter(i => !i.resolvedAt);
  async function declare(e: React.FormEvent) {
    e.preventDefault(); setErr(null);
    try {
      await api.updates.publisher.supportAction({ action: 'declare', by: actor, title: form.title, impact: form.impact, components: form.components, nations: form.nations === 'all' ? 'all' : [form.nations], text: form.text,
        start: form.start ? new Date(form.start).toISOString() : undefined, end: form.end ? new Date(form.end).toISOString() : undefined });
      setForm(f => ({ ...f, title: '', text: '', components: [] })); load();
    } catch (x) { setErr(x instanceof Error ? x.message : 'Could not declare'); }
  }
  async function update(i: ServiceIncident, state: string) {
    setErr(null);
    const text = window.prompt(`Update for ${i.id} (${state})`);
    if (!text) return;
    try { await api.updates.publisher.supportAction({ action: 'update-service', id: i.id, state, text, by: actor }); load(); }
    catch (x) { setErr(x instanceof Error ? x.message : 'Could not update'); }
  }
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
      {open.map(i => (
        <Panel key={i.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
          <span className="font-mono text-[11px] text-white/45">{i.id}</span>
          <Chip tone={IMPACT_TONE[i.impact]}>{IMPACT_TEXT[i.impact]}</Chip>
          <span className="min-w-0 flex-1 text-[14px] font-light text-[#f3efe6]">{i.title}</span>
          <span className="font-mono text-[10.5px] text-white/40">{i.scheduled ? `${fmtDateTime(i.scheduled.start)} → ${fmtDateTime(i.scheduled.end)}` : fmtDateTime(i.startedAt)} · {i.nations === 'all' ? 'all nations' : i.nations.join(', ')}</span>
          {(i.scheduled ? ['in-progress', 'completed'] : ['identified', 'monitoring', 'resolved']).map(s => (
            <button key={s} type="button" className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/50 hover:text-[#f4e4bd]" onClick={() => update(i, s)}>{s}</button>
          ))}
        </Panel>
      ))}
      {!open.length ? <p className="text-[13px] font-light text-[#9be7c4]">No open service incidents or announced maintenance.</p> : null}
      <form onSubmit={declare} className="mt-2 grid grid-cols-[minmax(0,1fr)] gap-3 rounded-[2px] border p-4 sm:grid-cols-2" style={{ borderColor: hair(0.14) }}>
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#d9c398]/70 sm:col-span-2">Declare an incident or announce maintenance</p>
        <input aria-label="Title" className={inputCls} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Title" />
        <Select aria-label="Impact" value={form.impact} onChange={e => setForm({ ...form, impact: e.target.value })}>
          {(['degraded', 'partial-outage', 'major-outage', 'maintenance'] as const).map(k => <option key={k} value={k}>{IMPACT_TEXT[k]}</option>)}
        </Select>
        <div className="flex flex-wrap gap-x-4 gap-y-1 sm:col-span-2">
          {d.components.map(c => (
            <label key={c.key} className="flex items-center gap-1.5 text-[12.5px] font-light text-white/65">
              <input type="checkbox" checked={form.components.includes(c.key)} onChange={e => setForm({ ...form, components: e.target.checked ? [...form.components, c.key] : form.components.filter(x => x !== c.key) })} />
              {c.label}
            </label>
          ))}
        </div>
        <Select aria-label="Nations" value={form.nations} onChange={e => setForm({ ...form, nations: e.target.value })}>
          <option value="all">All nations</option>
          {d.nations.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
        </Select>
        <input aria-label="First update" className={inputCls} value={form.text} onChange={e => setForm({ ...form, text: e.target.value })} placeholder="What nations should know" />
        {form.impact === 'maintenance' ? (
          <>
            <input aria-label="Start" type="datetime-local" className={inputCls} value={form.start} onChange={e => setForm({ ...form, start: e.target.value })} />
            <input aria-label="End" type="datetime-local" className={inputCls} value={form.end} onChange={e => setForm({ ...form, end: e.target.value })} />
          </>
        ) : null}
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <button type="submit" className={`${goldBtn} px-4 py-2 text-[12.5px]`} style={goldStyle}>{form.impact === 'maintenance' ? 'Announce' : 'Declare'}</button>
          <span className="text-[11.5px] text-white/40" style={{ color: CHAMPAGNE }}>Shown on each affected nation’s status page and counted in its monthly report.</span>
          <ErrorLine>{err}</ErrorLine>
        </div>
      </form>
    </div>
  );
}
