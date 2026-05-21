import { CommandShell } from '@/components/ui/CommandShell';
import { SubstrateStatus } from '@/components/features/SubstrateStatus';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Substrate Status' };

export default function SubstratePage() {
  return (
    <CommandShell active="substrate">
      <SubstrateStatus />
    </CommandShell>
  );
}
