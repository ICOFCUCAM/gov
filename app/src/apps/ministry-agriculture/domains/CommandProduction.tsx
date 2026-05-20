'use client';

// Agriculture domains — Command, Production, Water surfaces.

import * as React from 'react';
import { agricultureOps } from '@/lib/gov/agriculture-systems';
import { SeasonalFrame, SeasonalKpi, SeasonalRule, CropRow, SeasonalCallout, AGRICULTURE_DS } from '@/apps/ministry-agriculture/design-system/agriculture-ds';
import { seed, wave } from '@/lib/telemetry';

export function FoodSecurityIndex({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  const o = agricultureOps(id, ts);
  return (
    <SeasonalFrame archetype="command" code="CM-FSI-02" title="Food Security Index"
      subtitle="national composite · 0..100">
      <SeasonalKpi items={[
        { label: 'Food security', value: `${o.foodSecurityIndex}/100`, tone: o.foodSecurityIndex >= 75 ? 'ok' : o.foodSecurityIndex >= 55 ? 'warn' : 'alert' },
        { label: 'Strategic reserve', value: `${o.strategicReserveDays}d`, tone: o.strategicReserveDays >= 45 ? 'ok' : 'warn' },
        { label: 'Subsidy disbursed', value: `${o.subsidyDisbursementPct}%`, tone: o.subsidyDisbursementPct >= 75 ? 'ok' : 'warn' },
        { label: 'Pest alerts', value: o.pestAlerts, tone: o.pestAlerts >= 6 ? 'alert' : o.pestAlerts ? 'warn' : 'ok' },
      ]} />
      <SeasonalRule label="regional production" />
      {o.byRegion.map(r => (
        <CropRow key={r.region} crop={r.region} idx={r.productionIdx}
          tone={r.tone === 'ok' ? 'ok' : r.tone === 'warn' ? 'warn' : 'alert'} />
      ))}
    </SeasonalFrame>
  );
}

export function StrategicReserve({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  const o = agricultureOps(id, ts);
  const reserves = [
    { commodity: 'Rice', kt: Math.round(wave(`sr:r:${id}`, ts, 480, 4800)), pctTarget: Math.round(wave(`sr:rt:${id}`, ts, 55, 99)) },
    { commodity: 'Maize', kt: Math.round(wave(`sr:m:${id}`, ts, 600, 5200)), pctTarget: Math.round(wave(`sr:mt:${id}`, ts, 50, 99)) },
    { commodity: 'Wheat', kt: Math.round(wave(`sr:w:${id}`, ts, 400, 3800)), pctTarget: Math.round(wave(`sr:wt:${id}`, ts, 45, 99)) },
    { commodity: 'Pulses', kt: Math.round(wave(`sr:p:${id}`, ts, 80, 920)), pctTarget: Math.round(wave(`sr:pt:${id}`, ts, 60, 99)) },
    { commodity: 'Edible oils', kt: Math.round(wave(`sr:o:${id}`, ts, 40, 480)), pctTarget: Math.round(wave(`sr:ot:${id}`, ts, 38, 99)) },
    { commodity: 'Sugar', kt: Math.round(wave(`sr:s:${id}`, ts, 60, 720)), pctTarget: Math.round(wave(`sr:st:${id}`, ts, 50, 99)) },
  ];
  return (
    <SeasonalFrame archetype="command" code="CM-RES-03" title="Strategic Reserve"
      subtitle="national grain & commodity buffer">
      <SeasonalKpi items={[
        { label: 'Reserve days', value: `${o.strategicReserveDays}d`, tone: o.strategicReserveDays >= 45 ? 'ok' : 'warn' },
        { label: 'Commodities tracked', value: reserves.length },
        { label: 'Mean fulfilment', value: `${Math.round(reserves.reduce((s, r) => s + r.pctTarget, 0) / reserves.length)}%`, tone: 'ok' },
        { label: 'Below 60% target', value: reserves.filter(r => r.pctTarget < 60).length, tone: 'alert' },
      ]} />
      <SeasonalRule label="reserve composition" />
      {reserves.map(r => (
        <CropRow key={r.commodity} crop={r.commodity} idx={r.pctTarget}
          tone={r.pctTarget >= 80 ? 'ok' : r.pctTarget >= 60 ? 'warn' : 'alert'}
          tail={`${r.kt.toLocaleString()} kt`} />
      ))}
      <SeasonalCallout kicker="strategic doctrine" body="Reserves are constitutionally bound to civilian-priority use. Drawdown requires Cabinet authorisation and is sealed to the Audit Vault." />
    </SeasonalFrame>
  );
}

export function CropYieldBoard({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  const o = agricultureOps(id, ts);
  return (
    <SeasonalFrame archetype="production" code="PR-YLD-05" title="Crop Yield Board"
      subtitle="per-crop yield composite">
      <SeasonalKpi items={[
        { label: 'Crops tracked', value: o.crops.length },
        { label: 'Strong yield', value: o.crops.filter(c => c.tone === 'ok').length, tone: 'ok' },
        { label: 'Soft yield', value: o.crops.filter(c => c.tone === 'warn').length, tone: 'warn' },
        { label: 'Shortfall', value: o.crops.filter(c => c.tone === 'alert').length, tone: 'alert' },
      ]} />
      <SeasonalRule label="yield index" />
      {o.crops.map(c => (
        <CropRow key={c.crop} crop={c.crop} idx={c.yieldIdx} tone={c.tone} />
      ))}
    </SeasonalFrame>
  );
}

export function LivestockBoard({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  const o = agricultureOps(id, ts);
  const species = ['Cattle', 'Sheep & goats', 'Poultry', 'Swine', 'Aquaculture'];
  return (
    <SeasonalFrame archetype="production" code="PR-LIV-06" title="Livestock Board"
      subtitle="livestock health & disease watch">
      <SeasonalKpi items={[
        { label: 'Livestock health', value: `${o.livestockHealthPct}%`, tone: o.livestockHealthPct >= 85 ? 'ok' : 'warn' },
        { label: 'Species tracked', value: species.length },
        { label: 'Vaccination coverage', value: `${Math.round(wave(`lv:v:${id}`, ts, 62, 96))}%`, tone: 'ok' },
        { label: 'Disease alerts', value: Math.round(wave(`lv:d:${id}`, ts, 0, 8)), tone: 'warn' },
      ]} />
      <SeasonalRule label="species health" />
      {species.map((s, i) => {
        const k = `lv:${id}:${i}`;
        const h = Math.round(wave(`${k}:h`, ts, 68, 98));
        return (
          <CropRow key={s} crop={s} idx={h}
            tone={h >= 88 ? 'ok' : h >= 70 ? 'warn' : 'alert'}
            tail={`${Math.round(wave(`${k}:n`, ts, 12, 320))}k head`} />
        );
      })}
    </SeasonalFrame>
  );
}

export function FisheryBoard({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  const fisheries = ['Marine (coastal)', 'Marine (offshore)', 'Inland freshwater', 'Aquaculture (warm)', 'Aquaculture (cold)'];
  return (
    <SeasonalFrame archetype="production" code="PR-FSH-07" title="Fishery Board"
      subtitle="marine & inland fishery posture">
      <SeasonalKpi items={[
        { label: 'Fisheries tracked', value: fisheries.length },
        { label: 'Sustainable yield', value: `${Math.round(wave(`fb:y:${id}`, ts, 58, 86))}%`, tone: 'ok' },
        { label: 'IUU incidents (30d)', value: Math.round(wave(`fb:iu:${id}`, ts, 0, 14)), tone: 'warn' },
        { label: 'Fishery workforce (k)', value: Math.round(wave(`fb:w:${id}`, ts, 38, 240)) },
      ]} />
      <SeasonalRule label="stock posture" />
      {fisheries.map((f, i) => {
        const k = `fb:${id}:${i}`;
        const idx = Math.round(wave(`${k}:s`, ts, 38, 92));
        return (
          <CropRow key={f} crop={f} idx={idx}
            tone={idx >= 70 ? 'ok' : idx >= 50 ? 'warn' : 'alert'}
            tail={`${Math.round(wave(`${k}:q`, ts, 4, 84))}kt / yr`} />
        );
      })}
      <SeasonalCallout kicker="sustainability doctrine" body="Fishery quotas honour the maximum sustainable yield. Distant-water fleets are constitutionally restrained from depleting third-party EEZs." />
    </SeasonalFrame>
  );
}

export function IrrigationNetwork({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  const o = agricultureOps(id, ts);
  const schemes = ['Northern delta canal', 'Eastern highland scheme', 'Coastal recovery scheme', 'Western reservoir network', 'Highland micro-irrigation', 'Capital periurban scheme'];
  return (
    <SeasonalFrame archetype="water" code="WT-IRR-09" title="Irrigation Network"
      subtitle="scheme coverage & operational status">
      <SeasonalKpi items={[
        { label: 'Coverage', value: `${o.irrigationCoveragePct}%`, tone: o.irrigationCoveragePct >= 60 ? 'ok' : 'warn' },
        { label: 'Schemes', value: schemes.length },
        { label: 'Energy uptime', value: `${Math.round(wave(`ir:eu:${id}`, ts, 86, 99))}%`, tone: 'ok' },
        { label: 'Reservoir storage', value: `${Math.round(wave(`ir:rs:${id}`, ts, 38, 92))}%`, tone: 'warn' },
      ]} />
      <SeasonalRule label="scheme posture" />
      {schemes.map((s, i) => {
        const k = `ir:${id}:${i}`;
        const cov = Math.round(wave(`${k}:c`, ts, 28, 92));
        return (
          <CropRow key={s} crop={s} idx={cov}
            tone={cov >= 72 ? 'ok' : cov >= 50 ? 'warn' : 'alert'}
            tail={`${Math.round(wave(`${k}:h`, ts, 18, 240))}k ha`} />
        );
      })}
    </SeasonalFrame>
  );
}

export function BasinAllocation({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  const basins = ['Aurine basin', 'Eastern confluence', 'Coastal delta', 'Northern spring', 'Highland tributary'];
  return (
    <SeasonalFrame archetype="water" code="WT-BAS-10" title="Basin Allocation"
      subtitle="water-rights & basin sharing">
      <SeasonalKpi items={[
        { label: 'Basins under quota', value: basins.length },
        { label: 'Within budget', value: Math.round(wave(`ba:wb:${id}`, ts, 2, basins.length)) },
        { label: 'Cooperative arrangements', value: Math.round(wave(`ba:co:${id}`, ts, 12, 86)) },
        { label: 'Ecological reserve %', value: `${Math.round(wave(`ba:er:${id}`, ts, 18, 32))}%`, tone: 'info' },
      ]} />
      <SeasonalRule label="basin posture" />
      {basins.map((b, i) => {
        const k = `ba:${id}:${i}`;
        const u = Math.round(wave(`${k}:u`, ts, 40, 96));
        return (
          <CropRow key={b} crop={b} idx={u}
            tone={u >= 90 ? 'alert' : u >= 70 ? 'warn' : 'ok'}
            tail={`${u}% withdrawn`} />
        );
      })}
      <SeasonalCallout kicker="cooperative doctrine" body="Basin allocations are negotiated by cooperatives, not unilaterally extracted. Discriminatory allocation is constitutionally prohibited." />
    </SeasonalFrame>
  );
}

void seed;
