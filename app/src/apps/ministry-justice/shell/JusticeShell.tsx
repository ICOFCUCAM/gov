'use client';

// apps/ministry-justice/shell — the dedicated Justice layout engine.
// Renders the active sovereign domain through the Justice design
// system. Single coherent surface that replaces the generic
// SectorInstitutionApp for the JUSTICE archetype.

import * as React from 'react';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { JUSTICE_DS, SealStrip } from '@/apps/ministry-justice/design-system/justice-ds';
import { JUSTICE_DOMAINS, domainBySurface, type SurfaceId } from '@/apps/ministry-justice/core/domains';
import { FederationStrip } from '@/apps/ministry-justice/federation/federation';
import { CASE_FILING_APPROVAL } from '@/apps/ministry-justice/workflows/case-filing-workflow';

// Existing surfaces shipped earlier
import { ConstitutionalReviewChamber } from '@/apps/ministry-justice/ConstitutionalReviewChamber';
import { JudicialOperationsRoster } from '@/apps/ministry-justice/JudicialOperationsRoster';
import { RightsAdministrativeReview } from '@/apps/ministry-justice/RightsAdministrativeReview';
import { JusticeContinuityForesight } from '@/apps/ministry-justice/JusticeContinuityForesight';
import { LegalRecordsContinuity } from '@/apps/ministry-justice/LegalRecordsContinuity';
import { ForensicEvidenceCoordination } from '@/apps/ministry-justice/ForensicEvidenceCoordination';
import { PublicJusticePortal } from '@/apps/ministry-justice/PublicJusticePortal';

// New domain surfaces
import { SeparationOfPowers } from '@/apps/ministry-justice/domains/SeparationOfPowers';
import { EmergencyPowersWatch } from '@/apps/ministry-justice/domains/EmergencyPowersWatch';
import { SovereigntyDefence } from '@/apps/ministry-justice/domains/SovereigntyDefence';
import { SupremeCourtBench } from '@/apps/ministry-justice/domains/SupremeCourtBench';
import { AppellateRouting } from '@/apps/ministry-justice/domains/AppellateRouting';
import { JudicialStatistics } from '@/apps/ministry-justice/domains/JudicialStatistics';
import { JudicialConduct } from '@/apps/ministry-justice/domains/JudicialConduct';
import { CivilDocket, CriminalDocket, FamilyDocket, CommercialDocket, AdministrativeDocket } from '@/apps/ministry-justice/domains/CaseDocket';
import { CaseScheduling } from '@/apps/ministry-justice/domains/CaseScheduling';
import { EvidenceVault } from '@/apps/ministry-justice/domains/EvidenceVault';
import { JudicialSignatures } from '@/apps/ministry-justice/domains/JudicialSignatures';
import { AuthenticationQueue } from '@/apps/ministry-justice/domains/AuthenticationQueue';
import { RightsPetitions } from '@/apps/ministry-justice/domains/RightsPetitions';
import { PublicDocketRedacted } from '@/apps/ministry-justice/domains/PublicDocketRedacted';
import { LegalAid } from '@/apps/ministry-justice/domains/LegalAid';
import { CorrectionsAdministration } from '@/apps/ministry-justice/domains/CorrectionsAdministration';
import { ProbationRegistry } from '@/apps/ministry-justice/domains/ProbationRegistry';
import { AttorneyRegistry } from '@/apps/ministry-justice/domains/AttorneyRegistry';
import { ContinuityCascade } from '@/apps/ministry-justice/domains/ContinuityCascade';

import type { SovereignRole, Capability } from '@/shared/permissions/rbac';

// Map surface → renderer
const RENDER: Record<SurfaceId, (p: { id: string; now: number }) => React.ReactElement> = {
  // chamber
  'constitutional-review': p => <ConstitutionalReviewChamber {...p} />,
  'separation-of-powers': p => <SeparationOfPowers {...p} />,
  'emergency-powers': p => <EmergencyPowersWatch {...p} />,
  'sovereignty-defence': p => <SovereigntyDefence {...p} />,
  // bench
  'judicial-operations': p => <JudicialOperationsRoster {...p} />,
  'supreme-court-bench': p => <SupremeCourtBench {...p} />,
  'appellate-routing': p => <AppellateRouting {...p} />,
  'judicial-statistics': p => <JudicialStatistics {...p} />,
  'judicial-conduct': p => <JudicialConduct {...p} />,
  // docket
  'civil-docket': p => <CivilDocket {...p} />,
  'criminal-docket': p => <CriminalDocket {...p} />,
  'family-docket': p => <FamilyDocket {...p} />,
  'commercial-docket': p => <CommercialDocket {...p} />,
  'administrative-docket': p => <AdministrativeDocket {...p} />,
  'case-scheduling': p => <CaseScheduling {...p} />,
  // records & forensic
  'legal-records': p => <LegalRecordsContinuity {...p} />,
  'evidence-vault': p => <EvidenceVault {...p} />,
  'judicial-signatures': p => <JudicialSignatures {...p} />,
  'forensic-evidence': p => <ForensicEvidenceCoordination {...p} />,
  'authentication-queue': p => <AuthenticationQueue {...p} />,
  // rights
  'rights-administrative': p => <RightsAdministrativeReview {...p} />,
  'rights-petitions': p => <RightsPetitions {...p} />,
  'public-docket-redacted': p => <PublicDocketRedacted {...p} />,
  'legal-aid': p => <LegalAid {...p} />,
  // corrections
  'corrections-administration': p => <CorrectionsAdministration {...p} />,
  'probation-registry': p => <ProbationRegistry {...p} />,
  // portal
  'justice-portal': p => <PublicJusticePortal {...p} />,
  'attorney-registry': p => <AttorneyRegistry {...p} />,
  // continuity
  'justice-foresight': p => <JusticeContinuityForesight {...p} />,
  'continuity-cascade': p => <ContinuityCascade {...p} />,
};

export function JusticeShell({ id, surface, now, role, withheld = [] }: {
  id: string;
  surface: SurfaceId;
  now: number;
  role: SovereignRole;
  withheld?: Capability[];
}) {
  const domain = domainBySurface(surface);
  const render = RENDER[surface];
  return (
    <div className="space-y-2 p-2" style={{ background: JUSTICE_DS.charcoalDeep, boxShadow: 'inset 0 0 90px rgba(0,0,0,0.6)' }}>
      {render ? render({ id, now }) : null}
      {/* Federation contract appears below every surface — Justice is always speaking to other branches */}
      <FederationStrip />
      <RuntimeQueue
        scope={`justice:${surface}`}
        kind={domain?.archetype === 'docket' ? 'case' : domain?.archetype === 'fascicle' ? 'permit' : 'incident'}
        title={`${domain?.label ?? 'Justice'} runtime — ${CASE_FILING_APPROVAL.title}`}
        by="Judicial Officer"
        role={role}
        withheld={withheld} />
      <SealStrip maxim="Fiat justitia ruat caelum · let justice be done though the heavens fall" />
    </div>
  );
}

export { JUSTICE_DOMAINS };
