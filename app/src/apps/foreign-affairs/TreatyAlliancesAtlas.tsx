'use client';

// Foreign Affairs — Treaty & Alliances Atlas. Treaties rendered as a
// quartered atlas — by scope (bilateral · regional · multilateral ·
// universal) — with renegotiation timelines as horizontal ledger
// bars. Bilateral partner alignment plotted on a quiet bar plot.
// International organisations register at the foot.

import * as React from 'react';
import { foreignAffairsBoard, type Treaty } from '@/lib/gov/foreign-affairs';

const MIDNIGHT = '#0e1b3a';
const MIDNIGHT_DEEP = '#08122a';
const CHARCOAL = '#16181f';
const PANEL = '#1a1c24';
const GOLD = '#a78947';
const GOLD_DIM = '#7a6233';
const SILVER = '#a8aab0';
const BURGUNDY = '#6b2a35';
const INK = '#dad9d2';
const PARCH = '#ece6d3';
const MUT = '#7a7e88';
const TRACE = 'rgba(167,137,71,0.22)';

const STATUS_COL: Record<Treaty['status'], string> = {
  'in-force': GOLD, review: SILVER, amendment: GOLD_DIM, suspended: '#a05538', expired: BURGUNDY,
};
const DOMAIN_GLYPH: Record<Treaty['domain'], string> = {
  security: '⚜', trade: '⚖', climate: '✦', rights: '☩', maritime: '⚓', tech: '⌬',
};
const SCOPE_LABEL: Record<Treaty['scope'], string> = {
  bilateral: 'Bilateral · I.', regional: 'Regional · II.', multilateral: 'Multilateral · III.', universal: 'Universal · IV.',
};

