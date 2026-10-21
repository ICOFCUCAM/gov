import { CommandShell } from '@/components/ui/CommandShell';
import { OnboardingHub } from './OnboardingHub';
import { OnboardingWizard } from './OnboardingWizard';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Onboarding' };

export default function OnboardingPage() {
  return (
    <CommandShell active="cfg">
      <div className="mx-auto max-w-4xl space-y-8 px-3 py-6">
        <p className="text-ink-muted">
          Everything it takes to run the government on the platform, track by track, read from the live records.
        </p>
        <OnboardingHub />
        <section id="municipalities" className="scroll-mt-24 space-y-4">
          <header>
            <h2 className="text-xl font-semibold">Municipalities</h2>
            <p className="mt-1 text-sm text-ink-muted">Stand up a municipality on CivicOS.</p>
          </header>
          <OnboardingWizard />
        </section>
      </div>
    </CommandShell>
  );
}
