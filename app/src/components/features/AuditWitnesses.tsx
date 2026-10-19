'use client';

import * as React from 'react';
import { TONE, Panel } from '@/components/features/SituationRoom';
import { SurfaceHeading } from '@/components/ui/SurfaceHeading';
import { SubstrateNotConfigured } from '@/components/ui/SubstrateEmpty';
import { FilterChips } from '@/components/ui/FilterChips';
import { substrateAvailable } from '@/lib/db/client';
import { useRealtimeRefresh } from '@/components/identity/useRealtimeRefresh';
import {
  recentWitnessRows, recordWitnessAttestationRow,
  distinctAuditScopesRows, witnessAgreementRow,
  witnessWithSignatureRow,
  type AuditWitness,
} from '@/lib/db/repos/audit';
import { signWitnessAttestation, verifyWitnessAttestation } from '@/lib/db/signatures';
import { publicSigningJwk, ensureSigningKey } from '@/lib/db/webcrypto';
import { buildCsv, downloadCsv } from '@/lib/csv-download';
import { ageMinutes } from '@/lib/format';

/**
 * AuditWitnesses — external tamper attestations.
 *
 * Auditors (civil society, peer institutions, journalists) record
 * "I observed scope S at seq N with hash H at time T". The list below
 * is publicly readable. The agreement strip at the top shows, for
 * each scope, whether the latest attested hash still matches the live
 * chain — a tamper indicator that catches rewrites after the fact.
 *
 * A witness signs each statement with its device key (WebCrypto ECDSA
 * P-256); the platform records it only when an administrator has
 * registered that public key for the witness label and the signature
 * verifies (/api/audit/witnesses, go-live review H-1). Statements are
 * never replaced. Rows recorded before signatures were required stay
 * listed as history but never count towards agreement or divergence.
 */
