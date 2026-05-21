import { CommandShell } from '@/components/ui/CommandShell';
import { NotificationsCenter } from '@/components/features/NotificationsCenter';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Notifications' };

export default function AlertsPage() {
  return (
    <CommandShell active="alerts">
      <NotificationsCenter />
    </CommandShell>
  );
}
