'use client';

import * as React from 'react';
import { TONE, Panel } from '@/components/features/SituationRoom';
import { substrateAvailable, publicClient } from '@/lib/db/client';
import { useIdentity } from '@/components/identity/useIdentity';
import { SubstrateNotConfigured } from '@/components/ui/SubstrateEmpty';

interface RpcDef {
  name: string;
  signature: string;
  description: string;
  defaultArgs: Record<string, unknown>;
  prefill?: 'now-ref' | 'now-iso';
}

const RPCS: RpcDef[] = [
  { name: 'civicos_append_audit',
    signature: 'p_scope text, p_actor text, p_action text, p_subject text, p_detail text',
    description: 'Append an entry to the per-scope audit chain.',
    defaultArgs: { p_scope: 'playground', p_actor: 'tester', p_action: 'try', p_subject: 'sample', p_detail: '' } },
  { name: 'civicos_publish_event',
    signature: 'p_type text, p_source text, p_channel text, p_payload jsonb, p_target text',
    description: 'Publish a federation event.',
    defaultArgs: { p_type: 'runtime.transition', p_source: 'playground', p_channel: 'runtime', p_payload: {}, p_target: null } },
  { name: 'civicos_record_posture',
    signature: 'p_charter_id text, p_posture text, p_readiness int, p_stress int, p_detail jsonb',
    description: 'Snapshot a charter posture.',
    defaultArgs: { p_charter_id: 'platform', p_posture: 'steady', p_readiness: 80, p_stress: 20, p_detail: {} } },
  { name: 'civicos_record_dispatch',
    signature: 'p_ref text, p_issued_by_charter_id text, p_kind text, p_priority text, p_detail text, p_payload jsonb, p_target_facility_id uuid, p_target_charter_id text, p_issued_by_officer_id uuid',
    description: 'Open a new dispatch.',
    defaultArgs: { p_ref: '', p_issued_by_charter_id: 'platform', p_kind: 'unit-deploy', p_priority: 'priority', p_detail: 'test dispatch', p_payload: {}, p_target_facility_id: null, p_target_charter_id: null, p_issued_by_officer_id: null },
    prefill: 'now-ref' },
  { name: 'civicos_record_escalation',
    signature: 'p_source_charter_id text, p_severity text, p_reason text, p_target_charter_id text, p_linked_work_item_id uuid, p_linked_dispatch_id uuid, p_triggered_by_actor text, p_payload jsonb',
    description: 'Record an escalation.',
    defaultArgs: { p_source_charter_id: 'platform', p_severity: 'minor', p_reason: 'playground test', p_target_charter_id: null, p_linked_work_item_id: null, p_linked_dispatch_id: null, p_triggered_by_actor: 'tester', p_payload: {} } },
  { name: 'civicos_verify_audit_chain',
    signature: 'p_scope text',
    description: 'Walk a chain and report intact / brokenAt.',
    defaultArgs: { p_scope: 'playground' } },
];

const PLATFORM_ROLES = new Set(['platform-admin', 'noc-officer', 'cabinet-officer', 'auditor']);

/** SubstratePlayground — a read-anywhere, write-anywhere REPL for the
 *  public RPC contracts. Gated UI-side to platform-tier officers; the
 *  substrate is the final authority on what's permitted. Use sparingly
 *  in production; ideal for substrate familiarisation in staging. */
export function SubstratePlayground() {
  const { actor } = useIdentity();
  const [args, setArgs] = React.useState<Record<string, string>>(() =>
    Object.fromEntries(RPCS.map(r => [r.name, JSON.stringify(prefill(r), null, 2)])));
  const [results, setResults] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState<string | null>(null);
  const available = substrateAvailable();
  const isPlatform = actor?.kind === 'officer' && actor.role !== null && PLATFORM_ROLES.has(actor.role);

  if (!available) {
    return <SubstrateNotConfigured title="Substrate playground" />;
  }
  if (!isPlatform) {
    return (
      <Panel title="Substrate playground" meta="platform-tier only" bodyClass="!p-3">
        <p className="text-[11px] text-ink-muted">
          The playground is restricted UI-side to platform-tier officers
          (platform-admin / noc-officer / cabinet-officer / auditor).
          The substrate RPCs themselves still apply their own gates.
        </p>
      </Panel>
    );
  }

  async function run(rpc: RpcDef) {
    setBusy(rpc.name);
    try {
      const sb = publicClient();
      if (!sb) { setResults(s => ({ ...s, [rpc.name]: 'no client' })); return; }
      let parsed: Record<string, unknown>;
      try { parsed = JSON.parse(args[rpc.name] ?? '{}'); }
      catch (e) { setResults(s => ({ ...s, [rpc.name]: 'invalid JSON: ' + (e instanceof Error ? e.message : String(e)) })); return; }
      const { data, error } = await sb.rpc(rpc.name, parsed as never);
      setResults(s => ({
        ...s,
        [rpc.name]: error
          ? `ERROR: ${error.message}\nCODE: ${error.code ?? '—'}`
          : JSON.stringify(data, null, 2),
      }));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold uppercase tracking-[0.16em] text-ink">Substrate playground</h2>
          <span className="rounded-[3px] border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.16em]"
            style={{ borderColor: TONE.alert, color: TONE.alert }}>
            mutates state · use in staging
          </span>
        </div>
      </div>
      {RPCS.map(rpc => (
        <Panel key={rpc.name} title={rpc.name} meta={rpc.signature} bodyClass="!p-3 space-y-2 text-[11px]">
          <p className="text-[10px] text-ink-muted">{rpc.description}</p>
          <textarea
            value={args[rpc.name] ?? ''}
            onChange={e => setArgs(s => ({ ...s, [rpc.name]: e.currentTarget.value }))}
            className="h-32 w-full rounded-[3px] border border-line bg-bg px-2 py-1 font-mono text-[10px]"
            spellCheck={false}
          />
          <div className="flex items-center gap-2">
            <button type="button" disabled={busy === rpc.name}
              onClick={() => void run(rpc)}
              className="focus-ring rounded-[3px] border border-line bg-bg px-3 py-1 text-[9px] uppercase tracking-wider text-ink hover:bg-surface-2 disabled:opacity-50">
              {busy === rpc.name ? 'calling…' : 'invoke'}
            </button>
            <button type="button"
              onClick={() => setArgs(s => ({ ...s, [rpc.name]: JSON.stringify(prefill(rpc), null, 2) }))}
              className="focus-ring rounded-[3px] border border-line px-2 py-1 text-[9px] uppercase tracking-wider text-ink-muted hover:text-ink">
              reset
            </button>
          </div>
          {results[rpc.name] ? (
            <pre className="overflow-x-auto rounded-[3px] bg-bg px-2 py-1 font-mono text-[10px] text-ink-muted">{results[rpc.name]}</pre>
          ) : null}
        </Panel>
      ))}
    </div>
  );
}

function prefill(rpc: RpcDef): Record<string, unknown> {
  const out = { ...rpc.defaultArgs };
  if (rpc.prefill === 'now-ref' && 'p_ref' in out && !out.p_ref) {
    out.p_ref = `PG-${Date.now()}`;
  }
  return out;
}
