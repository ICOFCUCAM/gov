import { ConsentDetail } from '@/components/features/ConsentDetail';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Consent' };

export default async function ConsentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <main className="max-w-5xl mx-auto px-4 py-6">
      <ConsentDetail id={decodeURIComponent(id)} />
    </main>
  );
}
