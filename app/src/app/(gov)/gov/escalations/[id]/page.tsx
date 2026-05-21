import { CommandShell } from '@/components/ui/CommandShell';
import { EscalationDetail } from '@/components/features/EscalationDetail';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Escalation' };

export default async function EscalationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <CommandShell active="escalations">
      <EscalationDetail id={decodeURIComponent(id)} />
    </CommandShell>
  );
}
