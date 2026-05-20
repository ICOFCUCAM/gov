'use client';

// Foreign Affairs — Diplomatic Missions & Consular Register. Embassies
// arranged as wax-sealed dispatch cards grouped by region; consular
// continuity panel beneath. Diplomatic stationery aesthetic with
// midnight ink-block, gold seal motif and serif typography.

import * as React from 'react';
import { foreignAffairsBoard, REGIONS, type DiplomaticMission } from '@/lib/gov/foreign-affairs';

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

const SECURITY_COL: Record<DiplomaticMission['securityPosture'], string> = {
  normal: GOLD, heightened: '#a05538', lockdown: BURGUNDY, evacuation: '#8a2a30',
};
const FLAG_GLYPH: Record<DiplomaticMission['flag'], string> = {
  embassy: '✦', consulate: '✧', 'permanent-mission': '✶', 'special-envoy': '✷',
};

function WaxSeal({ color }: { color: string }) {
  return (
    <span className="relative inline-block" style={{ width: '34px', height: '34px' }} aria-hidden>
      <span className="absolute inset-0 rounded-full" style={{ background: `radial-gradient(circle at 30% 30%, ${color}cc, ${color}88 50%, #2a0a0e 100%)`, boxShadow: 'inset 0 -3px 4px rgba(0,0,0,0.55)' }} />
      <span className="absolute inset-[6px] rounded-full border" style={{ borderColor: 'rgba(255,255,255,0.18)' }} />
      <span className="absolute inset-0 flex items-center justify-center text-[13px]" style={{ color: '#f3e6c0', textShadow: '0 1px 0 rgba(0,0,0,0.6)' }}>✦</span>
    </span>
  );
}

const ADV_COL: Record<'caution' | 'increased' | 'reconsider' | 'do-not-travel', string> = {
  caution: SILVER, increased: GOLD, reconsider: '#a05538', 'do-not-travel': BURGUNDY,
};

