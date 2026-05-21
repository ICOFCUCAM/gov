import { CommandShell } from '@/components/ui/CommandShell';
import { EscalationFloor } from '@/components/features/EscalationFloor';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Escalation Floor' };

export default function EscalationsPage() {
  return (
    <CommandShell active="escalations">
      <EscalationFloor />
    </CommandShell>
  );
}
