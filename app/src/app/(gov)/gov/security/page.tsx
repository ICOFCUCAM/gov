import { CommandShell } from '@/components/ui/CommandShell';
import { DomainCommand } from '@/components/features/DomainCommand';

export const dynamic = 'force-dynamic';

export default function SecurityCommandPage() {
  return (
    <CommandShell active="sec">
      <DomainCommand domain="security" />
    </CommandShell>
  );
}
