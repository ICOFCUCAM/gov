import { CommandShell } from '@/components/ui/CommandShell';
import { NationalCoordination } from '@/components/features/NationalCoordination';

export const dynamic = 'force-dynamic';

export default function NationalCoordinationPage() {
  return (
    <CommandShell active="coord">
      <NationalCoordination />
    </CommandShell>
  );
}
