import { CommandShell } from '@/components/ui/CommandShell';
import { InteroperabilityFabric } from '@/components/features/InteroperabilityFabric';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Interoperability Fabric' };

export default function FabricPage() {
  return (
    <CommandShell active="fabric">
      <InteroperabilityFabric />
    </CommandShell>
  );
}
