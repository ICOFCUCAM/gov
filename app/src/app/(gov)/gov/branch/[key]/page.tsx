import { CommandShell } from '@/components/ui/CommandShell';
import { BranchWorkspace } from '@/components/features/BranchWorkspace';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Constitutional Branch' };

export default function BranchPage({ params }: { params: { key: string } }) {
  return (
    <CommandShell active="branches">
      <BranchWorkspace branchKey={params.key} />
    </CommandShell>
  );
}
