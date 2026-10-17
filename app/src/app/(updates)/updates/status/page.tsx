import { Suspense } from 'react';
import { StatusCenter } from '@/components/features/updates/SupportCenter';

export const metadata = { title: 'Status · Update Center' };

// Status page for this nation: service health, incidents and maintenance.
export default function Page() {
  return <Suspense><StatusCenter /></Suspense>;
}
