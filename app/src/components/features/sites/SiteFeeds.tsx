'use client';

// Connecting an institution's own system of record (a health facility list, a
// school registry, a grid operator's asset register) to the national facility
// register (map plan 4b). Each system gets its own key, shown once; the system
// sends its sites and keeps them up to date; officials still publish new
// sites and confirm moves. API: /api/org/ministries/{id}/facilities/feeds and
// …/facilities/feed (the system's own endpoint); rules: lib/data/facilities.ts.

import * as React from 'react';
import Link from 'next/link';
import { useOfficial } from '@/lib/official';
import type { SiteFeed } from '@/lib/data/facilities';
import { Msg, btn, callApi, input, when } from './shared';

export function SiteFeeds({ id, name, accepted }: { id: string; name?: string; accepted: boolean }) {
  const [official] = useOfficial();
  const [feeds, setFeeds] = React.useState<SiteFeed[]>([]);
  const [newKey, setNewKey] = React.useState<{ name: string; key: string } | null>(null);
  const [feedName, setFeedName] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null);
  const base = `/api/org/ministries/${encodeURIComponent(id)}/facilities`;
  const load = React.useCallback(async () => {
    try { setFeeds((await callApi<{ feeds: SiteFeed[] }>(`${base}/feeds`)).feeds); } catch { /* shown as empty */ }
  }, [base]);
  React.useEffect(() => { void load(); }, [load]);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  const run = async <T,>(f: () => Promise<T>, ok: (x: T) => string): Promise<T | null> => {
    if (!official) { setMsg({ ok: false, text: 'Sign in or name the acting official first: every step is recorded under a person.' }); return null; }
    setBusy(true);
    try { const x = await f(); setMsg({ ok: true, text: ok(x) }); await load(); return x; }
    catch (e) { setMsg({ ok: false, text: (e as Error).message }); return null; }
    finally { setBusy(false); }
  };

  return (
    <section className="space-y-3 rounded-[3px] border border-line bg-surface p-4" aria-label="Connect your own system">
      <h3 className="text-[16px] font-semibold">Connect your own system</h3>
      <p className="text-[13px] text-ink-soft">
        Instead of loading files, {name ?? 'the institution'}&rsquo;s own list of sites (for example its facility list or school registry) can send its
        sites here and keep them up to date. New sites still wait for an official to publish them; a changed position waits for an official to
        confirm the move. Sites recorded any other way are never changed by a system. Each system gets its own key.
      </p>
      {!accepted ? <p className="text-[13px] text-warn">The nation&rsquo;s facility policy does not accept sites from connected systems yet; an administrator can change it under Sites.</p> : null}
      <Msg msg={msg} />
      {newKey ? (
        <div className="space-y-2 rounded-[3px] border border-warn p-3 text-[13px]" role="status">
          <p><strong>Key for {newKey.name}.</strong> Copy it now into the system&rsquo;s settings: it is shown only this once and is not kept on the platform.</p>
          <code className="block break-all rounded-[3px] bg-bg px-2 py-1 font-mono text-[12px]">{newKey.key}</code>
          <details>
            <summary className="cursor-pointer text-link">How the system calls the platform</summary>
            <pre className="mt-1 overflow-x-auto rounded-[3px] bg-bg px-2 py-1 font-mono text-[11px]">{`POST ${origin}${base}/feed
Authorization: Bearer ${newKey.key}
Content-Type: application/json

{ "sites": [ { "ref": "your own id", "name": "…", "category": "health",
               "lat": -1.30096, "lng": 36.80661, "accuracyM": 10,
               "status": "operational", "code": "sector identifier" } ] }

GET ${origin}${base}/feed?since=2026-10-01T00:00:00Z
Authorization: Bearer ${newKey.key}`}</pre>
            <p className="mt-1 text-ink-soft">Every site is answered: added, updated, unchanged or refused with its reason. The read-back shows which sites officials published, certified or withdrew. The full description is on the <Link href="/developers" className="text-link underline">developer page</Link>.</p>
          </details>
          <button type="button" className={btn} onClick={() => setNewKey(null)}>I have copied the key</button>
        </div>
      ) : null}
      {feeds.length ? (
        <table className="w-full text-[13px]" data-stack>
          <thead><tr className="border-b border-line text-ink-muted"><th className="py-1 text-start font-semibold">System</th><th className="text-start font-semibold">Key</th><th className="text-start font-semibold">Connected</th><th className="text-start font-semibold">Last call</th><th /></tr></thead>
          <tbody>
            {feeds.map(f => (
              <tr key={f.id} className="border-b border-line-soft">
                <td data-label="System" className="py-1.5"><strong>{f.name}</strong></td>
                <td data-label="Key" className="font-mono text-[12px]">csf_{f.prefix}…</td>
                <td data-label="Connected">{when(f.issuedAt)}<div className="text-ink-muted">by {f.issuedBy}</div></td>
                <td data-label="Last call">{f.lastCallAt ? <>{when(f.lastCallAt)}<div className="text-ink-muted">{f.lastResult} · {f.calls} calls</div></> : 'Not yet'}</td>
                <td className="text-end">
                  {f.revokedAt ? <span className="text-ink-muted">Disconnected {when(f.revokedAt)} by {f.revokedBy}</span>
                    : <button className={btn} disabled={busy} onClick={() => run(() => callApi<{ feed: SiteFeed }>(`${base}/feeds/${encodeURIComponent(f.id)}`, { action: 'revoke', by: official }), x => `${x.feed.name} disconnected; its key no longer works`)}>Disconnect</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : <p className="text-[13px] text-ink-soft">No system is connected yet.</p>}
      <form className="flex flex-wrap items-end gap-2" onSubmit={async e => {
        e.preventDefault();
        const r = await run(() => callApi<{ feed: SiteFeed; key: string }>(`${base}/feeds`, { name: feedName, by: official }), x => `${x.feed.name} connected`);
        if (r) { setNewKey({ name: r.feed.name, key: r.key }); setFeedName(''); }
      }}>
        <label className="text-[12px] text-ink-soft">Name of the system<input className={`${input} mt-1 w-72`} required maxLength={80} value={feedName} onChange={e => setFeedName(e.currentTarget.value)} placeholder="e.g. Master Facility List" /></label>
        <button className={btn} disabled={busy || !accepted}>Connect and issue a key</button>
      </form>
      <p className="text-[12px] text-ink-muted">An administrator or an official who can sign for the institution connects systems.</p>
    </section>
  );
}
