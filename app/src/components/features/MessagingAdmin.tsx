'use client';

// Email and text messages (/admin/messaging): the providers this nation's
// administrator connects to send the platform's email and SMS (its mail relay,
// an HTTPS email service, an HTTPS SMS gateway), the public address used in
// links, and where messages stand. Addresses are shown masked and message
// texts never; secrets are never shown after they are saved. Without a
// provider, messages stay queued and the page says "not connected".

import * as React from 'react';
import Link from 'next/link';
import { useSignIn, officialLabel } from '@/lib/official';
import { roleOf } from '@/lib/auth/roles';
import type { MessagingStatus } from '@/app/api/messaging/route';
import type { ProviderKind, ProviderView, MessageStatus } from '@/lib/messaging/types';

const input = 'focus-ring w-full rounded-[3px] border border-line bg-surface px-2.5 py-2 text-[14px] text-ink';
const btn = 'focus-ring rounded-[3px] border border-line px-3 py-1.5 text-[13px] font-semibold text-ink hover:bg-surface-2 disabled:opacity-50';
const day = (iso?: string) => (iso ? new Date(iso).toISOString().slice(0, 16).replace('T', ' ') + ' UTC' : '—');
const STATUS: MessageStatus[] = ['queued', 'retrying', 'sending', 'sent', 'dead', 'cancelled'];
const STATUS_WORD: Record<MessageStatus, string> = { queued: 'Waiting', retrying: 'Will retry', sending: 'Sending', sent: 'Sent', dead: 'Failed', cancelled: 'Withdrawn' };
const STREAM_WORD = { alerts: 'Update alerts to officials', 'site-updates': 'Public website email updates', test: 'Tests' } as const;
const tone = (s: MessageStatus) => (s === 'sent' ? 'text-ok' : s === 'dead' ? 'text-alert' : s === 'retrying' ? 'text-warn' : 'text-ink-soft');

type Draft = {
  kind: ProviderKind; name: string; from: string; replyTo: string; host: string; port: string; security: 'starttls' | 'tls'; username: string; secret: string; caPem: string;
  url: string; method: 'POST' | 'PUT'; contentType: 'json' | 'form'; headers: string; bodyTemplate: string; perMinute: string;
};
const BLANK: Draft = {
  kind: 'smtp', name: '', from: '', replyTo: '', host: '', port: '', security: 'starttls', username: '', secret: '', caPem: '',
  url: '', method: 'POST', contentType: 'json', headers: 'Authorization: Bearer {{secret}}', bodyTemplate: '', perMinute: '60',
};
const TEMPLATE: Record<'http-email' | 'http-sms', { json: string; form: string }> = {
  'http-email': { json: '{"from":"{{from}}","to":"{{to}}","subject":"{{subject}}","text":"{{text}}"}', form: 'from={{from}}&to={{to}}&subject={{subject}}&text={{text}}' },
  'http-sms': { json: '{"from":"{{from}}","to":"{{to}}","message":"{{text}}"}', form: 'from={{from}}&to={{to}}&message={{text}}' },
};

