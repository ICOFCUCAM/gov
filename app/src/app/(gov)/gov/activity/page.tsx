import { CommandShell } from '@/components/ui/CommandShell';
import { ActivityLog } from '@/components/features/ActivityLog';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Activity Log' };

export default function ActivityPage() {
  return (
    <CommandShell active="activity">
      <ActivityLog />
    </CommandShell>
  );
}
