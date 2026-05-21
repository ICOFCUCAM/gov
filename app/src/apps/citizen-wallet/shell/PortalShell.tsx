'use client';

// apps/citizen-portal/shell — Citizen Super-Portal shell.

import * as React from 'react';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { PORTAL_DS, CitizenSeal } from '@/apps/citizen-wallet/design-system/portal-ds';
import { domainBySurface, type PortalSurfaceId } from '@/apps/citizen-wallet/core/domains';
import { FederationStrip } from '@/apps/citizen-wallet/federation/federation';
import { SERVICE_REQUEST } from '@/apps/citizen-wallet/workflows/portal-workflows';

import { WalletHome, UnifiedInbox, ServicesDirectory, ConsentsLedger, SovereignIdentity, IdentityVerification, BiometricDoctrine, HealthWallet, HealthRecords, Appointments, LearnerTwin, CredentialsPortfolio } from '@/apps/citizen-wallet/domains/WalletIdentity';
import { WelfareBenefits, UnemploymentAccount, TaxAccount, PaymentsHistory, TaxFiling, CivicJustice, CaseTracker, AppealCentre, CivicVoice, PetitionsWallet, PublicConsultations } from '@/apps/citizen-wallet/domains/WelfareTaxJustice';
import { PermitsLicences, BusinessRegistry, PersonalRecords, MobilityWallet, EnergyAccount, ConsularServices, VoterWallet, CitizenSafeguardsView, DataDoctrine, AppealDoctrine } from '@/apps/citizen-wallet/domains/PermitsRecordsSafeguards';

import type { SovereignRole, Capability } from '@/shared/permissions/rbac';

type Render = (p: { id: string; now: number; role: SovereignRole; withheld: Capability[] }) => React.ReactElement;

const RENDER: Record<PortalSurfaceId, Render> = {
  'wallet-home':           p => <WalletHome id={p.id} now={p.now} />,
  'unified-inbox':         p => <UnifiedInbox id={p.id} now={p.now} />,
  'services-directory':    p => <ServicesDirectory id={p.id} now={p.now} />,
  'consents-ledger':       p => <ConsentsLedger id={p.id} now={p.now} />,
  'sovereign-identity':    p => <SovereignIdentity id={p.id} now={p.now} />,
  'identity-verification': p => <IdentityVerification id={p.id} now={p.now} />,
  'biometric-doctrine':    p => <BiometricDoctrine id={p.id} now={p.now} />,
  'health-wallet':         p => <HealthWallet id={p.id} now={p.now} />,
  'health-records':        p => <HealthRecords id={p.id} now={p.now} />,
  'appointments':          p => <Appointments id={p.id} now={p.now} />,
  'learner-twin':          p => <LearnerTwin id={p.id} now={p.now} />,
  'credentials-portfolio': p => <CredentialsPortfolio id={p.id} now={p.now} />,
  'welfare-benefits':      p => <WelfareBenefits id={p.id} now={p.now} />,
  'unemployment-account':  p => <UnemploymentAccount id={p.id} now={p.now} />,
  'tax-account':           p => <TaxAccount id={p.id} now={p.now} />,
  'payments-history':      p => <PaymentsHistory id={p.id} now={p.now} />,
  'tax-filing':            p => <TaxFiling id={p.id} now={p.now} />,
  'civic-justice':         p => <CivicJustice id={p.id} now={p.now} />,
  'case-tracker':          p => <CaseTracker id={p.id} now={p.now} />,
  'appeal-centre':         p => <AppealCentre id={p.id} now={p.now} />,
  'civic-voice':           p => <CivicVoice id={p.id} now={p.now} />,
  'petitions-wallet':      p => <PetitionsWallet id={p.id} now={p.now} />,
  'public-consultations':  p => <PublicConsultations id={p.id} now={p.now} />,
  'permits-licences':      p => <PermitsLicences id={p.id} now={p.now} />,
  'business-registry':     p => <BusinessRegistry id={p.id} now={p.now} />,
  'personal-records':      p => <PersonalRecords id={p.id} now={p.now} />,
  'mobility-wallet':       p => <MobilityWallet id={p.id} now={p.now} />,
  'energy-account':        p => <EnergyAccount id={p.id} now={p.now} />,
  'consular-services':     p => <ConsularServices id={p.id} now={p.now} />,
  'voter-wallet':          p => <VoterWallet id={p.id} now={p.now} />,
  'citizen-safeguards':    p => <CitizenSafeguardsView id={p.id} now={p.now} />,
  'data-doctrine':         p => <DataDoctrine id={p.id} now={p.now} />,
  'appeal-doctrine':       p => <AppealDoctrine id={p.id} now={p.now} />,
};

export function PortalShell({ id, surface, now, role, withheld = [] }: {
  id: string; surface: PortalSurfaceId; now: number; role: SovereignRole; withheld?: Capability[];
}) {
  const domain = domainBySurface(surface);
  const render = RENDER[surface];
  return (
    <div className="space-y-2 p-2" style={{ background: PORTAL_DS.paperDeep }}>
      {render ? render({ id, now, role, withheld }) : <WalletHome id={id} now={now} />}
      <FederationStrip />
      <RuntimeQueue
        scope={`portal:${surface}`}
        kind={domain?.archetype === 'justice' ? 'case' : domain?.archetype === 'taxation' || domain?.archetype === 'welfare' ? 'procurement' : domain?.archetype === 'permits' || domain?.archetype === 'business' ? 'permit' : 'case'}
        title={`${domain?.label ?? 'Citizen wallet'} runtime — ${SERVICE_REQUEST.title}`}
        by="Citizen"
        role={role}
        withheld={withheld} />
      <CitizenSeal maxim="Civis sum · I am a citizen" />
    </div>
  );
}
