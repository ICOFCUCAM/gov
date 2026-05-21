import { CommandShell } from '@/components/ui/CommandShell';
import { WorkflowDiff } from '@/components/features/WorkflowDiff';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Workflow diff' };

export default function DiffPage() {
  return (
    <CommandShell active="workflows">
      <WorkflowDiff />
    </CommandShell>
  );
}
