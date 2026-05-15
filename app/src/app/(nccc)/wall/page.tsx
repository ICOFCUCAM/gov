'use client';

import * as React from 'react';
import { WallPanel } from '@/components/ui/WallPanel';
import { Pill } from '@/components/ui/Pill';
import { ClassBanner } from '@/components/ui/ClassBanner';
import { TONE, Spark, seed, waveSeries, TerritoryHeat } from '@/components/features/SituationRoom';

const ACTIVATION = Date.UTC(2026, 4, 13, 8, 31);
const SUNSET = Date.UTC(2026, 4, 21, 17, 0);

function dur(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
}

export default function NcccWallPage() {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const epoch = Math.floor(now / 8000);
  const ts = now / 4000;
  const sp = (k: string, lo = 30, hi = 85) => waveSeries(`w:${k}`, ts, 16, lo, hi);

  const indicators = [
    { l: 'Hospital beds available', v: `${62 + Math.round(seed(`hb:${epoch}`) * 10)}%`, t: 'ok', k: 'hb' },
    { l: 'Power coverage on grid', v: `${85 + Math.round(seed(`pc:${epoch}`) * 9)}%`, t: 'ok', k: 'pc' },
    { l: 'Water pressure · zone A', v: `▼ ${10 + Math.round(seed(`wp:${epoch}`) * 6)}%`, t: 'warn', k: 'wp' },
    { l: 'Telecom load', v: seed(`tl:${epoch}`) > 0.85 ? 'Elevated' : 'Nominal', t: seed(`tl:${epoch}`) > 0.85 ? 'warn' : 'ok', k: 'tl' },
    { l: 'Refugee flow · 24h', v: `+${440 + Math.round(seed(`rf:${epoch}`) * 120)}`, t: 'warn', k: 'rf' },
    { l: 'Evacuation throughput', v: `${(1.1 + seed(`ev:${epoch}`) * 0.8).toFixed(1)}k/h`, t: 'ok', k: 'ev' },
  ];
  const scenarioCount = 44 + Math.round(seed(`sc:${epoch}`) * 7);

  const options = [
    { o: 'A — Pre-position 4 convoys to Kilifi', r: '+14% ±6%', c: '12', d: '0', n: '—' },
    { o: 'B — Evacuate vulnerable zone', r: '+22% ±9%', c: '24', d: '~3,200', n: 'Kibarani route disadvantages 2 communities — equity overlay attached' },
    { o: 'C — Both, sequential', r: '+28% ±10%', c: '34', d: '~3,200', n: '—' },
  ];

  return (
    <div className="bg-wall-bg text-wall-ink min-h-screen">
      <header className="px-6 py-3 border-b border-wall-line flex justify-between items-center gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <strong className="flex items-center gap-2 text-warn">
            <span className="h-2 w-2 animate-pulse rounded-full" style={{ backgroundColor: TONE.warn }} />EMERGENCY
          </strong>
          <span className="text-wall-muted">· National Flood Operations Center · Activation +{dur(now - ACTIVATION)} · Sunset in {dur(SUNSET - now)}</span>
        </div>
        <div className="flex items-center gap-3 text-wall-muted">
          <span className="font-mono tabular-nums">{new Date(now).toLocaleTimeString()}</span>
          <span>Constitutional officers: STO · Algorithmic Ombudsman · People&apos;s Editor</span>
        </div>
      </header>

      <main className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4">

        <WallPanel title="Operational map" className="lg:col-span-2">
          <div className="overflow-hidden rounded-[3px] border border-wall-line">
            <TerritoryHeat epoch={epoch} height={220} focus="Kenya" />
          </div>
          <p className="text-wall-muted text-sm mt-2">
            Tana River basin · live · 1km aggregation grid · DP-ε disclosed · no citizen-individual layer
          </p>
        </WallPanel>

        <WallPanel title="Live indicators" className="lg:col-span-2">
          <div className="grid grid-cols-2 gap-2">
            {indicators.map(ind => (
              <div key={ind.l} className="rounded-[3px] border border-wall-line p-2">
                <div className="text-xs text-wall-muted">{ind.l}</div>
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-lg tabular-nums" style={{ color: TONE[ind.t] }}>{ind.v}</span>
                </div>
                <div className="-mb-1 h-5 overflow-hidden opacity-80"><Spark pts={sp(ind.k)} tone={ind.t} /></div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-sm"><strong>Tripwires:</strong> <Pill tone="warn">1 amber (water pressure)</Pill></p>
        </WallPanel>

        <WallPanel title="Timeline" className="lg:col-span-2">
          <ul className="text-sm space-y-1">
            {[
              ['08:14', 'Alert issued', 'warn'], ['08:31', 'NCCC activated', 'alert'],
              ['09:05', 'Health desk online', 'ok'], ['09:22', 'First discharge confirmed', 'ok'],
              ['09:34', 'Civil society briefed', 'ok'], [new Date(now).toLocaleTimeString().slice(0, 5), 'Convoy staging update', 'ok'],
            ].map(([t, e, tn], i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="font-mono text-xs text-wall-muted tabular-nums">{t}</span>
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: TONE[tn as string] }} />
                <span>{e}</span>
              </li>
            ))}
          </ul>
          <p className="text-wall-muted text-sm mt-2">Sunset clock: {dur(SUNSET - now)} remaining · renewal requires Parliament confirmation</p>
        </WallPanel>

        <WallPanel title="Comms ticker" className="lg:col-span-2">
          <div className="text-sm space-y-2">
            <p><strong>Public:</strong> &ldquo;Flood advisory in force; see safety pages.&rdquo;</p>
            <p><strong>Inter-gov:</strong> &ldquo;Mwanza region confirms 200 evacuees received.&rdquo;</p>
            <p><strong>Cross-sovereign:</strong> &ldquo;Tanzania border coordination active.&rdquo;</p>
            <p><strong>Misinformation:</strong> &ldquo;False video re. bridge collapse — debunked.&rdquo;</p>
          </div>
        </WallPanel>

        <WallPanel span="full">
          <div className="flex justify-between items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-wall-ink m-0">AI scenario panel</h3>
            <ClassBanner decisionClass="D" />
          </div>
          <p>
            Currently modeling: <strong>cyclone landfall +6h shift</strong> — surfacing{' '}
            <span className="font-mono tabular-nums" style={{ color: TONE.warn }}>{scenarioCount}</span> cascading indicators.{' '}
            <em>Officer approval required to base any decision on these scenarios.</em>{' '}
            AI does not decide. Humans sign per remit.
          </p>
        </WallPanel>

        <WallPanel span="full">
          <div className="flex justify-between gap-3 mb-2">
            <h3 className="text-lg font-semibold text-wall-ink m-0">Deliberation table — current options</h3>
            <Pill tone="warn">Awaiting authority sign-offs</Pill>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-wall-muted text-left">
                <tr>
                  <th className="py-2 pr-3">Option</th>
                  <th className="py-2 pr-3">Lives-at-risk reduction</th>
                  <th className="py-2 pr-3">Cost (KES M)</th>
                  <th className="py-2 pr-3">People displaced</th>
                  <th className="py-2">Civil society note</th>
                </tr>
              </thead>
              <tbody>
                {options.map(op => (
                  <tr key={op.o} className="border-t border-wall-line">
                    <td className="py-1 pr-3">{op.o}</td>
                    <td className="py-1 pr-3 font-mono tabular-nums" style={{ color: TONE.ok }}>{op.r}</td>
                    <td className="py-1 pr-3 font-mono tabular-nums">{op.c}</td>
                    <td className="py-1 pr-3 font-mono tabular-nums">{op.d}</td>
                    <td className="py-1">{op.n}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-wall-muted text-sm mt-2">
            Each authority signs their own remit individually. There is no joint &ldquo;approve&rdquo; button.
          </p>
        </WallPanel>

        <WallPanel span="full" title="Invariant watch (live)">
          <div className="flex gap-2 flex-wrap">
            {['Sovereignty of principal', 'Contestability', 'Auditability', 'Replaceability / exit', 'Constitutional supremacy', 'Inclusion floor', 'No superintelligent unilateralism'].map(inv => (
              <Pill key={inv} tone="ok">✓ {inv}</Pill>
            ))}
          </div>
          <p className="text-wall-muted text-sm mt-2">
            Not on this wall: citizen-individual map layers · predictive citizen-behavior visualization · surveillance feeds.
            Per Companions 142, 154, 158.
          </p>
        </WallPanel>

      </main>
    </div>
  );
}
