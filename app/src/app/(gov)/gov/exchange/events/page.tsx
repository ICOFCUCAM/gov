import { CommandShell } from '@/components/ui/CommandShell';
import { EventOutbox } from '@/components/features/EventOutbox';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Events sent out' };

export default function EventOutboxPage() {
  return (
    <CommandShell active="intg">
      <EventOutbox />
    </CommandShell>
  );
}
