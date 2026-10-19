'use client';

// Release communication: "what's new" in the nation's language, training and
// guides per release, officials' alert subscriptions, and the publisher's
// translation coverage.

import * as React from 'react';
import { api } from '@/lib/api/client';
import { nationMessages } from '@/lib/nation/registry';
import { locales } from '@/lib/i18n/config';
import { inputCls, Select, goldBtn, goldStyle, ghostBtn, hair, CHAMPAGNE } from '@/components/features/onboarding/Chrome';
import type { AlertCategory, Official, WhatsNew } from '@/lib/api/types';
import { ChangeChip, Chip, ErrorLine, Panel, fmtDateTime, useActor } from './ui';

const CAT_TEXT: Record<AlertCategory, string> = { security: 'Security', releases: 'Releases', incidents: 'Incidents', eol: 'End of life' };
// Language names come from the i18n configuration (no names hardcoded here).
const LANG: Record<string, string> = Object.fromEntries(locales.map(l => [l.code, l.name]));

export function WhatsNewPanel({ releaseId, link }: { releaseId: string; link?: string }) {
  const [w, setW] = React.useState<WhatsNew | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  React.useEffect(() => { api.updates.whatsNew(releaseId, link).then(r => setW(r.whatsNew)).catch(e => setErr(e instanceof Error ? e.message : 'Could not load')); }, [releaseId, link]);
  const m = nationMessages().releaseNotes;
  if (!w) return <div className="min-h-[140px]"><ErrorLine>{err}</ErrorLine></div>;
  const rtl = w.translated && w.locale === 'ar';
  const kind = { 'admin-guide': m.adminGuide, training: m.training, runbook: m.runbook, video: m.video } as const;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div dir={rtl ? 'rtl' : undefined} lang={w.translated ? w.locale : 'en'}>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {w.pending ? <Chip tone="#f4d58d">{m.translationPending}</Chip> : w.locale !== 'en' ? <Chip tone="#9be7c4">{m.inYourLanguage} · {LANG[w.locale] ?? w.locale}</Chip> : null}
        </div>
        <p className="text-[15px] font-light leading-relaxed text-[#f3efe6]/85">{w.summary}</p>
        <ul className="mt-3 grid gap-1.5">
          {w.changes.map((c, i) => <li key={i} className="flex items-start gap-2 text-[13.5px] font-light text-white/70"><ChangeChip kind={c.kind} /><span className="min-w-0">{c.text}</span></li>)}
        </ul>
      </div>
      <div>
        <p className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-[#d9c398]/75">{m.learning}</p>
        <ul className="mt-2 grid gap-2">
          {w.resources.map(r => (
            <li key={r.url}><a href={r.url} target="_blank" rel="noreferrer" className="text-[13px] font-light underline decoration-[#d9c398]/30 underline-offset-4 hover:text-[#f4e4bd]" style={{ color: CHAMPAGNE }}>{r.title}</a>
              <span className="block font-mono text-[10px] text-white/40">{kind[r.kind]} · {LANG[r.language] ?? r.language}{r.placeholder ? ' · placeholder link' : ''}</span></li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function AlertsPanel({ link }: { link?: string }) {
  const [actor] = useActor();
  const [d, setD] = React.useState<Awaited<ReturnType<typeof api.updates.alerts>> | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState({ name: '', role: '', email: '', sms: '' });
  const load = React.useCallback(() => { api.updates.alerts(link).then(setD).catch(e => setErr(e instanceof Error ? e.message : 'Could not load')); }, [link]);
  React.useEffect(load, [load]);
  if (!d) return <div className="min-h-[200px]"><ErrorLine>{err}</ErrorLine></div>;
  async function save(o: Partial<Official>) {
    setErr(null);
    if (!actor.trim()) { setErr('Enter your name under “Changed by” first.'); return; }
    try { await api.updates.alertsAction({ action: 'save', official: o, by: actor, link }); load(); }
    catch (x) { setErr(x instanceof Error ? x.message : 'Could not save'); }
  }
  async function remove(id: string) {
    setErr(null);
    if (!actor.trim()) { setErr('Enter your name under “Changed by” first.'); return; }
    try { await api.updates.alertsAction({ action: 'remove', id, by: actor, link }); load(); }
    catch (x) { setErr(x instanceof Error ? x.message : 'Could not remove'); }
  }
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-[12.5px] font-light">
          <thead><tr className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#d9c398]/65">
            <th className="py-2 pr-3 font-normal">Official</th><th className="py-2 pr-3 font-normal">Email</th><th className="py-2 pr-3 font-normal">SMS</th>
            {d.categories.map(c => <th key={c} className="py-2 pr-3 text-center font-normal">{CAT_TEXT[c]}</th>)}<th className="py-2 font-normal" />
          </tr></thead>
          <tbody>{d.officials.map(o => (
            <tr key={o.id} className="border-t" style={{ borderColor: hair(0.08) }}>
              <td className="py-2 pr-3"><span className="text-[#f3efe6]">{o.name}</span><span className="block text-[11.5px] text-white/40">{o.role}</span></td>
              {(['email', 'sms'] as const).map(ch => (
                <td key={ch} className="py-2 pr-3">
                  <label className="flex items-center gap-1.5 font-mono text-[11px] text-white/55">
                    <input type="checkbox" checked={o.channels[ch]} disabled={!(ch === 'email' ? o.email : o.sms)} onChange={e => save({ id: o.id, channels: { ...o.channels, [ch]: e.target.checked } })} aria-label={`${ch} for ${o.name}`} />
                    {(ch === 'email' ? o.email : o.sms) ?? '—'}
                  </label>
                </td>
              ))}
              {d.categories.map(c => (
                <td key={c} className="py-2 pr-3 text-center"><input type="checkbox" checked={o.subscriptions[c]} onChange={e => save({ id: o.id, subscriptions: { ...o.subscriptions, [c]: e.target.checked } })} aria-label={`${CAT_TEXT[c]} alerts for ${o.name}`} /></td>
              ))}
              <td className="py-2 text-right"><button type="button" className="text-[11.5px] text-white/40 hover:text-[#f1938f]" onClick={() => remove(o.id)}>Remove</button></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] items-end gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)_auto]">
        <input aria-label="Name or title" className={`${inputCls} py-2 text-[13px]`} value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="Official’s name or title" />
        <input aria-label="Role" className={`${inputCls} py-2 text-[13px]`} value={draft.role} onChange={e => setDraft({ ...draft, role: e.target.value })} placeholder="Role" />
        <input aria-label="Email" className={`${inputCls} py-2 text-[13px]`} value={draft.email} onChange={e => setDraft({ ...draft, email: e.target.value })} placeholder="Email" />
        <input aria-label="Mobile" className={`${inputCls} py-2 text-[13px]`} value={draft.sms} onChange={e => setDraft({ ...draft, sms: e.target.value })} placeholder="Mobile (SMS)" />
        <button type="button" className={`${ghostBtn} py-2 text-[12.5px]`} onClick={async () => { await save({ ...draft, channels: { email: !!draft.email, sms: !!draft.sms }, subscriptions: { security: true, releases: false, incidents: true, eol: false } }); setDraft({ name: '', role: '', email: '', sms: '' }); }}>Add official</button>
      </div>
      <ErrorLine>{err}</ErrorLine>
      <div>
        <p className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-[#d9c398]/75">Recent alerts</p>
        <p className="mt-1 text-[11.5px] text-white/40">No email or SMS provider is connected yet: alerts are queued, not sent.</p>
        <ul className="mt-2 grid gap-1.5">
          {d.outbox.map(a => (
            <li key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] font-light text-white/65">
              <span className="font-mono text-[10.5px] text-white/40">{fmtDateTime(a.at)}</span>
              <Chip tone={a.category === 'security' ? '#f1938f' : a.category === 'incidents' ? '#f1b36b' : a.category === 'eol' ? '#c9b6ff' : '#a9c7e8'}>{CAT_TEXT[a.category]}</Chip>
              <span className="min-w-0 flex-1">{a.subject}</span>
              <span className="font-mono text-[10.5px] text-white/45">{a.channel} → {a.officialName} · {a.status}</span>
            </li>
          ))}
          {!d.outbox.length ? <li className="text-[12.5px] text-white/45">No alerts yet.</li> : null}
        </ul>
      </div>
    </div>
  );
}

export function PublisherComms() {
  const [actor] = useActor();
  const [d, setD] = React.useState<Awaited<ReturnType<typeof api.updates.publisher.comms>> | null>(null);
  const [f, setF] = React.useState({ releaseId: '', locale: 'sw', summary: '', changes: '' });
  const [err, setErr] = React.useState<string | null>(null);
  const [ok, setOk] = React.useState<string | null>(null);
  const load = React.useCallback(() => { api.updates.publisher.comms().then(r => { setD(r); setF(x => ({ ...x, releaseId: x.releaseId || r.releases[0]?.id || '' })); }).catch(e => setErr(e instanceof Error ? e.message : 'Could not load')); }, []);
  React.useEffect(load, [load]);
  if (!d) return <div className="min-h-[200px]"><ErrorLine>{err}</ErrorLine></div>;
  async function translate() {
    setErr(null); setOk(null);
    if (!actor.trim()) { setErr('Enter your name above first.'); return; }
    try { await api.updates.publisher.commsAction({ action: 'translate', releaseId: f.releaseId, locale: f.locale, summary: f.summary, changes: f.changes.split('\n').map(s => s.trim()).filter(Boolean), by: actor }); setOk('Translation saved — nations in that language now see it.'); setF({ ...f, summary: '', changes: '' }); load(); }
    catch (x) { setErr(x instanceof Error ? x.message : 'Could not save'); }
  }
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <p className="text-[12.5px] font-light text-white/55">Languages of enrolled nations: {d.nations.map(n => `${n.name} (${LANG[n.language] ?? n.language})`).join(' · ')}</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-[12.5px] font-light">
          <thead><tr className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#d9c398]/65"><th className="py-2 pr-3 font-normal">Release</th>{d.locales.map(l => <th key={l} className="py-2 pr-3 font-normal">{LANG[l] ?? l}</th>)}<th className="py-2 font-normal">Guides</th></tr></thead>
          <tbody>{d.releases.map(r => (
            <tr key={r.id} className="border-t" style={{ borderColor: hair(0.08) }}>
              <td className="py-2 pr-3"><span className="font-mono text-[12px] text-[#f4e4bd]">{r.version}</span> <span className="text-white/50">{r.title}</span></td>
              {d.locales.map(l => <td key={l} className="py-2 pr-3">{d.coverage[r.id]?.[l] ? <Chip tone="#9be7c4">Translated</Chip> : <Chip tone="#f4d58d">Pending</Chip>}</td>)}
              <td className="py-2 font-mono text-[11.5px] text-white/55">{r.resources}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <Panel className="grid grid-cols-[minmax(0,1fr)] gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_160px]">
        <Select aria-label="Release" value={f.releaseId} onChange={e => setF({ ...f, releaseId: e.target.value })}>{d.releases.map(r => <option key={r.id} value={r.id}>{r.version} — {r.title}</option>)}</Select>
        <Select aria-label="Language" value={f.locale} onChange={e => setF({ ...f, locale: e.target.value })}>{d.locales.map(l => <option key={l} value={l}>{LANG[l] ?? l}</option>)}</Select>
        <textarea aria-label="Translated summary" className={`${inputCls} min-h-[60px] sm:col-span-2`} value={f.summary} onChange={e => setF({ ...f, summary: e.target.value })} placeholder="Translated summary" />
        <textarea aria-label="Translated changes" className={`${inputCls} min-h-[72px] sm:col-span-2`} value={f.changes} onChange={e => setF({ ...f, changes: e.target.value })} placeholder="Translated changes, one per line, in the release’s order" />
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <button type="button" className={`${goldBtn} px-4 py-2 text-[12.5px]`} style={goldStyle} onClick={translate}>Save translation</button>
          {ok ? <span className="text-[12px] text-[#9be7c4]">{ok}</span> : null}
          <ErrorLine>{err}</ErrorLine>
        </div>
      </Panel>
    </div>
  );
}