export function MessagingAdmin() {
  const s = useSignIn();
  const [d, setD] = React.useState<MessagingStatus | null>(null);
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [f, setF] = React.useState<Draft>(BLANK);
  const [publicUrl, setPublicUrl] = React.useState('');
  const [testTo, setTestTo] = React.useState<Record<string, string>>({});

  const load = React.useCallback(async () => {
    const r = await fetch('/api/messaging', { cache: 'no-store' });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setMsg({ ok: false, text: (j as { error?: string }).error ?? `Could not load (${r.status})` }); return; }
    setD(j as MessagingStatus);
    setPublicUrl((j as MessagingStatus).settings.publicUrl ?? '');
  }, []);
  const admin = !!s?.official && roleOf(s.official) === 'administrator';
  React.useEffect(() => { if (admin) void load(); }, [admin, load]);

  async function call(body: Record<string, unknown>, done: string) {
    setBusy(true); setMsg(null);
    try {
      const r = await fetch('/api/messaging', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error((j as { error?: string }).error ?? `Request failed (${r.status})`);
      setD((j as { status: MessagingStatus }).status);
      setMsg({ ok: true, text: done });
      return true;
    } catch (e) { setMsg({ ok: false, text: (e as Error).message }); return false; }
    finally { setBusy(false); }
  }

  function providerBody(): Record<string, unknown> {
    const base = { kind: f.kind, name: f.name, from: f.from, perMinute: Number(f.perMinute) || 60, ...(f.replyTo ? { replyTo: f.replyTo } : {}), ...(f.secret ? { secret: f.secret } : {}), ...(f.caPem ? { caPem: f.caPem } : {}), ...(f.username ? { username: f.username } : {}) };
    if (f.kind === 'smtp') return { ...base, host: f.host, security: f.security, ...(f.port ? { port: Number(f.port) } : {}) };
    const headers = Object.fromEntries(f.headers.split('\n').map(l => l.trim()).filter(Boolean).map(l => { const i = l.indexOf(':'); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
    return { ...base, url: f.url, method: f.method, contentType: f.contentType, headers, bodyTemplate: f.bodyTemplate || TEMPLATE[f.kind][f.contentType] };
  }

  return (
    <div className="mx-auto max-w-[1100px] space-y-4 text-[14px] text-ink">
      <header>
        <h2 className="text-[22px] font-semibold tracking-tight">Email and text messages</h2>
        <p className="mt-1 max-w-3xl text-ink-soft">
          The services this installation sends email and text messages through: alerts to the officials named in the <Link href="/updates" className="text-link underline">Update Center</Link>, and the email updates people ask for on the public websites. They are the nation&rsquo;s own: its mail server, or an email or SMS service it chose. Until one is connected, messages wait here and nothing is sent.
        </p>
      </header>
      {!s ? null : !s.official ? (
        <p className="rounded-[3px] border border-line bg-surface p-3"><Link href="/sign-in?from=/admin/messaging" className="text-link underline">Sign in</Link> as an administrator to connect email and SMS.</p>
      ) : !admin ? (
        <p className="rounded-[3px] border border-line bg-surface p-3">Signed in as <strong>{officialLabel(s.official)}</strong>. Only an administrator can see and change how messages are sent.</p>
      ) : !d ? (
        msg ? <p role="status" className="text-alert">{msg.text}</p> : <p className="text-ink-soft">Loading…</p>
      ) : (
        <>
          <section aria-label="Connection" className="grid gap-2 sm:grid-cols-2">
            {(['email', 'sms'] as const).map(ch => (
              <div key={ch} className="rounded-[3px] border border-line bg-surface p-3">
                <p className="text-[12px] uppercase tracking-wide text-ink-muted">{ch === 'email' ? 'Email' : 'Text messages (SMS)'}</p>
                <p className={`text-[17px] font-semibold ${d.channels[ch] === 'connected' ? 'text-ok' : 'text-warn'}`}>{d.channels[ch] === 'connected' ? 'Connected' : 'Not connected'}</p>
                <p className="text-[12.5px] text-ink-soft">
                  {d.counts.byChannel[ch].queued + d.counts.byChannel[ch].retrying} waiting · {d.counts.byChannel[ch].sent} sent · {d.counts.byChannel[ch].dead} failed
                </p>
              </div>
            ))}
          </section>

          {!d.secretsSealed ? <p className="rounded-[3px] border border-warn bg-surface p-3 text-[13px]">Passwords and keys for providers are stored without encryption on this installation: set <code>CIVICOS_DATA_KEK</code> (or a key provider) so they are sealed.</p> : null}
          <p className="text-[12.5px] text-ink-muted">
            Providers are reached only at the address given here, never on a private network{d.privateNetwork ? ' — except that this installation allows the nation’s own network (CIVICOS_MESSAGING_PRIVATE=1)' : ' (set CIVICOS_MESSAGING_PRIVATE=1 to allow the nation’s own network)'}. Mail servers are used only over TLS.
          </p>

          <form className="flex flex-wrap items-end gap-2 rounded-[3px] border border-line bg-surface p-3"
            onSubmit={e => { e.preventDefault(); void call({ action: 'settings', publicUrl }, publicUrl ? `Links now start with ${publicUrl}` : 'Public address cleared'); }}>
            <label className="min-w-[260px] flex-1 text-[12px] text-ink-soft">Public address of this platform (used in links in emails)
              <input className={`${input} mt-1`} value={publicUrl} onChange={e => setPublicUrl(e.currentTarget.value)} placeholder="https://www.gov.example" />
            </label>
            <button className={btn} disabled={busy}>Save address</button>
            <p className="w-full text-[12px] text-ink-muted">{d.publicBase ? `Links start with ${d.publicBase}.` : 'Not set: website emails (confirmation and unsubscribe links) wait until it is.'}</p>
          </form>

          <section aria-label="Providers" className="space-y-2">
            <h3 className="text-[16px] font-semibold">Providers</h3>
            {d.providers.length ? (
              <table className="w-full text-[13px]">
                <thead><tr className="border-b border-line text-ink-muted"><th className="py-1.5 text-start font-semibold">Provider</th><th className="text-start font-semibold">Sends</th><th className="text-start font-semibold">Where</th><th className="text-start font-semibold">Last result</th><th className="text-start font-semibold">Test</th><th /></tr></thead>
                <tbody>
                  {d.providers.map((p: ProviderView) => (
                    <tr key={p.id} className="border-b border-line-soft align-top">
                      <td className="py-1.5"><strong>{p.name}</strong><div className="text-ink-muted">{d.kinds.find(k => k.kind === p.kind)?.label} · order {p.priority} · {p.perMinute}/min</div></td>
                      <td>{p.channel === 'email' ? 'Email' : 'SMS'} from {p.from}<div className="text-ink-muted">{p.hasSecret ? 'Password or key held' : 'No password or key'}</div></td>
                      <td>{p.kind === 'smtp' ? `${p.host}:${p.port} (${p.security === 'tls' ? 'TLS' : 'STARTTLS'})` : (() => { try { return new URL(p.url!).host; } catch { return p.url; } })()}</td>
                      <td>{p.lastResult ? <span className={p.lastResult.ok ? 'text-ok' : 'text-alert'}>{p.lastResult.ok ? 'OK' : 'Failed'}: {p.lastResult.detail}<div className="text-ink-muted">{day(p.lastResult.at)}</div></span> : <span className="text-ink-muted">Not used yet</span>}</td>
                      <td>
                        <div className="flex gap-1">
                          <input aria-label={`Send a test from ${p.name} to`} className={`${input} w-[170px] py-1 text-[12.5px]`} placeholder={p.channel === 'email' ? 'your address' : 'your number'} value={testTo[p.id] ?? ''} onChange={e => setTestTo({ ...testTo, [p.id]: e.currentTarget.value })} />
                          <button type="button" className={btn} disabled={busy || !testTo[p.id]} onClick={() => call({ action: 'test', id: p.id, to: testTo[p.id] }, `Test sent through ${p.name}`)}>Send test</button>
                        </div>
                      </td>
                      <td className="text-end whitespace-nowrap">
                        <button type="button" className={`${btn} me-1`} disabled={busy} onClick={() => call({ action: 'save-provider', provider: { id: p.id, enabled: !p.enabled } }, `${p.name} ${p.enabled ? 'paused' : 'enabled'}`)}>{p.enabled ? 'Pause' : 'Enable'}</button>
                        <button type="button" className={btn} disabled={busy} onClick={() => window.confirm(`Remove ${p.name}? Messages on its channel wait until another provider is connected.`) && call({ action: 'remove-provider', id: p.id }, `${p.name} removed`)}>Remove</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="text-ink-soft">No provider is connected. Messages are waiting, not sent.</p>}
          </section>

          <form className="grid gap-2 rounded-[3px] border border-line bg-surface p-3 md:grid-cols-4"
            onSubmit={async e => { e.preventDefault(); if (await call({ action: 'save-provider', provider: providerBody() }, `${f.name} connected`)) setF(BLANK); }}>
            <h3 className="text-[15px] font-semibold md:col-span-4">Connect a provider</h3>
            <label className="text-[12px] text-ink-soft">Kind<select className={`${input} mt-1`} value={f.kind} onChange={e => setF({ ...f, kind: e.currentTarget.value as ProviderKind, bodyTemplate: '' })}>
              {d.kinds.map(k => <option key={k.kind} value={k.kind}>{k.label}</option>)}</select></label>
            <label className="text-[12px] text-ink-soft">Name<input className={`${input} mt-1`} required value={f.name} onChange={e => setF({ ...f, name: e.currentTarget.value })} placeholder="e.g. Government mail relay" /></label>
            <label className="text-[12px] text-ink-soft">{f.kind === 'http-sms' ? 'Sender name or number' : 'Sender address'}<input className={`${input} mt-1`} required value={f.from} onChange={e => setF({ ...f, from: e.currentTarget.value })} placeholder={f.kind === 'http-sms' ? 'GOV' : 'updates@gov.example'} /></label>
            <label className="text-[12px] text-ink-soft">Messages per minute<input className={`${input} mt-1`} inputMode="numeric" value={f.perMinute} onChange={e => setF({ ...f, perMinute: e.currentTarget.value })} /></label>
            {f.kind === 'smtp' ? (
              <>
                <label className="text-[12px] text-ink-soft">Mail server<input className={`${input} mt-1`} required value={f.host} onChange={e => setF({ ...f, host: e.currentTarget.value })} placeholder="smtp.gov.example" /></label>
                <label className="text-[12px] text-ink-soft">Security<select className={`${input} mt-1`} value={f.security} onChange={e => setF({ ...f, security: e.currentTarget.value as Draft['security'] })}>
                  <option value="starttls">STARTTLS (port 587)</option><option value="tls">TLS (port 465)</option></select></label>
                <label className="text-[12px] text-ink-soft">Port<input className={`${input} mt-1`} inputMode="numeric" value={f.port} onChange={e => setF({ ...f, port: e.currentTarget.value })} placeholder={f.security === 'tls' ? '465' : '587'} /></label>
                <label className="text-[12px] text-ink-soft">Reply-to (optional)<input className={`${input} mt-1`} value={f.replyTo} onChange={e => setF({ ...f, replyTo: e.currentTarget.value })} /></label>
              </>
            ) : (
              <>
                <label className="text-[12px] text-ink-soft md:col-span-2">Service address<input className={`${input} mt-1`} required value={f.url} onChange={e => setF({ ...f, url: e.currentTarget.value })} placeholder="https://sms.provider.example/v1/messages" /></label>
                <label className="text-[12px] text-ink-soft">Method<select className={`${input} mt-1`} value={f.method} onChange={e => setF({ ...f, method: e.currentTarget.value as Draft['method'] })}><option>POST</option><option>PUT</option></select></label>
                <label className="text-[12px] text-ink-soft">Body<select className={`${input} mt-1`} value={f.contentType} onChange={e => setF({ ...f, contentType: e.currentTarget.value as Draft['contentType'], bodyTemplate: '' })}><option value="json">JSON</option><option value="form">Form</option></select></label>
                <label className="text-[12px] text-ink-soft md:col-span-2">Headers (one per line)<textarea className={`${input} mt-1 font-mono text-[12.5px]`} rows={2} value={f.headers} onChange={e => setF({ ...f, headers: e.currentTarget.value })} /></label>
                <label className="text-[12px] text-ink-soft md:col-span-2">Body template<textarea className={`${input} mt-1 font-mono text-[12.5px]`} rows={2} value={f.bodyTemplate || TEMPLATE[f.kind][f.contentType]} onChange={e => setF({ ...f, bodyTemplate: e.currentTarget.value })} /></label>
                <p className="text-[12px] text-ink-muted md:col-span-4">Placeholders: {'{{to}} {{from}} {{subject}} {{text}} {{key}} (sent again on a retry, for the service to recognise) {{secret}} {{username}} {{basic}} {{unsubscribe}}'}.</p>
              </>
            )}
            <label className="text-[12px] text-ink-soft">User name (optional)<input className={`${input} mt-1`} autoComplete="off" value={f.username} onChange={e => setF({ ...f, username: e.currentTarget.value })} /></label>
            <label className="text-[12px] text-ink-soft">{f.kind === 'smtp' ? 'Password' : 'Key or password'}<input type="password" autoComplete="new-password" className={`${input} mt-1`} value={f.secret} onChange={e => setF({ ...f, secret: e.currentTarget.value })} /></label>
            <label className="text-[12px] text-ink-soft md:col-span-2">Internal certificate authority (optional, PEM)<textarea className={`${input} mt-1 font-mono text-[11.5px]`} rows={2} value={f.caPem} onChange={e => setF({ ...f, caPem: e.currentTarget.value })} placeholder="-----BEGIN CERTIFICATE-----" /></label>
            <div className="flex items-end md:col-span-4"><button className={btn} disabled={busy}>Connect</button></div>
          </form>

          {msg ? <p role="status" className={msg.ok ? 'text-ok' : 'text-alert'}>{msg.text}</p> : null}

          <section aria-label="Messages by source" className="space-y-2">
            <h3 className="text-[16px] font-semibold">Messages</h3>
            <table className="w-full text-[13px]">
              <thead><tr className="border-b border-line text-ink-muted"><th className="py-1.5 text-start font-semibold">From</th>{STATUS.map(st => <th key={st} className="text-end font-semibold">{STATUS_WORD[st]}</th>)}</tr></thead>
              <tbody>
                {(Object.keys(STREAM_WORD) as (keyof typeof STREAM_WORD)[]).map(k => (
                  <tr key={k} className="border-b border-line-soft"><td className="py-1.5">{STREAM_WORD[k]}</td>{STATUS.map(st => <td key={st} className="text-end tabular-nums">{d.counts.byStream[k][st]}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </section>

          {d.dead.length ? (
            <section aria-label="Failed messages" className="space-y-2">
              <h3 className="text-[16px] font-semibold">Failed messages</h3>
              <ul className="space-y-1">
                {d.dead.map(m => (
                  <li key={m.id} className="flex flex-wrap items-center gap-2 rounded-[3px] border border-line bg-surface p-2 text-[13px]">
                    <span className="font-mono text-[12px] text-ink-muted">{m.id}</span><span>{m.channel} to {m.to}</span><span className="min-w-0 flex-1 text-ink-soft">{m.lastError}</span>
                    <button type="button" className={btn} disabled={busy} onClick={() => call({ action: 'retry', id: m.id }, `${m.id} will be sent again`)}>Send again</button>
                    <button type="button" className={btn} disabled={busy} onClick={() => call({ action: 'discard', id: m.id }, `${m.id} discarded`)}>Discard</button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section aria-label="Recent messages" className="space-y-2">
            <h3 className="text-[16px] font-semibold">Recent messages</h3>
            {d.recent.length ? (
              <table className="w-full text-[13px]">
                <thead><tr className="border-b border-line text-ink-muted"><th className="py-1.5 text-start font-semibold">Queued</th><th className="text-start font-semibold">To</th><th className="text-start font-semibold">Subject</th><th className="text-start font-semibold">Status</th><th className="text-start font-semibold">Attempts</th></tr></thead>
                <tbody>
                  {d.recent.map(m => (
                    <tr key={m.id} className="border-b border-line-soft align-top">
                      <td className="py-1.5 whitespace-nowrap">{day(m.createdAt)}</td>
                      <td>{m.channel === 'email' ? 'Email' : 'SMS'} · {m.to}</td>
                      <td className="max-w-[360px]">{m.subject || '—'}</td>
                      <td className={tone(m.status)}>
                        {m.status === 'queued' && d.channels[m.channel] === 'not connected' ? 'Waiting — not connected' : STATUS_WORD[m.status]}
                        {m.status === 'retrying' && m.nextAttemptAt ? <div className="text-ink-muted">next {day(m.nextAttemptAt)}</div> : null}
                        {m.lastError && m.status !== 'sent' ? <div className="text-ink-muted">{m.lastError}</div> : null}
                      </td>
                      <td className="tabular-nums">{m.attempts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="text-ink-soft">No messages yet.</p>}
          </section>
        </>
      )}
    </div>
  );
}
