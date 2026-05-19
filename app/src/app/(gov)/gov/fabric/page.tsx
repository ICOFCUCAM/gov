import { CommandShell } from '@/components/ui/CommandShell';
import { EventBusMonitor } from '@/components/features/EventBusMonitor';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Event Bus Monitor' };

export default function FabricPage() {
  return (
    <CommandShell active="fabric">
      <EventBusMonitor />
    </CommandShell>
  );
}
