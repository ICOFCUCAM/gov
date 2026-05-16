import { CommandShell } from '@/components/ui/CommandShell';
import { BranchWorkspace } from '@/components/features/BranchWorkspace';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Judiciary' };

export default function JudiciaryPage() {
  return (
    <CommandShell active="judiciary">
      <BranchWorkspace branch="judiciary" />
    </CommandShell>
  );
}
