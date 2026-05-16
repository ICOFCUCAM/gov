import { CommandShell } from '@/components/ui/CommandShell';
import { BranchWorkspace } from '@/components/features/BranchWorkspace';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Legislature' };

export default function LegislaturePage() {
  return (
    <CommandShell active="legislature">
      <BranchWorkspace branch="legislature" />
    </CommandShell>
  );
}
