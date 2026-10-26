import { CommandShell } from '@/components/ui/CommandShell';
import { BudgetTreasury } from '@/components/features/economy/BudgetTreasury';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Budget and treasury' };

export default function Page() {
  return (
    <CommandShell active="fin">
      <BudgetTreasury />
    </CommandShell>
  );
}
