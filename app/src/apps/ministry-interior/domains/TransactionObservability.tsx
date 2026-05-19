'use client';

// Interior Sovereign Runtime — Transaction Observability. The national
// citizen-transaction runtime: stage lanes (capture → validate → ministry
// commit → national sync → archive) and a live ledger exposing SLA timer,
// legal deadline, escalation, sync state, audit lineage and the
// constitutional processing guarantee for every file.

import * as React from 'react';
import { observabilityLedger, AGENCIES, AGENCY_LABEL, type TxnStage, type Agency } from '@/lib/gov/sovereign-observability';

const LANES: { key: TxnStage; label: string }[] = [
  { key: 'captured', label: 'CAPTURE' },
  { key: 'validated', label: 'VALIDATE' },
  { key: 'ministry-commit', label: 'MINISTRY COMMIT' },
  { key: 'national-sync', label: 'NATIONAL SYNC' },
  { key: 'archived', label: 'ARCHIVE' },
];
const ESC = (e: string) => (e === 'breach' ? 'rgb(var(--c-alert))' : e === 'watch' ? 'rgb(var(--c-warn))' : 'rgb(var(--c-ok))');

export function TransactionObservability({ id, now }: { id: string; now: number }) {
  void id;
  const [agency, setAgency] = React.useState<Agency | 'ALL'>('ALL');
  const all = observabilityLedger(now);
  const txns = agency === 'ALL' ? all : all.filter(t => t.agency === agency);

  return (
    <div className="space-y-2 font-mono">
      {/* Stage rails — process topology, left → right propagation */}
      <div className="grid grid-cols-5 gap-px border border-line bg-line">
        {LANES.map(l => {
          const inLane = txns.filter(t => t.stage === l.key);
          const breach = inLane.filter(t => t.escalation === 'breach').length;
          const watch = inLane.filter(t => t.escalation === 'watch').length;
          return (
            <div key={l.key} className="bg-black/40 px-2 py-1.5">
              <div className="text-[8px] uppercase tracking-[0.16em] text-ink-muted">{l.label}</div>
              <div className="mt-0.5 text-[16px] font-semibold tabular-nums text-ink">{inLane.length}</div>
              <div className="mt-0.5 flex gap-2 text-[8.5px]">
                <span style={{ color: 'rgb(var(--c-warn))' }}>{watch} watch</span>
                <span style={{ color: 'rgb(var(--c-alert))' }}>{breach} brch</span>
              </div>
              <div className="mt-1 h-1 w-full bg-surface-2">
                <span className="block h-full" style={{ width: `${inLane.length ? Math.min(100, (breach + watch) / inLane.length * 100) : 0}%`, background: breach ? 'rgb(var(--c-alert))' : 'rgb(var(--c-warn))' }} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-1 text-[9px]">
        <span className="text-ink-muted">FILTER</span>
        {(['ALL', ...AGENCIES] as (Agency | 'ALL')[]).map(a => (
          <button key={a} onClick={() => setAgency(a)}
            className={'focus-ring border px-1.5 py-px uppercase tracking-[0.1em] ' + (agency === a ? 'border-link text-ink' : 'border-line text-ink-muted hover:text-ink')}>
            {a === 'ALL' ? 'ALL' : AGENCY_LABEL[a]}
          </button>
        ))}
      </div>

      {/* Live ledger — every field nationally observable */}
      <div className="border border-line">
        <div className="flex items-center gap-2 border-b border-line bg-black/30 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
          <span className="w-20 shrink-0">Txn ID</span>
          <span className="w-28 shrink-0">Agency</span>
          <span className="w-24 shrink-0">Officer</span>
          <span className="w-20 shrink-0">Stage</span>
          <span className="w-24 shrink-0">SLA timer</span>
          <span className="w-20 shrink-0">Sync</span>
          <span className="min-w-0 flex-1">Constitutional</span>
        </div>
        <div className="max-h-[420px] overflow-y-auto">
          {txns.slice(0, 60).map(t => {
            const slaPct = Math.min(100, Math.round((t.ageHrs / t.slaHrs) * 100));
            return (
              <div key={t.id} className="flex items-center gap-2 border-b border-line/50 px-2 py-1 text-[10px] last:border-0">
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${t.constitutional === 'breach' ? 'animate-pulse' : ''}`} style={{ background: ESC(t.escalation) }} aria-hidden />
                <span className="w-[68px] shrink-0 truncate tabular-nums text-ink-muted">{t.id}</span>
                <span className="w-28 shrink-0 truncate text-ink">{AGENCY_LABEL[t.agency]}</span>
                <span className="w-24 shrink-0 truncate text-ink-muted">{t.officer}</span>
                <span className="w-20 shrink-0 truncate text-ink-soft">{t.stage}</span>
                <span className="w-24 shrink-0">
                  <span className="flex items-center gap-1">
                    <span className="relative h-1.5 w-12 bg-surface-2">
                      <span className="absolute inset-y-0 left-0" style={{ width: `${slaPct}%`, background: ESC(t.escalation) }} />
                    </span>
                    <span className="tabular-nums" style={{ color: ESC(t.escalation) }}>{t.ageHrs}/{t.slaHrs}h</span>
                  </span>
                </span>
                <span className="w-20 shrink-0 truncate text-ink-muted">{t.sync}{t.fromLedger ? ' ·L' : ''}</span>
                <span className="min-w-0 flex-1 truncate" style={{ color: ESC(t.escalation) }}>
                  {t.constitutional}{t.riskFlags.length ? ` · ${t.riskFlags.join(', ')}` : ''}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <p className="text-[9px] text-ink-muted">
        {txns.length} observable transactions · audit lineage: capture → validate → ministry commit → national sync → archive.
        Files past the legal deadline cannot be silently hidden — they hold a permanent constitutional-breach state.
      </p>
    </div>
  );
}
