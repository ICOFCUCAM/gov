'use client';

// apps/foreign-affairs/shell — the World Dispatch shell. Dispatches
// all 31 Foreign Affairs surfaces through the Chancery design system,
// blending the existing 7 ministry surfaces with 22 new domains.

import * as React from 'react';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { FOREIGN_DS, ChancerySeal } from '@/apps/foreign-affairs/design-system/foreign-ds';
import { domainBySurface, type ForeignSurfaceId } from '@/apps/foreign-affairs/core/domains';
import { FederationStrip } from '@/apps/foreign-affairs/federation/federation';
import { TREATY_RATIFICATION } from '@/apps/foreign-affairs/workflows/foreign-workflows';

import { GeopoliticalCommandCenter } from '@/apps/foreign-affairs/GeopoliticalCommandCenter';
import { DiplomaticMissionsRegister } from '@/apps/foreign-affairs/DiplomaticMissionsRegister';
import { TreatyAlliancesAtlas } from '@/apps/foreign-affairs/TreatyAlliancesAtlas';
import { InternationalCrisisForesight } from '@/apps/foreign-affairs/InternationalCrisisForesight';
import { GeopoliticalIntelligenceSystems } from '@/apps/foreign-affairs/GeopoliticalIntelligenceSystems';
import { InternationalLawSovereignty } from '@/apps/foreign-affairs/InternationalLawSovereignty';
import { CitizenForeignServicesPortal } from '@/apps/foreign-affairs/CitizenForeignServicesPortal';

import { WorldDispatch, RegionalTensionBoard, EmbassyOperations, ConsularContinuity, SpecialEnvoys, TreatyComplianceBench, NegotiationDocket } from '@/apps/foreign-affairs/domains/DispatchTreaties';
import { AnomalyDetection, ConflictProbability, StrategicDependency, InfluenceSignals, EconomicDiplomacy, SanctionsExposure, SovereignAssetExposure, SovereigntyDisputes, TreatyLegalityBench } from '@/apps/foreign-affairs/domains/IntelligenceLaw';
import { PassportPipeline, VisaProcessing, TravelAdvisories, CivilizationalStanding, MultilateralRoster, VotingAlignment, DiplomaticSafeguards, AntiImperialAudit } from '@/apps/foreign-affairs/domains/ConsularForesight';

import type { SovereignRole, Capability } from '@/shared/permissions/rbac';

type Render = (p: { id: string; now: number; role: SovereignRole; withheld: Capability[] }) => React.ReactElement;

const RENDER: Record<ForeignSurfaceId, Render> = {
  // dispatch
  'geopolitical-command':   p => <GeopoliticalCommandCenter id={p.id} now={p.now} />,
  'world-dispatch':         p => <WorldDispatch id={p.id} now={p.now} />,
  'regional-tension-board': p => <RegionalTensionBoard id={p.id} now={p.now} />,
  // missions
  'diplomatic-missions':    p => <DiplomaticMissionsRegister id={p.id} now={p.now} />,
  'embassy-operations':     p => <EmbassyOperations id={p.id} now={p.now} />,
  'consular-continuity':    p => <ConsularContinuity id={p.id} now={p.now} />,
  'special-envoys':         p => <SpecialEnvoys id={p.id} now={p.now} />,
  // treaties
  'treaties-alliances':       p => <TreatyAlliancesAtlas id={p.id} now={p.now} />,
  'treaty-compliance-bench':  p => <TreatyComplianceBench id={p.id} now={p.now} />,
  'negotiation-docket':       p => <NegotiationDocket id={p.id} now={p.now} />,
  // intelligence
  'intelligence-systems':   p => <GeopoliticalIntelligenceSystems id={p.id} now={p.now} />,
  'anomaly-detection':      p => <AnomalyDetection id={p.id} now={p.now} />,
  'conflict-probability':   p => <ConflictProbability id={p.id} now={p.now} />,
  'strategic-dependency':   p => <StrategicDependency id={p.id} now={p.now} />,
  'influence-signals':      p => <InfluenceSignals id={p.id} now={p.now} />,
  // economic
  'economic-diplomacy':       p => <EconomicDiplomacy id={p.id} now={p.now} />,
  'sanctions-exposure':       p => <SanctionsExposure id={p.id} now={p.now} />,
  'sovereign-asset-exposure': p => <SovereignAssetExposure id={p.id} now={p.now} />,
  // law
  'law-sovereignty':        p => <InternationalLawSovereignty id={p.id} now={p.now} />,
  'sovereignty-disputes':   p => <SovereigntyDisputes id={p.id} now={p.now} />,
  'treaty-legality-bench':  p => <TreatyLegalityBench id={p.id} now={p.now} />,
  // consular
  'citizen-portal':         p => <CitizenForeignServicesPortal id={p.id} now={p.now} />,
  'passport-pipeline':      p => <PassportPipeline id={p.id} now={p.now} />,
  'visa-processing':        p => <VisaProcessing id={p.id} now={p.now} />,
  'travel-advisories':      p => <TravelAdvisories id={p.id} now={p.now} />,
  // foresight
  'crisis-foresight':       p => <InternationalCrisisForesight id={p.id} now={p.now} />,
  'civilizational-standing':p => <CivilizationalStanding id={p.id} now={p.now} />,
  // organizations
  'multilateral-roster':    p => <MultilateralRoster id={p.id} now={p.now} />,
  'voting-alignment':       p => <VotingAlignment id={p.id} now={p.now} />,
  // oversight
  'diplomatic-safeguards':  p => <DiplomaticSafeguards id={p.id} now={p.now} />,
  'anti-imperial-audit':    p => <AntiImperialAudit id={p.id} now={p.now} />,
};

export function ForeignShell({ id, surface, now, role, withheld = [] }: {
  id: string; surface: ForeignSurfaceId; now: number; role: SovereignRole; withheld?: Capability[];
}) {
  const domain = domainBySurface(surface);
  const render = RENDER[surface];
  return (
    <div className="space-y-2 p-2"
      style={{ background: FOREIGN_DS.midnight, boxShadow: 'inset 0 0 90px rgba(0,0,0,0.65)' }}>
      {render ? render({ id, now, role, withheld }) : <GeopoliticalCommandCenter id={id} now={now} />}
      <FederationStrip />
      <RuntimeQueue
        scope={`foreign:${surface}`}
        kind={domain?.archetype === 'treaty' ? 'approval' : domain?.archetype === 'consular' ? 'case' : 'incident'}
        title={`${domain?.label ?? 'Foreign Affairs'} runtime — ${TREATY_RATIFICATION.title}`}
        by="Diplomatic Officer"
        role={role}
        withheld={withheld} />
      <ChancerySeal maxim="Pacta sunt servanda · agreements must be kept" />
    </div>
  );
}
