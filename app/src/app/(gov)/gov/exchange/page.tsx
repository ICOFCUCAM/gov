import { CommandShell } from '@/components/ui/CommandShell';
import { DataSharingServices } from '@/components/features/DataSharingServices';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Data-sharing services' };

export default function DataSharingServicesPage() {
  return (
    <CommandShell active="intg">
      <DataSharingServices />
    </CommandShell>
  );
}
