'use client';

// Interior Constitutional Governance — Sovereign Authority (Multi-Key).
// Critical actions require distributed authorization (Ministry + Judicial
// + Oversight) and, for surveillance/investigation, a live judicial
// token. The runtime REFUSES execution when keys are missing — the
// constitution is executable operational logic.

import * as React from 'react';
import { pendingSovereignActions, SOVEREIGN_ACTION_LABEL, type AuthorityKey } from '@/lib/gov/constitutional-governance';

const KEYS: AuthorityKey[] = ['MINISTRY', 'JUDICIAL', 'OVERSIGHT'];

export function SovereignAuthority({ id, now }: { id: string; now: number }) {
  void id;
  const actions = pendingSovereignActions(now);
  const refused = actions.filter(a => !a.result.permitted).length;
  return (
    <div className="space-y-2 font-mono">
      <div className="flex flex-wrap items-stretch divide-x divide-line border-y border-line bg-black/30">
        <div className="min-w-[160px] flex-1 px-3 py-1.5">
          <div className="text-[8px] uppercase tracking-[0.16em] text-ink-muted">Pending sovereign actions</div>
          <div className="mt-0.5 text-[17px] font-semibold tabular-nums text-ink">{actions.length}</div>
        </div>
        <div className="min-w-[160px] flex-1 px-3 py-1.5">
          <div className="text-[8px] uppercase tracking-[0.16em] text-ink-muted">Runtime-refused</div>
          <div className="mt-0.5 text-[17px] font-semibold tabular-nums" style={{ color: refused ? 'rgb(var(--c-alert))' : 'rgb(var(--c-ok))' }}>{refused}</div>
        </div>
        <div className="min-w-[240px] flex-[2] px-3 py-1.5">
          <div className="text-[8px] uppercase tracking-[0.16em] text-ink-muted">Rule</div>
          <div className="mt-0.5 text-[10px] text-ink-soft">No single actor may control sovereign powers alone.</div>
        </div>
      </div>

      <div className="border border-line">
        <div className="flex items-center gap-2 border-b border-line bg-black/30 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
          <span className="w-52 shrink-0">Sovereign action</span>
          <span className="w-44 shrink-0">Distributed keys</span>
          <span className="w-28 shrink-0">Judicial token</span>
          <span className="w-20 shrink-0">Verdict</span>
          <span className="min-w-0 flex-1">Constitutional basis</span>
        </div>
        {actions.map(a => (
          <div key={a.id} className="flex items-center gap-2 border-b border-line/60 px-2 py-1.5 text-[10px] last:border-0">
            <span className="w-52 shrink-0">
              <span className="text-ink">{SOVEREIGN_ACTION_LABEL[a.kind]}</span>
              <span className="block text-[8px] text-ink-muted">{a.requestedBy}</span>
            </span>
            <span className="flex w-44 shrink-0 gap-1">
              {KEYS.map(k => {
                const held = a.keysHeld.includes(k);
                return (
                  <span key={k} className="border px-1 text-[8px] uppercase tracking-[0.06em]"
                    style={{
                      borderColor: held ? 'color-mix(in srgb,rgb(var(--c-ok)) 50%,transparent)' : 'rgb(var(--c-alert))',
                      color: held ? 'rgb(var(--c-ok))' : 'rgb(var(--c-alert))',
                    }}>
                    {held ? k : `${k}✗`}
                  </span>
                );
              })}
            </span>
            <span className="w-28 shrink-0 text-[9px]"
              style={{ color: a.judicialToken.present && !a.judicialToken.expired ? 'rgb(var(--c-ok))' : 'rgb(var(--c-warn))' }}>
              {a.judicialToken.present ? (a.judicialToken.expired ? 'expired' : 'active') : 'absent'}
            </span>
            <span className="w-20 shrink-0 text-[9px] font-bold uppercase tracking-[0.1em]"
              style={{ color: a.result.permitted ? 'rgb(var(--c-ok))' : 'rgb(var(--c-alert))' }}>
              {a.result.verdict}
            </span>
            <span className="min-w-0 flex-1 truncate text-ink-muted">{a.result.reason}</span>
          </div>
        ))}
      </div>
      <p className="text-[9px] text-ink-muted">
        Emergency powers auto-expire and require renewal + judicial review — no permanent exceptional powers.
        AI may recommend escalation but may not authorize sovereign actions; human constitutional accountability is mandatory.
      </p>
    </div>
  );
}
