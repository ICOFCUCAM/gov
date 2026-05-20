'use client';

// Communications — Digital Identity & Spectrum / Media Governance.
// Digital identity programme dashboard, spectrum band utilisation
// register, media landscape readout. Network palette.

import * as React from 'react';
import { communicationsBoard, type SpectrumBand } from '@/lib/gov/communications-continuity';

const SIGNAL_CYAN = '#2dd4d4';
const FIBER = '#0fb98d';
const AMBER = '#d68a2e';
const ALERT = '#c44a3a';
const DEEP_NET = '#0a1628';
const PANEL = '#131e2e';
const PANEL2 = '#1a2a3e';
const DATA = '#e8eef5';
const INK = '#c5cdd6';
const MUT = '#6f7a8a';

const SPECTRUM_COL: Record<SpectrumBand['classification'], string> = {
  optimal: FIBER, observant: SIGNAL_CYAN, congested: AMBER, oversubscribed: ALERT,
};

const BAND_GLYPH: Record<SpectrumBand['band'], string> = {
  'low-band': '▮', 'mid-band': '▯', 'high-band-mmwave': '⌬', 'broadcast-tv': '📺', 'broadcast-radio': '📻', satellite: '✦',
};

export function DigitalIdentitySpectrum({ id, now }: { id: string; now: number }) {
  void id;
  const b = communicationsBoard(now);
  const di = b.digitalIdentity;
  const media = b.media;
  return (
    <div style={{ background: DEEP_NET, color: INK, fontFamily: '"JetBrains Mono", ui-monospace, monospace' }}>
      <div className="h-px w-full" style={{ background: `linear-gradient(90deg, transparent 0%, ${FIBER} 30%, ${FIBER} 70%, transparent 100%)`, boxShadow: `0 0 6px ${FIBER}` }} />

      <header className="px-8 py-5" style={{ background: 'linear-gradient(180deg, #131e2e 0%, #0a1628 100%)', borderBottom: `1px solid rgba(15,185,141,0.18)` }}>
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.42em]" style={{ color: FIBER }}>NCC ◇ DIGITAL IDENTITY · SPECTRUM · MEDIA GOVERNANCE</div>
            <h2 className="mt-2 text-[18px] tracking-[0.04em]" style={{ color: DATA }}>{di.citizensEnrolledM}M citizens enrolled · {di.authRequestsDailyM}M daily authentications · {b.spectrum.length} spectrum bands</h2>
          </div>
        </div>
      </header>

      {/* Digital identity */}
      <section className="px-8 py-5" style={{ background: DEEP_NET, borderBottom: `1px solid rgba(45,212,212,0.12)` }}>
        <h3 className="mb-3 text-[10px] uppercase tracking-[0.36em]" style={{ color: SIGNAL_CYAN }}>◈ NATIONAL DIGITAL IDENTITY PROGRAMME</h3>
        <div className="grid grid-cols-2 gap-px md:grid-cols-3 lg:grid-cols-6" style={{ background: 'rgba(45,212,212,0.18)' }}>
          {[
            { l: 'CITIZENS ENROLLED', v: `${di.citizensEnrolledM}M`, c: SIGNAL_CYAN },
            { l: 'AUTH /DAY', v: `${di.authRequestsDailyM}M`, c: FIBER },
            { l: 'AUTH SUCCESS', v: `${di.authSuccessRatePct}%`, c: di.authSuccessRatePct >= 99 ? FIBER : AMBER },
            { l: 'BREACHES Q', v: di.credentialBreachesThisQ, c: di.credentialBreachesThisQ >= 6 ? ALERT : AMBER },
            { l: 'RECOVERY PENDING', v: di.recoveryRequestsPending.toLocaleString(), c: di.recoveryRequestsPending >= 10000 ? AMBER : INK },
            { l: 'TRUST IDX', v: di.trustIdx, c: di.trustIdx >= 80 ? FIBER : AMBER },
          ].map(x => (
            <div key={x.l} className="px-4 py-3" style={{ background: PANEL }}>
              <div className="text-[8.5px] uppercase tracking-[0.24em]" style={{ color: MUT }}>{x.l}</div>
              <div className="mt-0.5 tabular-nums text-[18px]" style={{ color: x.c }}>{x.v}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Spectrum band register */}
      <section className="px-8 py-5" style={{ background: PANEL, borderBottom: `1px solid rgba(45,212,212,0.12)` }}>
        <h3 className="mb-3 text-[10px] uppercase tracking-[0.36em]" style={{ color: SIGNAL_CYAN }}>📡 SPECTRUM ALLOCATION · 6 BANDS</h3>
        <div className="space-y-2">
          {b.spectrum.map(s => {
            const col = SPECTRUM_COL[s.classification];
            return (
              <div key={s.band} className="grid grid-cols-[40px_180px_90px_1fr_70px_80px_110px] items-center gap-3 px-4 py-2.5" style={{ background: DEEP_NET, borderLeft: `2px solid ${col}` }}>
                <span className="text-center text-[16px]" style={{ color: col }}>{BAND_GLYPH[s.band]}</span>
                <div>
                  <div className="text-[12px]" style={{ color: DATA }}>{s.band.replace(/-/g, ' ')}</div>
                  <div className="text-[9px]" style={{ color: MUT }}>{s.allocatedMhz} MHz</div>
                </div>
                <span className="tabular-nums text-[10px]" style={{ color: MUT }}>{s.licensees} lic.</span>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 flex-1" style={{ background: PANEL2 }}>
                    <div className="h-full" style={{ width: `${Math.min(100, s.utilisationPct)}%`, background: col }} />
                    {s.utilisationPct > 100 ? <div className="h-full absolute" style={{ width: '6px', background: ALERT, marginLeft: '-6px' }} /> : null}
                  </div>
                </div>
                <span className="text-right tabular-nums text-[11px]" style={{ color: col }}>{s.utilisationPct}%</span>
                <span className="text-right tabular-nums text-[10px]" style={{ color: s.congestionIdx > 25 ? ALERT : AMBER }}>cong {s.congestionIdx}</span>
                <span className="text-right text-[9px] uppercase tracking-[0.18em]" style={{ color: col }}>● {s.classification}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Media landscape */}
      <section className="px-8 py-5" style={{ background: DEEP_NET }}>
        <h3 className="mb-3 text-[10px] uppercase tracking-[0.36em]" style={{ color: SIGNAL_CYAN }}>📺 MEDIA &amp; INFORMATION LANDSCAPE</h3>
        <div className="grid grid-cols-2 gap-px md:grid-cols-3 lg:grid-cols-5" style={{ background: 'rgba(45,212,212,0.18)' }}>
          {[
            { l: 'BROADCASTERS', v: media.broadcastersLicensed, c: INK },
            { l: 'PRESS INDEP.', v: media.pressIndependenceIdx, c: media.pressIndependenceIdx >= 75 ? FIBER : AMBER },
            { l: 'CONTENT INTEG.', v: media.contentIntegrityIdx, c: media.contentIntegrityIdx >= 75 ? FIBER : AMBER },
            { l: 'SPECTRUM DISP.', v: media.spectrumDisputesOpen, c: media.spectrumDisputesOpen >= 10 ? ALERT : AMBER },
            { l: 'PSM UPTIME', v: `${media.publicServiceMediaUptimePct}%`, c: media.publicServiceMediaUptimePct >= 99 ? FIBER : AMBER },
          ].map(x => (
            <div key={x.l} className="px-4 py-3" style={{ background: PANEL }}>
              <div className="text-[8.5px] uppercase tracking-[0.24em]" style={{ color: MUT }}>{x.l}</div>
              <div className="mt-0.5 tabular-nums text-[18px]" style={{ color: x.c }}>{x.v}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="h-px w-full" style={{ background: `linear-gradient(90deg, transparent 0%, ${FIBER} 30%, ${FIBER} 70%, transparent 100%)`, boxShadow: `0 0 6px ${FIBER}` }} />
    </div>
  );
}
