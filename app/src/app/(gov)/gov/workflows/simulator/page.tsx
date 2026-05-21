import { CommandShell } from '@/components/ui/CommandShell';
import { WorkflowSimulator } from '@/components/features/WorkflowSimulator';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Workflow simulator' };

export default function SimulatorPage() {
  return (
    <CommandShell active="workflows">
      <WorkflowSimulator />
    </CommandShell>
  );
}
