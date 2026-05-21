import { CitizenSubstrate } from '@/components/features/CitizenSubstrate';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Citizen Wallet · substrate' };

export default function CitizenSubstratePage() {
  return (
    <main className="max-w-5xl mx-auto px-4 py-6">
      <CitizenSubstrate />
    </main>
  );
}
