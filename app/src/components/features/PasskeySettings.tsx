'use client';

// The signed-in official's passkeys and security keys (My account): add one
// (this device's fingerprint, face or PIN, a phone, or a USB/NFC security
// key), see when each was last used, remove one. A passkey works as the
// second sign-in step after the password, or to sign in on its own. Only its
// public key is kept. Server: /api/auth/passkeys.

import * as React from 'react';
import Link from 'next/link';
import { useSignIn, refreshSignIn } from '@/lib/official';
import { createPasskey, passkeysSupported, type CreationJSON } from '@/lib/webauthn-browser';

interface Passkey { id: string; name: string; createdAt: string; lastUsedAt?: string; synced: boolean }

const btn = 'focus-ring rounded-[3px] border border-line px-3 py-1.5 text-[13px] font-semibold text-ink hover:bg-surface-2 disabled:opacity-50';
const input = 'focus-ring w-56 rounded-[3px] border border-line bg-surface px-2.5 py-2 text-[14px] text-ink';
const day = (iso?: string) => (iso ? new Date(iso).toISOString().slice(0, 10) : 'never');

export function PasskeySettings() {
  const official = useSignIn()?.official ?? null;
  const [list, setList] = React.useState<Passkey[] | null>(null);
  const [why, setWhy] = React.useState<string | null>(null);
  const [name, setName] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null);
  const [supported, setSupported] = React.useState(true);
  React.useEffect(() => { setSupported(passkeysSupported()); }, []);

  const load = React.useCallback(async () => {
    const r = await fetch('/api/auth/passkeys', { cache: 'no-store' });
    if (!r.ok) { setList(null); return; }
    const d = (await r.json()) as { passkeys: Passkey[]; available: boolean; why?: string };
    setList(d.passkeys); setWhy(d.available ? null : d.why ?? 'Passkeys are not available on this installation yet');
  }, []);
  React.useEffect(() => { if (official?.method === 'local') void load(); }, [official?.method, load]);

  async function post(body: Record<string, unknown>) {
    const r = await fetch('/api/auth/passkeys', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error((d as { error?: string }).error ?? `Request failed (${r.status})`);
    return d;
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      const o = (await post({ action: 'options' })) as { challengeId: string; publicKey: CreationJSON };
      const response = await createPasskey(o.publicKey);
      await post({ action: 'register', challengeId: o.challengeId, response, name });
      setName(''); setMsg({ ok: true, text: 'Passkey added' });
      await load(); await refreshSignIn();
    } catch (err) { setMsg({ ok: false, text: (err as Error).message }); }
    finally { setBusy(false); }
  }

  async function remove(p: Passkey) {
    if (!window.confirm(`Remove the passkey "${p.name}"? It will no longer sign you in.`)) return;
    setBusy(true); setMsg(null);
    try { await post({ action: 'remove', id: p.id }); setMsg({ ok: true, text: 'Passkey removed' }); await load(); }
    catch (err) { setMsg({ ok: false, text: (err as Error).message }); }
    finally { setBusy(false); }
  }

  if (!official || official.method !== 'local' || !list) return null;
  return (
    <section id="passkeys" className="mx-auto mb-4 max-w-[1100px] space-y-3 rounded-[3px] border border-line bg-surface p-4 text-[14px] text-ink">
      <h2 className="text-[17px] font-semibold">Passkeys and security keys</h2>
      <p className="max-w-3xl text-ink-soft">
        Sign in with this device&rsquo;s fingerprint, face or PIN, your phone, or a security key, instead of typing a code. A passkey counts as the second sign-in step after your password, and can sign you in on its own. Nobody can copy it from the platform: only its public key is kept here.
      </p>
      {msg ? <p role="status" className={msg.ok ? 'text-ok' : 'text-alert'}>{msg.text}</p> : null}
      {list.length ? (
        <ul className="divide-y divide-line rounded-[3px] border border-line">
          {list.map(p => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
              <span><strong>{p.name}</strong> <span className="text-[13px] text-ink-muted">· added {day(p.createdAt)} · last used {day(p.lastUsedAt)}{p.synced ? ' · synced across your devices' : ' · this device or key only'}</span></span>
              <button type="button" className={btn} disabled={busy} onClick={() => remove(p)}>Remove</button>
            </li>
          ))}
        </ul>
      ) : <p className="text-ink-soft">No passkeys yet.</p>}
      {why ? <p className="text-[13px] text-ink-muted">{why}</p> : !supported ? <p className="text-[13px] text-ink-muted">This browser cannot make passkeys.</p> : (
        <form className="flex flex-wrap items-end gap-2" onSubmit={add}>
          <label className="text-[12px] text-ink-soft">Name for it<input className={`${input} mt-1 block`} maxLength={60} placeholder="e.g. Office laptop" value={name} onChange={e => setName(e.currentTarget.value)} /></label>
          <button className={btn} disabled={busy}>{busy ? 'Working…' : 'Add a passkey'}</button>
        </form>
      )}
      <p className="text-[12px] text-ink-muted">Every change here is written to the <Link href="/gov/audit" className="text-link underline">audit record</Link>. If you lose every device, an administrator can reset your second step under People › Sign-in accounts.</p>
    </section>
  );
}
