import { CommandShell } from '@/components/ui/CommandShell';
import { NationalFabricView } from '@/components/features/NationalFabricView';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'National Interoperability Fabric' };

export default function FabricPage() {
  return (
    <CommandShell active="fabric">
      <NationalFabricView />
    </CommandShell>
  );
}
