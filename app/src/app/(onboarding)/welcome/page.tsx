import { Suspense } from 'react';
import { Welcome } from '@/components/features/onboarding/Welcome';

export const metadata = { title: 'Welcome' };

// Landing after sign-in. Hands over to /setup until setup is complete.
export default function WelcomePage() {
  return <Suspense><Welcome /></Suspense>;
}
