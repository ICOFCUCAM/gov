import { Suspense } from 'react';
import { FeatureRequests } from '@/components/features/updates/FeatureRequests';

export const metadata = { title: 'Feature requests · Update Center' };

// A nation's special feature requests and their pipeline.
export default function FeatureRequestsPage() {
  return <Suspense><FeatureRequests /></Suspense>;
}
