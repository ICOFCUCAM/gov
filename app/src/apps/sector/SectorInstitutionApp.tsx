'use client';

// Sector institution apps — Agriculture, Justice (ministry), Interior,
// Labour, Trade, Environment. Each is engine-driven (its bespoke
// operational engine), with executable workflow runtimes — NOT a generic
// dashboard fallback. Subsystems live inside the institution app.

import * as React from 'react';
import { StatGrid, Bars, Panel, FieldPanel } from '@/apps/_shared/AppKit';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { agricultureOps } from '@/lib/gov/agriculture-systems';
import { justiceOps } from '@/lib/gov/justice-systems';
import { interiorOps } from '@/lib/gov/interior-systems';
import { laborOps } from '@/lib/gov/labor-systems';
import { tradeOps } from '@/lib/gov/trade-systems';
import { environmentOps } from '@/lib/gov/environment-systems';
import type { ArchetypeKey } from '@/lib/api/types';
import type { SovereignRole, Capability } from '@/shared/permissions/rbac';
import type { WorkKind } from '@/lib/gov/runtime-workflow';

type Tone = 'ok' | 'warn' | 'alert';
const WF: Record<string, WorkKind> = {
  command: 'incident', regulatory: 'permit', permit: 'permit', citizen: 'approval',
  farmer: 'approval', legalaid: 'case', registries: 'permit', corrections: 'case',
  disputes: 'case', insurance: 'approval', identity: 'permit', border: 'incident',
  licensing: 'permit', registry: 'permit', export: 'procurement', monitoring: 'case',
};

