import { CommandShell } from '@/components/ui/CommandShell';
import { RecordsManagementDesk } from '@/components/features/frontdoor/RecordsManagementDesk';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Records management' };

// Plan step I13: record classes and schedules, legal holds, disposal, transfer to the archive, migrations (lib/recordkeeping).
export default function RecordsManagementPage() {
  return (
    <CommandShell active="aud">
      <RecordsManagementDesk />
    </CommandShell>
  );
}
