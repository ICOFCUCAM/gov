'use client';

import * as React from 'react';
import { listEscalationsRows } from '@/lib/db/repos/memory';
import { listDispatchesRows } from '@/lib/db/repos/memory';
import { listWorkItemsRows } from '@/lib/db/repos/work-items';
import {
  distinctAuditScopesRows, verifyChainRow,
  recentWitnessRows, witnessAgreementRow,
} from '@/lib/db/repos/audit';
import { substrateAvailable } from '@/lib/db/client';
import type { EscalationRow, DispatchRow, WorkItemRow } from '@/lib/db/types';
import { useRealtimeRefresh } from './useRealtimeRefresh';
import { isSeen, subscribeSeen } from '@/lib/seen';
import { useIdentity } from './useIdentity';

export type AlertKind = 'chain-broken' | 'witness-divergence' | 'escalation' | 'dispatch' | 'work-item';
export type AlertSeverity = 'national' | 'major' | 'critical' | 'urgent' | 'minor' | 'warn';

export interface Alert {
  id: string;
  kind: AlertKind;
  severity: AlertSeverity;
  title: string;
  detail: string;
  href: string;
  at: number;
}

const sevWeight: Record<AlertSeverity, number> = {
  national: 0, major: 1, critical: 2, urgent: 3, warn: 4, minor: 5,
};

/**
 * useSubstrateAlerts — aggregates signal that needs operator attention
 * across the persistent substrate. Reads four streams, applies severity
 * heuristics, and returns a sorted Alert[] suitable for both a header
 * bell badge and the /gov/alerts page.
 *
 * All four sources are RLS-scoped, so the alerts an operator sees are
 * scoped to their identity automatically.
 */
export function useSubstrateAlerts(): { alerts: Alert[]; unseen: Alert[]; loading: boolean; refresh: () => Promise<void> } {
  const { actor } = useIdentity();
  const [alerts, setAlerts] = React.useState<Alert[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [, force] = React.useReducer(x => x + 1, 0);
  React.useEffect(() => subscribeSeen(() => force()), []);
  const available = substrateAvailable();

  const refresh = React.useCallback(async () => {
    if (!available) return;
    setLoading(true);
    try {
      // Parallel reads — each is small, RLS-shaped.
      const [escs, dispatches, work, scopes, witnesses] = await Promise.all([
        listEscalationsRows({ openOnly: true, limit: 40 }),
        listDispatchesRows({ limit: 60 }),
        listWorkItemsRows({ closed: false, limit: 60 }),
        distinctAuditScopesRows(8),
        recentWitnessRows({ limit: 60 }),
      ]);

      // Chain sweep (parallel verify on the recent scopes).
      const chains = await Promise.all(scopes.map(async s => {
        const r = await verifyChainRow(s);
        return { scope: s, intact: r?.intact ?? false, entries: r?.entries ?? 0 };
      }));

      const next: Alert[] = [];

      // Broken chains — always national severity (substrate integrity).
      for (const c of chains) {
        if (!c.intact && c.entries > 0) {
          next.push({
            id: `chain:${c.scope}`,
            kind: 'chain-broken',
            severity: 'national',
            title: `Audit chain broken · ${c.scope}`,
            detail: `${c.entries} entries; integrity sweep failed`,
            href: '/gov/audit',
            at: Date.now(),
          });
        }
      }

      // Witness divergences — for any scope with attestations, check if
      // the live latest-seq hash still matches. Disagreement is a
      // tamper-after-the-fact alarm; severity 'major' (the chain itself
      // hasn't been broken; the chain was rewritten and the attestation
      // catches it).
      const witnessScopes = Array.from(new Set(witnesses.map(w => w.scope))).slice(0, 12);
      const witnessAgreements = await Promise.all(witnessScopes.map(async s => {
        const a = await witnessAgreementRow(s);
        return [s, a] as const;
      }));
      for (const [s, a] of witnessAgreements) {
        if (a && !a.consistent && a.attestations > 0) {
          next.push({
            id: `wd:${s}`,
            kind: 'witness-divergence',
            severity: 'major',
            title: `Witness divergence · ${s}`,
            detail: `live chain disagrees with ${a.attestations} attestation${a.attestations === 1 ? '' : 's'}`,
            href: '/gov/witnesses',
            at: Date.now(),
          });
        }
      }

      // Escalations — surface major / national directly.
      for (const e of escs as EscalationRow[]) {
        if (e.severity === 'major' || e.severity === 'national') {
          next.push({
            id: `esc:${e.id}`,
            kind: 'escalation',
            severity: e.severity,
            title: `${e.severity.toUpperCase()} escalation`,
            detail: `${e.source_charter_id}${e.target_charter_id ? ' → ' + e.target_charter_id : ''} · ${e.reason}`,
            href: '/gov/escalations',
            at: new Date(e.triggered_at).getTime(),
          });
        }
      }

      // Dispatches — critical/urgent that are still open.
      for (const d of dispatches as DispatchRow[]) {
        if ((d.priority === 'critical' || d.priority === 'urgent') && !d.closed_at) {
          next.push({
            id: `dsp:${d.id}`,
            kind: 'dispatch',
            severity: d.priority === 'critical' ? 'critical' : 'urgent',
            title: `${d.priority.toUpperCase()} dispatch`,
            detail: `${d.issued_by_charter_id}${d.target_charter_id ? ' → ' + d.target_charter_id : ''} · ${d.detail ?? d.kind}`,
            href: '/gov/dispatches',
            at: new Date(d.dispatched_at).getTime(),
          });
        }
      }

      // Work items — critical/urgent and still open.
      for (const w of work as WorkItemRow[]) {
        if ((w.priority === 'critical' || w.priority === 'urgent') && !w.closed) {
          next.push({
            id: `wi:${w.id}`,
            kind: 'work-item',
            severity: w.priority === 'critical' ? 'critical' : 'urgent',
            title: `${w.priority.toUpperCase()} work item`,
            detail: `${w.scope} · ${w.title} · ${w.current_stage}`,
            href: '/gov/workbench',
            at: new Date(w.created_at).getTime(),
          });
        }
      }

      next.sort((a, b) => {
        const dw = sevWeight[a.severity] - sevWeight[b.severity];
        if (dw !== 0) return dw;
        return b.at - a.at; // newest first within same severity
      });
      setAlerts(next);
    } finally {
      setLoading(false);
    }
  }, [available]);

  React.useEffect(() => { void refresh(); }, [refresh]);

  useRealtimeRefresh(
    React.useMemo(() => [
      { table: 'escalations' as const },
      { table: 'dispatches' as const },
      { table: 'work_items' as const },
      { table: 'audit_entries' as const },
    ], []),
    refresh,
  );

  const unseen = alerts.filter(a => !isSeen(actor?.id ?? null, a.id));
  return { alerts, unseen, loading, refresh };
}
