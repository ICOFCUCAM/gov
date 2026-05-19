'use client';

// Interior Sovereign Runtime — National Control Board. Not analytics:
// national process observability + execution governance. Agency pressure
// rails, regional corruption heat, and the live escalation watchlist.

import * as React from 'react';
import { controlBoard } from '@/lib/gov/sovereign-observability';

const RISK = (r: number) => (r >= 65 ? 'rgb(var(--c-alert))' : r >= 40 ? 'rgb(var(--c-warn))' : 'rgb(var(--c-ok))');
const ESC = (e: string) => (e === 'breach' ? 'rgb(var(--c-alert))' : e === 'watch' ? 'rgb(var(--c-warn))' : 'rgb(var(--c-ok))');

function Ribbon({ items }: { items: { l: string; v: string; alert?: boolean }[] }) {
  return (
    <div className="flex flex-wrap items-stretch divide-x divide-line border-y border-line bg-black/30 font-mono">
      {items.map(i => (
        <div key={i.l} className="min-w-[120px] flex-1 px-3 py-1.5">
          <div className="text-[8px] uppercase tracking-[0.18em] text-ink-muted">{i.l}</div>
          <div className="mt-0.5 text-[17px] font-semibold tabular-nums"
            style={{ color: i.alert ? 'rgb(var(--c-alert))' : 'rgb(var(--c-ok))' }}>{i.v}</div>
        </div>
      ))}
    </div>
  );
}

export function NationalControlBoard({ id, now }: { id: string; now: number }) {
  void id;
  const b = controlBoard(now);
  return (
    <div className="space-y-2 font-mono">
      <Ribbon items={[
        { l: 'Observed txns', v: `${b.total}` },
        { l: 'Delayed', v: `${b.delayed}`, alert: b.delayed > 0 },
        { l: 'Constitutional breach', v: `${b.breached}`, alert: b.breached > 0 },
        { l: 'Corruption hotspots', v: `${b.corruptionHotspots}`, alert: b.corruptionHotspots > 0 },
        { l: 'Sync failures', v: `${b.syncFailures}`, alert: b.syncFailures > 0 },
        { l: 'Live ledger folded', v: `${b.ledgerFolded}` },
      ]} />

      <div>
        <div className="px-1 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-ink-soft">▌Agency execution pressure — breach-first</div>
        <div className="border border-line">
          {b.agencies.map(a => {
            const pct = a.total ? Math.round((a.delayed / a.total) * 100) : 0;
            return (
              <div key={a.agency} className="flex items-center gap-2 border-b border-line/60 px-2 py-1 text-[10px] last:border-0">
                <span className="w-44 shrink-0 truncate text-ink">{a.label}</span>
                <span className="w-10 shrink-0 tabular-nums text-ink-muted">{a.total}</span>
                <div className="relative h-2 min-w-0 flex-1 bg-surface-2">
                  <span className="absolute inset-y-0 left-0" style={{ width: `${pct}%`, background: ESC(a.breached ? 'breach' : a.delayed ? 'watch' : 'nominal') }} />
                </div>
                <span className="w-16 shrink-0 text-right tabular-nums" style={{ color: ESC(a.delayed ? 'watch' : 'nominal') }}>{a.delayed} dly</span>
                <span className="w-16 shrink-0 text-right tabular-nums" style={{ color: a.breached ? 'rgb(var(--c-alert))' : 'rgb(var(--c-ok))' }}>{a.breached} brch</span>
                <span className="w-20 shrink-0 text-right tabular-nums" style={{ color: RISK(a.meanRisk) }}>risk {a.meanRisk}</span>
                <span className="w-28 shrink-0 truncate text-right text-ink-muted">{a.worstRegion}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
        <div>
          <div className="px-1 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-ink-soft">▌Regional corruption heat</div>
          <div className="border border-line">
            {b.regionHeat.map(r => (
              <div key={r.region} className="flex items-center gap-2 border-b border-line/60 px-2 py-1 text-[10px] last:border-0">
                <span className="w-28 shrink-0 truncate text-ink">{r.region}</span>
                <div className="relative h-2 min-w-0 flex-1 bg-surface-2">
                  <span className="absolute inset-y-0 left-0" style={{ width: `${Math.min(100, r.risk)}%`, background: RISK(r.risk) }} />
                </div>
                <span className="w-12 shrink-0 text-right tabular-nums" style={{ color: RISK(r.risk) }}>{r.risk}</span>
                <span className="w-16 shrink-0 text-right tabular-nums text-ink-muted">{r.delayed} dly</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="px-1 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-ink-soft">▌Escalation watchlist — highest obstruction risk</div>
          <div className="border border-line">
            {b.watchlist.length === 0 ? (
              <p className="px-2 py-2 text-[10px] text-ink-muted">No delayed files — all transactions within lawful processing time.</p>
            ) : b.watchlist.map(t => (
              <div key={t.id} className="flex items-center gap-2 border-b border-line/60 px-2 py-1 text-[10px] last:border-0">
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${t.constitutional === 'breach' ? 'animate-pulse' : ''}`} style={{ background: ESC(t.escalation) }} aria-hidden />
                <span className="w-20 shrink-0 truncate tabular-nums text-ink-muted">{t.id}</span>
                <span className="w-24 shrink-0 truncate text-ink">{t.category}</span>
                <span className="w-24 shrink-0 truncate text-ink-muted">{t.officer}</span>
                <span className="min-w-0 flex-1 truncate text-ink-muted">{t.ageHrs}h / legal {t.legalDeadlineHrs}h</span>
                <span className="shrink-0 text-right tabular-nums" style={{ color: RISK(t.corruptionRisk) }}>R{t.corruptionRisk}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
