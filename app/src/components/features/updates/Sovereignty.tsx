'use client';

// Data-sovereignty controls: which operational data may leave the country.
// Everything is off unless an official enables it, with a reason; each
// category shows a sample of exactly what would be shared.

import * as React from 'react';
import { api } from '@/lib/api/client';
import { inputCls, goldBtn, goldStyle, ghostBtn, hair } from '@/components/features/onboarding/Chrome';
import type { DataCategory } from '@/lib/api/types';
import { Chip, ErrorLine, Panel, fmtDateTime, useActor } from './ui';

export function SovereigntyPanel({ link }: { link?: string }) {
  const [actor] = useActor();
  const [d, setD] = React.useState<Awaited<ReturnType<typeof api.updates.sovereignty>> | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [reason, setReason] = React.useState<Record<string, string>>({});
  const [sample, setSample] = React.useState<DataCategory | null>(null);
  const load = React.useCallback(() => { api.updates.sovereignty(link).then(setD).catch(e => setErr(e instanceof Error ? e.message : 'Could not load')); }, [link]);
  React.useEffect(load, [load]);
  if (!d) return <div className="min-h-[260px]"><ErrorLine>{err}</ErrorLine></div>;
  async function set(category: DataCategory, enabled: boolean) {
    setErr(null);
    if (!actor.trim()) { setErr('Enter your name under “Changed by” first.'); return; }
    try { await api.updates.setSovereignty({ category, enabled, by: actor, reason: reason[category], link }); setReason({ ...reason, [category]: '' }); load(); }
    catch (x) { setErr(x instanceof Error ? x.message : 'Could not change it'); }
  }
  const on = d.state.filter(s => s.enabled).length;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
      <p className="text-[13px] font-light text-white/60">{on ? `${on} of ${d.state.length} categories shared with the publisher.` : 'Nothing leaves the country: every category is off.'} Safety does not depend on sharing — probation, fallback and incidents work entirely here.</p>
      {d.categories.map(c => {
        const s = d.state.find(x => x.category === c.key)!;
        return (
          <Panel key={c.key} strong={s.enabled} className="min-w-0 px-4 py-4">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="text-[15px] font-light text-[#f3efe6]">{c.label}</span>
              <Chip tone={s.enabled ? '#f4d58d' : '#9be7c4'} solid={s.enabled}>{s.enabled ? 'Shared' : 'Off — stays in the country'}</Chip>
              <span className="ml-auto font-mono text-[10.5px] text-white/40">to {c.destination}</span>
            </div>
            <p className="mt-1.5 text-[12.5px] font-light text-white/55">{c.purpose} {s.enabled ? '' : c.whenOff}</p>
            <div className="mt-2 grid grid-cols-[minmax(0,1fr)] gap-2 text-[12px] font-light sm:grid-cols-2">
              <div><span className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-[#d9c398]/70">Contains</span><ul className="mt-1 grid gap-0.5 text-white/60">{c.contains.map(x => <li key={x}>· {x}</li>)}</ul></div>
              <div><span className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-[#9be7c4]/80">Never</span><ul className="mt-1 grid gap-0.5 text-white/60">{c.never.map(x => <li key={x}>· {x}</li>)}</ul></div>
            </div>
            <button type="button" onClick={() => setSample(x => (x === c.key ? null : c.key))} aria-expanded={sample === c.key} className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-white/45 hover:text-[#f4e4bd]">{sample === c.key ? 'Hide' : 'Show'} sample payload</button>
            {sample === c.key ? <pre className="mt-2 overflow-x-auto rounded-[2px] border p-3 font-mono text-[11px] leading-relaxed text-white/70" style={{ borderColor: hair(0.12), background: 'rgba(0,0,0,0.25)' }}>{JSON.stringify(c.sample, null, 2)}</pre> : null}
            <p className="mt-2 font-mono text-[10.5px] text-white/40">
              {s.enabled ? `Approved by ${s.approvedBy} on ${fmtDateTime(s.at)} — “${s.reason}” · ${s.sent} sent${s.lastSentAt ? `, last ${fmtDateTime(s.lastSentAt)}` : ''}` : `${s.heldBack} held back in the country${s.at ? ` · switched off ${fmtDateTime(s.at)}` : ''}`}
            </p>
            <div className="mt-3 flex flex-wrap items-end gap-2">
              {s.enabled ? (
                <button type="button" className={`${goldBtn} px-4 py-2 text-[12.5px]`} style={goldStyle} onClick={() => set(c.key, false)}>Stop sharing</button>
              ) : (
                <>
                  <input aria-label={`Reason to share ${c.label}`} className={`${inputCls} min-w-[240px] flex-1 py-2 text-[13px]`} value={reason[c.key] ?? ''} onChange={e => setReason({ ...reason, [c.key]: e.target.value })} placeholder="Reason for sharing (required)" />
                  <button type="button" className={`${ghostBtn} py-2 text-[12.5px]`} onClick={() => set(c.key, true)}>Approve sharing</button>
                </>
              )}
            </div>
          </Panel>
        );
      })}
      <ErrorLine>{err}</ErrorLine>
    </div>
  );
}

export function PublisherTelemetry() {
  const [d, setD] = React.useState<Awaited<ReturnType<typeof api.updates.publisher.telemetry>> | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  React.useEffect(() => { api.updates.publisher.telemetry().then(setD).catch(e => setErr(e instanceof Error ? e.message : 'Could not load')); }, []);
  if (!d) return <div className="min-h-[160px]"><ErrorLine>{err}</ErrorLine></div>;
  const cats: { k: DataCategory; l: string }[] = [{ k: 'health-reports', l: 'Health reports' }, { k: 'crash-reports', l: 'Crash reports' }, { k: 'usage-metrics', l: 'Usage metrics' }, { k: 'support-attachments', l: 'Support attachments' }];
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
      <p className="text-[12.5px] font-light text-white/55">Only what each nation has chosen to share arrives here. Where a category is off, nothing is received — not even a count.</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-[12.5px] font-light">
          <thead><tr className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#d9c398]/65"><th className="py-2 pr-3 font-normal">Nation</th>{cats.map(c => <th key={c.k} className="py-2 pr-3 font-normal">{c.l}</th>)}</tr></thead>
          <tbody>{d.nations.map(n => (
            <tr key={n.id} className="border-t" style={{ borderColor: hair(0.08) }}>
              <td className="py-2 pr-3 text-[#f3efe6]">{n.name}</td>
              {cats.map(c => { const s = n.categories[c.k]!; return <td key={c.k} className="py-2 pr-3">{s.shared ? <Chip tone="#9be7c4">{s.received} received</Chip> : <Chip tone="#a5abb5">Not shared</Chip>}</td>; })}
            </tr>
          ))}</tbody>
        </table>
      </div>
      {d.recent.length ? (
        <ul className="grid gap-1">{d.recent.slice(0, 8).map(t => <li key={t.id} className="text-[12px] font-light text-white/55"><span className="font-mono text-[10.5px] text-white/40">{fmtDateTime(t.at)}</span> · {t.category} · {t.summary}</li>)}</ul>
      ) : null}
    </div>
  );
}
