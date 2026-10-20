import { CommandShell } from '@/components/ui/CommandShell';
import { TaxRegister } from '@/components/features/TaxRegister';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Tax' };

export default function Page() {
  return (
    <CommandShell active="fin">
      <TaxRegister />
    </CommandShell>
  );
}
