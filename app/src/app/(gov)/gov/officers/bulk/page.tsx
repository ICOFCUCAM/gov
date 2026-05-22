import { CommandShell } from '@/components/ui/CommandShell';
import { BulkOfficerOnboarding } from '@/components/features/BulkOfficerOnboarding';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Bulk Officer Onboarding' };

export default function BulkOfficersPage() {
  return (
    <CommandShell active="officers-bulk">
      <BulkOfficerOnboarding />
    </CommandShell>
  );
}
