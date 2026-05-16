import { CommandShell } from '@/components/ui/CommandShell';
import { DomainCommand } from '@/components/features/DomainCommand';

export const dynamic = 'force-dynamic';

export default function TreasuryCommandPage() {
  return (
    <CommandShell active="trs">
      <DomainCommand domain="treasury" />
    </CommandShell>
  );
}
