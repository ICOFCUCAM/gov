import { OnboardingWizard } from './OnboardingWizard';
export const metadata = { title: 'Municipal Onboarding' };


export default function MunicipalOnboardingPage() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-10 space-y-6">
      <header>
        <h1 className="text-3xl font-semibold">Municipal onboarding</h1>
        <p className="text-ink-muted mt-2">
          Stand up a municipality on CivicOS. The wizard checks the inclusion
          floor, language coverage, and constitutional officer signoff before
          provisioning. A municipality cannot go live without them.
        </p>
      </header>
      <OnboardingWizard />
    </main>
  );
}
