import { CommandShell } from '@/components/ui/CommandShell';
import { EventDetail } from '@/components/features/EventDetail';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Federation event' };

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <CommandShell active="federation">
      <EventDetail id={decodeURIComponent(id)} />
    </CommandShell>
  );
}
