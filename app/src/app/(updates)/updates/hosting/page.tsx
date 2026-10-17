import { Suspense } from 'react';
import { HostingCenter } from '@/components/features/updates/HostingCenter';

export const metadata = { title: 'Hosting · Update Center' };

// Hosting & deployment: own data centre, another cloud, our hosted cloud,
// or a perpetual licence — compared, assessed and chosen.
export default function HostingPage() {
  return <Suspense><HostingCenter /></Suspense>;
}
