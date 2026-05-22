'use client';

import * as React from 'react';
import { TONE, Panel } from '@/components/features/SituationRoom';
import {
  recentAuditEntriesRows, distinctAuditScopesRows, verifyChainRow, auditScopeSummaryRows,
  auditTrailRows, recordWitnessAttestationRow, type AuditEntry,
} from '@/lib/db/repos/audit';
import { substrateAvailable } from '@/lib/db/client';
import { useIdentity } from '@/components/identity/useIdentity';
import { useRealtimeRefresh } from '@/components/identity/useRealtimeRefresh';
import { SubstrateNotConfigured } from '@/components/ui/SubstrateEmpty';
import { downloadJson } from '@/lib/csv-download';
import { SurfaceHeading } from '@/components/ui/SurfaceHeading';

/**
 * Audit Explorer — surface the hash-chained audit ledger live.
 *
 * Left: list of audit scopes the current session can see (RLS-filtered).
 * Centre: the chain for the selected scope, newest first, with each
 * entry's prev_hash → hash relationship visible.
 * Right: chain verification — calls civicos_verify_audit_chain on
 * demand. The DB walks the chain and reports intact / brokenAt.
 *
 * Realtime: new audit entries appear without polling. The chain proof
 * is on-demand because verification is O(chain length) per call.
 */
