import { CitizenHome } from '@/components/features/CitizenHome';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Wallet Home' };

export default function WalletHomePage() {
  return (
    <main className="max-w-5xl mx-auto px-4 py-6">
      <CitizenHome />
    </main>
  );
}
