'use client';

import * as React from 'react';
import { WallPanel } from '@/components/ui/WallPanel';
import { Pill } from '@/components/ui/Pill';
import { ClassBanner } from '@/components/ui/ClassBanner';
import { TONE, Spark, seed, waveSeries, TerritoryHeat } from '@/components/features/SituationRoom';
import Link from 'next/link';
import { nationCurrency, aiLabel, nationRegions } from '@/lib/nation/registry';
import { useRenderNow } from '@/lib/clock/render-now';
import { api } from '@/lib/api/client';
import type { NationalSnapshot } from '@/lib/api/types';
import { SignalTag } from '@/components/ui/SignalTag';
import { REFERENCE_MODEL } from '@/lib/twin/signal';
import { GeneratedFold } from '@/components/ui/Generated';
import { useSeparation } from '@/components/features/SeparationChecks';
import type { AuditVerification } from '@/lib/api/types';

// The coordination wall shows a declared emergency: an active sev1 incident in
// the nation's institutions (/api/national). With none it stands watch. Places
// are the nation's own regions; indicators, options and the ticker are samples
// from the reference model until the nation connects its sources: marked Sample
// in demo and training, folded under "Not connected" in production
// (lib/twin/generated.ts). The invariant watch shows only what a check reads:
// the audit chain's verification and the separation-of-powers checks.