export function TreatyAlliancesAtlas({ id, now }: { id: string; now: number }) {
  void id;
  const b = foreignAffairsBoard(now);
  const groups: Treaty['scope'][] = ['bilateral', 'regional', 'multilateral', 'universal'];
  const byScope = groups.map(s => ({ scope: s, treaties: b.treaties.filter(t => t.scope === s) }));
  const e = b.economic;
  return (
    <div style={{ background: MIDNIGHT_DEEP, color: INK, fontFamily: 'ui-serif, Georgia, serif' }}>
      {/* Letterhead */}
      <header className="border-b px-8 py-5" style={{ borderColor: TRACE, background: MIDNIGHT }}>
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-[9px] uppercase tracking-[0.5em]" style={{ color: GOLD }}>· Treaty &amp; Alliances Atlas ·</div>
            <h2 className="mt-2 text-[18px] tracking-[0.06em]" style={{ color: PARCH }}>{b.treaties.length} standing instruments · {b.organizations.length} international bodies</h2>
          </div>
          <div className="text-right">
            <div className="text-[9px] uppercase tracking-[0.32em]" style={{ color: MUT }}>civilizational standing</div>
            <div className="mt-0.5 tabular-nums text-[18px]" style={{ color: GOLD }}>{b.forecast.civilizationalStandingIdx}</div>
          </div>
        </div>
      </header>

      {/* Treaty atlas — quartered */}
      <section className="grid grid-cols-1 gap-px lg:grid-cols-2" style={{ background: TRACE }}>
        {byScope.map(g => (
          <div key={g.scope} className="px-6 py-5" style={{ background: CHARCOAL }}>
            <div className="mb-3 flex items-baseline justify-between border-b pb-2" style={{ borderColor: TRACE }}>
              <h3 className="text-[10.5px] uppercase tracking-[0.36em]" style={{ color: GOLD }}>{SCOPE_LABEL[g.scope]}</h3>
              <span className="text-[9px] italic" style={{ color: MUT }}>{g.treaties.length} instrument{g.treaties.length === 1 ? '' : 's'}</span>
            </div>
            <ul className="space-y-3">
              {g.treaties.map(t => {
                const reneg = Math.max(0, Math.min(12, t.renegotiationDueY));
                const renegPct = ((12 - reneg) / 12) * 100;
                return (
                  <li key={t.id}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[12px]" style={{ color: PARCH }}>
                        <span className="mr-2" style={{ color: GOLD_DIM }}>{DOMAIN_GLYPH[t.domain]}</span>{t.title}
                      </span>
                      <span className="text-[9px] uppercase tracking-[0.24em]" style={{ color: STATUS_COL[t.status] }}>· {t.status}</span>
                    </div>
                    <div className="mt-1 grid grid-cols-[1fr_70px_80px] items-center gap-3 text-[10px]">
                      <div className="flex items-center gap-2">
                        <span className="uppercase tracking-[0.18em]" style={{ color: MUT, fontSize: '8.5px' }}>RENEG</span>
                        <div className="h-[2px] flex-1" style={{ background: '#0d1428' }}>
                          <div className="h-full" style={{ width: `${renegPct}%`, background: t.renegotiationDueY <= 2 ? '#a05538' : GOLD }} />
                        </div>
                        <span className="tabular-nums" style={{ color: t.renegotiationDueY <= 2 ? '#a05538' : SILVER }}>{t.renegotiationDueY}y</span>
                      </div>
                      <span className="text-right tabular-nums" style={{ color: SILVER }}>{t.signatories} sig.</span>
                      <span className="text-right tabular-nums" style={{ color: t.complianceIdx >= 80 ? GOLD : SILVER }}>{t.complianceIdx} comp.</span>
                    </div>
                    <div className="mt-1 text-[9px] italic" style={{ color: MUT }}>· in force {t.yearsInForce}y · {t.domain}</div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </section>

      {/* Bilateral alignment + economic diplomacy */}
      <section className="grid grid-cols-1 gap-px lg:grid-cols-[1fr_320px]" style={{ background: TRACE }}>
        <div className="px-8 py-6" style={{ background: MIDNIGHT_DEEP }}>
          <div className="text-[9px] uppercase tracking-[0.4em]" style={{ color: GOLD }}>✦ Bilateral Alignment Atlas</div>
          <div className="mt-4 space-y-2">
            {e.bilateralPartners.map(p => (
              <div key={p.partner} className="grid grid-cols-[180px_1fr_60px_70px] items-center gap-3 text-[11px]">
                <span className="italic" style={{ color: PARCH }}>{p.partner}</span>
                <div className="relative h-[2px]" style={{ background: '#0d1428' }}>
                  <div className="h-full" style={{ width: `${p.alignmentIdx}%`, background: p.alignmentIdx >= 70 ? GOLD : p.alignmentIdx >= 45 ? SILVER : BURGUNDY }} />
                  {/* tick at 50 */}
                  <div className="absolute inset-y-[-2px]" style={{ left: '50%', width: '1px', background: GOLD_DIM, opacity: 0.4 }} />
                </div>
                <span className="text-right tabular-nums" style={{ color: p.alignmentIdx >= 70 ? GOLD : SILVER }}>{p.alignmentIdx}</span>
                <span className="text-right tabular-nums" style={{ color: MUT }}>{p.tradeShare}%</span>
              </div>
            ))}
          </div>
        </div>
        <div className="px-6 py-6" style={{ background: PANEL }}>
          <div className="text-[9px] uppercase tracking-[0.4em]" style={{ color: GOLD }}>◈ Economic Diplomacy</div>
          <div className="mt-4 space-y-3">
            {[
              { l: 'Trade alignment', v: e.tradeAlignmentIdx, t: e.tradeAlignmentIdx >= 70 ? GOLD : SILVER },
              { l: 'Investment continuity', v: e.investmentContinuityIdx, t: e.investmentContinuityIdx >= 70 ? GOLD : SILVER },
              { l: 'Sanctions exposure', v: e.sanctionsExposureIdx, t: e.sanctionsExposureIdx >= 50 ? BURGUNDY : e.sanctionsExposureIdx >= 30 ? '#a05538' : GOLD },
              { l: 'Resource coverage', v: e.strategicResourceCoverageIdx, t: e.strategicResourceCoverageIdx >= 70 ? GOLD : SILVER },
            ].map(x => (
              <div key={x.l}>
                <div className="flex items-baseline justify-between">
                  <span className="text-[10px] uppercase tracking-[0.24em]" style={{ color: MUT }}>{x.l}</span>
                  <span className="tabular-nums text-[14px]" style={{ color: x.t }}>{x.v}</span>
                </div>
                <div className="mt-1 h-[2px]" style={{ background: '#0d1428' }}>
                  <div className="h-full" style={{ width: `${x.v}%`, background: x.t }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* International organizations roster */}
      <section className="px-8 py-6" style={{ background: PANEL }}>
        <div className="mb-3 flex items-baseline justify-between">
          <div className="flex items-baseline gap-3">
            <span style={{ color: GOLD }}>✦</span>
            <h3 className="text-[11px] uppercase tracking-[0.4em]" style={{ color: SILVER }}>International Organisations · Multilateral Participation</h3>
          </div>
          <span className="text-[9px] italic" style={{ color: MUT }}>membership · participation · voting alignment · contribution</span>
        </div>
        <div className="grid grid-cols-1 gap-px md:grid-cols-2" style={{ background: TRACE }}>
          {b.organizations.map(o => {
            const memCol = o.membership === 'full' ? GOLD : o.membership === 'observer' ? SILVER : o.membership === 'associate' ? GOLD_DIM : BURGUNDY;
            return (
              <div key={o.org} className="grid grid-cols-[1fr_90px_90px_90px] items-baseline gap-3 px-5 py-3" style={{ background: PANEL }}>
                <span className="text-[12px]" style={{ color: PARCH }}>{o.org}</span>
                <span className="text-[9px] uppercase tracking-[0.24em]" style={{ color: memCol }}>· {o.membership}</span>
                <span className="text-right tabular-nums text-[11px]" style={{ color: SILVER }}>part {o.participationIdx}</span>
                <span className="text-right tabular-nums text-[11px]" style={{ color: o.votingAlignmentIdx >= 70 ? GOLD : SILVER }}>vote {o.votingAlignmentIdx} · {o.contributionTier}</span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
