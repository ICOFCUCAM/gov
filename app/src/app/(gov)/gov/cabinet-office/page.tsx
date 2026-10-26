import { CommandShell } from '@/components/ui/CommandShell';
import { CabinetOffice } from '@/components/features/economy/CabinetOffice';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Cabinet office' };

export default function Page() {
  return (
    <CommandShell active="cab">
      <CabinetOffice />
    </CommandShell>
  );
}