export function AuditWitnesses() {
  const [witnesses, setWitnesses] = React.useState<AuditWitness[]>([]);
  const [scopes, setScopes] = React.useState<string[]>([]);
  const [scopeFilter, setScopeFilter] = React.useState<string>('all');
  const [agreement, setAgreement] = React.useState<Map<string, { attestations: number; consistent: boolean; latestSeq: number | null }>>(new Map());
  const [composerOpen, setComposerOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const available = substrateAvailable();

  const refresh = React.useCallback(async () => {
    if (!available) return;
    setLoading(true);
    try {
      const [ws, sc] = await Promise.all([
        recentWitnessRows({ limit: 200 }),
        distinctAuditScopesRows(80),
      ]);
      setWitnesses(ws);
      setScopes(sc);
      // Agreement check for the top-15 most-recent scopes (avoid hitting RPC for every scope).
      const topScopes = Array.from(new Set(ws.map(w => w.scope))).slice(0, 15);
      const entries = await Promise.all(topScopes.map(async s => {
        const r = await witnessAgreementRow(s);
        return [s, r ?? { attestations: 0, consistent: true, latestSeq: null }] as const;
      }));
      setAgreement(new Map(entries));
    } finally {
      setLoading(false);
    }
  }, [available]);

  React.useEffect(() => { void refresh(); }, [refresh]);

  useRealtimeRefresh(
    React.useMemo(() => [{ table: 'audit_entries' as const }], []),
    refresh,
  );

  if (!available) {
    return <SubstrateNotConfigured title="Audit Witnesses" />;
  }

  const filtered = scopeFilter === 'all'
    ? witnesses
    : witnesses.filter(w => w.scope === scopeFilter);

  const divergent = Array.from(agreement.entries()).filter(([, a]) => !a.consistent && a.attestations > 0);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <SurfaceHeading title="Audit Witnesses" badge="external tamper proofs · public" />
        <div className="flex items-center gap-2">
          <button type="button"
            onClick={() => setComposerOpen(o => !o)}
            className="focus-ring rounded-[3px] border border-line px-2 py-0.5 text-[9px] uppercase tracking-wider text-ink-muted hover:text-ink">
            {composerOpen ? 'cancel' : '+ attest'}
          </button>
          <button type="button"
            onClick={() => { void refresh(); }}
            disabled={loading}
            className="focus-ring rounded-[3px] border border-line px-2 py-0.5 text-[9px] uppercase tracking-wider text-ink-muted hover:text-ink disabled:opacity-50">
            {loading ? 'sweeping…' : 'refresh'}
          </button>
          <button type="button"
            onClick={() => {
              const csv = buildCsv(
                ['at','scope','observed_seq','observed_hash','witness_label','has_jwk','has_signature','recorded_by'],
                witnesses.map(w => [
                  new Date(w.at).toISOString(),
                  w.scope, w.observedSeq, w.observedHash, w.label,
                  w.hasJwk, w.hasSignature, w.recordedBy ?? '',
                ]),
              );
              downloadCsv('civicos-witnesses', csv);
            }}
            className="focus-ring rounded-[3px] border border-line px-2 py-0.5 text-[9px] uppercase tracking-wider text-ink-muted hover:text-ink">
            csv
          </button>
        </div>
      </div>

      {divergent.length > 0 ? (
        <div className="rounded-[3px] border px-3 py-2 text-[11px] animate-pulse"
          style={{ borderColor: TONE.alert, color: TONE.alert }}>
          ⚠ {divergent.length} scope{divergent.length === 1 ? '' : 's'} with attestations that diverge from the live chain.
          Possible tamper-after-the-fact on:{' '}
          <span className="font-mono">{divergent.map(([s]) => s).join(', ')}</span>
          {' '}— the witness-divergence cron writes an escalation per scope; see{' '}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- kept as a full page load */}
          <a href="/gov/escalations" className="underline">/gov/escalations</a>{' '}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- kept as a full page load */}
          and{' '}<a href="/gov/federation" className="underline">/gov/federation</a>{' '}
          (channel <span className="font-mono">constitutional</span>, type <span className="font-mono">audit.divergence</span>).
        </div>
      ) : witnesses.length > 0 ? (
        <div className="rounded-[3px] border px-3 py-2 text-[11px]"
          style={{ borderColor: TONE.ok, color: TONE.ok }}>
          ✓ All {agreement.size} witnessed scopes agree with the live chain.
        </div>
      ) : null}

      {composerOpen ? (
        <AttestationComposer scopes={scopes} onDone={async () => {
          await refresh();
          setComposerOpen(false);
        }} />
      ) : null}

      <FilterChips label="scope:"
        options={['all', ...Array.from(new Set(witnesses.map(w => w.scope)))]}
        value={scopeFilter}
        onChange={setScopeFilter} />

      <Panel title="Attestations" meta={`${filtered.length}`} bodyClass="!p-0">
        {filtered.length === 0 ? (
          <p className="px-3 py-4 text-[11px] text-ink-muted">
            No witness attestations recorded{scopeFilter === 'all' ? '' : ` for ${scopeFilter}`}.
          </p>
        ) : (
          <div className="max-h-[560px] overflow-y-auto">
            {filtered.map(w => {
              const a = agreement.get(w.scope);
              const tone = a == null ? TONE.neutral : a.consistent ? TONE.ok : TONE.alert;
              return (
                <div key={w.id} className="border-b border-line-soft px-3 py-1.5 last:border-0 text-[10px]">
                  <div className="flex items-center gap-2">
                    <span className="w-44 shrink-0 truncate font-mono text-link">{w.scope}</span>
                    <span className="w-12 shrink-0 text-right font-mono tabular-nums text-ink">@{w.observedSeq}</span>
                    <span className="w-32 shrink-0 truncate font-mono text-ink-soft">{w.observedHash.slice(0, 16)}…</span>
                    <span className="min-w-0 flex-1 truncate text-ink">{w.label}</span>
                    <span className="w-16 shrink-0 text-right text-[8.5px] font-bold uppercase tracking-wider" style={{ color: tone }}>
                      {a == null ? '—' : a.consistent ? 'agrees' : 'divergent'}
                    </span>
                    <span className="w-16 shrink-0 text-right font-mono tabular-nums text-ink-muted">{ageMinutes(w.at)}m</span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 font-mono text-[9px] text-ink-muted">
                    {w.hasJwk ? <span style={{ color: TONE.link }}>+ jwk</span> : null}
                    {w.hasSignature ? <span style={{ color: TONE.link }}>+ signed</span> : null}
                    {w.registeredKey ? <span style={{ color: TONE.link }}>registered key</span> : <span>unsigned (history, not counted)</span>}
                    {w.hasJwk && w.hasSignature ? <VerifyButton witnessId={w.id} /> : null}
                    <span>· {new Date(w.at).toLocaleString()}</span>
                    {w.recordedBy ? <span>· {w.recordedBy}</span> : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      <p className="text-[10px] text-ink-muted">
        Witnesses are publicly readable and append-only. If the live chain
        is ever rewritten, the (seq, hash) pair attested above will no
        longer match — making tamper-after-the-fact detectable by anyone.
      </p>
    </div>
  );
}

function AttestationComposer({ scopes, onDone }: { scopes: string[]; onDone: () => Promise<void> }) {
  const [scope, setScope] = React.useState(scopes[0] ?? 'substrate:self');
  const [observedSeq, setObservedSeq] = React.useState('');
  const [observedHash, setObservedHash] = React.useState('');
  const [label, setLabel] = React.useState('');
  const [myKey, setMyKey] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const seq = Number(observedSeq);
    if (!Number.isInteger(seq) || seq < 0) {
      setError('observed seq must be a non-negative integer');
      return;
    }
    if (!observedHash.trim() || !label.trim()) {
      setError('observed hash and witness label are required');
      return;
    }
    setBusy(true);
    try {
      // Every statement is signed with this device's key (required since H-1).
      await ensureSigningKey();
      const jwk = await publicSigningJwk();
      const signature = await signWitnessAttestation({
        scope, observedSeq: seq, observedHash: observedHash.trim(),
        witnessLabel: label.trim(),
      });
      if (!jwk || !signature) {
        setError('This browser cannot sign (WebCrypto unavailable)');
        return;
      }
      const row = await recordWitnessAttestationRow({
        scope, observedSeq: seq, observedHash: observedHash.trim(),
        label: label.trim(),
        jwk, signature,
      });
      if ('error' in row) {
        setError(row.error);
        return;
      }
      setObservedSeq('');
      setObservedHash('');
      setLabel('');
      await onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2 rounded-[3px] border border-line bg-surface p-3 text-[11px]">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
        <label className="block">
          <span className="block text-[8.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Scope</span>
          <input list="known-scopes" className="mt-1 w-full rounded-[3px] border border-line bg-bg px-2 py-1 font-mono text-[11px]"
            value={scope} onChange={e => setScope(e.currentTarget.value)} required />
          <datalist id="known-scopes">
            {scopes.map(s => <option key={s} value={s} />)}
          </datalist>
        </label>
        <label className="block">
          <span className="block text-[8.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Observed seq</span>
          <input className="mt-1 w-full rounded-[3px] border border-line bg-bg px-2 py-1 font-mono text-[11px]"
            value={observedSeq} onChange={e => setObservedSeq(e.currentTarget.value)} required />
        </label>
        <label className="block">
          <span className="block text-[8.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Observed hash</span>
          <input className="mt-1 w-full rounded-[3px] border border-line bg-bg px-2 py-1 font-mono text-[11px]"
            value={observedHash} onChange={e => setObservedHash(e.currentTarget.value)}
            placeholder="hex" required />
        </label>
        <label className="block">
          <span className="block text-[8.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Witness label</span>
          <input className="mt-1 w-full rounded-[3px] border border-line bg-bg px-2 py-1 text-[11px]"
            value={label} onChange={e => setLabel(e.currentTarget.value)}
            placeholder="auditor name / institution" required />
        </label>
      </div>
      {error ? <p className="text-[10px]" style={{ color: TONE.alert }}>{error}</p> : null}
      <div className="flex items-center gap-2">
        <button type="submit" disabled={busy}
          className="focus-ring rounded-[3px] border border-line bg-bg px-3 py-1 text-[9px] uppercase tracking-wider text-ink hover:bg-surface-2 disabled:opacity-50">
          {busy ? 'attesting…' : 'attest'}
        </button>
        <button type="button"
          onClick={async () => {
            await ensureSigningKey();
            const k = await publicSigningJwk();
            setMyKey(k ? JSON.stringify({ kty: k.kty, crv: k.crv, x: k.x, y: k.y }) : 'This browser cannot sign (WebCrypto unavailable)');
          }}
          className="focus-ring rounded-[3px] border border-line bg-bg px-3 py-1 text-[9px] uppercase tracking-wider text-ink hover:bg-surface-2">
          show my public key
        </button>
        <p className="text-[9px] text-ink-muted">
          Signed with this device&apos;s key. Public, append-only, never replaced. An administrator registers
          your public key for your witness label first.
        </p>
      </div>
      {myKey ? (
        <label className="block">
          <span className="block text-[8.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Your public key (give it to an administrator)</span>
          <textarea readOnly value={myKey} rows={2} className="mt-1 w-full rounded-[3px] border border-line bg-bg px-2 py-1 font-mono text-[10px]" />
        </label>
      ) : null}
      <WitnessKeyRegistration label={label} />
    </form>
  );
}

/** Administrators register (or revoke) a witness's public key
 *  (/api/audit/witnesses/keys; refused for everyone else). */
function WitnessKeyRegistration({ label }: { label: string }) {
  const [open, setOpen] = React.useState(false);
  const [jwkText, setJwkText] = React.useState('');
  const [message, setMessage] = React.useState<string | null>(null);
  async function register() {
    setMessage(null);
    let jwk: unknown;
    try { jwk = JSON.parse(jwkText); } catch { setMessage('The public key must be JSON (a JWK)'); return; }
    const res = await fetch('/api/audit/witnesses/keys', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ label: label.trim(), jwk }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    setMessage(res.ok ? `Registered for ${label.trim()}` : json.error ?? `Not registered (${res.status})`);
  }
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)}
        className="focus-ring text-[9px] uppercase tracking-wider text-link underline">
        register a witness key (administrators)
      </button>
    );
  }
  return (
    <div className="space-y-1">
      <label className="block">
        <span className="block text-[8.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Witness public key (JWK) for the label above</span>
        <textarea value={jwkText} onChange={e => setJwkText(e.currentTarget.value)} rows={2}
          className="mt-1 w-full rounded-[3px] border border-line bg-bg px-2 py-1 font-mono text-[10px]" />
      </label>
      <button type="button" onClick={() => void register()} disabled={!label.trim() || !jwkText.trim()}
        className="focus-ring rounded-[3px] border border-line bg-bg px-3 py-1 text-[9px] uppercase tracking-wider text-ink hover:bg-surface-2 disabled:opacity-50">
        register key
      </button>
      {message ? <p className="text-[10px] text-ink-muted" role="status">{message}</p> : null}
    </div>
  );
}

/** Per-row "verify" control. Pulls the underlying row (jwk + signature)
 *  from civicos.audit_witnesses, re-derives the canonical material from
 *  the public-view fields, and runs WebCrypto.subtle.verify locally.
 *  Reports verified / failed / unavailable in-place. */
function VerifyButton({ witnessId }: { witnessId: string }) {
  const [state, setState] = React.useState<'idle' | 'checking' | 'ok' | 'fail' | 'unavailable'>('idle');

  async function run() {
    setState('checking');
    const full = await witnessWithSignatureRow(witnessId);
    if (!full || !full.witnessJwk || !full.witnessSignature) {
      setState('fail');
      return;
    }
    const ok = await verifyWitnessAttestation({
      scope: full.scope,
      observedSeq: full.observedSeq,
      observedHash: full.observedHash,
      witnessLabel: full.witnessLabel,
      jwk: full.witnessJwk,
      hexSignature: full.witnessSignature,
    });
    if (ok === null) setState('unavailable');
    else setState(ok ? 'ok' : 'fail');
  }

  return (
    <button type="button" onClick={() => void run()}
      className="focus-ring rounded-[3px] border border-line-soft px-1.5 py-0 text-[9px] uppercase tracking-wider hover:text-ink"
      style={{ color: state === 'ok' ? TONE.ok : state === 'fail' ? TONE.alert : 'rgb(var(--c-ink-muted))' }}>
      {state === 'checking' ? 'verifying…'
        : state === 'ok' ? 'verified ✓'
        : state === 'fail' ? 'failed ✗'
        : state === 'unavailable' ? 'no webcrypto'
        : 'verify'}
    </button>
  );
}
