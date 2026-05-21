import { CommandShell } from '@/components/ui/CommandShell';
import { WorkflowCatalogue } from '@/components/features/WorkflowCatalogue';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Workflow Catalogue' };

export default function WorkflowsPage() {
  return (
    <CommandShell active="workflows">
      <WorkflowCatalogue />
    </CommandShell>
  );
}