export function DiplomaticMissionsRegister({ id, now }: { id: string; now: number }) {
  void id;
  const b = foreignAffairsBoard(now);
  const byRegion = REGIONS.map(r => ({ region: r, missions: b.missions.filter(m => m.region === r) })).filter(x => x.missions.length);
  return (
    <div style={{ background: MIDNIGHT_DEEP, color: INK, fontFamily: 'ui-serif, Georgia, serif' }}>
      {/* Letterhead */}
      <header className="border-b px-8 py-6" style={{ borderColor: TRACE, background: MIDNIGHT }}>
        <div className="flex items-end justify-between">
          <div>
            <div className="text-[9px] uppercase tracking-[0.5em]" style={{ color: GOLD }}>· Register of Diplomatic Missions ·</div>
            <h2 className="mt-2 text-[18px] tracking-[0.06em]" style={{ color: PARCH }}>{b.missions.length} foreign posts across {byRegion.length} regions</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[9px] uppercase tracking-[0.32em]" style={{ color: MUT }}>posts in evacuation</span>
            <span className="tabular-nums text-[18px]" style={{ color: b.consular.emergencyEvacuationsActive ? BURGUNDY : GOLD }}>{b.consular.emergencyEvacuationsActive}</span>
          </div>
        </div>
      </header>

      {/* Region groupings */}
      {byRegion.map(({ region, missions }) => (
        <section key={region} className="border-b px-8 py-5" style={{ borderColor: TRACE, background: MIDNIGHT_DEEP }}>
          <div className="mb-4 flex items-baseline justify-between">
            <div className="flex items-baseline gap-3">
              <span className="text-[11px]" style={{ color: GOLD }}>✦</span>
              <h3 className="text-[12px] uppercase tracking-[0.32em]" style={{ color: SILVER }}>{region}</h3>
              <span className="text-[9px] italic" style={{ color: MUT }}>{missions.length} post{missions.length === 1 ? '' : 's'}</span>
            </div>
            <span className="text-[9px] uppercase tracking-[0.32em]" style={{ color: MUT }}>partner · ambassador · staff · continuity · security</span>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {missions.map(m => (
              <article key={m.id} className="grid grid-cols-[44px_1fr_auto] items-start gap-4 px-4 py-3" style={{ background: CHARCOAL, border: `1px solid ${TRACE}`, borderLeft: `3px solid ${SECURITY_COL[m.securityPosture]}` }}>
                <WaxSeal color={SECURITY_COL[m.securityPosture]} />
                <div>
                  <div className="text-[12px]" style={{ color: PARCH }}>
                    <span className="mr-2" style={{ color: GOLD }}>{FLAG_GLYPH[m.flag]}</span>{m.postName}
                  </div>
                  <div className="text-[10px] italic" style={{ color: SILVER }}>{m.partner} · H.E. {m.ambassador}</div>
                  <div className="mt-2 grid grid-cols-3 gap-3 text-[10px]">
                    <div>
                      <div className="uppercase tracking-[0.18em]" style={{ color: MUT, fontSize: '8.5px' }}>staff</div>
                      <div className="tabular-nums" style={{ color: INK }}>{m.staff}</div>
                    </div>
                    <div>
                      <div className="uppercase tracking-[0.18em]" style={{ color: MUT, fontSize: '8.5px' }}>continuity</div>
                      <div className="tabular-nums" style={{ color: m.continuityIdx >= 80 ? GOLD : SILVER }}>{m.continuityIdx}</div>
                    </div>
                    <div>
                      <div className="uppercase tracking-[0.18em]" style={{ color: MUT, fontSize: '8.5px' }}>consular load</div>
                      <div className="tabular-nums" style={{ color: m.consularLoad > 3000 ? '#a05538' : INK }}>{m.consularLoad.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[8.5px] uppercase tracking-[0.32em]" style={{ color: MUT }}>posture</div>
                  <div className="mt-0.5 text-[10px] uppercase tracking-[0.28em] italic" style={{ color: SECURITY_COL[m.securityPosture] }}>{m.securityPosture}</div>
                  <div className="mt-1 text-[8.5px] italic" style={{ color: GOLD_DIM }}>{m.flag}</div>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}

      {/* Consular continuity panel */}
      <section className="px-8 py-6" style={{ background: PANEL }}>
        <div className="mb-3 flex items-baseline justify-between">
          <div className="flex items-baseline gap-3">
            <span style={{ color: GOLD }}>✦</span>
            <h3 className="text-[11px] uppercase tracking-[0.4em]" style={{ color: SILVER }}>Consular Continuity · Citizens Abroad</h3>
          </div>
          <span className="text-[9px] italic" style={{ color: MUT }}>citizen protection &amp; emergency continuity</span>
        </div>
        <div className="grid grid-cols-2 gap-px md:grid-cols-4" style={{ background: TRACE }}>
          {[
            { l: 'Citizens registered abroad', v: `${b.consular.citizensRegisteredAbroadK}K`, t: SILVER },
            { l: 'Active consular cases', v: b.consular.consularCasesActive.toLocaleString(), t: b.consular.consularCasesActive > 4000 ? '#a05538' : INK },
            { l: 'Emergency evacuations', v: `${b.consular.emergencyEvacuationsActive}`, t: b.consular.emergencyEvacuationsActive ? BURGUNDY : GOLD },
            { l: 'Passport queue', v: b.consular.passportIssuanceQueue.toLocaleString(), t: INK },
          ].map(x => (
            <div key={x.l} className="px-5 py-4" style={{ background: PANEL }}>
              <div className="text-[8.5px] uppercase tracking-[0.32em]" style={{ color: MUT }}>{x.l}</div>
              <div className="mt-1 tabular-nums text-[18px]" style={{ color: x.t, fontFamily: 'ui-serif, Georgia, serif' }}>{x.v}</div>
            </div>
          ))}
        </div>
        {b.consular.travelAdvisoriesActive.length > 0 ? (
          <div className="mt-5">
            <div className="text-[9px] uppercase tracking-[0.32em]" style={{ color: GOLD }}>· Standing travel advisories</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {b.consular.travelAdvisoriesActive.map(a => (
                <span key={a.region} className="px-3 py-1.5 text-[10px] uppercase tracking-[0.18em]" style={{ background: CHARCOAL, border: `1px solid ${ADV_COL[a.level]}`, color: ADV_COL[a.level] }}>
                  {a.region} · {a.level}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
