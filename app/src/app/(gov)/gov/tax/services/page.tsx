import { CommandShell } from '@/components/ui/CommandShell';
import { TaxServices } from '@/components/features/TaxServices';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Tax services' };

export default function Page() {
  return (
    <CommandShell active="fin">
      <TaxServices />
    </CommandShell>
  );
}
