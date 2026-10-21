import { CommandShell } from '@/components/ui/CommandShell';
import { OfficesRegister } from '@/components/features/OfficesRegister';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Offices' };

// Offices of state and who holds them, and the state's classification (plan phase 4; audit F, H):
// /api/offices and the nation profile. Holding an office grants no permission.
export default function OfficesPage() {
  return (
    <CommandShell active="cfg">
      <div className="space-y-6 p-4">
        <p className="max-w-3xl text-sm text-ink-muted">
          The offices the nation&apos;s law sets up, which institution each belongs to, and who holds them.
          The platform names no office and gives none a power: each power is recorded and enforced where it belongs.
        </p>
        <OfficesRegister />
      </div>
    </CommandShell>
  );
}
