import { CommandShell } from '@/components/ui/CommandShell';
import { DomainCommand } from '@/components/features/DomainCommand';

export const dynamic = 'force-dynamic';

export default function GeopoliticalMonitorPage() {
  return (
    <CommandShell active="geo">
      <DomainCommand domain="geopolitical" />
    </CommandShell>
  );
}
