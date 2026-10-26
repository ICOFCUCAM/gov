import { CommandShell } from '@/components/ui/CommandShell';
import { SecurityResilienceDesk } from '@/components/features/SecurityResilienceDesk';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Cyber and resilience' };

// I12: security governance and resilience (lib/security), a tab of Security & public order.
export default function SecurityResiliencePage() {
  return (
    <CommandShell active="sec">
      <SecurityResilienceDesk />
    </CommandShell>
  );
}
