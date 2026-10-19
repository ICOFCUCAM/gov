import { Suspense } from 'react';
import { ReleaseDetail } from '@/components/features/updates/ReleaseDetail';

export const metadata = { title: 'Release · Update Center' };

// One release as this nation sees it: what changes, how to verify and
// deliver it, and the nation's own decision on it.
export default async function ReleasePage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  return <Suspense><ReleaseDetail id={decodeURIComponent(params.id)} /></Suspense>;
}