export function AuditExplorer() {
  const { actor, session, ready } = useIdentity();
  const [scopes, setScopes] = React.useState<string[]>([]);
  const [active, setActive] = React.useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const sp = new URL(window.location.href).searchParams.get('scope');
    return sp || null;
  });
  const [recent, setRecent] = React.useState<AuditEntry[]>([]);
  const [counts, setCounts] = React.useState<Record<string, number>>({});
  const [trail, setTrail] = React.useState<AuditEntry[]>([]);
  const [verifying, setVerifying] = React.useState(false);
  const [verification, setVerification] = React.useState<{ entries: number; intact: boolean; brokenAt: number | null } | null>(null);
  const available = substrateAvailable();

  const refresh = React.useCallback(async () => {
    if (!available) return;
    const [s, r, sum] = await Promise.all([
      distinctAuditScopesRows(30),
      recentAuditEntriesRows(120),
      auditScopeSummaryRows(200),
    ]);
    // Prefer the platform-tier summary (has counts + ordered by activity);
    // fall back to the distinct-scope list for non-platform sessions.
    setScopes(sum.length > 0 ? sum.map(x => x.scope) : s);
    setCounts(Object.fromEntries(sum.map(x => [x.scope, x.entries])));
    setRecent(r);
    if (!active && (sum.length > 0 || s.length > 0)) setActive((sum[0]?.scope) ?? s[0]!);
  }, [available, active]);

  React.useEffect(() => { if (ready) void refresh(); }, [ready, actor?.id, session?.user.id, refresh]);

  useRealtimeRefresh(
    React.useMemo(() => [{ table: 'audit_entries' as const }], []),
    refresh,
  );

  React.useEffect(() => {
    if (!active) { setTrail([]); return; }
    void auditTrailRows(active, 100).then(setTrail);
    setVerification(null);
  }, [active]);

  const onVerify = React.useCallback(async () => {
    if (!active) return;
    setVerifying(true);
    try {
      const r = await verifyChainRow(active);
      if (r) setVerification({ entries: r.entries, intact: r.intact, brokenAt: r.brokenAt });
    } finally {
      setVerifying(false);
    }
  }, [active]);

  const downloadChain = React.useCallback(() => {
    if (!active || trail.length === 0) return;
    const chain = [...trail].reverse(); // newest-last for chain order
    downloadJson(`civicos-chain-${active.replace(/[^a-z0-9._-]+/gi, '_')}`, {
      scope: active,
      exported_at: new Date().toISOString(),
      entries: chain.length,
      verification: verification ?? null,
      chain: chain.map(e => ({
        seq: e.seq, at: e.at, actor: e.actor, action: e.action,
        subject: e.subject, detail: e.detail,
        prev_hash: e.prevHash, hash: e.hash,
      })),
    });
  }, [active, trail, verification]);

  if (!available) {
    return <SubstrateNotConfigured title="Audit Explorer" />;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <SurfaceHeading title="Audit Explorer" badge="hash-chained · tamper-evident" />
        <div className="flex items-center gap-2">
          <a href="/gov/audit/sweep"
             className="focus-ring rounded-[3px] border border-line px-2 py-0.5 text-[9px] uppercase tracking-wider text-ink-muted hover:text-ink">
            coverage sweep
          </a>
          <button
            type="button"
            onClick={downloadChain}
            disabled={!active || trail.length === 0}
            className="focus-ring rounded-[3px] border border-line px-2 py-0.5 text-[9px] uppercase tracking-wider text-ink-muted hover:text-ink disabled:opacity-50"
          >
            download chain
          </button>
          <button
            type="button"
            onClick={() => { void refresh(); }}
            className="focus-ring rounded-[3px] border border-line px-2 py-0.5 text-[9px] uppercase tracking-wider text-ink-muted hover:text-ink"
          >
            refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[200px_1fr_240px]">
        <Panel title="Scopes" meta={`${scopes.length}`} bodyClass="!p-0">
          {scopes.length === 0 ? (
            <p className="px-3 py-4 text-[11px] text-ink-muted">No audit scopes visible.</p>
          ) : (
            <div className="max-h-[480px] overflow-y-auto">
              {scopes.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setActive(s)}
                  className="flex w-full items-center gap-2 border-b border-line-soft px-3 py-1.5 text-left font-mono text-[10px] hover:bg-surface-2"
                  style={{ color: s === active ? TONE.link : 'rgb(var(--c-ink))' }}
                >
                  <span className="min-w-0 flex-1 truncate">{s}</span>
                  {counts[s] != null ? <span className="shrink-0 text-ink-muted">{counts[s]}</span> : null}
                </button>
              ))}
            </div>
          )}
        </Panel>

        <Panel title={active ? `Chain · ${active}` : 'Chain'} meta={`${trail.length} entries`} bodyClass="!p-0">
          {trail.length === 0 ? (
            <p className="px-3 py-4 text-[11px] text-ink-muted">
              {active ? 'Empty chain.' : 'Select a scope.'}
            </p>
          ) : (
            <div className="max-h-[480px] overflow-y-auto">
              {trail.map(e => (
                <a key={e.hash} href={`/gov/audit/${encodeURIComponent(e.scope)}/${e.seq}`}
                   className="block border-b border-line-soft px-3 py-1.5 text-[10px] hover:bg-surface-2">
                  <div className="flex items-center gap-2">
                    <span className="w-12 shrink-0 font-mono tabular-nums text-ink-muted">#{e.seq}</span>
                    <span className="w-20 shrink-0 truncate font-mono text-link">{e.action}</span>
                    <span className="min-w-0 flex-1 truncate text-ink">{e.subject}</span>
                    <span className="w-32 shrink-0 truncate text-right text-ink-soft">{e.actor}</span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 font-mono text-[9px] text-ink-muted">
                    <span>prev {e.prevHash}</span>
                    <span>→</span>
                    <span style={{ color: TONE.link }}>hash {e.hash}</span>
                    {e.detail ? <span className="ml-2 truncate">· {e.detail}</span> : null}
                  </div>
                </a>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Verification" meta="DB-side" bodyClass="!p-3 space-y-2 text-[11px]">
          <p className="text-ink-muted">
            Asks the substrate to walk the selected chain server-side and
            report whether every <span className="font-mono">prev_hash → hash</span>
            relationship is intact.
          </p>
          <button
            type="button"
            onClick={onVerify}
            disabled={!active || verifying}
            className="focus-ring w-full rounded-[3px] border border-line bg-bg px-3 py-1 text-[9px] uppercase tracking-wider text-ink hover:bg-surface-2 disabled:opacity-50"
          >
            {verifying ? 'verifying…' : active ? 'verify chain' : 'select a scope'}
          </button>
          {verification ? (
            <div
              className="rounded-[3px] border px-2 py-1.5 font-mono"
              style={{
                borderColor: verification.intact ? TONE.ok : TONE.alert,
                color: verification.intact ? TONE.ok : TONE.alert,
              }}
            >
              {verification.intact
                ? `intact · ${verification.entries} entries`
                : `BROKEN · ${verification.entries} entries · broken at seq ${verification.brokenAt}`}
            </div>
          ) : null}
          {verification?.intact ? (
            <AttestThisChain scope={active!} latestEntry={trail[0] ?? null} />
          ) : null}
        </Panel>
      </div>

      <Panel title="Recent across all scopes" meta={`${recent.length}`} bodyClass="!p-0">
        {recent.length === 0 ? (
          <p className="px-3 py-4 text-[11px] text-ink-muted">No recent entries visible at the current scope.</p>
        ) : (
          <div className="max-h-[320px] overflow-y-auto">
            {recent.map(e => (
              <a key={e.hash} href={`/gov/audit/${encodeURIComponent(e.scope)}/${e.seq}`}
                 className="flex items-center gap-2 border-b border-line-soft px-3 py-1 text-[10px] hover:bg-surface-2">
                <span className="w-32 shrink-0 truncate font-mono text-link">{e.scope}</span>
                <span className="w-10 shrink-0 font-mono tabular-nums text-ink-muted">#{e.seq}</span>
                <span className="w-20 shrink-0 truncate font-mono text-ink">{e.action}</span>
                <span className="min-w-0 flex-1 truncate text-ink">{e.subject}</span>
                <span className="w-32 shrink-0 truncate text-right text-ink-soft">{e.actor}</span>
              </a>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

/** Inline attestation: one-click record_witness_attestation for the
 *  currently verified scope. Surfaces the most recent (seq, hash) pair
 *  so auditors don't have to retype them. */
function AttestThisChain({ scope, latestEntry }: { scope: string; latestEntry: AuditEntry | null }) {
  const [label, setLabel] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [result, setResult] = React.useState<'idle' | 'ok' | 'fail'>('idle');

  if (!latestEntry) return null;

  async function attest() {
    if (!label.trim() || !latestEntry) return;
    setBusy(true);
    setResult('idle');
    try {
      const row = await recordWitnessAttestationRow({
        scope,
        observedSeq: latestEntry.seq,
        observedHash: latestEntry.hash,
        label: label.trim(),
      });
      setResult(row ? 'ok' : 'fail');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-2 space-y-2 rounded-[3px] border border-line-soft px-2 py-1.5">
      <p className="font-mono text-[10px] text-ink-muted">
        Attest @{latestEntry.seq} = {latestEntry.hash.slice(0, 12)}…
      </p>
      <div className="flex gap-1">
        <input
          className="flex-1 rounded-[3px] border border-line bg-bg px-2 py-1 text-[10px]"
          placeholder="witness label"
          value={label}
          onChange={e => setLabel(e.currentTarget.value)}
        />
        <button type="button" disabled={!label.trim() || busy} onClick={() => void attest()}
          className="focus-ring rounded-[3px] border border-line bg-bg px-2 py-1 text-[9px] uppercase tracking-wider text-ink hover:bg-surface-2 disabled:opacity-50">
          {busy ? '…' : 'attest'}
        </button>
      </div>
      {result === 'ok' ? (
        <p className="text-[9px]" style={{ color: TONE.ok }}>recorded</p>
      ) : result === 'fail' ? (
        <p className="text-[9px]" style={{ color: TONE.alert }}>failed</p>
      ) : null}
    </div>
  );
}
