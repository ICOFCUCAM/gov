import { CommandShell } from '@/components/ui/CommandShell';
import { OpsCenter } from './OpsCenter';

export const dynamic = 'force-dynamic';

export default function OpsPage() {
  return (
    <CommandShell active="ops">
      <OpsCenter />
    </CommandShell>
  );
}
