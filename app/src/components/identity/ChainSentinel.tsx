'use client';

import * as React from 'react';
import { distinctAuditScopesRows, verifyChainRow } from '@/lib/db/repos/audit';
import { substrateAvailable } from '@/lib/db/client';
import { useRealtimeRefresh } from '@/components/identity/useRealtimeRefresh';

type Status = 'idle' | 'verifying' | 'intact' | 'broken' | 'partial';

interface SentinelState {
  status: Status;
  scopesChecked: number;
  brokenScopes: string[];
  lastCheckAt: number | null;
}

const TONE_FOR: Record<Status, string> = {
  idle:     'rgb(var(--c-ink-muted))',
  verifying:'rgb(var(--c-ink-muted))',
  intact:   '#34d39c',
  broken:   '#f1707a',
  partial:  '#e0b341',
};

const LABEL: Record<Status, string> = {
  idle:     'chain · idle',
  verifying:'chain · …',
  intact:   'chain ok',
  broken:   'chain BROKEN',
  partial:  'chain · partial',
};

/**
 * ChainSentinel — passive watchdog for the audit chain.
 *
 * On mount and on every realtime audit_entries event, picks the top
 * 8 most-recent scopes the current session can see and runs
 * civicos_verify_audit_chain on each. Shows a compact status pill
 * in the shell; clicking opens /gov/audit for full investigation.
 *
 * Designed to be additive — the substrate's per-row trigger already
 * makes the chain tamper-evident at write time; this surface is the
 * read-time witness that nothing has been tampered with since.
 */
export function ChainSentinel({ className = '' }: { className?: string }) {
  const [state, setState] = React.useState<SentinelState>({
    status: 'idle', scopesChecked: 0, brokenScopes: [], lastCheckAt: null,
  });

  const verify = React.useCallback(async () => {
    if (!substrateAvailable()) return;
    setState(s => ({ ...s, status: 'verifying' }));
    try {
      const scopes = await distinctAuditScopesRows(8);
      if (scopes.length === 0) {
        setState({ status: 'idle', scopesChecked: 0, brokenScopes: [], lastCheckAt: Date.now() });
        return;
      }
      const results = await Promise.all(scopes.map(async s => {
        const r = await verifyChainRow(s);
        return { scope: s, intact: r?.intact ?? false };
      }));
      const broken = results.filter(r => !r.intact).map(r => r.scope);
      setState({
        status: broken.length === 0 ? 'intact'
              : broken.length === results.length ? 'broken'
              : 'partial',
        scopesChecked: results.length,
        brokenScopes: broken,
        lastCheckAt: Date.now(),
      });
    } catch {
      setState(s => ({ ...s, status: 'idle' }));
    }
  }, []);

  React.useEffect(() => { void verify(); }, [verify]);

  useRealtimeRefresh(
    React.useMemo(() => [{ table: 'audit_entries' as const }], []),
    verify,
  );

  if (!substrateAvailable()) return null;
  if (state.status === 'idle' && state.scopesChecked === 0) return null;

  const tone = TONE_FOR[state.status];
  const title = state.brokenScopes.length > 0
    ? `BROKEN chains: ${state.brokenScopes.join(', ')}`
    : `Verified ${state.scopesChecked} chains${state.lastCheckAt ? ' at ' + new Date(state.lastCheckAt).toLocaleTimeString() : ''}`;

  return (
    <a
      href="/gov/audit"
      title={title}
      className={`inline-flex items-center gap-1 rounded-[3px] border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em] hover:bg-surface-2 ${className}`}
      style={{ borderColor: tone, color: tone }}
    >
      <span aria-hidden>{state.status === 'broken' ? '⚠' : state.status === 'partial' ? '◐' : '●'}</span>
      <span>{LABEL[state.status]}</span>
      {state.scopesChecked > 0 ? (
        <span className="font-mono tabular-nums opacity-70">{state.scopesChecked}</span>
      ) : null}
    </a>
  );
}
