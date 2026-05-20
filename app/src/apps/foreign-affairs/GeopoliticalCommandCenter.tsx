'use client';

// Foreign Affairs — Geopolitical Command Center. A diplomatic polar
// disc of regional tensions arranged around the seal of state, with
// alliance/alignment readouts beneath. Midnight diplomatic blue,
// restrained gold, deep charcoal, muted silver, strategic burgundy.
// Distinguishing geometry: a radial bearing-disc (not a chamber, not
// a lattice, not a rail) — regions sit at compass bearings and
// project influence outward as restrained spokes.

import * as React from 'react';
import { foreignAffairsBoard, type GeopoliticalPosture, type RegionalTension } from '@/lib/gov/foreign-affairs';

const MIDNIGHT = '#0e1b3a';
const MIDNIGHT_DEEP = '#08122a';
const CHARCOAL = '#16181f';
const GOLD = '#a78947';
const GOLD_DIM = '#7a6233';
const SILVER = '#a8aab0';
const BURGUNDY = '#6b2a35';
const INK = '#dad9d2';
const MUT = '#7a7e88';
const TRACE = 'rgba(167,137,71,0.22)';

const POSTURE_COL: Record<GeopoliticalPosture, string> = {
  aligned: GOLD, balanced: SILVER, realigning: GOLD_DIM, pressured: '#a05538', 'crisis-engagement': BURGUNDY,
};

const DRIFT_COL: Record<RegionalTension['drift'], string> = {
  aligning: GOLD, stable: SILVER, cooling: '#5a7d8f', drifting: GOLD_DIM, fracturing: BURGUNDY,
};

// Polar bearing disc
function BearingDisc({ tensions }: { tensions: RegionalTension[] }) {
  const size = 360;
  const cx = size / 2, cy = size / 2;
  const rOuter = 158, rInner = 60;
  const n = tensions.length;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block" aria-hidden>
      <defs>
        <radialGradient id="discBg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#1a2a52" />
          <stop offset="100%" stopColor={MIDNIGHT_DEEP} />
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={rOuter + 8} fill={MIDNIGHT_DEEP} stroke={TRACE} />
      <circle cx={cx} cy={cy} r={rOuter} fill="url(#discBg)" stroke={GOLD_DIM} strokeOpacity={0.55} />
      {/* concentric ring marks at 25/50/75 */}
      {[0.25, 0.5, 0.75].map(p => (
        <circle key={p} cx={cx} cy={cy} r={rInner + (rOuter - rInner) * p} fill="none" stroke={TRACE} strokeDasharray="2 4" />
      ))}
      {/* compass cross */}
      {[0, 90, 180, 270].map(deg => {
        const rad = (deg - 90) * Math.PI / 180;
        return (
          <line key={deg} x1={cx + Math.cos(rad) * rInner} y1={cy + Math.sin(rad) * rInner}
            x2={cx + Math.cos(rad) * (rOuter + 2)} y2={cy + Math.sin(rad) * (rOuter + 2)}
            stroke={GOLD_DIM} strokeOpacity={0.4} strokeWidth={0.6} />
        );
      })}
      {/* center seal */}
      <circle cx={cx} cy={cy} r={rInner} fill={MIDNIGHT} stroke={GOLD} strokeOpacity={0.6} />
      <circle cx={cx} cy={cy} r={rInner - 6} fill="none" stroke={GOLD_DIM} strokeDasharray="1 3" />
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize={9.5} fontFamily="ui-serif, serif" fill={GOLD} letterSpacing={4}>SOVEREIGN</text>
      <text x={cx} y={cy + 8} textAnchor="middle" fontSize={9.5} fontFamily="ui-serif, serif" fill={GOLD} letterSpacing={4}>FOREIGN</text>
      <text x={cx} y={cy + 22} textAnchor="middle" fontSize={7.5} fontFamily="ui-serif, serif" fill={SILVER} letterSpacing={3}>· AFFAIRS ·</text>
      {/* regional bearings */}
      {tensions.map((t, i) => {
        const deg = (i / n) * 360 - 90;
        const rad = deg * Math.PI / 180;
        const px = cx + Math.cos(rad) * (rOuter * 0.86);
        const py = cy + Math.sin(rad) * (rOuter * 0.86);
        const lx = cx + Math.cos(rad) * (rOuter + 18);
        const ly = cy + Math.sin(rad) * (rOuter + 18);
        const reach = (t.tensionIdx / 100) * (rOuter - rInner - 6);
        const startX = cx + Math.cos(rad) * (rInner + 2);
        const startY = cy + Math.sin(rad) * (rInner + 2);
        const endX = cx + Math.cos(rad) * (rInner + 2 + reach);
        const endY = cy + Math.sin(rad) * (rInner + 2 + reach);
        const col = DRIFT_COL[t.drift];
        return (
          <g key={t.region}>
            {/* spoke trace */}
            <line x1={startX} y1={startY} x2={endX} y2={endY} stroke={col} strokeOpacity={0.7} strokeWidth={2} />
            {/* flashpoint pips */}
            {Array.from({ length: t.flashpoints }).map((_, fi) => {
              const fr = rInner + 8 + fi * 6;
              return <circle key={fi} cx={cx + Math.cos(rad) * fr} cy={cy + Math.sin(rad) * fr} r={1.6} fill={BURGUNDY} />;
            })}
            {/* tension dot */}
            <circle cx={px} cy={py} r={4.5} fill={col} stroke={MIDNIGHT_DEEP} strokeWidth={1} />
            {/* label */}
            <text x={lx} y={ly} textAnchor={Math.cos(rad) > 0.2 ? 'start' : Math.cos(rad) < -0.2 ? 'end' : 'middle'}
              fontSize={9.5} fontFamily="ui-serif, serif" fill={INK} letterSpacing={1.5}>{t.region.toUpperCase()}</text>
            <text x={lx} y={ly + 11} textAnchor={Math.cos(rad) > 0.2 ? 'start' : Math.cos(rad) < -0.2 ? 'end' : 'middle'}
              fontSize={8} fill={col} letterSpacing={2}>· {t.drift} · {t.tensionIdx}</text>
          </g>
        );
      })}
    </svg>
  );
}

