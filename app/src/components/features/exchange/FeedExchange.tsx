'use client';

// One connected system's exchange with the platform (review R10): the public
// key its requests must be signed with (RFC 9421, optional; registered by a
// named official) and its recent exchanges from the platform's exchange log,
// each with the request digest, the signature key, the result and the id of
// the signed receipt the system received. API: …/feeds/[feedId]/signing-key
// and /api/exchange/log; rules: lib/exchange/.

import * as React from 'react';
import { useOfficial } from '@/lib/official';

interface Exchange { id: string; at: string; method: string; status: number; result: string; requestDigest: string; signature: 'verified' | 'absent' | 'refused'; signatureKeyId?: string; receiptId: string }
interface Key { keyId: string; registeredAt: string; registeredBy: string }

const btn = 'focus-ring rounded-[3px] border border-line px-2.5 py-1 text-xs font-semibold text-ink hover:bg-surface-2 disabled:opacity-50';
const when = (iso: string) => new Date(iso).toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
const SIG: Record<Exchange['signature'], string> = { verified: 'Signed, verified', absent: 'Not signed', refused: 'Signature refused' };

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, { ...init, headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((j as { error?: string }).error ?? `Request failed (${r.status})`);
  return j as T;
}

export function FeedExchange({ kind, ministryId, feedId, canManage }: { kind: 'case' | 'site'; ministryId: string; feedId: string; canManage: boolean }) {
  const [official] = useOfficial();
  const [open, setOpen] = React.useState(false);
  const [key, setKey] = React.useState<Key | null>(null);
  const [rows, setRows] = React.useState<Exchange[] | null>(null);
  const [pem, setPem] = React.useState('');
  const [msg, setMsg] = React.useState<string | null>(null);
  const keyUrl = `/api/org/ministries/${encodeURIComponent(ministryId)}/${kind === 'case' ? 'queue' : 'facilities'}/feeds/${encodeURIComponent(feedId)}/signing-key`;
  const channel = kind === 'case' ? 'case-feed' : 'site-feed';

  const load = React.useCallback(async () => {
    try {
      const [k, l] = await Promise.all([
        call<{ key: Key | null }>(keyUrl),
        call<{ exchanges: Exchange[] }>(`/api/exchange/log?channel=${channel}&feedId=${encodeURIComponent(feedId)}&limit=20`),
      ]);
      setKey(k.key); setRows(l.exchanges);
    } catch (e) { setMsg((e as Error).message); }
  }, [keyUrl, channel, feedId]);
  React.useEffect(() => { if (open) void load(); }, [open, load]);

  const act = async (f: () => Promise<unknown>, done: string) => {
    if (!official) { setMsg('Sign in or name the acting official first: every step is recorded under a person.'); return; }
    try { await f(); setMsg(done); setPem(''); await load(); } catch (e) { setMsg((e as Error).message); }
  };

  return (
    <details className="mt-1 text-xs" onToggle={e => setOpen((e.currentTarget as HTMLDetailsElement).open)}>
      <summary className="cursor-pointer text-link">Signing key and recent exchanges</summary>
      <div className="mt-1.5 space-y-2 rounded-[3px] border border-line-soft p-2">
        {msg ? <p role="status" className="text-ink-soft">{msg}</p> : null}
        <p>
          {key
            ? <>Requests must be signed (RFC 9421, Ed25519) with key <code className="font-mono">{key.keyId}</code>, registered {when(key.registeredAt)} by {key.registeredBy}. Unsigned or badly signed requests are refused.</>
            : <>No signing key: the system&rsquo;s bearer key alone is accepted. Register its Ed25519 public key to require signed requests.</>}
        </p>
        {canManage ? (
          <form className="flex flex-wrap items-end gap-2" onSubmit={e => { e.preventDefault(); void act(() => call(keyUrl, { method: 'POST', body: JSON.stringify({ publicKey: pem, by: official }) }), 'Key registered: requests must now be signed with it.'); }}>
            <label className="text-ink-soft">Public key (PEM)
              <textarea className="focus-ring mt-1 block w-80 rounded-[3px] border border-line bg-surface px-2 py-1 font-mono text-2xs" rows={3} value={pem} onChange={e => setPem(e.currentTarget.value)} placeholder="-----BEGIN PUBLIC KEY-----" required />
            </label>
            <button className={btn}>{key ? 'Replace key' : 'Register key'}</button>
            {key ? <button type="button" className={btn} onClick={() => void act(() => call(keyUrl, { method: 'DELETE', body: JSON.stringify({ by: official }) }), 'Key removed: the bearer key alone is accepted again.')}>Remove key</button> : null}
          </form>
        ) : null}
        {rows === null ? <p className="text-ink-muted">Loading…</p> : rows.length === 0 ? <p className="text-ink-muted">No exchanges recorded yet.</p> : (
          <table className="w-full" data-stack aria-label="Recent exchanges">
            <thead><tr className="border-b border-line text-ink-muted"><th className="py-0.5 text-start font-semibold">When</th><th className="text-start font-semibold">Request</th><th className="text-start font-semibold">Signature</th><th className="text-start font-semibold">Result</th><th className="text-start font-semibold">Receipt</th></tr></thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-b border-line-soft align-top">
                  <td data-label="When" className="py-0.5">{when(r.at)}</td>
                  <td data-label="Request">{r.method} <span className="font-mono text-ink-muted" title={r.requestDigest}>{r.requestDigest.slice(9, 21)}…</span></td>
                  <td data-label="Signature">{SIG[r.signature]}{r.signatureKeyId ? <div className="font-mono text-ink-muted">{r.signatureKeyId}</div> : null}</td>
                  <td data-label="Result">{r.status} · {r.result}</td>
                  <td data-label="Receipt" className="font-mono text-ink-muted">{r.receiptId.slice(0, 15)}…</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="text-ink-muted">Each answer carries a receipt signed by the platform (<code>receipt</code>, and the <code>CivicOS-Receipt</code> header); the system keeps it as its side of the record. The platform&rsquo;s key: <code>/api/exchange/key</code>.</p>
      </div>
    </details>
  );
}
