import { Suspense } from 'react';
import { MirrorCenter } from '@/components/features/updates/MirrorCenter';

export const metadata = { title: 'Mirror · Update Center' };

// Local mirror and offline logistics: registry mirror, sync manifests with
// deltas, and physical media with its chain of custody.
export default function MirrorPage() {
  return <Suspense><MirrorCenter /></Suspense>;
}
