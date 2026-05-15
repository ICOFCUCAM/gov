import { CommandShell } from '@/components/ui/CommandShell';
import { MinistryWorkspace } from '@/components/features/MinistryWorkspace';

export const dynamic = 'force-dynamic';

export default function MinistryOperationsPage({ params }: { params: { id: string } }) {
  return (
    <CommandShell active="min">
      <MinistryWorkspace id={params.id} />
    </CommandShell>
  );
}
