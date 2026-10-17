import { Suspense } from 'react';
import { SecurityStore } from '@/components/features/updates/SecurityStore';

export const metadata = { title: 'Security · Update Center' };

// Security store: baseline protection included for every nation, certified
// partners' advanced tools (instant payment or procurement), bring-your-own
// tooling, the nation's own software, definitions and posture.
export default function SecurityStorePage() {
  return <Suspense><SecurityStore /></Suspense>;
}
