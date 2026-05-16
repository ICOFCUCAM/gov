import { CommandShell } from '@/components/ui/CommandShell';
import { BranchesView } from '@/components/features/BranchesView';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Branches of Government' };

export default function BranchesPage() {
  return (
    <CommandShell active="branches">
      <BranchesView />
    </CommandShell>
  );
}
