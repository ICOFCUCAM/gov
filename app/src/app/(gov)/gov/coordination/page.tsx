import { AppShell } from '@/components/ui/AppShell';
import { NationalCoordination } from '@/components/features/NationalCoordination';

export const dynamic = 'force-dynamic';

export default function NationalCoordinationPage() {
  return (
    <AppShell active="/gov/coordination">
      <NationalCoordination />
    </AppShell>
  );
}
