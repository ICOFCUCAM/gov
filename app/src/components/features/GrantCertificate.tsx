'use client';

// The partner installation's client certificate for a federation grant
// (mutual TLS, lib/exchange/mtls.ts; GET/PUT/DELETE
// /api/federation/grants/[id]/certificate). Once a grant names one, the
// partner's exchanges under it are accepted only over mutual TLS with that
// certificate, as well as its integration key. Administrators change it
// (lib/auth/roles.ts); the signed-in official's name is recorded and every
// change audited by the route.

import * as React from 'react';
import { Button } from '@/components/ui/Button';

interface Binding { sha256: string; subject?: string; notAfter?: string; by: string; at: string }

/** "ab12cd…" → "AB:12:CD:…" for reading aloud against the partner's own record. */
export const formatFingerprint = (hex: string): string => hex.toUpperCase().match(/.{1,2}/g)?.join(':') ?? hex;

export function GrantCertificate({ grantId }: { grantId: string }) {
  const [cert, setCert] = React.useState<Binding | null | undefined>(undefined);
  const [open, setOpen] = React.useState(false);
  const [pem, setPem] = React.useState('');
  const [fp, setFp] = React.useState('');
  const [subject, setSubject] = React.useState('');
  const [msg, setMsg] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const url = `/api/federation/grants/${encodeURIComponent(grantId)}/certificate`;

  const load = React.useCallback(async () => {
    try {
      const r = await fetch(url, { cache: 'no-store' });
      const j = (await r.json()) as { certificate?: Binding | null; error?: string };
      if (!r.ok) throw new Error(j.error ?? 'Could not load');
      setCert(j.certificate ?? null);
    } catch (e) { setCert(null); setMsg(e instanceof Error ? e.message : 'Could not load'); }
  }, [url]);
  React.useEffect(() => { void load(); }, [load]);

  const send = async (method: 'PUT' | 'DELETE', body: unknown, done: string) => {
    setBusy(true); setMsg(null);
    try {
      const r = await fetch(url, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) throw new Error(j.error ?? 'Not saved');
      setMsg(done); setOpen(false); setPem(''); setFp(''); setSubject('');
      await load();
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Not saved'); }
    finally { setBusy(false); }
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (pem.trim()) return void send('PUT', { certificate: pem.trim() }, 'Certificate registered.');
    return void send('PUT', { sha256: fp.trim(), ...(subject.trim() ? { subject: subject.trim() } : {}) }, 'Certificate registered.');
  };

  return (
    <div className="mt-2 rounded border border-line-soft p-2 text-sm" data-testid="grant-certificate">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <strong className="text-xs uppercase tracking-wide text-ink-muted">Partner&apos;s client certificate (mutual TLS)</strong>
        {cert === undefined ? <span className="text-xs text-ink-muted">Loading…</span> : null}
      </div>
      {cert ? (
        <div className="mt-1 space-y-1">
          <p>Exchanges under this grant are accepted only over mutual TLS with this certificate.</p>
          <p className="break-all font-mono text-xs">SHA-256 {formatFingerprint(cert.sha256)}</p>
          {cert.subject ? <p className="text-xs text-ink-muted">Subject: {cert.subject}</p> : null}
          {cert.notAfter ? <p className="text-xs text-ink-muted">Expires {new Date(cert.notAfter).toLocaleDateString()}{Date.parse(cert.notAfter) < Date.now() ? ' (expired: the partner must send a new one)' : ''}</p> : null}
          <p className="text-xs text-ink-muted">Registered by {cert.by}, {new Date(cert.at).toLocaleString()}.</p>
        </div>
      ) : cert === null ? (
        <p className="mt-1 text-ink-muted">None registered: the partner&apos;s integration key alone is accepted. Register its certificate to require mutual TLS as well.</p>
      ) : null}
      <div className="mt-2 flex flex-wrap gap-2">
        <Button variant="secondary" disabled={busy} onClick={() => setOpen(o => !o)}>{cert ? 'Replace the certificate' : 'Register a certificate'}</Button>
        {cert ? (
          <Button variant="secondary" disabled={busy} onClick={() => {
            if (window.confirm('Remove the certificate? The partner\'s integration key alone will be accepted again.')) void send('DELETE', {}, 'Certificate removed.');
          }}>Remove</Button>
        ) : null}
      </div>
      {open ? (
        <form onSubmit={save} className="mt-2 space-y-2">
          <label className="block text-xs">
            <span className="font-medium">The partner&apos;s certificate (PEM)</span>
            <textarea value={pem} onChange={e => setPem(e.target.value)} rows={4} className="mt-1 w-full rounded border border-line bg-surface px-2 py-1 font-mono text-xs"
              placeholder="-----BEGIN CERTIFICATE-----" />
          </label>
          <p className="text-xs text-ink-muted">Or, without the certificate itself:</p>
          <label className="block text-xs">
            <span className="font-medium">Its SHA-256 fingerprint</span>
            <input value={fp} onChange={e => setFp(e.target.value)} disabled={!!pem.trim()} className="mt-1 w-full rounded border border-line bg-surface px-2 py-1 font-mono text-xs" placeholder="AB:CD:…" />
          </label>
          <label className="block text-xs">
            <span className="font-medium">Its subject (optional)</span>
            <input value={subject} onChange={e => setSubject(e.target.value)} disabled={!!pem.trim()} className="mt-1 w-full rounded border border-line bg-surface px-2 py-1 text-xs" placeholder="CN=exchange.gov.example,O=…" />
          </label>
          <Button type="submit" disabled={busy || (!pem.trim() && !fp.trim())}>Save</Button>
        </form>
      ) : null}
      {msg ? <p role="status" className="mt-1 text-xs text-ink-muted">{msg}</p> : null}
    </div>
  );
}
