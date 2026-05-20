'use client';

// apps/ministry-trade/shell — Industrial Corridor shell. Dispatches all 31
// Trade surfaces, blending 4 existing top-level subsystems with 24 new
// domains.

import * as React from 'react';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { TRADE_DS, CorridorSeal } from '@/apps/ministry-trade/design-system/trade-ds';
import { domainBySurface, type TradeSurfaceId } from '@/apps/ministry-trade/core/domains';
import { FederationStrip } from '@/apps/ministry-trade/federation/federation';
import { EXPORT_LICENCE } from '@/apps/ministry-trade/workflows/trade-workflows';

import { NationalIndustrialCommand } from '@/apps/ministry-trade/NationalIndustrialCommand';
import { TradeCorridorsExports } from '@/apps/ministry-trade/TradeCorridorsExports';
import { SupplyChainCommerce } from '@/apps/ministry-trade/SupplyChainCommerce';
import { EconomicForesightCrisis } from '@/apps/ministry-trade/EconomicForesightCrisis';

import { IndustrialPosture, FactoryClusters, CorridorBoard, TariffPressure, StrategicIndustries, StrategicReserves, PriorityAllocation } from '@/apps/ministry-trade/domains/CommandCorridor';
import { IndustrialDistricts, SmeContinuity, SupplyChains, InboundCover, BottleneckBoard, TradeAgreements, ExportDependencies, SanctionsExposure, IndustrialIncidents, RecoveryPathways, SabotageWatch } from '@/apps/ministry-trade/domains/CommercialSupply';
import { OutputTrajectory, AutonomyTrajectory, CompetitivenessBoard, BusinessRegistry, StandardsPortal, LicensingPermits, ExportCertification, IndustrialSafeguards, TransparentTenderAudit } from '@/apps/ministry-trade/domains/IntelligencePortal';

import type { SovereignRole, Capability } from '@/shared/permissions/rbac';

type Render = (p: { id: string; now: number; role: SovereignRole; withheld: Capability[] }) => React.ReactElement;

const RENDER: Record<TradeSurfaceId, Render> = {
  // command
  'industrial-command':       p => <NationalIndustrialCommand id={p.id} now={p.now} />,
  'industrial-posture':       p => <IndustrialPosture id={p.id} now={p.now} />,
  'factory-clusters':         p => <FactoryClusters id={p.id} now={p.now} />,
  // corridor
  'trade-corridors':          p => <TradeCorridorsExports id={p.id} now={p.now} />,
  'corridor-board':           p => <CorridorBoard id={p.id} now={p.now} />,
  'tariff-pressure':          p => <TariffPressure id={p.id} now={p.now} />,
  // strategic
  'strategic-industries':     p => <StrategicIndustries id={p.id} now={p.now} />,
  'strategic-reserves':       p => <StrategicReserves id={p.id} now={p.now} />,
  'priority-allocation':      p => <PriorityAllocation id={p.id} now={p.now} />,
  // commercial
  'supply-chain-commerce':    p => <SupplyChainCommerce id={p.id} now={p.now} />,
  'industrial-districts':     p => <IndustrialDistricts id={p.id} now={p.now} />,
  'sme-continuity':           p => <SmeContinuity id={p.id} now={p.now} />,
  // supply
  'supply-chains':            p => <SupplyChains id={p.id} now={p.now} />,
  'inbound-cover':            p => <InboundCover id={p.id} now={p.now} />,
  'bottleneck-board':         p => <BottleneckBoard id={p.id} now={p.now} />,
  // foreign
  'trade-agreements':         p => <TradeAgreements id={p.id} now={p.now} />,
  'export-dependencies':      p => <ExportDependencies id={p.id} now={p.now} />,
  'sanctions-exposure':       p => <SanctionsExposure id={p.id} now={p.now} />,
  // crisis
  'industrial-incidents':     p => <IndustrialIncidents id={p.id} now={p.now} />,
  'recovery-pathways':        p => <RecoveryPathways id={p.id} now={p.now} />,
  'sabotage-watch':           p => <SabotageWatch id={p.id} now={p.now} />,
  // intelligence
  'economic-foresight':       p => <EconomicForesightCrisis id={p.id} now={p.now} />,
  'output-trajectory':        p => <OutputTrajectory id={p.id} now={p.now} />,
  'autonomy-trajectory':      p => <AutonomyTrajectory id={p.id} now={p.now} />,
  'competitiveness-board':    p => <CompetitivenessBoard id={p.id} now={p.now} />,
  // portal
  'business-registry':        p => <BusinessRegistry id={p.id} now={p.now} />,
  'standards-portal':         p => <StandardsPortal id={p.id} now={p.now} />,
  'licensing-permits':        p => <LicensingPermits id={p.id} now={p.now} />,
  'export-certification':     p => <ExportCertification id={p.id} now={p.now} />,
  // oversight
  'industrial-safeguards':    p => <IndustrialSafeguards id={p.id} now={p.now} />,
  'transparent-tender-audit': p => <TransparentTenderAudit id={p.id} now={p.now} />,
};

export function TradeShell({ id, surface, now, role, withheld = [] }: {
  id: string; surface: TradeSurfaceId; now: number; role: SovereignRole; withheld?: Capability[];
}) {
  const domain = domainBySurface(surface);
  const render = RENDER[surface];
  return (
    <div className="space-y-2 p-2"
      style={{ background: TRADE_DS.graphite, boxShadow: 'inset 0 0 90px rgba(0,0,0,0.65)' }}>
      {render ? render({ id, now, role, withheld }) : <NationalIndustrialCommand id={id} now={now} />}
      <FederationStrip />
      <RuntimeQueue
        scope={`trade:${surface}`}
        kind={domain?.archetype === 'crisis' ? 'incident' : domain?.archetype === 'portal' ? 'permit' : 'approval'}
        title={`${domain?.label ?? 'Trade'} runtime — ${EXPORT_LICENCE.title}`}
        by="Trade Officer"
        role={role}
        withheld={withheld} />
      <CorridorSeal maxim="Commercium aequum · fair commerce binds the polity" />
    </div>
  );
}