export function SectorInstitutionApp({ instanceId, archetype, label, domain, now, role, withheld }: {
  instanceId: string; archetype: ArchetypeKey; label: string; domain: string;
  now: number; role: SovereignRole; withheld: Capability[];
}) {
  const id = instanceId; const ts = now / 4000;
  const wf = WF[domain] ?? 'case';
  let items: { l: string; v: string; t?: Tone }[] = [];
  let bars: { title: string; meta: string; rows: { label: string; pct: number; tone: Tone; tail?: string }[] } | null = null;

  if (archetype === 'AGRICULTURE') {
    const o = agricultureOps(id, ts);
    items = [
      { l: 'Food security', v: `${o.foodSecurityIndex}`, t: o.foodSecurityIndex >= 75 ? 'ok' : o.foodSecurityIndex >= 55 ? 'warn' : 'alert' },
      { l: 'Strategic reserve', v: `${o.strategicReserveDays}d`, t: o.strategicReserveDays >= 45 ? 'ok' : o.strategicReserveDays >= 21 ? 'warn' : 'alert' },
      { l: 'Livestock health', v: `${o.livestockHealthPct}%`, t: o.livestockHealthPct >= 85 ? 'ok' : 'warn' },
      { l: 'Irrigation coverage', v: `${o.irrigationCoveragePct}%`, t: o.irrigationCoveragePct >= 60 ? 'ok' : 'warn' },
      { l: 'Pest alerts', v: `${o.pestAlerts}`, t: o.pestAlerts > 8 ? 'alert' : o.pestAlerts ? 'warn' : 'ok' },
      { l: 'Subsidy disbursed', v: `${o.subsidyDisbursementPct}%`, t: o.subsidyDisbursementPct >= 75 ? 'ok' : 'warn' },
    ];
    bars = { title: 'Crop production', meta: 'yield index', rows: o.crops.map(c => ({ label: c.crop, pct: c.yieldIdx, tone: c.tone, tail: `${c.yieldIdx}` })) };
  } else if (archetype === 'JUSTICE') {
    const o = justiceOps(id, ts);
    items = [
      { l: 'Access to justice', v: `${o.accessToJusticeIndex}`, t: o.accessToJusticeIndex >= 75 ? 'ok' : o.accessToJusticeIndex >= 55 ? 'warn' : 'alert' },
      { l: 'Legal-aid represented', v: `${o.legalAid.representedPct}%`, t: o.legalAid.representedPct >= 75 ? 'ok' : 'warn' },
      { l: 'Prison occupancy', v: `${o.corrections.occupancyPct}%`, t: o.corrections.occupancyPct >= 110 ? 'alert' : o.corrections.occupancyPct >= 95 ? 'warn' : 'ok' },
      { l: 'Registry integrity', v: `${o.registries.integrityPct}%`, t: o.registries.integrityPct >= 98 ? 'ok' : 'warn' },
      { l: 'Court-liaison SLA', v: `${o.courtLiaison.slaMetPct}%`, t: o.courtLiaison.slaMetPct >= 80 ? 'ok' : 'warn' },
      { l: 'Transfers pending', v: `${o.courtLiaison.transfersPending}`, t: o.courtLiaison.transfersPending > 500 ? 'warn' : 'ok' },
    ];
  } else if (archetype === 'INTERIOR') {
    const o = interiorOps(id, ts);
    const lt: Tone = o.internalThreatLevel === 'high' ? 'alert' : o.internalThreatLevel === 'elevated' ? 'warn' : 'ok';
    items = [
      { l: 'Identity enrolled', v: `${o.identity.enrolledM}M`, t: 'ok' },
      { l: 'ID issuance backlog', v: o.identity.issuanceBacklog.toLocaleString(), t: o.identity.issuanceBacklog > 5000 ? 'alert' : 'warn' },
      { l: 'Border posts open', v: `${o.border.open}/${o.border.posts}`, t: o.border.open < o.border.posts ? 'warn' : 'ok' },
      { l: 'Flagged entries', v: `${o.border.flaggedEntries}`, t: o.border.flaggedEntries > 80 ? 'alert' : 'warn' },
      { l: 'Public order', v: `${o.coordination.publicOrderIndex}`, t: lt },
      { l: 'Threat level', v: o.internalThreatLevel, t: lt },
    ];
  } else if (archetype === 'LABOR') {
    const o = laborOps(id, ts);
    items = [
      { l: 'Unemployment', v: `${o.unemploymentPct}%`, t: o.unemploymentPct >= 16 ? 'alert' : o.unemploymentPct >= 9 ? 'warn' : 'ok' },
      { l: 'Placements today', v: o.placementsToday.toLocaleString(), t: 'ok' },
      { l: 'Inspection compliance', v: `${o.inspection.compliancePct}%`, t: o.inspection.compliancePct >= 80 ? 'ok' : 'warn' },
      { l: 'Insurance on-time', v: `${o.socialInsurance.payoutOnTimePct}%`, t: o.socialInsurance.payoutOnTimePct >= 90 ? 'ok' : 'warn' },
      { l: 'Open disputes', v: o.disputes.openDisputes.toLocaleString(), t: o.disputes.openDisputes > 3000 ? 'warn' : 'ok' },
      { l: 'Median resolution', v: `${o.disputes.medianDays}d`, t: o.disputes.medianDays >= 90 ? 'alert' : 'warn' },
    ];
  } else if (archetype === 'TRADE') {
    const o = tradeOps(id, ts);
    items = [
      { l: 'Trade balance', v: `${o.tradeBalanceIdx}`, t: o.tradeBalanceIdx >= 70 ? 'ok' : o.tradeBalanceIdx >= 50 ? 'warn' : 'alert' },
      { l: 'Export corridors', v: `${o.exports.corridorsOpen}/${o.exports.corridorsTotal}`, t: o.exports.corridorsOpen < o.exports.corridorsTotal ? 'warn' : 'ok' },
      { l: 'Export clearance', v: `${o.exports.clearanceDays}d`, t: o.exports.clearanceDays >= 10 ? 'alert' : o.exports.clearanceDays >= 5 ? 'warn' : 'ok' },
      { l: 'Businesses active', v: `${o.businessRegistry.activeM}M`, t: 'ok' },
      { l: 'Registration median', v: `${o.businessRegistry.medianDays}d`, t: o.businessRegistry.medianDays >= 14 ? 'warn' : 'ok' },
      { l: 'Standards conformity', v: `${o.standards.conformityPct}%`, t: o.standards.conformityPct >= 85 ? 'ok' : 'warn' },
    ];
  } else { // ENVIRONMENT / GENERIC
    const o = environmentOps(id, ts);
    items = [
      { l: 'Air quality index', v: `${o.airQualityIndex}`, t: o.airQualityIndex >= 150 ? 'alert' : o.airQualityIndex >= 100 ? 'warn' : 'ok' },
      { l: 'Water quality', v: `${o.waterQualityPct}%`, t: o.waterQualityPct >= 80 ? 'ok' : 'warn' },
      { l: 'Monitoring online', v: `${o.monitoringOnline}/${o.monitoringTotal}`, t: o.monitoringOnline < o.monitoringTotal * 0.85 ? 'warn' : 'ok' },
      { l: 'Emissions vs target', v: `${o.emissionsVsTargetPct}%`, t: o.emissionsVsTargetPct > 110 ? 'alert' : o.emissionsVsTargetPct > 100 ? 'warn' : 'ok' },
      { l: 'Protected integrity', v: `${o.protectedAreaIntegrityPct}%`, t: o.protectedAreaIntegrityPct >= 75 ? 'ok' : 'warn' },
      { l: 'Compliance', v: `${o.compliancePct}%`, t: o.compliancePct >= 80 ? 'ok' : 'warn' },
    ];
    bars = { title: 'Environmental hazards', meta: 'regional risk', rows: o.hazards.map(h => ({ label: `${h.region} · ${h.kind}`, pct: h.level === 'severe' ? 92 : h.level === 'moderate' ? 58 : 26, tone: h.level === 'severe' ? 'alert' : h.level === 'moderate' ? 'warn' : 'ok', tail: h.level })) };
  }

  return (
    <div className="space-y-2">
      <StatGrid items={items} />
      {bars ? <Panel title={bars.title} meta={bars.meta}><Bars rows={bars.rows} /></Panel> : null}
      {(['AGRICULTURE', 'INTERIOR', 'ENVIRONMENT', 'TRANSPORT'] as ArchetypeKey[]).includes(archetype) ? (
        <>
          <FieldPanel instId={id} archetype={archetype} now={now} />
          <RuntimeQueue scope={`${id}:field`} kind="field" title={`${label} field deployment runtime — stage → task → on-scene → cleared`} by="Field Coordinator" role={role} withheld={withheld} />
        </>
      ) : null}
      <RuntimeQueue scope={`${id}:${domain}`} kind={wf} title={`${label} · ${domain} runtime — execute the institutional workflow`} by="Institution Officer" role={role} withheld={withheld} />
    </div>
  );
}
