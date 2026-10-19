import { CommandShell } from '@/components/ui/CommandShell';
import { ParcelRegister } from '@/components/features/sites/ParcelRegister';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Land parcels' };

export default function ParcelsPage() {
  return (
    <CommandShell active="twin">
      <ParcelRegister />
    </CommandShell>
  );
}
