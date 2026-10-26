import { CommandShell } from '@/components/ui/CommandShell';
import { ProcurementDesk } from '@/components/features/economy/ProcurementDesk';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Procurement' };

export default function Page() {
  return (
    <CommandShell active="fin">
      <ProcurementDesk />
    </CommandShell>
  );
}
