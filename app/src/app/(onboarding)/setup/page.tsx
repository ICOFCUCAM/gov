import { Suspense } from 'react';
import { SetupWizard } from '@/components/features/onboarding/SetupWizard';

export const metadata = { title: 'Setup' };

// First-run onboarding: the nation or ministry loads its profile,
// identity and institutions. Re-entering edits the live configuration.
export default function SetupPage() {
  return <Suspense><SetupWizard /></Suspense>;
}
