import { CommandShell } from '@/components/ui/CommandShell';
import { AccountabilityScoreboard } from '@/components/features/AccountabilityScoreboard';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Accountability Scoreboard' };

export default function AccountabilityPage() {
  return (
    <CommandShell active="accountability">
      <AccountabilityScoreboard />
    </CommandShell>
  );
}
