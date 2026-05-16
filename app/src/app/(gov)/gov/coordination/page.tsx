import { CommandShell } from '@/components/ui/CommandShell';
import { NationalCoordination } from '@/components/features/NationalCoordination';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'National Coordination' };


export default function NationalCoordinationPage() {
  return (
    <CommandShell active="coord">
      <NationalCoordination />
    </CommandShell>
  );
}
