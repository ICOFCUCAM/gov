import { CommandShell } from '@/components/ui/CommandShell';
import { OpsCenter } from './OpsCenter';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Operations Centre' };


export default function OpsPage() {
  return (
    <CommandShell active="ops">
      <OpsCenter />
    </CommandShell>
  );
}
