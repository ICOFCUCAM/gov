import { CommandShell } from '@/components/ui/CommandShell';
import { BranchWorkspace } from '@/components/features/BranchWorkspace';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Constitutional Branch' };

export default async function BranchPage(props: { params: Promise<{ key: string }> }) {
  const params = await props.params;
  return (
    <CommandShell active="branches">
      <BranchWorkspace branchKey={params.key} />
    </CommandShell>
  );
}
