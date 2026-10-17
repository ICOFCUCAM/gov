import { Suspense } from 'react';
import { SupportCenter } from '@/components/features/updates/SupportCenter';

export const metadata = { title: 'Support · Update Center' };

// Support desk: tickets with SLA timers, the monthly service report and the contract tier.
export default function Page() {
  return <Suspense><SupportCenter /></Suspense>;
}
