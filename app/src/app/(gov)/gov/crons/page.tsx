import { CommandShell } from '@/components/ui/CommandShell';
import { CronStatus } from '@/components/features/CronStatus';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Cron status' };

export default function CronsPage() {
  return (
    <CommandShell active="crons">
      <CronStatus />
    </CommandShell>
  );
}
