import { AppShell } from '@/components/ui/AppShell';
import { Cabinet } from './Cabinet';

export const dynamic = 'force-dynamic';

export default function CabinetPage() {
  return (
    <AppShell active="/gov">
      <Cabinet />
    </AppShell>
  );
}