export default function NcccWallPage() {
  const [now, setNow] = React.useState(useRenderNow());
  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const [nat, setNat] = React.useState<NationalSnapshot | null>(null);
  React.useEffect(() => {
    const load = () => api.cabinet.national().then(setNat).catch(() => {});
    load();
    const t = setInterval(load, 15_000);
    return () => clearInterval(t);
  }, []);
  const declared = (nat?.crossMinistryIncidents ?? []).filter(i => i.severity === 'sev1');
  const emergency = declared[0];
  const regions = nationRegions();
  const place = (i: number) => regions[i % Math.max(1, regions.length)] ?? 'the affected region';
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
  // Tripwires are the sample indicators past their amber line (read from the indicators above, never typed).
  const tripwires = indicators.filter(i => i.t === 'warn');

  // The invariants a check can read today; the others say no check is connected.
  const separation = useSeparation();
  const [verify, setVerify] = React.useState<AuditVerification | null>(null);
  const [verifyFailed, setVerifyFailed] = React.useState(false);
  React.useEffect(() => {
    let live = true;
    const load = () => api.audit.verify().then(v => { if (live) { setVerify(v); setVerifyFailed(false); } }).catch(() => { if (live) setVerifyFailed(true); });
    void load();
    const t = setInterval(load, 30_000);
    return () => { live = false; clearInterval(t); };
  }, []);
  type Inv = { l: string; state: 'held' | 'broken' | 'unknown' | 'unchecked'; by: string };
  const invariants: Inv[] = [
    { l: 'Sovereignty of principal', state: 'unchecked', by: 'No check connected' },
    { l: 'Contestability', state: 'unchecked', by: 'No check connected' },
    { l: 'Auditability', state: verify ? (verify.ok ? 'held' : 'broken') : verifyFailed ? 'unknown' : 'unknown', by: verify ? `Audit chain: ${verify.ok ? `${verify.checked} links verified` : `broken at entry ${verify.brokenAtSeq}`}` : 'Audit chain verification not read' },
    { l: 'Replaceability / exit', state: 'unchecked', by: 'No check connected' },
    { l: 'Constitutional supremacy', state: separation.data ? (separation.data.intact ? 'held' : 'broken') : 'unknown', by: separation.data ? `Separation of powers: ${separation.data.intact ? 'every check holds' : 'a check does not hold'} (observed from the configuration)` : 'Separation-of-powers checks not read' },
    { l: 'Inclusion floor', state: 'unchecked', by: 'No check connected' },
    { l: 'No superintelligent unilateralism', state: 'unchecked', by: 'No check connected' },
  ];

  const options = [
    { o: `A — Pre-position 4 convoys to ${place(0)}`, r: '+14% ±6%', c: '12', d: '0', n: '—' },
    { o: 'B — Evacuate vulnerable zone', r: '+22% ±9%', c: '24', d: '~3,200', n: `Route through ${place(1)} disadvantages 2 communities — equity overlay attached` },
    { o: 'C — Both, sequential', r: '+28% ±10%', c: '34', d: '~3,200', n: '—' },
  ];

  return (
    <div className="bg-wall-bg text-wall-ink min-h-screen">
      <h1 className="sr-only">Emergency coordination screen</h1>
      <header className="px-6 py-3 border-b border-wall-line flex justify-between items-center gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href="/gov/situation-room" className="focus-ring text-sm text-wall-muted underline underline-offset-2">← Situation Room</Link>
          {emergency ? (
            <strong className="flex items-center gap-2 text-warn">
              <span className="h-2 w-2 animate-pulse rounded-full" style={{ backgroundColor: TONE.warn }} />EMERGENCY
            </strong>
          ) : (
            <strong className="flex items-center gap-2" style={{ color: TONE.ok }}>
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: TONE.ok }} />NO DECLARED EMERGENCY
            </strong>
          )}
          <span className="text-wall-muted">
            · National Coordination Center · {emergency
              ? `${emergency.label} (${emergency.ministry}) · authority: ${emergency.authority}${declared.length > 1 ? ` · +${declared.length - 1} more` : ''}`
              : 'standing watch · the wall activates when an institution declares a sev1 incident'}
          </span>
        </div>
        <div className="flex items-center gap-3 text-wall-muted">
          <span className="font-mono tabular-nums">{new Date(now).toLocaleTimeString()}</span>
          <span>Constitutional officers: STO · Algorithmic Ombudsman · People&apos;s Editor</span>
        </div>
      </header>

      <main className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4">

        <WallPanel title="Operational map" className="lg:col-span-2">
          {/* The nation's map in every mode; its sample layer only where samples are (TerritoryHeat). */}
          <div className="overflow-hidden rounded-[3px] border border-wall-line">
            <TerritoryHeat epoch={epoch} height={220} focus={nat?.sovereign.stateName} />
          </div>
          <p className="text-wall-muted text-sm mt-2">
            {regions.length ? regions.slice(0, 4).join(' · ') : 'National territory'} · sample layer until sources connect · 1km aggregation grid · DP-ε disclosed · no citizen-individual layer
          </p>
        </WallPanel>

        <WallPanel title="Indicators" className="lg:col-span-2">
          <GeneratedFold what="Indicators and tripwires">
          <p className="-mt-1 mb-2 flex items-center gap-2 text-xs text-wall-muted"><SignalTag kind="sample" source={REFERENCE_MODEL} /> reference model until the nation&apos;s sources report</p>
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
          <p className="mt-2 text-sm"><strong>Tripwires:</strong> {tripwires.length
            ? <Pill tone="warn">{tripwires.length} amber ({tripwires.map(i => i.l.toLowerCase()).join(', ')})</Pill>
            : <Pill tone="ok">none</Pill>}</p>
          </GeneratedFold>
        </WallPanel>

        <WallPanel title="Timeline" className="lg:col-span-2">
          <ul className="text-sm space-y-1">
            {(emergency
              ? declared.map(i => [i.ministry, `${i.label} · ${i.authority}`, 'alert'])
              : [['—', 'No declared emergency. Sev1 incidents from any institution appear here.', 'ok']]
            ).map(([t, e, tn], i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="font-mono text-xs text-wall-muted tabular-nums">{t}</span>
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: TONE[tn as string] }} />
                <span>{e}</span>
              </li>
            ))}
          </ul>
          <p className="text-wall-muted text-sm mt-2">Sunset clock starts when the emergency is declared · renewal requires confirmation by the legislature</p>
        </WallPanel>

        <WallPanel title="Comms ticker" className="lg:col-span-2">
          <GeneratedFold what="Example messages">
          <p className="-mt-1 mb-2 flex items-center gap-2 text-xs text-wall-muted"><SignalTag kind="sample" source={REFERENCE_MODEL} /> example messages; no messaging channel is connected yet</p>
          <div className="text-sm space-y-2">
            <p><strong>Public:</strong> &ldquo;{emergency ? 'Advisory in force; see the safety pages.' : 'No public advisory in force.'}&rdquo;</p>
            <p><strong>Inter-gov:</strong> &ldquo;{place(0)} confirms evacuees received.&rdquo;</p>
            <p><strong>Cross-sovereign:</strong> &ldquo;Border coordination with neighbouring states active.&rdquo;</p>
            <p><strong>Misinformation:</strong> &ldquo;False video re. bridge collapse — debunked.&rdquo;</p>
          </div>
          </GeneratedFold>
        </WallPanel>

        <WallPanel span="full">
          <div className="flex justify-between items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-wall-ink m-0">{aiLabel('AI scenario panel', 'Scenario panel')}</h3>
            <ClassBanner decisionClass="D" />
          </div>
          <GeneratedFold kind="simulated" marked what="The example scenario">
          <p>
            Currently modeling: <strong>cyclone landfall +6h shift</strong> — surfacing{' '}
            <span className="font-mono tabular-nums" style={{ color: TONE.warn }}>{scenarioCount}</span> cascading indicators.
          </p>
          </GeneratedFold>
          <p>
            <em>Officer approval required to base any decision on these scenarios.</em>{' '}
            {aiLabel('AI does not decide. ', '')}Humans sign per remit.
          </p>
        </WallPanel>

        <WallPanel span="full">
          <div className="flex justify-between gap-3 mb-2">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-wall-ink m-0">Deliberation table — current options <SignalTag kind="sample" source={REFERENCE_MODEL} /></h3>
            <Pill tone="warn">Awaiting authority sign-offs</Pill>
          </div>
          <GeneratedFold what="Example options">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-wall-muted text-left">
                <tr>
                  <th className="py-2 pr-3">Option</th>
                  <th className="py-2 pr-3">Lives-at-risk reduction</th>
                  <th className="py-2 pr-3">Cost ({nationCurrency()} M)</th>
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
          </GeneratedFold>
          <p className="text-wall-muted text-sm mt-2">
            Each authority signs their own remit individually. There is no joint &ldquo;approve&rdquo; button.
          </p>
        </WallPanel>

        <WallPanel span="full" title="Invariant watch (live)">
          {/* A tick only where a check reads a record; the others say plainly that nothing checks them yet. */}
          <div className="flex gap-2 flex-wrap">
            {invariants.map(inv => (
              <Pill key={inv.l} tone={inv.state === 'held' ? 'ok' : inv.state === 'broken' ? 'alert' : 'neutral'} title={inv.by} data-invariant={inv.state}>
                {inv.state === 'held' ? '✓' : inv.state === 'broken' ? '✗' : '○'} {inv.l}{inv.state === 'unchecked' ? ' · not checked' : inv.state === 'unknown' ? ' · not read' : ''}
              </Pill>
            ))}
          </div>
          <p className="text-wall-muted text-sm mt-2">
            {invariants.filter(i => i.state !== 'unchecked').map(i => i.by).join(' · ')}. The others have no check connected yet.
          </p>
          <p className="text-wall-muted text-sm mt-2">
            Not on this wall: citizen-individual map layers · predictive citizen-behavior visualization · surveillance feeds.
            Per Companions 142, 154, 158.
          </p>
        </WallPanel>

      </main>
    </div>
  );
}