export function GeopoliticalCommandCenter({ id, now }: { id: string; now: number }) {
  void id;
  const b = foreignAffairsBoard(now);
  const c = b.command;
  return (
    <div style={{ background: MIDNIGHT_DEEP, color: INK, fontFamily: 'ui-serif, Georgia, serif' }}>
      {/* Dispatch ribbon */}
      <header className="border-b px-8 py-5" style={{ borderColor: TRACE, background: `linear-gradient(180deg, ${MIDNIGHT} 0%, ${MIDNIGHT_DEEP} 100%)` }}>
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-[9px] uppercase tracking-[0.5em]" style={{ color: GOLD }}>· FOREIGN AFFAIRS ·  ─  GEOPOLITICAL DISPATCH</div>
            <h2 className="mt-2 text-[19px] tracking-[0.06em]" style={{ color: '#f1efe6' }}>{b.bannerLine}</h2>
          </div>
          <div className="text-right">
            <div className="text-[9px] uppercase tracking-[0.32em]" style={{ color: MUT }}>cable epoch</div>
            <div className="mt-1 tabular-nums text-[14px]" style={{ color: SILVER }}>№ {String(b.epoch).padStart(6, '0')}</div>
          </div>
        </div>
      </header>

      {/* Polar disc + readouts */}
      <section className="grid grid-cols-1 gap-px lg:grid-cols-[420px_1fr]" style={{ background: TRACE }}>
        <div className="flex items-center justify-center px-4 py-6" style={{ background: MIDNIGHT_DEEP }}>
          <BearingDisc tensions={c.regionalTensions} />
        </div>
        <div className="px-8 py-6" style={{ background: CHARCOAL }}>
          <div className="text-[9px] uppercase tracking-[0.4em]" style={{ color: GOLD }}>◈ Command Readout</div>
          <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3">
            {[
              { l: 'Global alignment', v: c.globalAlignmentIdx, t: c.globalAlignmentIdx >= 75 ? GOLD : c.globalAlignmentIdx >= 60 ? SILVER : BURGUNDY },
              { l: 'Alliance stability', v: c.allianceStabilityIdx, t: c.allianceStabilityIdx >= 75 ? GOLD : c.allianceStabilityIdx >= 60 ? SILVER : BURGUNDY },
              { l: 'Escalation index', v: c.diplomaticEscalationIdx, t: c.diplomaticEscalationIdx >= 60 ? BURGUNDY : c.diplomaticEscalationIdx >= 40 ? '#a05538' : SILVER },
              { l: 'Multipolar balance', v: c.multipolarBalanceIdx, t: c.multipolarBalanceIdx >= 65 ? GOLD : SILVER },
            ].map(x => (
              <div key={x.l} className="flex items-baseline justify-between border-b py-2" style={{ borderColor: TRACE }}>
                <span className="text-[10.5px] uppercase tracking-[0.24em]" style={{ color: MUT }}>{x.l}</span>
                <span className="tabular-nums text-[18px]" style={{ color: x.t, fontFamily: 'ui-serif, Georgia, serif' }}>{x.v}</span>
              </div>
            ))}
          </div>
          {/* posture stripe */}
          <div className="mt-6 flex items-center gap-3">
            <span className="text-[9px] uppercase tracking-[0.4em]" style={{ color: MUT }}>posture of state ―</span>
            <span className="inline-block h-px flex-1" style={{ background: GOLD_DIM }} />
            <span className="text-[11px] uppercase italic tracking-[0.32em]" style={{ color: POSTURE_COL[c.posture] }}>{c.posture}</span>
            <span className="inline-block h-px flex-1" style={{ background: GOLD_DIM }} />
            <span className="text-[12px]" style={{ color: POSTURE_COL[c.posture] }}>✦</span>
          </div>
          {/* drift table */}
          <div className="mt-5">
            <div className="text-[9px] uppercase tracking-[0.4em]" style={{ color: GOLD }}>◈ Regional Drift Register</div>
            <div className="mt-2 space-y-1.5">
              {b.drifts.map(d => (
                <div key={d.region} className="grid grid-cols-[1fr_60px_120px_70px_80px] items-baseline gap-3 text-[11px]">
                  <span className="italic" style={{ color: INK }}>{d.region}</span>
                  <span className="text-right tabular-nums" style={{ color: d.driftIdx >= 0 ? GOLD : BURGUNDY }}>{d.driftIdx >= 0 ? '+' : ''}{d.driftIdx}</span>
                  <div className="flex items-center gap-2">
                    <div className="h-[3px] flex-1" style={{ background: '#0d1428' }}>
                      <div className="h-full" style={{ width: `${d.influenceIdx}%`, background: GOLD }} />
                    </div>
                    <span className="text-[10px] tabular-nums" style={{ color: SILVER }}>{d.influenceIdx}</span>
                  </div>
                  <span className="text-right text-[10px]" style={{ color: MUT }}>inst {d.instabilityForecast}</span>
                  <span className="text-right text-[10px]" style={{ color: MUT }}>dep {d.dependencyIdx}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer cable */}
      <footer className="flex items-center justify-between px-8 py-3" style={{ background: MIDNIGHT, borderTop: `1px solid ${TRACE}`, color: GOLD_DIM, fontFamily: 'ui-serif, Georgia, serif' }}>
        <span className="text-[9px] uppercase tracking-[0.4em]">━━ END OF DIPLOMATIC DISPATCH ━━</span>
        <span className="text-[9px] italic tracking-[0.18em]">internationally lawful · defensive · pluralistic engagement only</span>
      </footer>
    </div>
  );
}
