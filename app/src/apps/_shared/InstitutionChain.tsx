'use client';

// Shared bureaucratic-chain UI: the actor→facility→ministry→national
// lineage and a live inter-tier dispatch channel. Used by every ministry
// surface so public actors visibly serve the state THROUGH institutions,
// not as standalone dashboards.

import * as React from 'react';
import {
  chainDef, type Facility, type RecordLineage, type ChainIntegrity,
} from '@/lib/gov/institution-chain';
import {
  channel, send, subscribe, version,
  type Dispatch, type DispatchTier,
} from '@/lib/gov/dispatch-store';

const TIER_C: Record<string, string> = {
  ACTOR: 'rgb(var(--c-link))', FACILITY: 'rgb(var(--c-ok))',
  MINISTRY: 'rgb(var(--c-warn))', NATIONAL: 'rgb(var(--c-alert))',
};

export function InstitutionChainStrip({
  accent, ministryKey, facility, actorName, lineage, integrity,
}: {
  accent: string; ministryKey: string; facility: Facility;
  actorName: string; lineage: RecordLineage; integrity: ChainIntegrity;
}) {
  const d = chainDef(ministryKey);
  const iTone = integrity.status === 'synchronised' ? 'ok' : integrity.status === 'lagging' ? 'warn' : 'alert';
  return (
    <div className="rounded-[4px] border px-3 py-2.5 text-[10px]"
      style={{ borderColor: 'color-mix(in srgb,#1d2a36 75%,transparent)', background: `linear-gradient(100deg,#0a0f18,color-mix(in srgb,${accent} 6%,#0a0f18))` }}>
      <div className="mb-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-[8px] font-bold uppercase tracking-[0.18em] text-ink-muted">Institutional chain</span>
        <span className="text-ink-soft">{actorName} · <span style={{ color: accent }}>{d.actorRole}</span></span>
        <span className="text-ink-muted">enrolled at</span>
        <span className="font-medium text-ink">{facility.name} ({facility.id})</span>
        <span className="text-ink-muted">· {facility.region}</span>
        <span className="ml-auto rounded-[2px] px-1.5 py-0.5 text-[7.5px] font-bold uppercase tracking-wider"
          style={{ background: `color-mix(in srgb,rgb(var(--c-${iTone})) 18%,transparent)`, color: `rgb(var(--c-${iTone}))` }}>
          UPLINK {integrity.status}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {lineage.stages.map((s, i) => (
          <React.Fragment key={i}>
            <span className="flex items-center gap-1 rounded-[3px] px-1.5 py-0.5"
              style={{ background: s.done ? `color-mix(in srgb,${TIER_C[s.tier]} 14%,transparent)` : 'rgba(255,255,255,0.03)', color: s.done ? TIER_C[s.tier] : 'rgb(var(--c-ink-muted))' }}>
              <span>{s.done ? '▣' : '▢'}</span>{s.label}
            </span>
            {i < lineage.stages.length - 1 ? <span className="text-ink-muted">→</span> : null}
          </React.Fragment>
        ))}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-[9px] text-ink-muted">
        <span>{d.ministry} · {integrity.facilities} facilities</span>
        <span>mean sync <span style={{ color: `rgb(var(--c-${iTone}))` }}>{integrity.meanSyncPct}%</span></span>
        <span>uplink {integrity.uplinkLatencyMin}m · national lag {integrity.nationalLagMin}m</span>
        {integrity.unsynced ? <span style={{ color: 'rgb(var(--c-alert))' }}>{integrity.unsynced} facility unsynced</span> : <span style={{ color: 'rgb(var(--c-ok))' }}>all facilities synced</span>}
      </div>
    </div>
  );
}

const P_TONE: Record<string, string> = { routine: 'rgb(var(--c-ink-muted))', priority: 'rgb(var(--c-warn))', urgent: 'rgb(var(--c-alert))' };

export function DispatchChannel({
  scope, now, accent, selfTier, selfName, toTier, title,
}: {
  scope: string; now: number; accent: string;
  selfTier: DispatchTier; selfName: string; toTier: DispatchTier; title: string;
}) {
  const v = React.useSyncExternalStore(subscribe, version, () => 0);
  const [draft, setDraft] = React.useState('');
  const [prio, setPrio] = React.useState<Dispatch['priority']>('routine');
  const list = React.useMemo(() => channel(scope, now).slice(-7), [scope, now, v]);
  const submit = () => {
    const b = draft.trim();
    if (!b) return;
    send(scope, { fromTier: selfTier, from: selfName, toTier, body: b, priority: prio }, now);
    setDraft('');
  };
  return (
    <div className="rounded-[4px] border" style={{ borderColor: 'color-mix(in srgb,#1d2a36 75%,transparent)', background: '#0a0f18' }}>
      <div className="flex items-center justify-between border-b px-3 py-1.5" style={{ borderColor: 'color-mix(in srgb,#1d2a36 60%,transparent)' }}>
        <span className="text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: accent }}>{title}</span>
        <span className="text-[8px] uppercase tracking-wider text-ink-muted">{selfTier} ↔ {toTier} · live</span>
      </div>
      <div className="max-h-[168px] space-y-1 overflow-y-auto px-3 py-2">
        {list.map(m => (
          <div key={m.id} className="text-[10px]">
            <span className="font-mono text-[8px] text-ink-muted">{new Date(m.at).toLocaleTimeString('en-GB', { hour12: false })}</span>{' '}
            <span style={{ color: TIER_C[m.fromTier] }}>{m.from}</span>
            <span className="text-ink-muted"> → {m.toTier.toLowerCase()}</span>
            {m.priority !== 'routine' ? <span className="ml-1 text-[7.5px] font-bold uppercase" style={{ color: P_TONE[m.priority] }}>· {m.priority}</span> : null}
            <div className="text-ink-soft">{m.body}</div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5 border-t px-2 py-1.5" style={{ borderColor: 'color-mix(in srgb,#1d2a36 60%,transparent)' }}>
        <select value={prio} onChange={e => setPrio(e.target.value as Dispatch['priority'])}
          className="focus-ring rounded-[3px] border bg-surface px-1 py-1 text-[9px] uppercase tracking-wider text-ink-soft"
          style={{ borderColor: 'rgb(var(--c-line))' }}>
          <option value="routine">routine</option><option value="priority">priority</option><option value="urgent">urgent</option>
        </select>
        <input value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') submit(); }}
          placeholder={`Dispatch to ${toTier.toLowerCase()}…`}
          className="focus-ring min-w-0 flex-1 rounded-[3px] border bg-surface px-2 py-1 text-[10px] text-ink"
          style={{ borderColor: 'rgb(var(--c-line))' }} />
        <button type="button" onClick={submit}
          className="focus-ring rounded-[3px] border px-2 py-1 text-[9px] font-semibold uppercase tracking-wider"
          style={{ borderColor: accent, color: accent }}>Send</button>
      </div>
    </div>
  );
}
