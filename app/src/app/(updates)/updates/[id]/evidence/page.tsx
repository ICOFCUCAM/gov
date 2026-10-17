import { Suspense } from 'react';
import { EvidencePage } from '@/components/features/updates/EvidencePack';

export const metadata = { title: 'Evidence pack · Update Center' };

// A release's compliance evidence pack for this nation, readable; the same
// pack downloads as a JSON manifest with a digest.
export default function Page({ params }: { params: { id: string } }) {
  return <Suspense><EvidencePage id={params.id} /></Suspense>;
}
